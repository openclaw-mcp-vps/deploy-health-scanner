import { NextResponse } from "next/server";
import axios from "axios";

import { ACCESS_COOKIE_NAME, verifyAccessToken } from "@/lib/auth";
import {
  countMonitoredUrlsForOwner,
  createOrActivateMonitoredUrl,
  getSubscriptionByEmail,
  insertHealthCheck,
  listMonitoredUrlsForOwner,
} from "@/lib/database";
import { runHealthCheck } from "@/lib/health-checker";
import { getUrlLimitForSubscription, isSubscriptionActive } from "@/lib/plans";

export const runtime = "nodejs";

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

function normalizeExternalUrl(value: string) {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return `https://${value}`;
}

async function fetchVercelUrls(token: string) {
  const headers = {
    Authorization: `Bearer ${token}`,
  };

  const projectsResponse = await axios.get("https://api.vercel.com/v9/projects?limit=20", {
    headers,
    timeout: 15000,
  });

  const projects = projectsResponse.data?.projects as Array<{ id?: string }> | undefined;
  if (!projects || projects.length === 0) {
    return [];
  }

  const deploymentResponses = await Promise.all(
    projects
      .slice(0, 20)
      .filter((project) => project.id)
      .map(async (project) => {
        try {
          const deployment = await axios.get(
            `https://api.vercel.com/v13/deployments?projectId=${project.id}&state=READY&limit=1`,
            {
              headers,
              timeout: 15000,
            },
          );

          const item = deployment.data?.deployments?.[0];
          const alias = item?.alias?.[0];
          const rawUrl = alias || item?.url;

          if (!rawUrl || typeof rawUrl !== "string") {
            return null;
          }

          return normalizeExternalUrl(rawUrl);
        } catch {
          return null;
        }
      }),
  );

  return deploymentResponses.filter((value): value is string => Boolean(value));
}

async function fetchNetlifyUrls(token: string) {
  const response = await axios.get("https://api.netlify.com/api/v1/sites", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    timeout: 15000,
  });

  const sites = response.data as Array<{ ssl_url?: string; url?: string }>;

  return sites
    .map((site) => site.ssl_url || site.url || null)
    .filter((value): value is string => Boolean(value));
}

async function runInitialChecks(monitoredUrlIds: Array<{ id: number; url: string }>) {
  const chunk = monitoredUrlIds.slice(0, 10);

  await Promise.all(
    chunk.map(async (item) => {
      const result = await runHealthCheck(item.url);
      await insertHealthCheck({
        monitoredUrlId: item.id,
        status: result.status,
        httpStatus: result.httpStatus,
        responseTimeMs: result.responseTimeMs,
        sslValid: result.sslValid,
        sslExpiresAt: result.sslExpiresAt,
        sslDaysRemaining: result.sslDaysRemaining,
        seoTitle: result.seoTitle,
        seoDescription: result.seoDescription,
        seoOgImage: result.seoOgImage,
        seoCanonical: result.seoCanonical,
        pageSpeedScore: result.pageSpeedScore,
        pageSpeedCategory: result.pageSpeedCategory,
        error: result.error,
      });
    }),
  );
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
      provider?: "vercel" | "netlify";
      token?: string;
    };

    const provider = body.provider;
    const token = body.token?.trim();

    if (!provider || !["vercel", "netlify"].includes(provider)) {
      return NextResponse.json({ error: "Provider must be vercel or netlify." }, { status: 400 });
    }

    if (!token) {
      return NextResponse.json({ error: "API token is required." }, { status: 400 });
    }

    const importedRawUrls = provider === "vercel" ? await fetchVercelUrls(token) : await fetchNetlifyUrls(token);
    const uniqueUrls = [...new Set(importedRawUrls.map((item) => normalizeExternalUrl(item)))]
      .filter((item) => item.startsWith("http://") || item.startsWith("https://"));

    if (uniqueUrls.length === 0) {
      return NextResponse.json({
        imported: 0,
        skipped: 0,
        totalDiscovered: 0,
      });
    }

    const [existingUrls, currentCount] = await Promise.all([
      listMonitoredUrlsForOwner(email),
      countMonitoredUrlsForOwner(email),
    ]);

    const existingSet = new Set(existingUrls.map((item) => item.url));
    const candidates = uniqueUrls.filter((url) => !existingSet.has(url));

    const urlLimit = getUrlLimitForSubscription(subscription);
    const availableSlots = urlLimit === null ? candidates.length : Math.max(0, urlLimit - currentCount);

    if (availableSlots === 0 && candidates.length > 0) {
      return NextResponse.json(
        {
          error: `You reached your ${urlLimit}-URL limit. Upgrade to import more projects.`,
        },
        { status: 403 },
      );
    }

    const urlsToCreate = candidates.slice(0, availableSlots);

    const created = await Promise.all(
      urlsToCreate.map((url) =>
        createOrActivateMonitoredUrl({
          ownerEmail: email,
          url,
          displayName: provider === "vercel" ? "Vercel project" : "Netlify site",
        }),
      ),
    );

    await runInitialChecks(created.map((item) => ({ id: item.id, url: item.url })));

    return NextResponse.json({
      imported: created.length,
      skipped: uniqueUrls.length - created.length,
      totalDiscovered: uniqueUrls.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
