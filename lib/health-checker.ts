import axios from "axios";
import { load } from "cheerio";
import sslChecker from "ssl-checker";

import type { CheckStatus } from "@/lib/database";

export type HealthCheckResult = {
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

function normalizeUrl(input: string) {
  const value = input.trim();
  if (!value) {
    throw new Error("URL is required.");
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return `https://${value}`;
}

function classifyStatus(result: Omit<HealthCheckResult, "status">): CheckStatus {
  if (result.error) {
    return "critical";
  }

  if ((result.httpStatus ?? 0) >= 500 || result.sslDaysRemaining !== null && result.sslDaysRemaining < 7) {
    return "critical";
  }

  if (
    (result.httpStatus ?? 0) >= 400 ||
    (result.sslDaysRemaining !== null && result.sslDaysRemaining < 30) ||
    !result.seoTitle ||
    !result.seoDescription ||
    (result.pageSpeedScore !== null && result.pageSpeedScore < 70)
  ) {
    return "warning";
  }

  return "healthy";
}

async function runHttpCheck(url: string) {
  const start = Date.now();
  const response = await axios.get(url, {
    timeout: 15000,
    maxRedirects: 5,
    validateStatus: () => true,
  });

  return {
    httpStatus: response.status,
    responseTimeMs: Date.now() - start,
    body: typeof response.data === "string" ? response.data : "",
  };
}

async function runSslCheck(url: string) {
  const hostname = new URL(url).hostname;
  const sslData = await sslChecker(hostname, {
    method: "GET",
    port: 443,
  });

  const expiresAt = (sslData as { validTo?: string }).validTo
    ? new Date((sslData as { validTo: string }).validTo).toISOString()
    : null;

  return {
    sslValid: typeof sslData.valid === "boolean" ? sslData.valid : null,
    sslExpiresAt: expiresAt,
    sslDaysRemaining: typeof sslData.daysRemaining === "number" ? Math.round(sslData.daysRemaining) : null,
  };
}

function runSeoCheck(html: string) {
  const $ = load(html);
  const title = $("head title").text().trim();
  const description = $('meta[name="description"]').attr("content")?.trim() ?? "";
  const ogImage = $('meta[property="og:image"]').attr("content")?.trim() ?? "";
  const canonical = $('link[rel="canonical"]').attr("href")?.trim() ?? "";

  return {
    seoTitle: title.length > 0,
    seoDescription: description.length > 0,
    seoOgImage: ogImage.length > 0,
    seoCanonical: canonical.length > 0,
  };
}

function derivePageSpeedCategory(score: number | null) {
  if (score === null) {
    return null;
  }

  if (score >= 90) {
    return "good";
  }

  if (score >= 50) {
    return "needs-improvement";
  }

  return "poor";
}

async function runPerformanceCheck(url: string, responseTimeMs: number | null) {
  try {
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&category=performance`;
    const response = await axios.get(apiUrl, { timeout: 25000 });
    const rawScore = response.data?.lighthouseResult?.categories?.performance?.score;

    if (typeof rawScore === "number") {
      const score = Math.round(rawScore * 100);
      return {
        pageSpeedScore: score,
        pageSpeedCategory: derivePageSpeedCategory(score),
      };
    }
  } catch {
    // Fall through to heuristic score.
  }

  if (responseTimeMs === null) {
    return {
      pageSpeedScore: null,
      pageSpeedCategory: null,
    };
  }

  const heuristic = Math.max(15, Math.min(98, 100 - Math.round(responseTimeMs / 50)));
  return {
    pageSpeedScore: heuristic,
    pageSpeedCategory: derivePageSpeedCategory(heuristic),
  };
}

export async function runHealthCheck(rawUrl: string): Promise<HealthCheckResult> {
  const url = normalizeUrl(rawUrl);

  try {
    const http = await runHttpCheck(url);

    const [ssl, performance] = await Promise.all([
      runSslCheck(url).catch(() => ({
        sslValid: null,
        sslExpiresAt: null,
        sslDaysRemaining: null,
      })),
      runPerformanceCheck(url, http.responseTimeMs),
    ]);

    const seo = runSeoCheck(http.body);

    const partial: Omit<HealthCheckResult, "status"> = {
      httpStatus: http.httpStatus,
      responseTimeMs: http.responseTimeMs,
      sslValid: ssl.sslValid,
      sslExpiresAt: ssl.sslExpiresAt,
      sslDaysRemaining: ssl.sslDaysRemaining,
      seoTitle: seo.seoTitle,
      seoDescription: seo.seoDescription,
      seoOgImage: seo.seoOgImage,
      seoCanonical: seo.seoCanonical,
      pageSpeedScore: performance.pageSpeedScore,
      pageSpeedCategory: performance.pageSpeedCategory,
      error: null,
    };

    return {
      ...partial,
      status: classifyStatus(partial),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected health check failure.";

    const partial: Omit<HealthCheckResult, "status"> = {
      httpStatus: null,
      responseTimeMs: null,
      sslValid: null,
      sslExpiresAt: null,
      sslDaysRemaining: null,
      seoTitle: false,
      seoDescription: false,
      seoOgImage: false,
      seoCanonical: false,
      pageSpeedScore: null,
      pageSpeedCategory: null,
      error: message,
    };

    return {
      ...partial,
      status: "critical",
    };
  }
}

export function normalizeMonitoringUrl(rawUrl: string) {
  return normalizeUrl(rawUrl);
}
