import { Pool, type QueryResult, type QueryResultRow } from "pg";

export type CheckStatus = "healthy" | "warning" | "critical";

export type MonitoredUrl = {
  id: number;
  ownerEmail: string;
  url: string;
  displayName: string | null;
  isActive: boolean;
  createdAt: string;
  lastCheckedAt: string | null;
};

export type HealthCheckRecord = {
  id: number;
  monitoredUrlId: number;
  checkedAt: string;
  status: CheckStatus;
  httpStatus: number | null;
  responseTimeMs: number | null;
  sslValid: boolean | null;
  sslExpiresAt: string | null;
  sslDaysRemaining: number | null;
  seoTitle: boolean;
  seoDescription: boolean;
  seoOgImage: boolean;
  seoCanonical: boolean;
  pageSpeedScore: number | null;
  pageSpeedCategory: string | null;
  error: string | null;
};

export type AlertChannel = {
  id: number;
  monitoredUrlId: number;
  channelType: "email" | "slack";
  target: string;
  enabled: boolean;
};

export type Subscription = {
  id: number;
  email: string;
  lemonsqueezyOrderId: string | null;
  status: string;
  plan: string | null;
  createdAt: string;
  updatedAt: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __dhs_pool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __dhs_schema_ready: Promise<void> | undefined;
}

function getPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!global.__dhs_pool) {
    global.__dhs_pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
      max: 20,
    });
  }

  return global.__dhs_pool;
}

async function ensureSchema() {
  if (!global.__dhs_schema_ready) {
    global.__dhs_schema_ready = (async () => {
      const pool = getPool();

      await pool.query(`
        CREATE TABLE IF NOT EXISTS subscriptions (
          id BIGSERIAL PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          lemonsqueezy_order_id TEXT UNIQUE,
          status TEXT NOT NULL DEFAULT 'active',
          plan TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS monitored_urls (
          id BIGSERIAL PRIMARY KEY,
          owner_email TEXT NOT NULL,
          url TEXT NOT NULL,
          display_name TEXT,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_checked_at TIMESTAMPTZ,
          UNIQUE(owner_email, url)
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS health_checks (
          id BIGSERIAL PRIMARY KEY,
          monitored_url_id BIGINT NOT NULL REFERENCES monitored_urls(id) ON DELETE CASCADE,
          checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          status TEXT NOT NULL,
          http_status INTEGER,
          response_time_ms INTEGER,
          ssl_valid BOOLEAN,
          ssl_expires_at TIMESTAMPTZ,
          ssl_days_remaining INTEGER,
          seo_title BOOLEAN NOT NULL DEFAULT FALSE,
          seo_description BOOLEAN NOT NULL DEFAULT FALSE,
          seo_og_image BOOLEAN NOT NULL DEFAULT FALSE,
          seo_canonical BOOLEAN NOT NULL DEFAULT FALSE,
          page_speed_score INTEGER,
          page_speed_category TEXT,
          error TEXT
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS alert_channels (
          id BIGSERIAL PRIMARY KEY,
          monitored_url_id BIGINT NOT NULL REFERENCES monitored_urls(id) ON DELETE CASCADE,
          channel_type TEXT NOT NULL CHECK (channel_type IN ('email', 'slack')),
          target TEXT NOT NULL,
          enabled BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(monitored_url_id, channel_type, target)
        );
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_health_checks_url_time
        ON health_checks(monitored_url_id, checked_at DESC);
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_monitored_urls_owner
        ON monitored_urls(owner_email, created_at DESC);
      `);
    })();
  }

  await global.__dhs_schema_ready;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  await ensureSchema();
  const pool = getPool();
  return pool.query<T>(text, params);
}

function mapMonitoredUrl(row: {
  id: string;
  owner_email: string;
  url: string;
  display_name: string | null;
  is_active: boolean;
  created_at: string;
  last_checked_at: string | null;
}): MonitoredUrl {
  return {
    id: Number(row.id),
    ownerEmail: row.owner_email,
    url: row.url,
    displayName: row.display_name,
    isActive: row.is_active,
    createdAt: row.created_at,
    lastCheckedAt: row.last_checked_at,
  };
}

