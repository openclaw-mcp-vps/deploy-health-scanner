import tls from "node:tls";
import { getMonitorById, insertAlert, insertMonitorCheck, updateMonitorLatest } from "@/lib/db/queries";
import { sendEmailAlert } from "@/lib/notifications/email";
import { sendSlackAlert } from "@/lib/notifications/slack";

interface SeoSnapshot {
  title: string | null;
  description: string | null;
  canonical: string | null;
  robots: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  score: number;
}

export interface HealthCheckResult {
  url: string;
  httpStatus: number | null;
  sslExpiresAt: Date | null;
  sslDaysRemaining: number | null;
  loadTimeMs: number | null;
  seo: SeoSnapshot;
  success: boolean;
  statusLabel: "healthy" | "warning" | "critical";
  errors: string[];
}

export async function checkUrlHealth(url: string): Promise<HealthCheckResult> {
  const errors: string[] = [];
  let httpStatus: number | null = null;
  let loadTimeMs: number | null = null;
  let body = "";

  const sslInfo = await getSslInfo(url);
  if (sslInfo.error) {
    errors.push(sslInfo.error);
  }

  try {
    const started = Date.now();
    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent": "DeployHealthScannerBot/1.0 (+https://deployhealthscanner.com)",
      },
      cache: "no-store",
    });

    httpStatus = response.status;
    body = await response.text();
    loadTimeMs = Date.now() - started;
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Unable to fetch URL");
  }

  const seo = extractSeoSnapshot(body);

  if (httpStatus !== null && (httpStatus < 200 || httpStatus >= 400)) {
    errors.push(`HTTP status ${httpStatus}`);
  }

  if (loadTimeMs !== null && loadTimeMs > 4000) {
    errors.push(`Load time ${loadTimeMs}ms exceeds 4000ms threshold`);
  }

  if (seo.score < 70) {
    errors.push(`SEO score ${seo.score}/100 below threshold`);
  }

  if (sslInfo.daysRemaining !== null && sslInfo.daysRemaining <= 14) {
    errors.push(`SSL certificate expires in ${sslInfo.daysRemaining} day(s)`);
  }

  const success = errors.length === 0;
  const statusLabel: HealthCheckResult["statusLabel"] = !success
    ? httpStatus !== null && httpStatus >= 400
      ? "critical"
      : "warning"
    : "healthy";

  return {
    url,
    httpStatus,
    sslExpiresAt: sslInfo.expiresAt,
    sslDaysRemaining: sslInfo.daysRemaining,
    loadTimeMs,
    seo,
    success,
    statusLabel,
    errors,
  };
}

export async function runHealthCheckForMonitor(monitorId: string): Promise<HealthCheckResult | null> {
  const monitor = await getMonitorById(monitorId);
  if (!monitor || !monitor.is_active) {
    return null;
  }

  const result = await checkUrlHealth(monitor.url);

  await insertMonitorCheck({
    monitorId,
    httpStatus: result.httpStatus,
    sslExpiresAt: result.sslExpiresAt,
    sslDaysRemaining: result.sslDaysRemaining,
    loadTimeMs: result.loadTimeMs,
    seoScore: result.seo.score,
    seoTitle: result.seo.title,
    seoDescription: result.seo.description,
    seoCanonical: result.seo.canonical,
    seoRobots: result.seo.robots,
    seoOgTitle: result.seo.ogTitle,
    seoOgDescription: result.seo.ogDescription,
    success: result.success,
    statusLabel: result.statusLabel,
    errors: result.errors,
  });

  await updateMonitorLatest({
    monitorId,
    httpStatus: result.httpStatus,
    sslDaysRemaining: result.sslDaysRemaining,
    loadTimeMs: result.loadTimeMs,
    seoScore: result.seo.score,
    success: result.success,
  });

  const alertReason = deriveAlertReason(result, monitor.failure_count);
  if (alertReason) {
    const message = {
      url: monitor.url,
      reason: alertReason,
      status: result.statusLabel,
      details: result.errors.join(" | ") || "All checks passed",
    };

    const [emailResult, slackResult] = await Promise.all([sendEmailAlert(message), sendSlackAlert(message)]);

    if (emailResult.sent) {
      await insertAlert({
        monitorId,
        channel: "email",
        reason: alertReason,
        payload: message,
      });
    }

    if (slackResult.sent) {
      await insertAlert({
        monitorId,
        channel: "slack",
        reason: alertReason,
        payload: message,
      });
    }
  }

  return result;
}

