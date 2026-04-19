import crypto from "node:crypto";

import type { SubscriptionPlan, SubscriptionStatus } from "@/lib/db/schema";

export interface CheckoutPayload {
  email: string;
  ownerKey: string;
  plan: SubscriptionPlan;
}

export interface LemonWebhookEvent {
  email: string;
  ownerKey: string | null;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  customerId: string | null;
  orderId: string | null;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function buildCheckoutUrl(payload: CheckoutPayload): string {
  const productId = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID;

  if (!productId) {
    throw new Error("NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID is required.");
  }

  const baseUrl = process.env.LEMON_SQUEEZY_CHECKOUT_URL ?? `https://checkout.lemonsqueezy.com/buy/${productId}`;
  const params = new URLSearchParams({
    embed: "1",
    "checkout[email]": normalizeEmail(payload.email),
    "checkout[custom][owner_key]": payload.ownerKey,
    "checkout[custom][plan]": payload.plan,
  });

  return `${baseUrl}?${params.toString()}`;
}

export function verifyWebhookSignature(rawBody: string, providedSignature: string | null): boolean {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  if (!secret || !providedSignature) {
    return false;
  }

  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  const digestBuffer = Buffer.from(digest);
  const signatureBuffer = Buffer.from(providedSignature);

  if (digestBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(digestBuffer, signatureBuffer);
}

function resolvePlan(input: string | null | undefined): SubscriptionPlan {
  if (!input) {
    return "starter";
  }

  const normalized = input.toLowerCase();
  return normalized.includes("unlimited") ? "unlimited" : "starter";
}

function resolveStatus(eventName: string, dataStatus: string | null | undefined): SubscriptionStatus {
  const normalizedEvent = eventName.toLowerCase();
  const normalizedStatus = (dataStatus ?? "").toLowerCase();

  if (normalizedEvent.includes("cancel") || normalizedStatus.includes("cancel")) {
    return "cancelled";
  }

  if (normalizedEvent.includes("expired") || normalizedStatus.includes("expired")) {
    return "expired";
  }

  if (
    normalizedEvent.includes("order_created") ||
    normalizedEvent.includes("subscription_created") ||
    normalizedStatus.includes("paid") ||
    normalizedStatus.includes("active") ||
    normalizedStatus.includes("on_trial")
  ) {
    return "active";
  }

  return "pending";
}

export function parseWebhookEvent(payload: unknown): LemonWebhookEvent | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const meta = (record.meta ?? {}) as Record<string, unknown>;
  const data = (record.data ?? {}) as Record<string, unknown>;
  const attributes = (data.attributes ?? {}) as Record<string, unknown>;
  const customData = ((meta.custom_data as Record<string, unknown> | undefined) ??
    (attributes.custom_data as Record<string, unknown> | undefined) ??
    {}) as Record<string, unknown>;

  const eventName = String(meta.event_name ?? "");
  const email =
    String(
      customData.email ??
        attributes.user_email ??
        attributes.customer_email ??
        attributes.email ??
        ""
    )
      .trim()
      .toLowerCase();

  if (!email) {
    return null;
  }

  const plan = resolvePlan(String(customData.plan ?? attributes.variant_name ?? attributes.product_name ?? "starter"));
  const status = resolveStatus(eventName, String(attributes.status ?? ""));

  return {
    email,
    ownerKey: customData.owner_key ? String(customData.owner_key) : null,
    plan,
    status,
    customerId: attributes.customer_id ? String(attributes.customer_id) : null,
    orderId: attributes.order_id ? String(attributes.order_id) : data.id ? String(data.id) : null,
  };
}
