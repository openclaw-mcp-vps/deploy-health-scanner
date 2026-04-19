import Link from "next/link";
import { Activity, BellRing, Gauge, ShieldCheck } from "lucide-react";

import { Pricing } from "@/components/pricing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const problems = [
  {
    title: "Status checks miss real launch risks",
    body: "A 200 response can still hide expired SSL, missing metadata, or painfully slow pages that hurt conversion.",
  },
  {
    title: "Alerts are scattered across tools",
    body: "You should not need one tool for uptime, another for SEO checks, and another for performance alerts.",
  },
  {
    title: "Monitoring costs jump too fast",
    body: "Founders with 5-50 projects are often stuck between shallow cheap tools and expensive enterprise suites.",
  },
];

const features = [
  {
    title: "Uptime checks every 5 minutes",
    description: "Catch outages quickly with HTTP status verification and response time trend tracking.",
    icon: Activity,
  },
  {
    title: "SSL expiry intelligence",
    description: "Know exactly when certificates are expiring and get alerted before browsers start blocking users.",
    icon: ShieldCheck,
  },
  {
    title: "SEO meta watchdog",
    description: "Monitor title tags, descriptions, and indexing-critical metadata after every deployment.",
    icon: Gauge,
  },
  {
    title: "Email + Slack alerting",
    description: "Route incidents to where your team already works so downtime never sits unseen.",
    icon: BellRing,
  },
];

const faq = [
  {
    q: "How often are checks performed?",
    a: "Every monitor is scheduled every 5 minutes. You can also trigger manual checks from the dashboard when you ship changes.",
  },
  {
    q: "Do I need to install an agent on my servers?",
    a: "No. Deploy Health Scanner works externally against your URLs, so it covers Vercel, Netlify, static sites, and custom hosts equally.",
  },
  {
    q: "Can I alert multiple channels?",
    a: "Yes. Configure email and Slack simultaneously so incidents reach both your inbox and your team channel.",
  },
  {
    q: "What happens after I purchase?",
    a: "You get instant dashboard access through a secure purchase cookie and can start adding monitored URLs right away.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen text-slate-100">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Deploy Health Scanner
        </Link>
        <div className="flex items-center gap-3">
          <a href="#pricing" className="text-sm text-slate-300 hover:text-cyan-300">
            Pricing
          </a>
          <Link href="/dashboard">
            <Button size="sm">Open Dashboard</Button>
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 pb-16 pt-8 md:grid-cols-2 md:items-center md:pt-20">
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">Monitoring for deployed projects</p>
          <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
            Continuous uptime, SSL, SEO, and speed checks for every URL you ship
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-300">
            Paste URLs or connect your deploy workflow and get one clear signal on site health. Built for indie founders managing
            5-50 projects who need more than ping checks.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/dashboard">
              <Button size="lg">Start Monitoring</Button>
            </Link>
            <a href="#pricing">
              <Button size="lg" variant="secondary">
                See Pricing
              </Button>
            </a>
          </div>
          <p className="mt-4 text-sm text-slate-400">From $12/month. No install. 5-minute checks by default.</p>
        </div>
        <Card className="border-cyan-500/20 bg-slate-900/90">
          <CardHeader>
            <CardTitle>Live monitor snapshot</CardTitle>
            <CardDescription>One dashboard shows technical and growth-critical issues side by side.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-200">
              api.exampleapp.com is up (HTTP 200), SSL valid for 43 days.
            </div>
            <div className="rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-amber-200">
              www.exampleapp.com meta description changed after latest deployment.
            </div>
            <div className="rounded-md border border-rose-500/20 bg-rose-500/10 p-3 text-rose-200">
              docs.exampleapp.com response time increased from 420ms to 1280ms.
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="mb-8 text-3xl font-semibold">Why existing tools miss what founders care about</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {problems.map((problem) => (
            <Card key={problem.title}>
              <CardHeader>
                <CardTitle className="text-xl">{problem.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-300">{problem.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="mb-8 text-3xl font-semibold">Everything you need to keep deployed sites healthy</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {features.map((feature) => (
            <Card key={feature.title} className="border-slate-700/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-xl">
                  <feature.icon className="h-5 w-5 text-cyan-300" />
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-300">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Pricing />

      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="mb-8 text-center text-3xl font-semibold">Frequently asked questions</h2>
        <div className="space-y-4">
          {faq.map((item) => (
            <Card key={item.q}>
              <CardHeader>
                <CardTitle className="text-lg">{item.q}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-300">{item.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-800/80 px-6 py-10 text-center text-sm text-slate-400">
        Deploy Health Scanner helps indie teams prevent silent production failures before users notice.
      </footer>
    </main>
  );
}
