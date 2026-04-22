import nodemailer from "nodemailer";
import { IncomingWebhook } from "@slack/webhook";

import type {
  AlertChannelRecord,
  MonitorRecord,
  MonitorWithLatest
} from "@/lib/database";
import type { MonitorCheckOutcome } from "@/lib/monitoring";

interface AlertPayload {
  monitor: MonitorRecord | MonitorWithLatest;
  result: MonitorCheckOutcome;
  alerts: string[];
}

function createEmailBody(payload: AlertPayload) {
  const lines = [
    `Monitor: ${payload.monitor.name}`,
    `URL: ${payload.monitor.url}`,
    `Checked at: ${new Date(payload.result.checkedAt).toUTCString()}`,
    `HTTP status: ${payload.result.httpStatus ?? "no response"}`,
    `SSL valid: ${payload.result.sslValid ? "yes" : "no"}`,
    `SSL days remaining: ${payload.result.sslDaysRemaining ?? "unknown"}`,
    `SEO title tag present: ${payload.result.seoTitle ? "yes" : "no"}`,
    `SEO description present: ${payload.result.seoDescription ? "yes" : "no"}`,
    `Load time: ${payload.result.loadTimeMs ?? "unknown"} ms`
  ];

  if (payload.result.error) {
    lines.push(`Error: ${payload.result.error}`);
  }

  lines.push("", "Triggered alerts:");

  for (const alert of payload.alerts) {
    lines.push(`- ${alert}`);
  }

  return lines.join("\n");
}

function createSlackBody(payload: AlertPayload) {
  const alertBullets = payload.alerts.map((alert) => `• ${alert}`).join("\n");

  return {
    text: `Deploy Health Scanner alert for ${payload.monitor.name}`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `Deploy Health Scanner Alert`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Monitor:* ${payload.monitor.name}\n*URL:* ${payload.monitor.url}\n*HTTP:* ${payload.result.httpStatus ?? "no response"}\n*Load:* ${payload.result.loadTimeMs ?? "n/a"} ms`
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Issues*\n${alertBullets}`
        }
      }
    ]
  };
}

async function sendEmailAlert(targetEmail: string, payload: AlertPayload) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT ?? "587");
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const from = process.env.ALERT_FROM_EMAIL || "alerts@deployhealthscanner.dev";

  if (!smtpHost || !smtpUser || !smtpPass) {
    return {
      delivered: false,
      reason:
        "SMTP credentials are missing. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS."
    };
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });

  await transporter.sendMail({
    from,
    to: targetEmail,
    subject: `Deploy Health Scanner alert: ${payload.monitor.name}`,
    text: createEmailBody(payload)
  });

  return { delivered: true };
}

async function sendSlackAlert(webhookUrl: string, payload: AlertPayload) {
  const webhook = new IncomingWebhook(webhookUrl);
  await webhook.send(createSlackBody(payload));
  return { delivered: true };
}

export async function sendAlerts(params: {
  monitor: MonitorRecord | MonitorWithLatest;
  result: MonitorCheckOutcome;
  channels: AlertChannelRecord[];
}) {
  if (params.result.alerts.length === 0) {
    return [];
  }

  const payload: AlertPayload = {
    monitor: params.monitor,
    result: params.result,
    alerts: params.result.alerts
  };

  const results: Array<{ type: string; target: string; delivered: boolean; reason?: string }> = [];

  for (const channel of params.channels) {
    try {
      if (channel.type === "email") {
        const emailResult = await sendEmailAlert(channel.target, payload);
        results.push({
          type: channel.type,
          target: channel.target,
          delivered: emailResult.delivered,
          reason: emailResult.reason
        });
      } else if (channel.type === "slack") {
        await sendSlackAlert(channel.target, payload);
        results.push({
          type: channel.type,
          target: channel.target,
          delivered: true
        });
      }
    } catch (channelError) {
      const reason =
        channelError instanceof Error ? channelError.message : "Unknown notification error";
      results.push({
        type: channel.type,
        target: channel.target,
        delivered: false,
        reason
      });
    }
  }

  return results;
}
