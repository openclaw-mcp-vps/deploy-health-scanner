import { Resend } from "resend";

export interface AlertMessage {
  url: string;
  reason: string;
  status: string;
  details: string;
}

export async function sendEmailAlert(message: AlertMessage): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ALERT_TO_EMAIL;
  const from = process.env.ALERT_FROM_EMAIL || "alerts@deployhealthscanner.com";

  if (!apiKey || !to) {
    return { sent: false, reason: "Missing RESEND_API_KEY or ALERT_TO_EMAIL" };
  }

  const resend = new Resend(apiKey);

  await resend.emails.send({
    from,
    to,
    subject: `Deploy Health Scanner alert: ${message.reason}`,
    html: `<div style="font-family:Segoe UI,sans-serif;line-height:1.5">
      <h2 style="margin-bottom:8px">${message.reason}</h2>
      <p><strong>URL:</strong> ${message.url}</p>
      <p><strong>Status:</strong> ${message.status}</p>
      <p><strong>Details:</strong> ${message.details}</p>
      <p style="margin-top:16px">Open your dashboard to review trends and run a manual re-check.</p>
    </div>`,
  });

  return { sent: true };
}
