import { NextResponse } from "next/server";

import {
  listActiveMonitors,
  listAlertChannelsForUser,
  listUserEmailsByIds,
  recordCheckResult
} from "@/lib/database";
import { runMonitorCheck } from "@/lib/monitoring";
import { sendAlerts } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isCronAuthorized(request: Request) {
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    return true;
  }

  const headerToken = request.headers.get("x-cron-key");
  const authorization = request.headers.get("authorization") || "";
  const bearer = authorization.startsWith("Bearer ")
    ? authorization.replace("Bearer ", "")
    : null;

  return expected === headerToken || expected === bearer;
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const monitors = await listActiveMonitors();

  const userIds = [...new Set(monitors.map((monitor) => Number(monitor.user_id)))];
  const users = await listUserEmailsByIds(userIds);
  const userEmailMap = new Map(users.map((user) => [Number(user.id), user.email]));

  const channelCache = new Map<number, Awaited<ReturnType<typeof listAlertChannelsForUser>>>();

  let checkedCount = 0;
  let alertCount = 0;
  const failures: Array<{ monitorId: number; message: string }> = [];

  for (const monitor of monitors) {
    try {
      const result = await runMonitorCheck(monitor);

      await recordCheckResult({
        monitorId: Number(monitor.id),
        httpStatus: result.httpStatus,
        isUp: result.isUp,
        sslValid: result.sslValid,
        sslDaysRemaining: result.sslDaysRemaining,
        seoTitle: result.seoTitle,
        seoDescription: result.seoDescription,
        loadTimeMs: result.loadTimeMs,
        error: result.error
      });

      checkedCount += 1;

      if (result.alerts.length > 0) {
        const userId = Number(monitor.user_id);
        if (!channelCache.has(userId)) {
          channelCache.set(userId, await listAlertChannelsForUser(userId));
        }

        const channels = channelCache.get(userId) || [];

        await sendAlerts({
          monitor,
          result,
          channels
        });

        alertCount += 1;
      }
    } catch (error) {
      failures.push({
        monitorId: Number(monitor.id),
        message: error instanceof Error ? error.message : "Unknown cron failure"
      });
    }
  }

  return NextResponse.json({
    checkedCount,
    alertCount,
    monitorCount: monitors.length,
    userCount: userEmailMap.size,
    failures
  });
}
