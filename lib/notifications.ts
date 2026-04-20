import axios from "axios";
import nodemailer from "nodemailer";

import type { AlertChannel, HealthCheckRecord, MonitoredUrl } from "@/lib/database";

function buildMessage(url: MonitoredUrl, check: HealthCheckRecord, previous: HealthCheckRecord | null) {
  const subject = `Deploy Health Scanner: ${check.status.toUpperCase()} on ${url.displayName || url.url}`;
  const lines = [
    `URL: ${url.url}`,
    `Status: ${check.status}`,
    `HTTP: ${check.httpStatus ?? "n/a"}`,
    `Response Time: ${check.responseTimeMs ?? "n/a"}ms`,
    `SSL Days Remaining: ${check.sslDaysRemaining ?? "n/a"}`,
    `PageSpeed: ${check.pageSpeedScore ?? "n/a"}`,
    `SEO title/meta: ${check.seoTitle && check.seoDescription ? "ok" : "missing"}`,
    previous ? `Previous Status: ${previous.status}` : "Previous Status: none",
  ];

  if (check.error) {
    lines.push(`Error: ${check.error}`);
  }

  return {
    subject,
    text: lines.join("\n"),
    markdown: `*${subject}*\n\n${lines.map((line) => `• ${line}`).join("\n")}`,
  };
}

function shouldAlert(current: HealthCheckRecord, previous: HealthCheckRecord | null) {
  if (current.status === "healthy") {
    return previous !== null && previous.status !== "healthy";
  }

  if (!previous) {
    return true;
  }

  if (previous.status === "healthy") {
    return true;
  }

  return previous.status !== current.status;
}

async function sendEmailAlert(target: string, subject: string, text: string) {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.ALERT_FROM_EMAIL || process.env.SMTP_FROM;

  if (!host || !user || !pass || !from) {
    return;
  }

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  await transport.sendMail({
    from,
    to: target,
    subject,
    text,
  });
}

async function sendSlackWebhook(target: string, markdown: string) {
  await axios.post(
    target,
    {
      text: markdown,
    },
    {
      timeout: 10000,
    },
  );
}

export async function dispatchAlerts(params: {
  monitoredUrl: MonitoredUrl;
  currentCheck: HealthCheckRecord;
  previousCheck: HealthCheckRecord | null;
  channels: AlertChannel[];
}) {
  if (!shouldAlert(params.currentCheck, params.previousCheck)) {
    return;
  }

  const { subject, text, markdown } = buildMessage(
    params.monitoredUrl,
    params.currentCheck,
    params.previousCheck,
  );

  await Promise.all(
    params.channels.map(async (channel) => {
      if (!channel.enabled) {
        return;
      }

      try {
        if (channel.channelType === "email") {
          await sendEmailAlert(channel.target, subject, text);
        }

        if (channel.channelType === "slack") {
          await sendSlackWebhook(channel.target, markdown);
        }
      } catch {
        // Alert failures should not fail the health-check pipeline.
      }
    }),
  );
}
