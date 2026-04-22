import { createHmac, timingSafeEqual } from "node:crypto";

export interface LemonSqueezyWebhookResult {
  eventName: string;
  email: string | null;
  status: "active" | "canceled" | "past_due" | "paused" | "unknown";
}

function safeCompare(a: string, b: string) {
  const aBuffer = Buffer.from(a, "utf8");
  const bBuffer = Buffer.from(b, "utf8");

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return timingSafeEqual(aBuffer, bBuffer);
}

export function verifyLemonSqueezySignature(
  rawBody: string,
  signature: string | null
) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

  if (!secret) {
    return true;
  }

  if (!signature) {
    return false;
  }

  const digest = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeCompare(digest, signature);
}

export function parseLemonSqueezyWebhook(payload: any): LemonSqueezyWebhookResult {
  const eventName =
    payload?.meta?.event_name || payload?.event_name || payload?.eventName || "unknown";

  const email =
    payload?.data?.attributes?.user_email ||
    payload?.data?.attributes?.customer_email ||
    payload?.meta?.custom_data?.email ||
    payload?.meta?.custom_data?.user_email ||
    null;

  let status: LemonSqueezyWebhookResult["status"] = "unknown";

  if (
    [
      "subscription_created",
      "subscription_resumed",
      "subscription_payment_success",
      "order_created"
    ].includes(eventName)
  ) {
    status = "active";
  }

  if (["subscription_cancelled", "subscription_expired"].includes(eventName)) {
    status = "canceled";
  }

  if (["subscription_payment_failed"].includes(eventName)) {
    status = "past_due";
  }

  if (["subscription_paused"].includes(eventName)) {
    status = "paused";
  }

  return {
    eventName,
    email: typeof email === "string" ? email.toLowerCase() : null,
    status
  };
}
