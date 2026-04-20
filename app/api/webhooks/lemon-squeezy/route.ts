import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { upsertSubscription } from "@/lib/db/queries";

export const runtime = "nodejs";

interface LemonWebhookPayload {
  meta?: {
    event_name?: string;
  };
  data?: {
    id?: string;
    attributes?: Record<string, unknown>;
  };
}

export async function POST(request: Request) {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json({ error: "LEMON_SQUEEZY_WEBHOOK_SECRET is not configured" }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-signature") ?? "";

  if (!isValidSignature(rawBody, secret, signature)) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  let payload: LemonWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as LemonWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const eventName = payload.meta?.event_name ?? "unknown";
  const attrs = payload.data?.attributes ?? {};

  const orderId = stringFromUnknown(attrs.order_id) || stringFromUnknown(payload.data?.id);
  const email =
    stringFromUnknown(attrs.user_email) ||
    stringFromUnknown(attrs.customer_email) ||
    stringFromUnknown(attrs.email) ||
    "";
  const planName =
    stringFromUnknown(attrs.variant_name) ||
    stringFromUnknown(attrs.product_name) ||
    "Deploy Health Scanner";

  if (orderId && email) {
    await upsertSubscription({
      orderId,
      email,
      planName,
      status: mapSubscriptionStatus(eventName, stringFromUnknown(attrs.status) || "paid"),
    });
  }

  return NextResponse.json({
    received: true,
    eventName,
    orderId,
    email,
  });
}

function mapSubscriptionStatus(eventName: string, fallback: string): string {
  const lowered = eventName.toLowerCase();

  if (lowered.includes("cancel") || lowered.includes("expired")) {
    return "cancelled";
  }

  if (lowered.includes("refund")) {
    return "refunded";
  }

  if (lowered.includes("subscription_paused")) {
    return "paused";
  }

  if (lowered.includes("subscription_created") || lowered.includes("order_created")) {
    return "paid";
  }

  return fallback.toLowerCase();
}

function stringFromUnknown(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  if (typeof value === "number") {
    return String(value);
  }

  return null;
}

function isValidSignature(body: string, secret: string, signature: string): boolean {
  if (!signature) {
    return false;
  }

  const digest = createHmac("sha256", secret).update(body).digest("hex");
  const expected = Buffer.from(digest, "utf8");
  const received = Buffer.from(signature, "utf8");

  if (expected.length !== received.length) {
    return false;
  }

  return timingSafeEqual(expected, received);
}
