import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { ACCESS_COOKIE_NAME, parseCookieValue, verifyAccessCookie } from "@/lib/auth/paywall";

export function createTRPCContext(opts: FetchCreateContextFnOptions) {
  const cookieHeader = opts.req.headers.get("cookie");
  const accessToken = parseCookieValue(cookieHeader, ACCESS_COOKIE_NAME);
  const access = verifyAccessCookie(accessToken);

  return {
    isPaid: access.valid,
    accessPayload: access.payload,
  };
}

export type TRPCContext = ReturnType<typeof createTRPCContext>;
