import type { AlertMessage } from "@/lib/notifications/email";

export async function sendSlackAlert(message: AlertMessage): Promise<{ sent: boolean; reason?: string }> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    return { sent: false, reason: "Missing SLACK_WEBHOOK_URL" };
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: `Deploy Health Scanner alert: ${message.reason}`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${message.reason}*\n*URL:* ${message.url}\n*Status:* ${message.status}\n*Details:* ${message.details}`,
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return { sent: false, reason: `Slack API ${response.status}: ${errorText}` };
  }

  return { sent: true };
}
