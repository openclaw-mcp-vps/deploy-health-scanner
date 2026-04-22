import { NextRequest, NextResponse } from "next/server";

import {
  createMonitor,
  getOrCreateUser,
  listMonitorsForUser,
  listRecentResults,
  upsertAlertChannel,
  listAlertChannelsForUser,
  recordCheckResult
} from "@/lib/database";
import { runMonitorCheck } from "@/lib/monitoring";
import { sendAlerts } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeUrl(rawUrl: string) {
  const value = rawUrl.trim();
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return `https://${value}`;
}

function getEmailFromRequest(request: NextRequest) {
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get("email")?.trim().toLowerCase();
  const fromCookie = request.cookies.get("dhs_email")?.value?.trim().toLowerCase();

  return fromQuery || fromCookie || "";
}

export async function GET(request: NextRequest) {
  const email = getEmailFromRequest(request);

  if (!email) {
    return NextResponse.json({ error: "Missing user email." }, { status: 400 });
  }

  const monitors = await listMonitorsForUser(email);

  const monitorsWithHistory = await Promise.all(
    monitors.map(async (monitor) => {
      const history = await listRecentResults(Number(monitor.id), 24);
      return {
        ...monitor,
        id: Number(monitor.id),
        user_id: Number(monitor.user_id),
        check_interval_minutes: Number(monitor.check_interval_minutes),
        ssl_days_threshold: Number(monitor.ssl_days_threshold),
        uptime_24h:
          monitor.uptime_24h !== null ? Number(monitor.uptime_24h) : null,
        history: history.reverse().map((item) => ({
          checkedAt: item.checked_at,
          isUp: item.is_up,
          loadTimeMs: item.load_time_ms,
          status: item.http_status
        }))
      };
    })
  );

  return NextResponse.json({ monitors: monitorsWithHistory });
}

export async function POST(request: Request) {
  const body = await request.json();

  const email = (body.email || "").toString().trim().toLowerCase();
  const urlValue = (body.url || "").toString();
  const name = (body.name || "").toString();
  const alertEmail = (body.alertEmail || "").toString().trim().toLowerCase();
  const slackWebhook = (body.slackWebhook || "").toString().trim();
  const sslDaysThreshold = Number(body.sslDaysThreshold || 14);

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  if (!urlValue || !name) {
    return NextResponse.json(
      { error: "Monitor name and URL are required." },
      { status: 400 }
    );
  }

  let normalizedUrl = "";
  try {
    normalizedUrl = normalizeUrl(urlValue);
    new URL(normalizedUrl);
  } catch {
    return NextResponse.json({ error: "Invalid URL format." }, { status: 400 });
  }

  const user = await getOrCreateUser(email);

  const monitor = await createMonitor({
    userId: Number(user.id),
    name,
    url: normalizedUrl,
    sslDaysThreshold: Number.isFinite(sslDaysThreshold) ? sslDaysThreshold : 14
  });

  const notificationEmail = alertEmail || email;
  await upsertAlertChannel({
    userId: Number(user.id),
    type: "email",
    target: notificationEmail
  });

  if (slackWebhook) {
    await upsertAlertChannel({
      userId: Number(user.id),
      type: "slack",
      target: slackWebhook
    });
  }

  const initialResult = await runMonitorCheck(monitor);

  await recordCheckResult({
    monitorId: Number(monitor.id),
    httpStatus: initialResult.httpStatus,
    isUp: initialResult.isUp,
    sslValid: initialResult.sslValid,
    sslDaysRemaining: initialResult.sslDaysRemaining,
    seoTitle: initialResult.seoTitle,
    seoDescription: initialResult.seoDescription,
    loadTimeMs: initialResult.loadTimeMs,
    error: initialResult.error
  });

  const channels = await listAlertChannelsForUser(Number(user.id));
  const delivered = await sendAlerts({
    monitor,
    result: initialResult,
    channels
  });

  return NextResponse.json({
    monitor: {
      ...monitor,
      id: Number(monitor.id),
      user_id: Number(monitor.user_id)
    },
    initialResult,
    notifications: delivered
  });
}
