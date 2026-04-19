import crypto from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAccessFromCookieStore } from "@/lib/auth";
import { query } from "@/lib/db";
import { ensureSchema } from "@/lib/db/schema";
import { enqueueMonitorChecks } from "@/lib/monitoring/jobs";

export const runtime = "nodejs";

const addMonitorSchema = z.object({
  name: z.string().trim().min(2).max(120),
  url: z.string().trim().url(),
  alertEmail: z.string().trim().email().optional().or(z.literal("")),
  slackChannel: z.string().trim().max(120).optional().or(z.literal("")),
});

const deleteMonitorSchema = z.object({
  id: z.string().trim().min(10),
});

interface MonitorRow {
  id: string;
  name: string;
  url: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  checked_at: string | null;
  http_status: number | null;
  ssl_expiry: string | null;
  seo_title: string | null;
  seo_description: string | null;
  load_ms: number | null;
  ok: boolean | null;
  failure_reason: string | null;
}

interface HistoryRow {
  monitor_id: string;
  checked_at: string;
  load_ms: number | null;
}

function parseRequestAccess(request: NextRequest) {
  const access = getAccessFromCookieStore(request.cookies);
  if (!access) {
    return NextResponse.json(
      {
        error: "Paid access is required. Complete checkout, then unlock from the dashboard.",
      },
      { status: 402 }
    );
  }

  return access;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const access = parseRequestAccess(request);
  if (access instanceof NextResponse) {
    return access;
  }

  await ensureSchema();

  const monitors = await query<MonitorRow>(
    `
      SELECT m.id,
             m.name,
             m.url,
             m.active,
             m.created_at,
             m.updated_at,
             latest.checked_at,
             latest.http_status,
             latest.ssl_expiry,
             latest.seo_title,
             latest.seo_description,
             latest.load_ms,
             latest.ok,
             latest.failure_reason
      FROM monitors m
      LEFT JOIN LATERAL (
        SELECT mc.checked_at,
               mc.http_status,
               mc.ssl_expiry,
               mc.seo_title,
               mc.seo_description,
               mc.load_ms,
               mc.ok,
               mc.failure_reason
        FROM monitor_checks mc
        WHERE mc.monitor_id = m.id
        ORDER BY mc.checked_at DESC
        LIMIT 1
      ) latest ON TRUE
      WHERE m.owner_key = $1
      ORDER BY m.created_at DESC
    `,
    [access.ownerKey]
  );

  const monitorIds = monitors.rows.map((row: MonitorRow) => row.id);
  const historyMap = new Map<string, Array<{ checkedAt: string; loadMs: number | null }>>();

  if (monitorIds.length > 0) {
    const history = await query<HistoryRow>(
      `
        SELECT monitor_id, checked_at, load_ms
        FROM (
          SELECT monitor_id,
                 checked_at,
                 load_ms,
                 ROW_NUMBER() OVER (PARTITION BY monitor_id ORDER BY checked_at DESC) AS row_num
          FROM monitor_checks
          WHERE monitor_id = ANY($1::text[])
        ) checks
        WHERE checks.row_num <= 20
        ORDER BY checks.checked_at ASC
      `,
      [monitorIds]
    );

    for (const row of history.rows) {
      const existing = historyMap.get(row.monitor_id) ?? [];
      existing.push({ checkedAt: row.checked_at, loadMs: row.load_ms });
      historyMap.set(row.monitor_id, existing);
    }
  }

  return NextResponse.json({
    monitors: monitors.rows.map((row: MonitorRow) => ({
      id: row.id,
      name: row.name,
      url: row.url,
      active: row.active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      latestCheck: row.checked_at
        ? {
            checkedAt: row.checked_at,
            httpStatus: row.http_status,
            sslExpiry: row.ssl_expiry,
            seoTitle: row.seo_title,
            seoDescription: row.seo_description,
            loadMs: row.load_ms,
            ok: row.ok,
            failureReason: row.failure_reason,
          }
        : null,
      history: historyMap.get(row.id) ?? [],
    })),
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const access = parseRequestAccess(request);
  if (access instanceof NextResponse) {
    return access;
  }

  const body = await request.json().catch(() => null);
  const parsed = addMonitorSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid monitor payload.", details: parsed.error.flatten() }, { status: 400 });
  }

  const url = new URL(parsed.data.url);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return NextResponse.json({ error: "Only HTTP and HTTPS URLs are supported." }, { status: 400 });
  }

  await ensureSchema();

  const monitorCount = await query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM monitors WHERE owner_key = $1`,
    [access.ownerKey]
  );

  const currentCount = Number(monitorCount.rows[0]?.count ?? 0);
  if (access.plan === "starter" && currentCount >= 10) {
    return NextResponse.json(
      {
        error: "Starter plan supports up to 10 monitors. Upgrade to Unlimited for additional URLs.",
      },
      { status: 403 }
    );
  }

  const monitorId = crypto.randomUUID();
  await query(
    `
      INSERT INTO monitors (id, owner_key, name, url)
      VALUES ($1, $2, $3, $4)
    `,
    [monitorId, access.ownerKey, parsed.data.name, parsed.data.url]
  );

  if (parsed.data.alertEmail || parsed.data.slackChannel) {
    await query(
      `
        INSERT INTO alert_channels (owner_key, email, slack_channel)
        VALUES ($1, NULLIF($2, ''), NULLIF($3, ''))
        ON CONFLICT (owner_key)
        DO UPDATE SET
          email = COALESCE(NULLIF(EXCLUDED.email, ''), alert_channels.email),
          slack_channel = COALESCE(NULLIF(EXCLUDED.slack_channel, ''), alert_channels.slack_channel),
          updated_at = NOW()
      `,
      [access.ownerKey, parsed.data.alertEmail ?? "", parsed.data.slackChannel ?? ""]
    );
  }

  await enqueueMonitorChecks(monitorId).catch(() => {
    // Queue errors should not block monitor creation.
  });

  return NextResponse.json(
    {
      id: monitorId,
      name: parsed.data.name,
      url: parsed.data.url,
    },
    { status: 201 }
  );
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const access = parseRequestAccess(request);
  if (access instanceof NextResponse) {
    return access;
  }

  const body = await request.json().catch(() => null);
  const parsed = deleteMonitorSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Monitor id is required." }, { status: 400 });
  }

  await ensureSchema();
  const deleted = await query(
    `
      DELETE FROM monitors
      WHERE id = $1 AND owner_key = $2
    `,
    [parsed.data.id, access.ownerKey]
  );

  if (deleted.rowCount === 0) {
    return NextResponse.json({ error: "Monitor not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
