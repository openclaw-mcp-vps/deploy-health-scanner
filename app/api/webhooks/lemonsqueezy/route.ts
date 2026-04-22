import { NextResponse } from "next/server";

import { logSubscriptionEvent, upsertPaidCustomer } from "@/lib/database";
import {
  parseLemonSqueezyWebhook,
  verifyLemonSqueezySignature
} from "@/lib/lemonsqueezy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");

  if (!verifyLemonSqueezySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = parseLemonSqueezyWebhook(payload);

  await logSubscriptionEvent({
    source: "lemonsqueezy",
    eventName: parsed.eventName,
    email: parsed.email,
    payload
  });

  if (parsed.email && parsed.status !== "unknown") {
    await upsertPaidCustomer(parsed.email, "lemonsqueezy", parsed.status);
  }

  return NextResponse.json({ received: true });
}
