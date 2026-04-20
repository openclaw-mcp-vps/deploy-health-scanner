import { NextResponse } from "next/server";
import { enqueueDueHealthChecks, processHealthCheckQueue } from "@/lib/monitoring/queue";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const queued = await enqueueDueHealthChecks(5);
  const processed = await processHealthCheckQueue(40);

  return NextResponse.json({
    status: "ok",
    queued,
    processed: processed.processed,
    failed: processed.failed,
    checkedAt: new Date().toISOString(),
  });
}
