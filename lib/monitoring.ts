import axios from "axios";
import * as cheerio from "cheerio";
import sslChecker from "ssl-checker";

import type { MonitorRecord } from "@/lib/database";

const REQUEST_TIMEOUT_MS = 20000;
const SLOW_PAGE_THRESHOLD_MS = 3500;

export interface MonitorCheckOutcome {
  checkedAt: string;
  httpStatus: number | null;
  isUp: boolean;
  sslValid: boolean;
  sslDaysRemaining: number | null;
  seoTitle: boolean;
  seoDescription: boolean;
  loadTimeMs: number | null;
  error: string | null;
  alerts: string[];
}

function normalizeUrl(rawUrl: string) {
  if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
    return rawUrl;
  }

  return `https://${rawUrl}`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}

function checkSeo(html: string) {
  const $ = cheerio.load(html);

  const title = $("head title").text().trim();
  const description = $("meta[name='description']").attr("content")?.trim() || "";

  return {
    hasTitle: title.length > 0,
    hasDescription: description.length > 0
  };
}

async function checkSslCertificate(url: string) {
  const hostname = new URL(url).hostname;

  const sslResult = await sslChecker(hostname, {
    method: "GET",
    port: 443
  });

  const valid = typeof sslResult.valid === "boolean" ? sslResult.valid : true;
  const daysRemaining =
    typeof sslResult.daysRemaining === "number" ? sslResult.daysRemaining : null;

  return {
    valid,
    daysRemaining
  };
}

export async function runWebsiteCheck(params: {
  url: string;
  sslDaysThreshold?: number;
}): Promise<MonitorCheckOutcome> {
  const checkedAt = new Date().toISOString();
  const normalizedUrl = normalizeUrl(params.url);
  const sslDaysThreshold = params.sslDaysThreshold ?? 14;

  let httpStatus: number | null = null;
  let isUp = false;
  let sslValid = false;
  let sslDaysRemaining: number | null = null;
  let seoTitle = false;
  let seoDescription = false;
  let loadTimeMs: number | null = null;
  let error: string | null = null;
  let html = "";

  const startedAt = Date.now();

  try {
    const response = await axios.get(normalizedUrl, {
      timeout: REQUEST_TIMEOUT_MS,
      responseType: "text",
      maxRedirects: 5,
      validateStatus: () => true,
      headers: {
        "User-Agent": "DeployHealthScannerBot/1.0 (+https://deployhealthscanner.dev)"
      }
    });

    httpStatus = response.status;
    isUp = response.status >= 200 && response.status < 400;
    loadTimeMs = Date.now() - startedAt;
    html = typeof response.data === "string" ? response.data : "";
  } catch (requestError) {
    loadTimeMs = Date.now() - startedAt;
    error = `HTTP check failed: ${getErrorMessage(requestError)}`;
  }

  if (html) {
    const seo = checkSeo(html);
    seoTitle = seo.hasTitle;
    seoDescription = seo.hasDescription;
  }

  try {
    const ssl = await checkSslCertificate(normalizedUrl);
    sslValid = ssl.valid;
    sslDaysRemaining = ssl.daysRemaining;
  } catch (sslError) {
    sslValid = false;
    if (!error) {
      error = `SSL check failed: ${getErrorMessage(sslError)}`;
    } else {
      error = `${error} | SSL check failed: ${getErrorMessage(sslError)}`;
    }
  }

  const alerts: string[] = [];

  if (!isUp) {
    alerts.push(`Site is down or returning a bad status (${httpStatus ?? "no response"}).`);
  }

  if (!sslValid) {
    alerts.push("SSL certificate is invalid or unavailable.");
  }

  if (sslDaysRemaining !== null && sslDaysRemaining <= sslDaysThreshold) {
    alerts.push(
      `SSL certificate expires in ${sslDaysRemaining} day${sslDaysRemaining === 1 ? "" : "s"}.`
    );
  }

  if (!seoTitle) {
    alerts.push("Missing SEO title tag.");
  }

  if (!seoDescription) {
    alerts.push("Missing SEO meta description.");
  }

  if (loadTimeMs !== null && loadTimeMs >= SLOW_PAGE_THRESHOLD_MS) {
    alerts.push(`Page is slow (${loadTimeMs} ms).`);
  }

  return {
    checkedAt,
    httpStatus,
    isUp,
    sslValid,
    sslDaysRemaining,
    seoTitle,
    seoDescription,
    loadTimeMs,
    error,
    alerts
  };
}

export async function runMonitorCheck(monitor: MonitorRecord) {
  return runWebsiteCheck({
    url: monitor.url,
    sslDaysThreshold: monitor.ssl_days_threshold
  });
}
