import { NextResponse } from "next/server";

import {
  ACCESS_COOKIE_NAME,
  createAccessToken,
  getAccessCookieMaxAgeSeconds,
} from "@/lib/auth";
import { getSubscriptionByEmail } from "@/lib/database";
import { isSubscriptionActive } from "@/lib/plans";

export const runtime = "nodejs";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase() || "";

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "A valid purchase email is required." }, { status: 400 });
    }

    const subscription = await getSubscriptionByEmail(email);
    if (!isSubscriptionActive(subscription)) {
      return NextResponse.json(
        {
          error: "No active subscription found for that email. Complete checkout first.",
        },
        { status: 402 },
      );
    }

    const token = createAccessToken(email);
    const response = NextResponse.json({ success: true });

    response.cookies.set({
      name: ACCESS_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: getAccessCookieMaxAgeSeconds(),
      path: "/",
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unlock request failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
