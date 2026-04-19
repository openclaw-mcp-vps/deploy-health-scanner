import cron from "node-cron";

import { query } from "@/lib/db";
import { ensureSchema } from "@/lib/db/schema";
import { sendAlertsForCheck } from "@/lib/monitoring/alerts";
import { runMonitorCheck } from "@/lib/monitoring/checker";
import { enqueueMonitorChecks } from "@/lib/monitoring/jobs";
import { monitorQueue, type MonitorQueueJob } from "@/lib/monitoring/queue";

async function persistCheck(jobData: MonitorQueueJob, result: Awaited<ReturnType<typeof runMonitorCheck>>): Promise<void> {
  await query(
    `
      INSERT INTO monitor_checks (
        monitor_id,
        checked_at,
        http_status,
        ssl_expiry,
        seo_title,
        seo_description,
        load_ms,
        ok,
        failure_reason
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
    [
      jobData.monitorId,
      result.checkedAt,
      result.httpStatus,
      result.sslExpiry,
      result.seoTitle,
      result.seoDescription,
      result.loadMs,
      result.ok,
      result.failureReason,
    ]
  );

  await query(
    `
      UPDATE monitors
      SET updated_at = NOW()
      WHERE id = $1
    `,
    [jobData.monitorId]
  );
}

async function processMonitor(jobData: MonitorQueueJob): Promise<void> {
  const monitor = await query<{ id: string; owner_key: string }>(
    `
      SELECT id, owner_key
      FROM monitors
      WHERE id = $1 AND owner_key = $2
      LIMIT 1
    `,
    [jobData.monitorId, jobData.ownerKey]
  );

  if (monitor.rowCount === 0) {
    return;
  }

  const result = await runMonitorCheck(jobData.url);
  await persistCheck(jobData, result);

  await sendAlertsForCheck({
    monitorId: jobData.monitorId,
    monitorName: jobData.name,
    monitorUrl: jobData.url,
    ownerKey: jobData.ownerKey,
    result,
  });
}

async function boot(): Promise<void> {
  await ensureSchema();

  monitorQueue.process("check-monitor", 5, async (job) => {
    await processMonitor(job.data);
  });

  monitorQueue.on("failed", (job, error) => {
    console.error(`Monitor job failed: ${job?.id ?? "unknown"}`, error);
  });

  monitorQueue.on("completed", (job) => {
    console.log(`Monitor job completed: ${job.id}`);
  });

  cron.schedule(
    "*/5 * * * *",
    async () => {
      try {
        const enqueued = await enqueueMonitorChecks();
        console.log(`[${new Date().toISOString()}] queued ${enqueued} monitors for checking`);
      } catch (error) {
        console.error("Failed to enqueue scheduled monitor checks", error);
      }
    },
    { timezone: "UTC" }
  );

  const initialEnqueueCount = await enqueueMonitorChecks().catch(() => 0);
  console.log(`Monitor worker started. Initial queue depth: ${initialEnqueueCount}`);
}

void boot();
