import {
  getQueuedJobs,
  markJobDone,
  markJobFailed,
  markJobRunning,
  queueDueMonitors,
  queueMonitorCheck,
} from "@/lib/db/queries";
import { runHealthCheckForMonitor } from "@/lib/monitoring/health-checker";

export async function enqueueDueHealthChecks(intervalMinutes = 5): Promise<number> {
  return queueDueMonitors(intervalMinutes);
}

export async function enqueueHealthCheckNow(monitorId: string): Promise<void> {
  await queueMonitorCheck(monitorId, new Date());
}

export async function processHealthCheckQueue(limit = 20): Promise<{
  processed: number;
  failed: number;
}> {
  const jobs = await getQueuedJobs(limit);
  let processed = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      await markJobRunning(job.id);
      await runHealthCheckForMonitor(job.monitor_id);
      await markJobDone(job.id);
      processed += 1;
    } catch (error) {
      failed += 1;
      await markJobFailed(job.id, error instanceof Error ? error.message : "Unknown health check error");
    }
  }

  return {
    processed,
    failed,
  };
}
