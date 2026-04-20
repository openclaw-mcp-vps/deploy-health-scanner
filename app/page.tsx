import Link from "next/link";
import { Activity, Bell, Gauge, ShieldCheck, Tags } from "lucide-react";
import { PricingCards } from "@/components/pricing-cards";

const problems = [
  {
    title: "Status checks miss hidden failures",
    body: "A homepage can return 200 while your SEO tags disappear, SSL cert nears expiration, or load time doubles after deployment.",
  },
  {
    title: "Fragmented tooling wastes time",
    body: "Founders jump between uptime dashboards, SSL reminders, and SEO audits instead of getting one actionable incident timeline.",
  },
  {
    title: "Deploy velocity introduces risk",
    body: "Shipping quickly across multiple projects means breakage often lands in production before anyone notices.",
  },
];

const features = [
  {
    icon: Activity,
    title: "Uptime and HTTP health",
    body: "Checks every 5 minutes with incident + recovery detection and a rolling history of failures.",
  },
  {
    icon: ShieldCheck,
    title: "SSL expiry tracking",
    body: "Certificate validity is tracked continuously so you catch expiring certs before traffic gets blocked.",
  },
  {
    icon: Tags,
    title: "SEO metadata validation",
    body: "Title, description, canonical, robots, and Open Graph fields are scored and diffed over time.",
  },
  {
    icon: Gauge,
    title: "Page speed trend monitoring",
    body: "Measures load timing on every scan so performance regressions surface instantly.",
  },
  {
    icon: Bell,
    title: "Email and Slack alerts",
    body: "Receive alerts on incidents, SSL risk, SEO regressions, and recovery events in your team channels.",
  },
];

const faqs = [
  {
    question: "How often are checks run?",
    answer: "Every monitored URL is queued every 5 minutes, with manual scans available from the dashboard when you need immediate validation.",
  },
  {
    question: "Can I import projects instead of adding URLs one by one?",
    answer: "Yes. Connect Vercel or Netlify API tokens and Deploy Health Scanner imports active project URLs automatically.",
  },
  {
    question: "How does paid access work?",
    answer: "After Lemon Squeezy checkout, your order and email are validated and a secure access cookie unlocks the dashboard.",
  },
  {
    question: "Who is this built for?",
    answer: "Indie founders and small teams managing 5-50 deployed apps that need one reliable health view for uptime, SSL, SEO, and speed.",
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-5 pb-20 pt-8 sm:px-8 lg:px-10">
      <header className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-black/20 px-4 py-3">
        <p className="text-sm font-medium tracking-wide">Deploy Health Scanner</p>
        <nav className="flex items-center gap-4 text-sm text-[var(--muted)]">
          <a href="#pricing" className="hover:text-[var(--text)]">
            Pricing
          </a>
          <a href="#faq" className="hover:text-[var(--text)]">
            FAQ
          </a>
          <Link href="/dashboard" className="rounded-md border border-[var(--border)] px-3 py-1.5 text-[var(--text)] hover:border-[var(--primary)]">
            Dashboard
          </Link>
        </nav>
      </header>

      <section className="relative mt-10 overflow-hidden rounded-3xl border border-[var(--border)] bg-gradient-to-br from-[#14253f] via-[#0f1722] to-[#0d1117] p-8 sm:p-12">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.24em] text-blue-200/80">Continuous uptime + SSL + SEO + speed</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
            Deploy Health Scanner keeps every deployed project trustworthy around the clock.
          </h1>
          <p className="mt-6 text-base text-[var(--text)]/80 sm:text-lg">
            Paste URLs or connect Vercel and Netlify. We run health checks every 5 minutes for HTTP status, SSL
            expiry, critical SEO tags, and load speed, then alert you through email or Slack before customers notice.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-lg bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--primary-soft)]"
            >
              Open Dashboard
            </Link>
            <a
              href="#pricing"
              className="rounded-lg border border-[var(--border)] px-5 py-3 text-sm font-semibold text-[var(--text)] hover:border-[var(--primary)]"
            >
              View Pricing
            </a>
          </div>
          <p className="mt-6 text-sm text-[var(--muted)]">Positioned between UptimeRobot and Checkly for founders who need broader checks without enterprise overhead.</p>
        </div>
      </section>

      <section className="mt-12 grid gap-4 md:grid-cols-3">
        {problems.map((problem) => (
          <article key={problem.title} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
            <h2 className="text-lg font-semibold">{problem.title}</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">{problem.body}</p>
          </article>
        ))}
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold sm:text-3xl">One monitor stack for real production risk</h2>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted)] sm:text-base">
          Deploy Health Scanner merges availability, trust signals, and performance checks so you ship faster without
          blind spots.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article key={feature.title} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
                <Icon className="size-5 text-[var(--primary)]" />
                <h3 className="mt-3 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-[var(--muted)]">{feature.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="pricing" className="mt-16">
        <h2 className="text-2xl font-semibold sm:text-3xl">Simple pricing for builders shipping fast</h2>
        <p className="mt-2 text-sm text-[var(--muted)] sm:text-base">
          Choose a plan based on project count. Every plan includes uptime, SSL, SEO, speed checks, and alerting.
        </p>
        <div className="mt-6">
          <PricingCards />
        </div>
      </section>

      <section id="faq" className="mt-16">
        <h2 className="text-2xl font-semibold sm:text-3xl">Frequently asked questions</h2>
        <div className="mt-5 grid gap-4">
          {faqs.map((faq) => (
            <article key={faq.question} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
              <h3 className="text-lg font-medium">{faq.question}</h3>
              <p className="mt-2 text-sm text-[var(--muted)]">{faq.answer}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
