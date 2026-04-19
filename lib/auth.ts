import crypto from "node:crypto";

import { NextResponse } from "next/server";

import type { SubscriptionPlan } from "@/lib/db/schema";

export const ACCESS_COOKIE_NAME = "dhs_access";
export const OWNER_COOKIE_NAME = "dhs_owner";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

type CookieRead = {
  get(name: string): { value: string } | undefined;
};

export interface AccessPayload {
  ownerKey: string;
  plan: SubscriptionPlan;
  expiresAt: number;
}

function getCookieSecret(): string {
  return process.env.AUTH_COOKIE_SECRET ?? "development-insecure-secret-change-me";
}

function sign(value: string): string {
  return crypto.createHmac("sha256", getCookieSecret()).update(value).digest("hex");
}

function safeEquals(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

export function generateOwnerKey(): string {
  return crypto.randomUUID();
}

export function createAccessToken(ownerKey: string, plan: SubscriptionPlan): string {
  const expiresAt = Date.now() + COOKIE_MAX_AGE_SECONDS * 1000;
  const payload = `${ownerKey}|${plan}|${expiresAt}`;
  const signature = sign(payload);
  return Buffer.from(`${payload}|${signature}`).toString("base64url");
}

export function parseAccessToken(token: string): AccessPayload | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [ownerKey, planRaw, expiresAtRaw, signature] = decoded.split("|");

    if (!ownerKey || !planRaw || !expiresAtRaw || !signature) {
      return null;
    }

    if (planRaw !== "starter" && planRaw !== "unlimited") {
      return null;
    }

    const payload = `${ownerKey}|${planRaw}|${expiresAtRaw}`;
    if (!safeEquals(sign(payload), signature)) {
      return null;
    }

    const expiresAt = Number(expiresAtRaw);
    if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
      return null;
    }

    return {
      ownerKey,
      plan: planRaw,
      expiresAt,
    };
  } catch {
    return null;
  }
}

export function getAccessFromCookieStore(cookieStore: CookieRead): AccessPayload | null {
  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
  if (!accessToken) {
    return null;
  }

  return parseAccessToken(accessToken);
}

export function getOwnerKeyFromCookieStore(cookieStore: CookieRead): string | null {
  return cookieStore.get(OWNER_COOKIE_NAME)?.value ?? null;
}

export function setOwnerCookie(response: NextResponse, ownerKey: string): void {
  response.cookies.set({
    name: OWNER_COOKIE_NAME,
    value: ownerKey,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

export function setAccessCookies(response: NextResponse, ownerKey: string, plan: SubscriptionPlan): void {
  setOwnerCookie(response, ownerKey);
  response.cookies.set({
    name: ACCESS_COOKIE_NAME,
    value: createAccessToken(ownerKey, plan),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

export function clearAccessCookies(response: NextResponse): void {
  response.cookies.delete(ACCESS_COOKIE_NAME);
}
