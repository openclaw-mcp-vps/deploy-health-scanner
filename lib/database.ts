import { Pool, type QueryResultRow } from "pg";

export type AlertChannelType = "email" | "slack";

export interface UserRecord {
  id: number;
  email: string;
  created_at: string;
}

export interface MonitorRecord {
  id: number;
  user_id: number;
  name: string;
  url: string;
  check_interval_minutes: number;
  ssl_days_threshold: number;
  is_active: boolean;
  status: string;
  last_checked_at: string | null;
  created_at: string;
}

export interface MonitorWithLatest extends MonitorRecord {
  latest_http_status: number | null;
  latest_is_up: boolean | null;
  latest_ssl_valid: boolean | null;
  latest_ssl_days_remaining: number | null;
  latest_seo_title: boolean | null;
  latest_seo_description: boolean | null;
  latest_load_time_ms: number | null;
  latest_error: string | null;
  latest_checked_at: string | null;
  uptime_24h: number | null;
}

export interface CheckResultRecord {
  id: number;
  monitor_id: number;
  checked_at: string;
  http_status: number | null;
  is_up: boolean;
  ssl_valid: boolean;
  ssl_days_remaining: number | null;
  seo_title: boolean;
  seo_description: boolean;
  load_time_ms: number | null;
  error: string | null;
}

export interface AlertChannelRecord {
  id: number;
  user_id: number;
  type: AlertChannelType;
  target: string;
  is_enabled: boolean;
}

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;

const pool =
  globalThis.__deployHealthScannerPool ||
  new Pool(
    connectionString
      ? {
          connectionString,
          ssl:
            process.env.NODE_ENV === "production"
              ? { rejectUnauthorized: false }
              : undefined
        }
      : undefined
  );

if (!globalThis.__deployHealthScannerPool) {
  globalThis.__deployHealthScannerPool = pool;
}

let schemaInitPromise: Promise<void> | null = null;