function mapHealthCheck(row: {
  id: string;
  monitored_url_id: string;
  checked_at: string;
  status: CheckStatus;
  http_status: number | null;
  response_time_ms: number | null;
  ssl_valid: boolean | null;
  ssl_expires_at: string | null;
  ssl_days_remaining: number | null;
  seo_title: boolean;
  seo_description: boolean;
  seo_og_image: boolean;
  seo_canonical: boolean;
  page_speed_score: number | null;
  page_speed_category: string | null;
  error: string | null;
}): HealthCheckRecord {
  return {
    id: Number(row.id),
    monitoredUrlId: Number(row.monitored_url_id),
    checkedAt: row.checked_at,
    status: row.status,
    httpStatus: row.http_status,
    responseTimeMs: row.response_time_ms,
    sslValid: row.ssl_valid,
    sslExpiresAt: row.ssl_expires_at,
    sslDaysRemaining: row.ssl_days_remaining,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    seoOgImage: row.seo_og_image,
    seoCanonical: row.seo_canonical,
    pageSpeedScore: row.page_speed_score,
    pageSpeedCategory: row.page_speed_category,
    error: row.error,
  };
}

function mapSubscription(row: {
  id: string;
  email: string;
  lemonsqueezy_order_id: string | null;
  status: string;
  plan: string | null;
  created_at: string;
  updated_at: string;
}): Subscription {
  return {
    id: Number(row.id),
    email: row.email,
    lemonsqueezyOrderId: row.lemonsqueezy_order_id,
    status: row.status,
    plan: row.plan,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAlertChannel(row: {
  id: string;
  monitored_url_id: string;
  channel_type: "email" | "slack";
  target: string;
  enabled: boolean;
}): AlertChannel {
  return {
    id: Number(row.id),
    monitoredUrlId: Number(row.monitored_url_id),
    channelType: row.channel_type,
    target: row.target,
    enabled: row.enabled,
  };
}

export async function upsertSubscription(input: {
  email: string;
  orderId?: string | null;
  status: string;
  plan?: string | null;
}) {
  const result = await query<{
    id: string;
    email: string;
    lemonsqueezy_order_id: string | null;
    status: string;
    plan: string | null;
    created_at: string;
    updated_at: string;
  }>(
    `
    INSERT INTO subscriptions (email, lemonsqueezy_order_id, status, plan, created_at, updated_at)
    VALUES ($1, $2, $3, $4, NOW(), NOW())
    ON CONFLICT (email)
    DO UPDATE SET
      lemonsqueezy_order_id = COALESCE(EXCLUDED.lemonsqueezy_order_id, subscriptions.lemonsqueezy_order_id),
      status = EXCLUDED.status,
      plan = COALESCE(EXCLUDED.plan, subscriptions.plan),
      updated_at = NOW()
    RETURNING *;
    `,
    [input.email.toLowerCase(), input.orderId ?? null, input.status, input.plan ?? null],
  );

  return mapSubscription(result.rows[0]);
}

export async function getSubscriptionByEmail(email: string) {
  const result = await query<{
    id: string;
    email: string;
    lemonsqueezy_order_id: string | null;
    status: string;
    plan: string | null;
    created_at: string;
    updated_at: string;
  }>(
    `
    SELECT * FROM subscriptions
    WHERE email = $1
    LIMIT 1;
    `,
    [email.toLowerCase()],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapSubscription(result.rows[0]);
}

export async function createOrActivateMonitoredUrl(input: {
  ownerEmail: string;
  url: string;
  displayName?: string | null;
}) {
  const result = await query<{
    id: string;
    owner_email: string;
    url: string;
    display_name: string | null;
    is_active: boolean;
    created_at: string;
    last_checked_at: string | null;
  }>(
    `
    INSERT INTO monitored_urls (owner_email, url, display_name, is_active)
    VALUES ($1, $2, $3, TRUE)
    ON CONFLICT (owner_email, url)
    DO UPDATE SET
      display_name = COALESCE(EXCLUDED.display_name, monitored_urls.display_name),
      is_active = TRUE
    RETURNING *;
    `,
    [input.ownerEmail.toLowerCase(), input.url, input.displayName ?? null],
  );

  return mapMonitoredUrl(result.rows[0]);
}

export async function countMonitoredUrlsForOwner(ownerEmail: string) {
  const result = await query<{ count: string }>(
    `
    SELECT COUNT(*)::text AS count
    FROM monitored_urls
    WHERE owner_email = $1 AND is_active = TRUE;
    `,
    [ownerEmail.toLowerCase()],
  );

  return Number(result.rows[0].count);
}

export async function listMonitoredUrlsForOwner(ownerEmail: string) {
  const result = await query<{
    id: string;
    owner_email: string;
    url: string;
    display_name: string | null;
    is_active: boolean;
    created_at: string;
    last_checked_at: string | null;
    latest_status: CheckStatus | null;
    latest_http_status: number | null;
    latest_response_time_ms: number | null;
    latest_ssl_days_remaining: number | null;
    latest_page_speed_score: number | null;
    latest_error: string | null;
    latest_checked_at: string | null;
  }>(
    `
    SELECT
      u.*,
      hc.status AS latest_status,
      hc.http_status AS latest_http_status,
      hc.response_time_ms AS latest_response_time_ms,
      hc.ssl_days_remaining AS latest_ssl_days_remaining,
      hc.page_speed_score AS latest_page_speed_score,
      hc.error AS latest_error,
      hc.checked_at AS latest_checked_at
    FROM monitored_urls u
    LEFT JOIN LATERAL (
      SELECT *
      FROM health_checks h
      WHERE h.monitored_url_id = u.id
      ORDER BY h.checked_at DESC
      LIMIT 1
    ) hc ON TRUE
    WHERE u.owner_email = $1
      AND u.is_active = TRUE
    ORDER BY u.created_at DESC;
    `,
    [ownerEmail.toLowerCase()],
  );

  return result.rows.map((row) => ({
    ...mapMonitoredUrl(row),
    latest: row.latest_status
      ? {
          status: row.latest_status,
          httpStatus: row.latest_http_status,
          responseTimeMs: row.latest_response_time_ms,
          sslDaysRemaining: row.latest_ssl_days_remaining,
          pageSpeedScore: row.latest_page_speed_score,
          error: row.latest_error,
          checkedAt: row.latest_checked_at,
        }
      : null,
  }));
}

export async function listRecentChecksForOwner(ownerEmail: string, limitPerUrl = 40) {
  const result = await query<{
    id: string;
    monitored_url_id: string;
    checked_at: string;
    status: CheckStatus;
    http_status: number | null;
    response_time_ms: number | null;
    ssl_valid: boolean | null;
    ssl_expires_at: string | null;
    ssl_days_remaining: number | null;
    seo_title: boolean;
    seo_description: boolean;
    seo_og_image: boolean;
    seo_canonical: boolean;
    page_speed_score: number | null;
    page_speed_category: string | null;
    error: string | null;
  }>(
    `
    SELECT *
    FROM (
      SELECT
        h.*,
        ROW_NUMBER() OVER (PARTITION BY h.monitored_url_id ORDER BY h.checked_at DESC) AS row_number
      FROM health_checks h
      INNER JOIN monitored_urls u ON u.id = h.monitored_url_id
      WHERE u.owner_email = $1
    ) ranked
    WHERE ranked.row_number <= $2
    ORDER BY ranked.checked_at DESC;
    `,
    [ownerEmail.toLowerCase(), limitPerUrl],
  );

  return result.rows.map(mapHealthCheck);
}

export async function listActiveMonitoredUrls() {
  const result = await query<{
    id: string;
    owner_email: string;
    url: string;
    display_name: string | null;
    is_active: boolean;
    created_at: string;
    last_checked_at: string | null;
  }>(
    `
    SELECT *
    FROM monitored_urls
    WHERE is_active = TRUE
    ORDER BY created_at ASC;
    `,
  );

  return result.rows.map(mapMonitoredUrl);
}

export async function getLatestCheckForUrl(monitoredUrlId: number) {
  const result = await query<{
    id: string;
    monitored_url_id: string;
    checked_at: string;
    status: CheckStatus;
    http_status: number | null;
    response_time_ms: number | null;
    ssl_valid: boolean | null;
    ssl_expires_at: string | null;
    ssl_days_remaining: number | null;
    seo_title: boolean;
    seo_description: boolean;
    seo_og_image: boolean;
    seo_canonical: boolean;
    page_speed_score: number | null;
    page_speed_category: string | null;
    error: string | null;
  }>(
    `
    SELECT *
    FROM health_checks
    WHERE monitored_url_id = $1
    ORDER BY checked_at DESC
    LIMIT 1;
    `,
    [monitoredUrlId],
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapHealthCheck(result.rows[0]);
}

export async function insertHealthCheck(input: {
  monitoredUrlId: number;
  status: CheckStatus;
  httpStatus: number | null;
  responseTimeMs: number | null;
  sslValid: boolean | null;
  sslExpiresAt: string | null;
  sslDaysRemaining: number | null;
  seoTitle: boolean;
  seoDescription: boolean;
  seoOgImage: boolean;
  seoCanonical: boolean;
  pageSpeedScore: number | null;
  pageSpeedCategory: string | null;
  error: string | null;
}) {
  const result = await query<{
    id: string;
    monitored_url_id: string;
    checked_at: string;
    status: CheckStatus;
    http_status: number | null;
    response_time_ms: number | null;
    ssl_valid: boolean | null;
    ssl_expires_at: string | null;
    ssl_days_remaining: number | null;
    seo_title: boolean;
    seo_description: boolean;
    seo_og_image: boolean;
    seo_canonical: boolean;
    page_speed_score: number | null;
    page_speed_category: string | null;
    error: string | null;
  }>(
    `
    INSERT INTO health_checks (
      monitored_url_id,
      status,
      http_status,
      response_time_ms,
      ssl_valid,
      ssl_expires_at,
      ssl_days_remaining,
      seo_title,
      seo_description,
      seo_og_image,
      seo_canonical,
      page_speed_score,
      page_speed_category,
      error,
      checked_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
    RETURNING *;
    `,
    [
      input.monitoredUrlId,
      input.status,
      input.httpStatus,
      input.responseTimeMs,
      input.sslValid,
      input.sslExpiresAt,
      input.sslDaysRemaining,
      input.seoTitle,
      input.seoDescription,
      input.seoOgImage,
      input.seoCanonical,
      input.pageSpeedScore,
      input.pageSpeedCategory,
      input.error,
    ],
  );

  await query(
    `
    UPDATE monitored_urls
    SET last_checked_at = NOW()
    WHERE id = $1;
    `,
    [input.monitoredUrlId],
  );

  return mapHealthCheck(result.rows[0]);
}

export async function upsertAlertChannels(input: {
  monitoredUrlId: number;
  email?: string | null;
  slackWebhookUrl?: string | null;
}) {
  const tasks: Array<Promise<unknown>> = [];

  if (input.email) {
    tasks.push(
      query(
        `
        INSERT INTO alert_channels (monitored_url_id, channel_type, target, enabled)
        VALUES ($1, 'email', $2, TRUE)
        ON CONFLICT (monitored_url_id, channel_type, target)
        DO UPDATE SET enabled = TRUE;
        `,
        [input.monitoredUrlId, input.email.toLowerCase()],
      ),
    );
  }

  if (input.slackWebhookUrl) {
    tasks.push(
      query(
        `
        INSERT INTO alert_channels (monitored_url_id, channel_type, target, enabled)
        VALUES ($1, 'slack', $2, TRUE)
        ON CONFLICT (monitored_url_id, channel_type, target)
        DO UPDATE SET enabled = TRUE;
        `,
        [input.monitoredUrlId, input.slackWebhookUrl],
      ),
    );
  }

  await Promise.all(tasks);

  return listAlertChannels(input.monitoredUrlId);
}

export async function listAlertChannels(monitoredUrlId: number) {
  const result = await query<{
    id: string;
    monitored_url_id: string;
    channel_type: "email" | "slack";
    target: string;
    enabled: boolean;
  }>(
    `
    SELECT id, monitored_url_id, channel_type, target, enabled
    FROM alert_channels
    WHERE monitored_url_id = $1 AND enabled = TRUE;
    `,
    [monitoredUrlId],
  );

  return result.rows.map(mapAlertChannel);
}
