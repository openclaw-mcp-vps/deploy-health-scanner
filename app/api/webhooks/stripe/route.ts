import { createHmac, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { logSubscriptionEvent, upsertPaidCustomer } from "@/lib/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeCompare(a: string, b: string) {
  const aBuffer = Buffer.from(a, "utf8");
  const bBuffer = Buffer.from(b, "utf8");

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return timingSafeEqual(aBuffer, bBuffer);
}

function verifyStripeSignature(payload: string, signatureHeader: string | null) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    return true;
  }

  if (!signatureHeader) {
    return false;
  }

  const parsed = signatureHeader
    .split(",")
    .map((part) => part.trim())
    .reduce<Record<string, string>>((acc, part) => {
      const [key, value] = part.split("=");
      if (key && value) {
        acc[key] = value;
      }
      return acc;
    }, {});

  const timestamp = parsed.t;
  const signature = parsed.v1;

  if (!timestamp || !signature) {
    return false;
  }

  const signedPayload = `${timestamp}.${payload}`;
  const expected = createHmac("sha256", secret).update(signedPayload).digest("hex");

  if (!safeCompare(expected, signature)) {
    return false;
  }

  const toleranceSeconds = 300;
  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds)) {
    return false;
  }

  const currentSeconds = Math.floor(Date.now() / 1000);
  return Math.abs(currentSeconds - timestampSeconds) <= toleranceSeconds;
}

function getStripeEventEmail(payload: any) {
  return (
    payload?.data?.object?.customer_details?.email ||
    payload?.data?.object?.customer_email ||
    payload?.data?.object?.receipt_email ||
    payload?.data?.object?.metadata?.email ||
    null
  );
}

function getStatusFromEvent(eventType: string) {
  if (
    [
      "checkout.session.completed",
      "invoice.payment_succeeded",
      "customer.subscription.created",
      "customer.subscription.updated"
    ].includes(eventType)
  ) {
    return "active";
  }

  if (
    [
      "invoice.payment_failed",
      "customer.subscription.paused",
      "customer.subscription.trial_will_end"
    ].includes(eventType)
  ) {
    return "past_due";
  }

  if (["customer.subscription.deleted"].includes(eventType)) {
    return "canceled";
  }

  return "unknown";
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signatureHeader = request.headers.get("stripe-signature");

  if (!verifyStripeSignature(rawBody, signatureHeader)) {
    return NextResponse.json({ error: "Invalid Stripe signature" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const eventName = (payload?.type || "unknown").toString();
  const email = getStripeEventEmail(payload);
  const status = getStatusFromEvent(eventName);

  await logSubscriptionEvent({
    source: "stripe",
    eventName,
    email,
    payload
  });

  if (email && status !== "unknown") {
    await upsertPaidCustomer(email.toLowerCase(), "stripe", status);
  }

  return NextResponse.json({ received: true });
}
