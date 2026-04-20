import { NextResponse } from "next/server";

import { ACCESS_COOKIE_NAME, verifyAccessToken } from "@/lib/auth";
import {
  countMonitoredUrlsForOwner,
  createOrActivateMonitoredUrl,
  getLatestCheckForUrl,
  getSubscriptionByEmail,
  insertHealthCheck,
  listAlertChannels,
  listMonitoredUrlsForOwner,
  listRecentChecksForOwner,
  upsertAlertChannels,
} from "@/lib/database";
import { runHealthCheck, normalizeMonitoringUrl } from "@/lib/health-checker";
import { dispatchAlerts } from "@/lib/notifications";
import { getUrlLimitForSubscription, isSubscriptionActive } from "@/lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getAuthenticatedEmail(request: Request) {
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${ACCESS_COOKIE_NAME}=`))
    ?.split("=")
    .slice(1)
    .join("=");

  const payload = verifyAccessToken(token);
  return payload?.email ?? null;
}

function normalizeOptional(input?: string) {
  const value = input?.trim();
  return value ? value : null;
}

function isValidEmail(value: string | null) {
  if (!value) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidSlackWebhook(value: string | null) {
  if (!value) {
    return true;
  }

  return /^https:\/\/.+/.test(value);
}

export async function GET(request: Request) {
  try {
    const email = getAuthenticatedEmail(request);
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await getSubscriptionByEmail(email);
    if (!isSubscriptionActive(subscription)) {
      return NextResponse.json({ error: "Subscription inactive" }, { status: 402 });
    }

    const [urls, checks] = await Promise.all([
      listMonitoredUrlsForOwner(email),
      listRecentChecksForOwner(email),
    ]);

    const checksByUrl = new Map<number, Array<{
      id: number;
      checkedAt: string;
      status: "healthy" | "warning" | "critical";
      httpStatus: number | null;
      responseTimeMs: number | null;
      pageSpeedScore: number | null;
    }>>();

    for (const check of checks) {
      if (!checksByUrl.has(check.monitoredUrlId)) {
        checksByUrl.set(check.monitoredUrlId, []);
      }

      checksByUrl.get(check.monitoredUrlId)?.push({
        id: check.id,
        checkedAt: check.checkedAt,
        status: check.status,
        httpStatus: check.httpStatus,
        responseTimeMs: check.responseTimeMs,
        pageSpeedScore: check.pageSpeedScore,
      });
    }

    const payload = urls.map((url) => ({
      id: url.id,
      url: url.url,
      displayName: url.displayName,
      createdAt: url.createdAt,
      lastCheckedAt: url.lastCheckedAt,
      latest: url.latest,
      history: checksByUrl.get(url.id) || [],
    }));

    return NextResponse.json({ urls: payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch checks.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const email = getAuthenticatedEmail(request);
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscription = await getSubscriptionByEmail(email);
    if (!isSubscriptionActive(subscription)) {
      return NextResponse.json({ error: "Subscription inactive" }, { status: 402 });
    }

    const body = (await request.json()) as {
      url?: string;
      displayName?: string;
      alertEmail?: string;
      slackWebhookUrl?: string;
    };

    const rawUrl = body.url?.trim();
    if (!rawUrl) {
      return NextResponse.json({ error: "URL is required." }, { status: 400 });
    }

    const normalizedUrl = normalizeMonitoringUrl(rawUrl);
    const alertEmail = normalizeOptional(body.alertEmail);
    const slackWebhookUrl = normalizeOptional(body.slackWebhookUrl);

    if (!isValidEmail(alertEmail)) {
      return NextResponse.json({ error: "Alert email is invalid." }, { status: 400 });
    }

    if (!isValidSlackWebhook(slackWebhookUrl)) {
      return NextResponse.json({ error: "Slack webhook must be a valid https URL." }, { status: 400 });
    }

    const urlLimit = getUrlLimitForSubscription(subscription);
    const currentUrlCount = await countMonitoredUrlsForOwner(email);
    const existingUrls = await listMonitoredUrlsForOwner(email);
    const alreadyExists = existingUrls.some((item) => item.url === normalizedUrl);

    if (urlLimit !== null && !alreadyExists && currentUrlCount >= urlLimit) {
      return NextResponse.json(
        {
          error: `This plan supports up to ${urlLimit} monitored URLs. Upgrade to unlimited for more projects.`,
        },
        { status: 403 },
      );
    }

    const monitoredUrl = await createOrActivateMonitoredUrl({
      ownerEmail: email,
      url: normalizedUrl,
      displayName: normalizeOptional(body.displayName),
    });

    await upsertAlertChannels({
      monitoredUrlId: monitoredUrl.id,
      email: alertEmail,
      slackWebhookUrl,
    });

    const previousCheck = await getLatestCheckForUrl(monitoredUrl.id);
    const checkResult = await runHealthCheck(monitoredUrl.url);
    const currentCheck = await insertHealthCheck({
      monitoredUrlId: monitoredUrl.id,
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

    const channels = await listAlertChannels(monitoredUrl.id);
    await dispatchAlerts({
      monitoredUrl,
      currentCheck,
      previousCheck,
      channels,
    });

    return NextResponse.json({
      monitoredUrl,
      check: currentCheck,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create check.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
