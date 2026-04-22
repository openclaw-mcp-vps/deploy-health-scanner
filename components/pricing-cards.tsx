import { CheckCircle2, ShieldCheck, TrendingUp, Zap } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

const starterFeatures = [
  "Monitor up to 10 URLs every 5 minutes",
  "Checks HTTP status, SSL validity, and SEO tags",
  "Email + Slack webhook alerts",
  "Manual on-demand checks from dashboard"
];

const growthFeatures = [
  "Unlimited URLs with the same 5-minute interval",
  "Priority alert delivery and unlimited Slack channels",
  "Longer check history for trend analysis",
  "Best fit for agencies and multi-product founders"
];

export default function PricingCards() {
  return (
    <section id="pricing" className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
          <Zap className="h-3.5 w-3.5" />
          Straightforward Pricing
        </p>
        <h2 className="text-3xl font-bold text-white sm:text-4xl">Pay only for what you monitor</h2>
        <p className="mt-4 text-base text-slate-300">
          Between UptimeRobot and Checkly in price, but tailored to deployed product health.
        </p>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Card className="border-slate-800 bg-slate-950/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              Starter
            </CardTitle>
            <CardDescription className="text-slate-300">
              Ideal for indie founders with a focused product stack.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 flex items-baseline gap-2">
              <span className="text-4xl font-bold text-white">$12</span>
              <span className="text-slate-400">/ month</span>
            </div>
            <ul className="space-y-3 text-sm text-slate-200">
              {starterFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-400" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <a
              href={process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK}
              className="mt-8 inline-flex w-full items-center justify-center rounded-md bg-emerald-500 px-4 py-2 font-semibold text-black transition hover:bg-emerald-400"
            >
              Buy Starter
            </a>
          </CardContent>
        </Card>

        <Card className="border-emerald-400/40 bg-gradient-to-b from-emerald-500/10 to-slate-950/90">
          <CardHeader>
            <p className="mb-2 inline-flex w-fit rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300">
              Most Popular
            </p>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              Growth
            </CardTitle>
            <CardDescription className="text-slate-300">
              Built for teams managing many domains and client deployments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 flex items-baseline gap-2">
              <span className="text-4xl font-bold text-white">$39</span>
              <span className="text-slate-400">/ month</span>
            </div>
            <ul className="space-y-3 text-sm text-slate-200">
              {growthFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-400" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <a
              href={process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK}
              className="mt-8 inline-flex w-full items-center justify-center rounded-md bg-emerald-500 px-4 py-2 font-semibold text-black transition hover:bg-emerald-400"
            >
              Buy Growth
            </a>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
