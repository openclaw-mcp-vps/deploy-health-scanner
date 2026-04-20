import Link from "next/link";

import { ArrowRight, BadgeCheck, Gauge, Globe, ShieldCheck, Siren, Zap } from "lucide-react";

import { PricingTable } from "@/components/pricing-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl shadow-black/25 sm:p-12">
        <div className="grid gap-10 lg:grid-cols-[1.25fr_1fr] lg:items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300">
              Continuous Deploy Monitoring
            </span>
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              Deploy Health Scanner keeps every shipped project healthy around the clock.
            </h1>
            <p className="max-w-2xl text-lg text-slate-300">
              Paste URLs or connect your deployment workflow. We check uptime, SSL expiry, SEO metadata, and
              performance every 5 minutes, then alert your team before issues hit traffic.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/unlock">
                  Unlock Dashboard
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#pricing">View Pricing</a>
              </Button>
            </div>
            <p className="text-sm text-slate-400">
              Better coverage than status-only tools. Lower cost than enterprise synthetic suites.
            </p>
          </div>

          <div className="grid gap-4">
            <Card className="border-slate-700">
              <CardHeader className="pb-3">
                <CardDescription>Checks every 5 minutes</CardDescription>
                <CardTitle className="text-3xl">288 scans/day</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-300">
                Every URL is monitored for HTTP errors, expiring certificates, missing SEO tags and degraded speed.
              </CardContent>
            </Card>
            <Card className="border-slate-700">
              <CardHeader className="pb-3">
                <CardDescription>Built for indie portfolios</CardDescription>
                <CardTitle className="text-3xl">5 to 50 projects</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-300">
                Ideal for founders and small studios managing several production sites across Vercel and Netlify.
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="mt-14 space-y-8">
        <div className="max-w-3xl space-y-3">
          <h2 className="text-3xl font-semibold">The blind spots most uptime tools miss</h2>
          <p className="text-slate-300">
            A 200 response does not guarantee your deployment is healthy. Founders lose revenue from cert expiries,
            missing metadata, and slow pages that quietly hurt conversion and SEO.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Globe className="size-4 text-sky-300" />
                HTTP Status
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-300">Detect downtime, redirects and 4xx/5xx failures instantly.</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="size-4 text-emerald-300" />
                SSL Expiry
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-300">
              Catch expiring certs before browsers throw trust warnings.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BadgeCheck className="size-4 text-cyan-300" />
                SEO Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-300">
              Validate title, meta description, canonical and OG image tags after each deployment.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Gauge className="size-4 text-violet-300" />
                Page Speed
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-300">
              Track performance regressions with PageSpeed data and trend history.
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mt-14 grid gap-6 lg:grid-cols-3">
        <Card className="border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Zap className="size-5 text-emerald-300" />
              1. Add URLs
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-300">
            Paste production URLs and optional alert channels. First check runs immediately.
          </CardContent>
        </Card>
        <Card className="border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Gauge className="size-5 text-sky-300" />
              2. Watch trends
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-300">
            Dashboard charts show uptime, response time and speed score movement over time.
          </CardContent>
        </Card>
        <Card className="border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Siren className="size-5 text-amber-300" />
              3. Alert fast
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-300">
            Email and Slack alerts fire on failures and state changes so you can ship fixes immediately.
          </CardContent>
        </Card>
      </section>

      <section className="mt-16">
        <PricingTable />
      </section>

      <section className="mt-16 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>FAQ: Why not just use UptimeRobot?</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-300">
            UptimeRobot is excellent for status-only checks. Deploy Health Scanner adds SSL expiry, SEO metadata and
            page-speed visibility in one workflow.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>FAQ: Do checks run automatically?</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-300">
            Yes. Configure a 5-minute cron trigger to `/api/cron/health-check` and the monitor runs continuously.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>FAQ: Can I bring my own Slack channel?</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-300">
            Yes. Add an incoming webhook URL per project and alerts are posted directly into your chosen channel.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>FAQ: What counts as a monitored URL?</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-300">
            Any public deployment URL you want scanned every 5 minutes, including custom domains and preview roots.
          </CardContent>
        </Card>
      </section>

      <footer className="mt-16 border-t border-slate-800 pt-6 text-sm text-slate-500">
        Deploy Health Scanner for indie founders shipping fast on modern deployment platforms.
      </footer>
    </main>
  );
}
