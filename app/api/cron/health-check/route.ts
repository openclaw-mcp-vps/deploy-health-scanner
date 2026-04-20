import { NextResponse } from "next/server";

import {
  getLatestCheckForUrl,
  insertHealthCheck,
  listActiveMonitoredUrls,
  listAlertChannels,
} from "@/lib/database";
import { runHealthCheck } from "@/lib/health-checker";
import { dispatchAlerts } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BATCH_SIZE = 5;

function isAuthorizedCron(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return true;
  }

  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  return token === secret;
}

async function processUrl(url: Awaited<ReturnType<typeof listActiveMonitoredUrls>>[number]) {
  const previousCheck = await getLatestCheckForUrl(url.id);
  const checkResult = await runHealthCheck(url.url);

  const currentCheck = await insertHealthCheck({
    monitoredUrlId: url.id,
    status: checkResult.status,
    httpStatus: checkResult.httpStatus,
    responseTimeMs: checkResult.responseTimeMs,
    sslValid: checkResult.sslValid,
    sslExpiresAt: checkResult.sslExpiresAt,
    sslDaysRemaining: checkResult.sslDaysRemaining,
    seoTitle: checkResult.seoTitle,
    seoDescription: checkResult.seoDescription,
    seoOgImage: checkResult.seoOgImage,
    seoCanonical: checkResult.seoCanonical,
    pageSpeedScore: checkResult.pageSpeedScore,
    pageSpeedCategory: checkResult.pageSpeedCategory,
    error: checkResult.error,
  });

  const channels = await listAlertChannels(url.id);
  await dispatchAlerts({
    monitoredUrl: url,
    currentCheck,
    previousCheck,
    channels,
  });

  return {
    urlId: url.id,
    status: currentCheck.status,
  };
}

async function runCron(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized cron request." }, { status: 401 });
  }

  try {
    const activeUrls = await listActiveMonitoredUrls();
    const results: Array<{ urlId: number; status: "healthy" | "warning" | "critical" }> = [];

    for (let index = 0; index < activeUrls.length; index += BATCH_SIZE) {
      const batch = activeUrls.slice(index, index + BATCH_SIZE);
      const batchResults = await Promise.all(batch.map((item) => processUrl(item)));
      results.push(...batchResults);
    }

    const summary = results.reduce(
      (acc, item) => {
        acc.total += 1;
        acc[item.status] += 1;
        return acc;
      },
      {
        total: 0,
        healthy: 0,
        warning: 0,
        critical: 0,
      },
    );

    return NextResponse.json({
      ok: true,
      ...summary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cron execution failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return runCron(request);
}

export async function POST(request: Request) {
  return runCron(request);
}
