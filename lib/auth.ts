import crypto from "node:crypto";

export const ACCESS_COOKIE_NAME = "dhs_access";
const ACCESS_TTL_SECONDS = 60 * 60 * 24 * 30;

type AccessPayload = {
  email: string;
  exp: number;
};

function getSigningSecret() {
  return process.env.COOKIE_SIGNING_SECRET || "dev-change-me";
}

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(input: string) {
  return crypto.createHmac("sha256", getSigningSecret()).update(input).digest("base64url");
}

export function createAccessToken(email: string) {
  const payload: AccessPayload = {
    email,
    exp: Math.floor(Date.now() / 1000) + ACCESS_TTL_SECONDS,
  };

  const encoded = toBase64Url(JSON.stringify(payload));
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

export function verifyAccessToken(token: string | undefined | null) {
  if (!token || !token.includes(".")) {
    return null;
  }

  const [encoded, providedSignature] = token.split(".");
  const expectedSignature = sign(encoded);

  const a = Buffer.from(providedSignature);
  const b = Buffer.from(expectedSignature);

  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encoded)) as AccessPayload;
    if (!payload.email || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function getAccessEmailFromCookies(cookieStore: CookieStoreLike) {
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
  const payload = verifyAccessToken(token);
  return payload?.email ?? null;
}

export function getAccessCookieMaxAgeSeconds() {
  return ACCESS_TTL_SECONDS;
}
type CookieStoreLike = {
  get: (name: string) => { value: string } | undefined;
};
