import { NextResponse } from "next/server";
import {
  ACCESS_COOKIE_NAME,
  createAccessCookieValue,
  getAccessCookieMaxAge,
} from "@/lib/auth/paywall";
import { findPaidSubscription } from "@/lib/db/queries";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  const isForm = contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data");

  const payload = isForm ? await parseFormPayload(request) : await parseJsonPayload(request);

  if (!payload.orderId || !payload.email) {
    const error = { error: "orderId and email are required." };
    if (isForm) {
      return NextResponse.redirect(new URL("/dashboard?unlock=missing-fields", request.url));
    }
    return NextResponse.json(error, { status: 400 });
  }

  const hasSubscription = await findPaidSubscription(payload.orderId, payload.email);
  if (!hasSubscription) {
    const error = { error: "No paid subscription matched this order and email." };
    if (isForm) {
      return NextResponse.redirect(new URL("/dashboard?unlock=not-found", request.url));
    }
    return NextResponse.json(error, { status: 404 });
  }

  const cookieValue = createAccessCookieValue({
    orderId: payload.orderId,
    email: payload.email,
    planName: "Deploy Health Scanner",
  });

  const response = isForm
    ? NextResponse.redirect(new URL("/dashboard?unlock=success", request.url))
    : NextResponse.json({ unlocked: true });

  response.cookies.set({
    name: ACCESS_COOKIE_NAME,
    value: cookieValue,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: getAccessCookieMaxAge(),
  });

  return response;
}

async function parseJsonPayload(request: Request): Promise<{ orderId: string; email: string }> {
  try {
    const body = (await request.json()) as { orderId?: string; email?: string };
    return {
      orderId: body.orderId?.trim() || "",
      email: body.email?.trim() || "",
    };
  } catch {
    return {
      orderId: "",
      email: "",
    };
  }
}

async function parseFormPayload(request: Request): Promise<{ orderId: string; email: string }> {
  const form = await request.formData();
  const orderId = String(form.get("orderId") || "").trim();
  const email = String(form.get("email") || "").trim();

  return {
    orderId,
    email,
  };
}
