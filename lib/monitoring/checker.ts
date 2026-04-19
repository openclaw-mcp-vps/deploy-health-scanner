import { performance } from "node:perf_hooks";
import tls from "node:tls";

import axios from "axios";
import { load as loadHtml } from "cheerio";

export interface MonitorCheckResult {
  checkedAt: string;
  ok: boolean;
  httpStatus: number | null;
  sslExpiry: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  loadMs: number | null;
  failureReason: string | null;
}

const REQUEST_TIMEOUT_MS = 20_000;
const SSL_WARNING_DAYS = 14;

async function fetchSslExpiry(targetUrl: string): Promise<string | null> {
  const url = new URL(targetUrl);

  if (url.protocol !== "https:") {
    return null;
  }

  return new Promise((resolve) => {
    const socket = tls.connect(
      {
        host: url.hostname,
        port: Number(url.port || 443),
        servername: url.hostname,
        rejectUnauthorized: false,
        timeout: 8_000,
      },
      () => {
        const cert = socket.getPeerCertificate();
        socket.end();

        if (!cert || !cert.valid_to) {
          resolve(null);
          return;
        }

        const parsed = new Date(cert.valid_to);
        resolve(Number.isNaN(parsed.getTime()) ? null : parsed.toISOString());
      }
    );

    socket.on("timeout", () => {
      socket.destroy();
      resolve(null);
    });

    socket.on("error", () => {
      resolve(null);
    });
  });
}

function getDaysUntil(dateIso: string | null): number | null {
  if (!dateIso) {
    return null;
  }

  const value = new Date(dateIso).getTime();
  if (Number.isNaN(value)) {
    return null;
  }

  return Math.floor((value - Date.now()) / (24 * 60 * 60 * 1000));
}

export async function runMonitorCheck(url: string): Promise<MonitorCheckResult> {
  const started = performance.now();

  try {
    const [response, sslExpiry] = await Promise.all([
      axios.get<string>(url, {
        timeout: REQUEST_TIMEOUT_MS,
        maxRedirects: 5,
        validateStatus: () => true,
        responseType: "text",
        headers: {
          "User-Agent": "DeployHealthScanner/1.0 (+https://deployhealthscanner.com)",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      }),
      fetchSslExpiry(url),
    ]);

    const completed = performance.now();
    const loadMs = Math.round(completed - started);

    let seoTitle: string | null = null;
    let seoDescription: string | null = null;
    const contentTypeHeader = response.headers["content-type"];
    const contentType =
      typeof contentTypeHeader === "string"
        ? contentTypeHeader
        : Array.isArray(contentTypeHeader)
          ? contentTypeHeader.join(";")
          : "";

    if (typeof response.data === "string" && contentType.includes("text/html")) {
      const $ = loadHtml(response.data);
      seoTitle = ($("title").first().text() || null)?.trim() ?? null;
      seoDescription =
        ($("meta[name='description']").attr("content") || $("meta[property='og:description']").attr("content") || null)?.trim() ??
        null;
    }

    const sslDaysLeft = getDaysUntil(sslExpiry);
    const sslExpiredOrNearExpiry = sslDaysLeft !== null && sslDaysLeft <= SSL_WARNING_DAYS;
    const statusOk = response.status >= 200 && response.status < 400;
    const speedOk = loadMs < 3_000;
    const metaOk = Boolean(seoTitle && seoDescription);

    let failureReason: string | null = null;
    if (!statusOk) {
      failureReason = `HTTP status ${response.status}`;
    } else if (sslExpiredOrNearExpiry) {
      failureReason = `SSL expires in ${sslDaysLeft} days`;
    } else if (!metaOk) {
      failureReason = "Missing SEO title or description";
    } else if (!speedOk) {
      failureReason = `Page load time ${loadMs}ms exceeds threshold`;
    }

    return {
      checkedAt: new Date().toISOString(),
      ok: statusOk && !sslExpiredOrNearExpiry && metaOk && speedOk,
      httpStatus: response.status,
      sslExpiry,
      seoTitle,
      seoDescription,
      loadMs,
      failureReason,
    };
  } catch (error) {
    const completed = performance.now();
    const loadMs = Math.round(completed - started);

    const failureReason = error instanceof Error ? error.message : "Unknown request error";

    return {
      checkedAt: new Date().toISOString(),
      ok: false,
      httpStatus: null,
      sslExpiry: null,
      seoTitle: null,
      seoDescription: null,
      loadMs,
      failureReason,
    };
  }
}
