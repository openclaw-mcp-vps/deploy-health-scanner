import { createHmac } from "node:crypto";

export const ACCESS_COOKIE_NAME = "dhs_access";
const COOKIE_TTL_SECONDS = 60 * 60 * 24 * 30;

interface AccessPayload {
  orderId: string;
  email: string;
  planName: string;
  exp: number;
}

function getSigningSecret(): string {
  return process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || "local-dev-webhook-secret-change-me";
}

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(data: string): string {
  return createHmac("sha256", getSigningSecret()).update(data).digest("base64url");
}

export function createAccessCookieValue(input: {
  orderId: string;
  email: string;
  planName: string;
}): string {
  const payload: AccessPayload = {
    orderId: input.orderId,
    email: input.email,
    planName: input.planName,
    exp: Math.floor(Date.now() / 1000) + COOKIE_TTL_SECONDS,
  };

  const payloadJson = JSON.stringify(payload);
  const encoded = toBase64Url(payloadJson);
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

export function verifyAccessCookie(
  value: string | undefined | null
): { valid: boolean; payload: AccessPayload | null } {
  if (!value) {
    return { valid: false, payload: null };
  }

  const [encoded, receivedSig] = value.split(".");
  if (!encoded || !receivedSig) {
    return { valid: false, payload: null };
  }

  const expectedSig = sign(encoded);
  if (expectedSig !== receivedSig) {
    return { valid: false, payload: null };
  }

  try {
    const parsed = JSON.parse(fromBase64Url(encoded)) as AccessPayload;
    if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) {
      return { valid: false, payload: null };
    }

    return { valid: true, payload: parsed };
  } catch {
    return { valid: false, payload: null };
  }
}

export function parseCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) {
    return null;
  }

  const entries = cookieHeader.split(";").map((part) => part.trim());
  for (const entry of entries) {
    if (!entry.startsWith(`${name}=`)) {
      continue;
    }

    return entry.slice(name.length + 1);
  }

  return null;
}

export function getAccessCookieMaxAge(): number {
  return COOKIE_TTL_SECONDS;
}
