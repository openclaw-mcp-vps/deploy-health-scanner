import { WebClient } from "@slack/web-api";
import { Resend } from "resend";

import { query } from "@/lib/db";
import type { MonitorCheckResult } from "@/lib/monitoring/checker";

interface AlertContext {
  monitorId: string;
  monitorName: string;
  monitorUrl: string;
  ownerKey: string;
  result: MonitorCheckResult;
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const slack = process.env.SLACK_BOT_TOKEN ? new WebClient(process.env.SLACK_BOT_TOKEN) : null;

function shouldAlert(result: MonitorCheckResult): boolean {
  if (!result.ok) {
    return true;
  }

  if (result.loadMs && result.loadMs > 3_000) {
    return true;
  }

  if (result.sslExpiry) {
    const daysLeft = Math.floor((new Date(result.sslExpiry).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    if (daysLeft <= 14) {
      return true;
    }
  }

  return false;
}

function formatAlertMessage(input: AlertContext): string {
  const { result } = input;
  const lines = [
    `Monitor: ${input.monitorName}`,
    `URL: ${input.monitorUrl}`,
    `Checked: ${result.checkedAt}`,
    `Status: ${result.httpStatus ?? "n/a"}`,
    `Load: ${result.loadMs ?? "n/a"}ms`,
    `SSL: ${result.sslExpiry ?? "n/a"}`,
    `SEO Title: ${result.seoTitle ?? "missing"}`,
    `SEO Description: ${result.seoDescription ?? "missing"}`,
    `Issue: ${result.failureReason ?? "degraded health signal"}`,
  ];

  return lines.join("\n");
}

async function resolveNotificationTargets(ownerKey: string): Promise<{ email: string | null; slackChannel: string | null }> {
  const result = await query<{ email: string | null; slack_channel: string | null; subscription_email: string | null }>(
    `
      SELECT ac.email,
             ac.slack_channel,
             s.email AS subscription_email
      FROM subscriptions s
      LEFT JOIN alert_channels ac ON ac.owner_key = s.owner_key
      WHERE s.owner_key = $1
      LIMIT 1
    `,
    [ownerKey]
  );

  const row = result.rows[0];

  return {
    email: row?.email ?? row?.subscription_email ?? null,
    slackChannel: row?.slack_channel ?? process.env.SLACK_CHANNEL ?? null,
  };
}

export async function sendAlertsForCheck(context: AlertContext): Promise<void> {
  if (!shouldAlert(context.result)) {
    return;
  }

  const targets = await resolveNotificationTargets(context.ownerKey);
  const message = formatAlertMessage(context);

  const sendTasks: Promise<unknown>[] = [];

  if (resend && targets.email) {
    sendTasks.push(
      resend.emails.send({
        from: process.env.ALERT_FROM_EMAIL ?? "alerts@deployhealthscanner.com",
        to: [targets.email],
        subject: `Deploy Health Scanner alert: ${context.monitorName}`,
        text: message,
      })
    );
  }

  if (slack && targets.slackChannel) {
    sendTasks.push(
      slack.chat.postMessage({
        channel: targets.slackChannel,
        text: `Deploy Health Scanner alert for ${context.monitorName}`,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Deploy Health Scanner alert*\n\`${context.monitorName}\`\n${context.monitorUrl}`,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Status:* ${context.result.httpStatus ?? "n/a"}\n*Load:* ${context.result.loadMs ?? "n/a"}ms\n*Issue:* ${
                context.result.failureReason ?? "degraded health signal"
              }`,
            },
          },
        ],
      })
    );
  }

  if (sendTasks.length > 0) {
    await Promise.allSettled(sendTasks);
  }
}