function deriveAlertReason(result: HealthCheckResult, previousFailureCount: number): string | null {
  if (!result.success && previousFailureCount === 0) {
    return "Incident detected";
  }

  if (result.success && previousFailureCount > 0) {
    return "Service recovered";
  }

  if (result.sslDaysRemaining !== null && result.sslDaysRemaining <= 7) {
    return "SSL expiry approaching";
  }

  if (result.loadTimeMs !== null && result.loadTimeMs > 4500) {
    return "Page speed regression";
  }

  if (result.seo.score < 60) {
    return "SEO metadata regression";
  }

  return null;
}

function extractSeoSnapshot(html: string): SeoSnapshot {
  const title = extractTagContent(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = extractMetaContent(html, "description");
  const canonical = extractLinkHref(html, "canonical");
  const robots = extractMetaContent(html, "robots");
  const ogTitle = extractMetaProperty(html, "og:title");
  const ogDescription = extractMetaProperty(html, "og:description");

  let score = 0;
  if (title && title.length >= 20 && title.length <= 70) score += 30;
  if (description && description.length >= 70 && description.length <= 170) score += 20;
  if (canonical) score += 15;
  if (robots) score += 10;
  if (ogTitle) score += 15;
  if (ogDescription) score += 10;

  return {
    title,
    description,
    canonical,
    robots,
    ogTitle,
    ogDescription,
    score,
  };
}

function extractTagContent(html: string, regex: RegExp): string | null {
  const match = regex.exec(html);
  if (!match || !match[1]) {
    return null;
  }
  return normalizeSpace(stripTags(match[1])).slice(0, 220) || null;
}

function extractMetaContent(html: string, name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(
    `<meta[^>]*(?:name|property)=(["'])${escaped}\\1[^>]*content=(["'])([\\s\\S]*?)\\2[^>]*>`,
    "i"
  );
  const match = regex.exec(html);
  if (!match) {
    return null;
  }

  return normalizeSpace(match[3]).slice(0, 320) || null;
}

function extractMetaProperty(html: string, property: string): string | null {
  return extractMetaContent(html, property);
}

function extractLinkHref(html: string, relValue: string): string | null {
  const escaped = relValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`<link[^>]*rel=(["'])${escaped}\\1[^>]*href=(["'])([\\s\\S]*?)\\2[^>]*>`, "i");
  const match = regex.exec(html);
  if (!match) {
    return null;
  }

  return normalizeSpace(match[3]).slice(0, 300) || null;
}

function stripTags(input: string): string {
  return input.replace(/<[^>]+>/g, " ");
}

function normalizeSpace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

async function getSslInfo(url: string): Promise<{
  expiresAt: Date | null;
  daysRemaining: number | null;
  error: string | null;
}> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return {
      expiresAt: null,
      daysRemaining: null,
      error: "Invalid URL",
    };
  }

  if (parsed.protocol !== "https:") {
    return {
      expiresAt: null,
      daysRemaining: null,
      error: "SSL check skipped (not HTTPS)",
    };
  }

  return new Promise((resolve) => {
    const socket = tls.connect(
      {
        host: parsed.hostname,
        port: 443,
        servername: parsed.hostname,
        rejectUnauthorized: false,
      },
      () => {
        const cert = socket.getPeerCertificate();
        socket.end();

        if (!cert || !cert.valid_to) {
          resolve({
            expiresAt: null,
            daysRemaining: null,
            error: "Unable to read SSL certificate",
          });
          return;
        }

        const expiresAt = new Date(cert.valid_to);
        const daysRemaining = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

        resolve({
          expiresAt,
          daysRemaining,
          error: null,
        });
      }
    );

    socket.setTimeout(8000, () => {
      socket.destroy();
      resolve({
        expiresAt: null,
        daysRemaining: null,
        error: "SSL check timed out",
      });
    });

    socket.on("error", (error) => {
      resolve({
        expiresAt: null,
        daysRemaining: null,
        error: `SSL check failed: ${error.message}`,
      });
    });
  });
}
