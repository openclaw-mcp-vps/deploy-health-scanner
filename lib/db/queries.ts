import { randomUUID } from "node:crypto";
import { ensureSchemaReady, queryRows } from "@/lib/db/client";
import type { MonitorCheckRecord, MonitorRecord, MonitorSource } from "@/lib/db/schema";

export async function listMonitors(): Promise<MonitorRecord[]> {
  await ensureSchemaReady();
  return queryRows<MonitorRecord>(
    `SELECT *
     FROM monitors
     WHERE is_active = TRUE
     ORDER BY created_at DESC`
  );
}

export async function getMonitorById(monitorId: string): Promise<MonitorRecord | null> {
  await ensureSchemaReady();
  const rows = await queryRows<MonitorRecord>(`SELECT * FROM monitors WHERE id = $1 LIMIT 1`, [monitorId]);
  return rows[0] ?? null;
}

export async function createMonitor(url: string, source: MonitorSource): Promise<MonitorRecord> {
  await ensureSchemaReady();

  const normalized = normalizeUrl(url);
  const existingRows = await queryRows<MonitorRecord>(`SELECT * FROM monitors WHERE url = $1 LIMIT 1`, [normalized]);

  if (existingRows[0]) {
    return existingRows[0];
  }

  const id = randomUUID();
  const rows = await queryRows<MonitorRecord>(
    `INSERT INTO monitors (id, url, source)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [id, normalized, source]
  );

  return rows[0];
}

export async function createMonitorsBatch(urls: string[], source: MonitorSource): Promise<number> {
  await ensureSchemaReady();

  let inserted = 0;
  for (const url of urls) {
    const normalized = normalizeUrl(url);
    const rows = await queryRows<{ id: string }>(`SELECT id FROM monitors WHERE url = $1 LIMIT 1`, [normalized]);
    if (rows.length > 0) {
      continue;
    }

    await queryRows(
      `INSERT INTO monitors (id, url, source)
       VALUES ($1, $2, $3)`,
      [randomUUID(), normalized, source]
    );
    inserted += 1;
  }

  return inserted;
}

export async function deactivateMonitor(monitorId: string): Promise<void> {
  await ensureSchemaReady();
  await queryRows(`UPDATE monitors SET is_active = FALSE WHERE id = $1`, [monitorId]);
}

export async function queueMonitorCheck(monitorId: string, when: Date = new Date()): Promise<void> {
  await ensureSchemaReady();
  const existingPending = await queryRows<{ id: string }>(
    `SELECT id
     FROM health_check_jobs
     WHERE monitor_id = $1
       AND status IN ('queued', 'running')
     LIMIT 1`,
    [monitorId]
  );

  if (existingPending.length > 0) {
    return;
  }

  await queryRows(
    `INSERT INTO health_check_jobs (id, monitor_id, scheduled_for, status)
     VALUES ($1, $2, $3, 'queued')`,
    [randomUUID(), monitorId, when.toISOString()]
  );
}

export async function getQueuedJobs(limit: number): Promise<
  Array<{
    id: string;
    monitor_id: string;
    attempts: number;
  }>
> {
  await ensureSchemaReady();
  return queryRows(
    `SELECT id, monitor_id, attempts
     FROM health_check_jobs
     WHERE status = 'queued'
     ORDER BY scheduled_for ASC
     LIMIT $1`,
    [limit]
  );
}

export async function markJobRunning(jobId: string): Promise<void> {
  await ensureSchemaReady();
  await queryRows(
    `UPDATE health_check_jobs
     SET status = 'running', attempts = attempts + 1, updated_at = NOW()
     WHERE id = $1`,
    [jobId]
  );
}

export async function markJobDone(jobId: string): Promise<void> {
  await ensureSchemaReady();
  await queryRows(
    `UPDATE health_check_jobs
     SET status = 'done', updated_at = NOW(), last_error = NULL
     WHERE id = $1`,
    [jobId]
  );
}

export async function markJobFailed(jobId: string, error: string): Promise<void> {
  await ensureSchemaReady();
  await queryRows(
    `UPDATE health_check_jobs
     SET status = 'failed', updated_at = NOW(), last_error = $2
     WHERE id = $1`,
    [jobId, error.slice(0, 800)]
  );
}

export async function queueDueMonitors(windowMinutes = 5): Promise<number> {
  await ensureSchemaReady();

  const dueRows = await queryRows<{ id: string }>(
    `SELECT id
     FROM monitors
     WHERE is_active = TRUE
       AND (
         last_checked_at IS NULL
         OR last_checked_at < NOW() - ($1 * INTERVAL '1 minute')
       )`,
    [windowMinutes]
  );

  let queued = 0;

  for (const row of dueRows) {
    const previous = await queryRows<{ id: string }>(
      `SELECT id
       FROM health_check_jobs
       WHERE monitor_id = $1
         AND status IN ('queued', 'running')
       LIMIT 1`,
      [row.id]
    );

    if (previous.length > 0) {
      continue;
    }

    await queryRows(
      `INSERT INTO health_check_jobs (id, monitor_id, scheduled_for, status)
       VALUES ($1, $2, NOW(), 'queued')`,
      [randomUUID(), row.id]
    );
    queued += 1;
  }

  return queued;
}

export async function insertMonitorCheck(input: {
  monitorId: string;
  httpStatus: number | null;
  sslExpiresAt: Date | null;
  sslDaysRemaining: number | null;
  loadTimeMs: number | null;
  seoScore: number | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoCanonical: string | null;
  seoRobots: string | null;
  seoOgTitle: string | null;
  seoOgDescription: string | null;
  success: boolean;
  statusLabel: string;
  errors: string[];
}): Promise<void> {
  await ensureSchemaReady();

  await queryRows(
    `INSERT INTO monitor_checks (
      id,
      monitor_id,
      http_status,
      ssl_expires_at,
      ssl_days_remaining,
      load_time_ms,
      seo_score,
      seo_title,
      seo_description,
      seo_canonical,
      seo_robots,
      seo_og_title,
      seo_og_description,
      success,
      status_label,
      error_messages
    ) VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      $8,
      $9,
      $10,
      $11,
      $12,
      $13,
      $14,
      $15,
      $16
    )`,
    [
      randomUUID(),
      input.monitorId,
      input.httpStatus,
      input.sslExpiresAt?.toISOString() ?? null,
      input.sslDaysRemaining,
      input.loadTimeMs,
      input.seoScore,
      input.seoTitle,
      input.seoDescription,
      input.seoCanonical,
      input.seoRobots,
      input.seoOgTitle,
      input.seoOgDescription,
      input.success,
      input.statusLabel,
      input.errors,
    ]
  );
}

export async function updateMonitorLatest(input: {
  monitorId: string;
  httpStatus: number | null;
  sslDaysRemaining: number | null;
  loadTimeMs: number | null;
  seoScore: number | null;
  success: boolean;
}): Promise<void> {
  await ensureSchemaReady();

  await queryRows(
    `UPDATE monitors
     SET latest_status = $2,
         latest_ssl_days_remaining = $3,
         latest_load_time_ms = $4,
         latest_seo_score = $5,
         last_checked_at = NOW(),
         failure_count = CASE WHEN $6 THEN 0 ELSE failure_count + 1 END
     WHERE id = $1`,
    [input.monitorId, input.httpStatus, input.sslDaysRemaining, input.loadTimeMs, input.seoScore, input.success]
  );
}

export async function listRecentChecks(limit = 120): Promise<MonitorCheckRecord[]> {
  await ensureSchemaReady();

  return queryRows<MonitorCheckRecord>(
    `SELECT *
     FROM monitor_checks
     ORDER BY checked_at DESC
     LIMIT $1`,
    [limit]
  );
}

export async function upsertSubscription(input: {
  orderId: string;
  email: string;
  planName: string;
  status: string;
}): Promise<void> {
  await ensureSchemaReady();

  await queryRows(
    `INSERT INTO subscriptions (id, order_id, email, plan_name, status)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (order_id)
     DO UPDATE SET
       email = EXCLUDED.email,
       plan_name = EXCLUDED.plan_name,
       status = EXCLUDED.status,
       updated_at = NOW()`,
    [randomUUID(), input.orderId, input.email, input.planName, input.status]
  );
}

export async function findPaidSubscription(orderId: string, email: string): Promise<boolean> {
  await ensureSchemaReady();

  const rows = await queryRows<{ exists: boolean }>(
    `SELECT EXISTS (
      SELECT 1
      FROM subscriptions
      WHERE order_id = $1
        AND lower(email) = lower($2)
        AND status IN ('paid', 'active', 'on_trial')
    ) AS exists`,
    [orderId, email]
  );

  return rows[0]?.exists ?? false;
}

export async function insertAlert(input: {
  monitorId: string;
  channel: "email" | "slack";
  reason: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  await ensureSchemaReady();

  await queryRows(
    `INSERT INTO alerts (id, monitor_id, channel, reason, payload)
     VALUES ($1, $2, $3, $4, $5)`,
    [randomUUID(), input.monitorId, input.channel, input.reason, JSON.stringify(input.payload)]
  );
}

function normalizeUrl(url: string): string {
  const withProtocol = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  const parsed = new URL(withProtocol);
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}
