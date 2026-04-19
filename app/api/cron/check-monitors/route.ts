import { NextRequest, NextResponse } from "next/server";

import { getAccessFromCookieStore } from "@/lib/auth";
import { query } from "@/lib/db";
import { ensureSchema } from "@/lib/db/schema";
import { enqueueMonitorChecks } from "@/lib/monitoring/jobs";

export const runtime = "nodejs";

function hasValidCronSecret(request: NextRequest): boolean {
  const configured = process.env.CRON_SECRET;
  if (!configured) {
    return false;
  }

  const bearer = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-cron-secret");

  return bearer === `Bearer ${configured}` || headerSecret === configured;
}

async function handle(request: NextRequest): Promise<NextResponse> {
  const searchParams = new URL(request.url).searchParams;
  const monitorId = searchParams.get("monitorId") ?? undefined;

  const trustedCronCall = hasValidCronSecret(request);

  if (!trustedCronCall) {
    const access = getAccessFromCookieStore(request.cookies);
    if (!access) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!monitorId) {
      return NextResponse.json(
        {
          error: "Manual checks require a specific monitorId query parameter.",
        },
        { status: 400 }
      );
    }

    await ensureSchema();
    const ownsMonitor = await query<{ id: string }>(
      `SELECT id FROM monitors WHERE id = $1 AND owner_key = $2`,
      [monitorId, access.ownerKey]
    );

    if (ownsMonitor.rowCount === 0) {
      return NextResponse.json({ error: "Monitor not found." }, { status: 404 });
    }
  }

  const enqueued = await enqueueMonitorChecks(monitorId);

  return NextResponse.json({ enqueued });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return handle(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handle(request);
}
