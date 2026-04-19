import Link from "next/link";
import { cookies } from "next/headers";

import { AddMonitor } from "@/components/dashboard/add-monitor";
import { MonitorList } from "@/components/dashboard/monitor-list";
import { PaywallGate } from "@/components/dashboard/paywall-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAccessFromCookieStore } from "@/lib/auth";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const access = getAccessFromCookieStore(cookieStore);

  return (
    <main className="min-h-screen px-6 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-400">Deploy Health Scanner</p>
            <h1 className="text-3xl font-semibold">Monitoring Dashboard</h1>
            <p className="mt-2 text-sm text-slate-400">
              Uptime + SSL + SEO + performance checks for every deployed project, refreshed every 5 minutes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {access ? <Badge variant="success">Plan: {access.plan}</Badge> : <Badge variant="warning">Locked</Badge>}
            <Link href="/">
              <Button variant="secondary">Back to site</Button>
            </Link>
          </div>
        </header>

        {access ? (
          <>
            <AddMonitor />
            <MonitorList />
          </>
        ) : (
          <>
            <PaywallGate />
            <Card className="mx-auto max-w-xl">
              <CardHeader>
                <CardTitle>What unlocks after payment</CardTitle>
                <CardDescription>Everything below is included immediately after your webhook-confirmed purchase.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-2 pl-6 text-sm text-slate-300">
                  <li>Monitor every project URL every 5 minutes.</li>
                  <li>Catch SSL expiry before users see browser warnings.</li>
                  <li>Track missing SEO title/description regressions after deploys.</li>
                  <li>Watch response time trends and surface performance degradation.</li>
                </ul>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}
