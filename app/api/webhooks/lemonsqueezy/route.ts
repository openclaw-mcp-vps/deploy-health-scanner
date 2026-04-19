import { NextRequest, NextResponse } from "next/server";

import { query } from "@/lib/db";
import { ensureSchema } from "@/lib/db/schema";
import { parseWebhookEvent, verifyWebhookSignature } from "@/lib/payments/lemonsqueezy";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const signature = request.headers.get("x-signature");
  const rawBody = await request.text();

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid Lemon Squeezy signature." }, { status: 401 });
  }

  const parsedBody = JSON.parse(rawBody) as unknown;
  const event = parseWebhookEvent(parsedBody);

  if (!event) {
    return NextResponse.json({ received: true, ignored: true });
  }

  await ensureSchema();

  await query(
    `
      INSERT INTO subscriptions (email, owner_key, plan, status, lemonsqueezy_customer_id, lemonsqueezy_order_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email)
      DO UPDATE SET
        owner_key = COALESCE(EXCLUDED.owner_key, subscriptions.owner_key),
        plan = EXCLUDED.plan,
        status = EXCLUDED.status,
        lemonsqueezy_customer_id = COALESCE(EXCLUDED.lemonsqueezy_customer_id, subscriptions.lemonsqueezy_customer_id),
        lemonsqueezy_order_id = COALESCE(EXCLUDED.lemonsqueezy_order_id, subscriptions.lemonsqueezy_order_id),
        updated_at = NOW()
    `,
    [event.email, event.ownerKey, event.plan, event.status, event.customerId, event.orderId]
  );

  return NextResponse.json({ received: true });
}
