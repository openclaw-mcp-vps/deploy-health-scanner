import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { generateOwnerKey, getOwnerKeyFromCookieStore, setOwnerCookie } from "@/lib/auth";
import { query } from "@/lib/db";
import { ensureSchema, type SubscriptionPlan } from "@/lib/db/schema";
import { buildCheckoutUrl } from "@/lib/payments/lemonsqueezy";

export const runtime = "nodejs";

const checkoutSchema = z.object({
  email: z.string().trim().email(),
  plan: z.enum(["starter", "unlimited"]).default("starter"),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  const existingOwnerKey = getOwnerKeyFromCookieStore(request.cookies);
  const ownerKey = existingOwnerKey ?? generateOwnerKey();

  await ensureSchema();
  await query(
    `
      INSERT INTO subscriptions (email, owner_key, plan, status)
      VALUES ($1, $2, $3, 'pending')
      ON CONFLICT (email)
      DO UPDATE SET
        owner_key = EXCLUDED.owner_key,
        plan = EXCLUDED.plan,
        updated_at = NOW()
    `,
    [parsed.data.email.toLowerCase(), ownerKey, parsed.data.plan]
  );

  const checkoutUrl = buildCheckoutUrl({
    email: parsed.data.email,
    ownerKey,
    plan: parsed.data.plan as SubscriptionPlan,
  });

  const response = NextResponse.json({ checkoutUrl });
  setOwnerCookie(response, ownerKey);
  return response;
}