export async function ensureDatabase() {
  if (!schemaInitPromise) {
    schemaInitPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id BIGSERIAL PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS paid_customers (
          id BIGSERIAL PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          source TEXT NOT NULL DEFAULT 'stripe',
          status TEXT NOT NULL DEFAULT 'active',
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS monitors (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          url TEXT NOT NULL,
          check_interval_minutes INTEGER NOT NULL DEFAULT 5,
          ssl_days_threshold INTEGER NOT NULL DEFAULT 14,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          status TEXT NOT NULL DEFAULT 'unknown',
          last_checked_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(user_id, url)
        );

        CREATE TABLE IF NOT EXISTS check_results (
          id BIGSERIAL PRIMARY KEY,
          monitor_id BIGINT NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
          checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          http_status INTEGER,
          is_up BOOLEAN NOT NULL,
          ssl_valid BOOLEAN NOT NULL,
          ssl_days_remaining INTEGER,
          seo_title BOOLEAN NOT NULL,
          seo_description BOOLEAN NOT NULL,
          load_time_ms INTEGER,
          error TEXT
        );

        CREATE TABLE IF NOT EXISTS alert_channels (
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          type TEXT NOT NULL,
          target TEXT NOT NULL,
          is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
          UNIQUE(user_id, type, target)
        );

        CREATE TABLE IF NOT EXISTS subscription_events (
          id BIGSERIAL PRIMARY KEY,
          source TEXT NOT NULL,
          event_name TEXT NOT NULL,
          email TEXT,
          payload JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_monitors_user_id ON monitors(user_id);
        CREATE INDEX IF NOT EXISTS idx_monitors_active ON monitors(is_active);
        CREATE INDEX IF NOT EXISTS idx_check_results_monitor_id_checked_at ON check_results(monitor_id, checked_at DESC);
      `);
    })();
  }

  return schemaInitPromise;
}

export async function dbQuery<T extends QueryResultRow>(
  queryText: string,
  params: unknown[] = []
) {
  await ensureDatabase();
  const result = await pool.query<T>(queryText, params);
  return result.rows;
}

export async function getOrCreateUser(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const rows = await dbQuery<UserRecord>(
    `
      INSERT INTO users (email)
      VALUES ($1)
      ON CONFLICT (email)
      DO UPDATE SET email = EXCLUDED.email
      RETURNING id, email, created_at
    `,
    [normalizedEmail]
  );

  return rows[0];
}

export async function upsertPaidCustomer(
  email: string,
  source: string,
  status: string
) {
  const normalizedEmail = email.trim().toLowerCase();
  await dbQuery(
    `
      INSERT INTO paid_customers (email, source, status)
      VALUES ($1, $2, $3)
      ON CONFLICT (email)
      DO UPDATE SET
        source = EXCLUDED.source,
        status = EXCLUDED.status,
        updated_at = NOW()
    `,
    [normalizedEmail, source, status]
  );
}

export async function isPaidUser(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const rows = await dbQuery<{ status: string }>(
    `
      SELECT status
      FROM paid_customers
      WHERE email = $1
      LIMIT 1
    `,
    [normalizedEmail]
  );

  if (rows.length === 0) {
    return false;
  }

  const status = rows[0].status.toLowerCase();
  return ["active", "paid", "trialing"].includes(status);
}

export async function createMonitor(params: {
  userId: number;
  name: string;
  url: string;
  sslDaysThreshold?: number;
}) {
  const rows = await dbQuery<MonitorRecord>(
    `
      INSERT INTO monitors (user_id, name, url, ssl_days_threshold)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, url)
      DO UPDATE SET
        name = EXCLUDED.name,
        ssl_days_threshold = EXCLUDED.ssl_days_threshold
      RETURNING id, user_id, name, url, check_interval_minutes, ssl_days_threshold, is_active, status, last_checked_at, created_at
    `,
    [params.userId, params.name.trim(), params.url.trim(), params.sslDaysThreshold ?? 14]
  );

  return rows[0];
}

export async function listMonitorsForUser(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  return dbQuery<MonitorWithLatest>(
    `
      SELECT
        m.id,
        m.user_id,
        m.name,
        m.url,
        m.check_interval_minutes,
        m.ssl_days_threshold,
        m.is_active,
        m.status,
        m.last_checked_at,
        m.created_at,
        latest.http_status AS latest_http_status,
        latest.is_up AS latest_is_up,
        latest.ssl_valid AS latest_ssl_valid,
        latest.ssl_days_remaining AS latest_ssl_days_remaining,
        latest.seo_title AS latest_seo_title,
        latest.seo_description AS latest_seo_description,
        latest.load_time_ms AS latest_load_time_ms,
        latest.error AS latest_error,
        latest.checked_at AS latest_checked_at,
        (
          SELECT ROUND(
            100.0 * AVG(CASE WHEN cr.is_up THEN 1 ELSE 0 END)::numeric,
            2
          )
          FROM check_results cr
          WHERE cr.monitor_id = m.id
          AND cr.checked_at >= NOW() - INTERVAL '24 hours'
        ) AS uptime_24h
      FROM monitors m
      INNER JOIN users u ON u.id = m.user_id
      LEFT JOIN LATERAL (
        SELECT
          cr.http_status,
          cr.is_up,
          cr.ssl_valid,
          cr.ssl_days_remaining,
          cr.seo_title,
          cr.seo_description,
          cr.load_time_ms,
          cr.error,
          cr.checked_at
        FROM check_results cr
        WHERE cr.monitor_id = m.id
        ORDER BY cr.checked_at DESC
        LIMIT 1
      ) latest ON TRUE
      WHERE u.email = $1
      ORDER BY m.created_at DESC
    `,
    [normalizedEmail]
  );
}

export async function listRecentResults(monitorId: number, limit = 20) {
  return dbQuery<CheckResultRecord>(
    `
      SELECT
        id,
        monitor_id,
        checked_at,
        http_status,
        is_up,
        ssl_valid,
        ssl_days_remaining,
        seo_title,
        seo_description,
        load_time_ms,
        error
      FROM check_results
      WHERE monitor_id = $1
      ORDER BY checked_at DESC
      LIMIT $2
    `,
    [monitorId, limit]
  );
}

export async function getMonitorByIdForUser(monitorId: number, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const rows = await dbQuery<MonitorRecord>(
    `
      SELECT
        m.id,
        m.user_id,
        m.name,
        m.url,
        m.check_interval_minutes,
        m.ssl_days_threshold,
        m.is_active,
        m.status,
        m.last_checked_at,
        m.created_at
      FROM monitors m
      INNER JOIN users u ON u.id = m.user_id
      WHERE m.id = $1 AND u.email = $2
      LIMIT 1
    `,
    [monitorId, normalizedEmail]
  );

  return rows[0] || null;
}

export async function listActiveMonitors() {
  return dbQuery<MonitorRecord>(
    `
      SELECT
        id,
        user_id,
        name,
        url,
        check_interval_minutes,
        ssl_days_threshold,
        is_active,
        status,
        last_checked_at,
        created_at
      FROM monitors
      WHERE is_active = TRUE
      ORDER BY created_at ASC
    `
  );
}

export async function recordCheckResult(params: {
  monitorId: number;
  httpStatus: number | null;
  isUp: boolean;
  sslValid: boolean;
  sslDaysRemaining: number | null;
  seoTitle: boolean;
  seoDescription: boolean;
  loadTimeMs: number | null;
  error: string | null;
}) {
  const rows = await dbQuery<CheckResultRecord>(
    `
      INSERT INTO check_results (
        monitor_id,
        http_status,
        is_up,
        ssl_valid,
        ssl_days_remaining,
        seo_title,
        seo_description,
        load_time_ms,
        error
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING
        id,
        monitor_id,
        checked_at,
        http_status,
        is_up,
        ssl_valid,
        ssl_days_remaining,
        seo_title,
        seo_description,
        load_time_ms,
        error
    `,
    [
      params.monitorId,
      params.httpStatus,
      params.isUp,
      params.sslValid,
      params.sslDaysRemaining,
      params.seoTitle,
      params.seoDescription,
      params.loadTimeMs,
      params.error
    ]
  );

  await dbQuery(
    `
      UPDATE monitors
      SET
        status = $2,
        last_checked_at = NOW()
      WHERE id = $1
    `,
    [params.monitorId, params.isUp ? "healthy" : "failing"]
  );

  return rows[0];
}

export async function upsertAlertChannel(params: {
  userId: number;
  type: AlertChannelType;
  target: string;
}) {
  await dbQuery(
    `
      INSERT INTO alert_channels (user_id, type, target)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, type, target)
      DO UPDATE SET is_enabled = TRUE
    `,
    [params.userId, params.type, params.target.trim()]
  );
}

export async function listAlertChannelsForUser(userId: number) {
  return dbQuery<AlertChannelRecord>(
    `
      SELECT id, user_id, type, target, is_enabled
      FROM alert_channels
      WHERE user_id = $1 AND is_enabled = TRUE
    `,
    [userId]
  );
}

export async function listUserEmailsByIds(userIds: number[]) {
  if (userIds.length === 0) {
    return [];
  }

  return dbQuery<{ id: number; email: string }>(
    `
      SELECT id, email
      FROM users
      WHERE id = ANY($1::bigint[])
    `,
    [userIds]
  );
}

export async function logSubscriptionEvent(params: {
  source: string;
  eventName: string;
  email?: string | null;
  payload: unknown;
}) {
  await dbQuery(
    `
      INSERT INTO subscription_events (source, event_name, email, payload)
      VALUES ($1, $2, $3, $4::jsonb)
    `,
    [
      params.source,
      params.eventName,
      params.email ? params.email.toLowerCase() : null,
      JSON.stringify(params.payload)
    ]
  );
}

declare global {
  // eslint-disable-next-line no-var
  var __deployHealthScannerPool: Pool | undefined;
}
