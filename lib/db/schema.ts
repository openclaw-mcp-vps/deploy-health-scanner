export type MonitorSource = "manual" | "vercel" | "netlify";

export interface MonitorRecord {
  id: string;
  url: string;
  source: MonitorSource;
  is_active: boolean;
  latest_status: number | null;
  latest_ssl_days_remaining: number | null;
  latest_load_time_ms: number | null;
  latest_seo_score: number | null;
  failure_count: number;
  created_at: string;
  last_checked_at: string | null;
}

export interface MonitorCheckRecord {
  id: string;
  monitor_id: string;
  checked_at: string;
  http_status: number | null;
  ssl_expires_at: string | null;
  ssl_days_remaining: number | null;
  load_time_ms: number | null;
  seo_score: number | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_canonical: string | null;
  seo_robots: string | null;
  seo_og_title: string | null;
  seo_og_description: string | null;
  success: boolean;
  status_label: string;
  error_messages: string[];
}

export const CREATE_TABLES_SQL: string[] = [
  `CREATE TABLE IF NOT EXISTS monitors (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL UNIQUE,
    source TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    latest_status INTEGER,
    latest_ssl_days_remaining INTEGER,
    latest_load_time_ms INTEGER,
    latest_seo_score INTEGER,
    failure_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_checked_at TIMESTAMPTZ
  );`,
  `CREATE TABLE IF NOT EXISTS monitor_checks (
    id TEXT PRIMARY KEY,
    monitor_id TEXT NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    http_status INTEGER,
    ssl_expires_at TIMESTAMPTZ,
    ssl_days_remaining INTEGER,
    load_time_ms INTEGER,
    seo_score INTEGER,
    seo_title TEXT,
    seo_description TEXT,
    seo_canonical TEXT,
    seo_robots TEXT,
    seo_og_title TEXT,
    seo_og_description TEXT,
    success BOOLEAN NOT NULL,
    status_label TEXT NOT NULL,
    error_messages TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]
  );`,
  `CREATE INDEX IF NOT EXISTS monitor_checks_monitor_id_checked_at_idx
    ON monitor_checks(monitor_id, checked_at DESC);`,
  `CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    plan_name TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE INDEX IF NOT EXISTS subscriptions_email_idx ON subscriptions(email);`,
  `CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    monitor_id TEXT REFERENCES monitors(id) ON DELETE CASCADE,
    channel TEXT NOT NULL,
    reason TEXT NOT NULL,
    payload JSONB NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS health_check_jobs (
    id TEXT PRIMARY KEY,
    monitor_id TEXT NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
    scheduled_for TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE INDEX IF NOT EXISTS health_check_jobs_status_sched_idx
    ON health_check_jobs(status, scheduled_for ASC);`,
  `CREATE UNIQUE INDEX IF NOT EXISTS health_check_jobs_pending_unique_idx
    ON health_check_jobs(monitor_id)
    WHERE status IN ('queued', 'running');`
];
