import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { generateOwnerKey, getOwnerKeyFromCookieStore, setAccessCookies } from "@/lib/auth";
import { query } from "@/lib/db";
import { ensureSchema, type SubscriptionPlan } from "@/lib/db/schema";

export const runtime = "nodejs";

const claimSchema = z.object({
  email: z.string().trim().email(),
});

interface SubscriptionRow {
  owner_key: string | null;
  plan: SubscriptionPlan;
  status: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.json().catch(() => null);
  const parsed = claimSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  await ensureSchema();

  const subscription = await query<SubscriptionRow>(
    `
      SELECT owner_key, plan, status
      FROM subscriptions
      WHERE email = $1
      LIMIT 1
    `,
    [parsed.data.email.toLowerCase()]
  );

  if (subscription.rowCount === 0) {
    return NextResponse.json({ error: "No purchase found for this email yet." }, { status: 404 });
  }

  const row = subscription.rows[0];
  if (row.status !== "active") {
    return NextResponse.json({ error: "Purchase exists but is not active yet." }, { status: 403 });
  }

  const cookieOwnerKey = getOwnerKeyFromCookieStore(request.cookies);
  const ownerKey = row.owner_key ?? cookieOwnerKey ?? generateOwnerKey();

  if (!row.owner_key || row.owner_key !== ownerKey) {
    await query(
      `
        UPDATE subscriptions
        SET owner_key = $1, updated_at = NOW()
        WHERE email = $2
      `,
      [ownerKey, parsed.data.email.toLowerCase()]
    );
  }

  const response = NextResponse.json({ success: true, plan: row.plan });
  setAccessCookies(response, ownerKey, row.plan);
  return response;
}
