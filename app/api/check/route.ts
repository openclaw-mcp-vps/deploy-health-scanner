import { NextResponse } from "next/server";

import {
  getMonitorByIdForUser,
  listAlertChannelsForUser,
  recordCheckResult
} from "@/lib/database";
import { runMonitorCheck, runWebsiteCheck } from "@/lib/monitoring";
import { sendAlerts } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();

  const monitorId = Number(body.monitorId);
  const email = (body.email || "").toString().trim().toLowerCase();
  const adhocUrl = (body.url || "").toString().trim();

  if (monitorId && email) {
    const monitor = await getMonitorByIdForUser(monitorId, email);

    if (!monitor) {
      return NextResponse.json(
        { error: "Monitor not found for this account." },
        { status: 404 }
      );
    }

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

    const channels = await listAlertChannelsForUser(Number(monitor.user_id));
    const delivered = await sendAlerts({
      monitor,
      result,
      channels
    });

    return NextResponse.json({ result, notifications: delivered });
  }

  if (adhocUrl) {
    let normalizedUrl = adhocUrl;
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    try {
      new URL(normalizedUrl);
    } catch {
      return NextResponse.json({ error: "Invalid URL provided." }, { status: 400 });
    }

    const result = await runWebsiteCheck({ url: normalizedUrl });
    return NextResponse.json({ result });
  }

  return NextResponse.json(
    {
      error:
        "Provide monitorId + email for saved checks, or provide a url for one-off checks."
    },
    { status: 400 }
  );
}
