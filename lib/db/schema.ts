import { query } from "@/lib/db";

export type SubscriptionPlan = "starter" | "unlimited";
export type SubscriptionStatus = "pending" | "active" | "cancelled" | "expired";

export interface MonitorRecord {
  id: string;
  owner_key: string;
  name: string;
  url: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

let schemaReady = false;

export async function ensureSchema(): Promise<void> {
  if (schemaReady) {
    return;
  }

  await query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      email TEXT PRIMARY KEY,
      owner_key TEXT,
      plan TEXT NOT NULL DEFAULT 'starter',
      status TEXT NOT NULL DEFAULT 'pending',
      lemonsqueezy_customer_id TEXT,
      lemonsqueezy_order_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (plan IN ('starter', 'unlimited')),
      CHECK (status IN ('pending', 'active', 'cancelled', 'expired'))
    );

    CREATE TABLE IF NOT EXISTS monitors (
      id TEXT PRIMARY KEY,
      owner_key TEXT NOT NULL,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS monitor_checks (
      id BIGSERIAL PRIMARY KEY,
      monitor_id TEXT NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
      checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      http_status INTEGER,
      ssl_expiry TIMESTAMPTZ,
      seo_title TEXT,
      seo_description TEXT,
      load_ms INTEGER,
      ok BOOLEAN NOT NULL DEFAULT FALSE,
      failure_reason TEXT
    );

    CREATE TABLE IF NOT EXISTS alert_channels (
      owner_key TEXT PRIMARY KEY,
      email TEXT,
      slack_channel TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_monitors_owner_key ON monitors(owner_key);
    CREATE INDEX IF NOT EXISTS idx_checks_monitor_id_checked_at ON monitor_checks(monitor_id, checked_at DESC);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_owner_key ON subscriptions(owner_key);
  `);

  schemaReady = true;
}
