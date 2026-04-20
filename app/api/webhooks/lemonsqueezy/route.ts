import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { upsertSubscription } from "@/lib/database";

export const runtime = "nodejs";

function secureCompare(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  if (left.length !== right.length) {
    return false;
  }

  return crypto.timingSafeEqual(left, right);
}

function getEventStatus(eventName: string, rawStatus: unknown) {
  const status = typeof rawStatus === "string" ? rawStatus.toLowerCase() : "";
  const event = eventName.toLowerCase();

  if (
    event.includes("cancel") ||
    event.includes("expired") ||
    event.includes("paused") ||
    ["cancelled", "expired", "paused", "past_due", "unpaid"].includes(status)
  ) {
    return "inactive";
  }

  return "active";
}

function getString(value: unknown) {
  return typeof value === "string" ? value : null;
}

export async function POST(request: Request) {
  try {
    const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "Webhook secret not configured." }, { status: 500 });
    }

    const rawBody = await request.text();
    const receivedSignature = request.headers.get("x-signature") || "";
    const normalizedReceived = receivedSignature.replace(/^sha256=/i, "");
    const generated = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

    if (!normalizedReceived || !secureCompare(normalizedReceived, generated)) {
      return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as {
      meta?: {
        event_name?: string;
      };
      data?: {
        id?: string;
        attributes?: Record<string, unknown>;
      };
    };

    const eventName = payload.meta?.event_name || "";
    const attributes = payload.data?.attributes || {};

    const email =
      getString(attributes.user_email) ||
      getString(attributes.customer_email) ||
      getString(attributes.email) ||
      getString(attributes.customer_name);

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Webhook payload missing customer email." }, { status: 400 });
    }

    const orderId =
      getString(attributes.order_id) ||
      getString(attributes.identifier) ||
      getString(payload.data?.id) ||
      null;

    const plan =
      getString(attributes.variant_name) ||
      getString(attributes.product_name) ||
      getString(attributes.plan_name) ||
      null;

    await upsertSubscription({
      email,
      orderId,
      status: getEventStatus(eventName, attributes.status),
      plan,
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
