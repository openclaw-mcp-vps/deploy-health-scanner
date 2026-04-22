import { NextResponse } from "next/server";

import { isPaidUser } from "@/lib/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function accessCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  };
}

function getEmailFromRequest(
  contentType: string,
  body: any,
  formData: FormData | null
): string {
  if (contentType.includes("application/json")) {
    return (body?.email || "").toString().trim().toLowerCase();
  }

  return (formData?.get("email")?.toString() || "").trim().toLowerCase();
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";

  let jsonBody: any = null;
  let formData: FormData | null = null;

  if (contentType.includes("application/json")) {
    jsonBody = await request.json();
  } else {
    formData = await request.formData();
  }

  const email = getEmailFromRequest(contentType, jsonBody, formData);

  if (!email || !isValidEmail(email)) {
    if (contentType.includes("application/json")) {
      return NextResponse.json(
        { error: "A valid email is required." },
        { status: 400 }
      );
    }

    return NextResponse.redirect(new URL("/dashboard?unlock=invalid_email", request.url));
  }

  const isPaid = await isPaidUser(email);

  if (!isPaid) {
    if (contentType.includes("application/json")) {
      return NextResponse.json(
        {
          error:
            "No active purchase found for this email yet. Complete checkout first, then try again."
        },
        { status: 402 }
      );
    }

    return NextResponse.redirect(new URL("/dashboard?unlock=not_found", request.url));
  }

  const response = contentType.includes("application/json")
    ? NextResponse.json({ ok: true, email })
    : NextResponse.redirect(new URL("/dashboard", request.url));

  response.cookies.set("dhs_paid", "1", accessCookieOptions());
  response.cookies.set("dhs_email", email, accessCookieOptions());

  return response;
}
