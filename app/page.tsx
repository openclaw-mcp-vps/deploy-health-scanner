import Link from "next/link";
import {
  Bell,
  Clock3,
  Gauge,
  Globe,
  ShieldCheck,
  Sparkles,
  TrendingDown
} from "lucide-react";

import PricingCards from "@/components/pricing-cards";

const problemPoints = [
  "Uptime-only tools miss SSL expiry and hidden SEO breakage.",
  "Launch-day monitoring often fails to cover marketing pages and docs.",
  "Performance regressions show up in churn before they show up in analytics."
];

const solutionCards = [
  {
    icon: Globe,
    title: "HTTP + uptime every 5 min",
    description:
      "Detect hard downtime, redirect loops, and unstable status codes before customers report them."
  },
  {
    icon: ShieldCheck,
    title: "SSL validity and expiry",
    description:
      "Track certificate health and get warned before renewals become outages."
  },
  {
    icon: Sparkles,
    title: "SEO tag integrity",
    description:
      "Catch missing title and description tags after deploys, CMS updates, or refactors."
  },
  {
    icon: Gauge,
    title: "Page speed monitoring",
    description:
      "Spot slowdowns by URL and trend response time from your dashboard."
  }
];

const faqs = [
  {
    question: "How is this different from UptimeRobot?",
    answer:
      "UptimeRobot is excellent for status checks, but it does not bundle SSL expiry, SEO meta validation, and speed checks in one workflow for product URLs. Deploy Health Scanner does."
  },
  {
    question: "Can I monitor private staging URLs?",
    answer:
      "Yes, if they are publicly reachable from our worker. Most founders use it for production domains and docs sites."
  },
  {
    question: "How do alerts work?",
    answer:
      "Email alerts are built-in. You can also attach one or multiple Slack webhooks per account."
  },
  {
    question: "What unlocks paid access?",
    answer:
      "After purchase via Stripe Checkout, your email is marked as active. In the dashboard, submit the same email once to set your access cookie and unlock the app."
  }
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-800/90 bg-[#0d1117]/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-wide text-slate-200">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Deploy Health Scanner
          </div>
          <nav className="flex items-center gap-3 text-sm">
            <a className="text-slate-300 hover:text-white" href="#pricing">
              Pricing
            </a>
            <a className="text-slate-300 hover:text-white" href="#faq">
              FAQ
            </a>
            <Link
              href="/dashboard"
              className="rounded-md border border-slate-700 px-3 py-1.5 font-semibold text-slate-100 hover:bg-slate-800"
            >
              Dashboard
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-20 sm:px-6 lg:px-8 lg:pt-24">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                <Clock3 className="h-3.5 w-3.5" />
                Continuous Deploy Monitoring
              </p>
              <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl">
                Deploy Health Scanner
                <span className="mt-2 block text-2xl font-medium text-slate-300 sm:text-3xl">
                  continuous uptime + SSL + SEO checks for all your projects
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-lg text-slate-300">
                Paste URLs or connect your deployed properties. Every 5 minutes we verify status,
                certificate health, SEO essentials, and response speed, then alert your team via
                email or Slack.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a
                  href={process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK}
                  className="rounded-md bg-emerald-500 px-5 py-3 font-semibold text-black hover:bg-emerald-400"
                >
                  Start with Stripe Checkout
                </a>
                <Link
                  href="/dashboard"
                  className="rounded-md border border-slate-700 px-5 py-3 font-semibold text-slate-100 hover:bg-slate-800"
                >
                  Open dashboard
                </Link>
              </div>
              <p className="mt-3 text-sm text-slate-400">
                Built for indie founders managing 5-50 deployed projects.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-6 shadow-2xl shadow-black/30">
              <h2 className="text-lg font-semibold text-white">What breaks most often after deploys</h2>
              <ul className="mt-4 space-y-3 text-sm text-slate-300">
                {problemPoints.map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <TrendingDown className="mt-0.5 h-4 w-4 flex-none text-rose-400" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                Replace four fragmented tools with one focused scanner aligned to deployed app
                health.
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-2">
            {solutionCards.map((item) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-5"
                >
                  <div className="mb-3 inline-flex rounded-md border border-cyan-400/30 bg-cyan-500/10 p-2 text-cyan-300">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm text-slate-300">{item.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-slate-800 bg-gradient-to-r from-slate-950/80 to-slate-900/80 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white">Alerts where you already work</h3>
                <p className="mt-1 text-sm text-slate-300">
                  Immediate email and Slack notifications with enough context to act quickly.
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-200">
                <span className="inline-flex items-center gap-2">
                  <Bell className="h-4 w-4 text-emerald-400" />
                  Email
                </span>
                <span className="inline-flex items-center gap-2">
                  <Bell className="h-4 w-4 text-cyan-400" />
                  Slack
                </span>
              </div>
            </div>
          </div>
        </section>

        <PricingCards />

        <section id="faq" className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white">Frequently asked questions</h2>
          <div className="mt-8 space-y-4">
            {faqs.map((faq) => (
              <article key={faq.question} className="rounded-lg border border-slate-800 bg-slate-950/60 p-5">
                <h3 className="text-lg font-semibold text-white">{faq.question}</h3>
                <p className="mt-2 text-sm text-slate-300">{faq.answer}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800 py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>Deploy Health Scanner</p>
          <p>5-minute checks for status, SSL, SEO, and speed.</p>
        </div>
      </footer>
    </div>
  );
}
