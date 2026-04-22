import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Lock, ShieldCheck } from "lucide-react";

import MonitorDashboard from "@/components/monitor-dashboard";
import PricingCards from "@/components/pricing-cards";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Manage your monitored URLs, run checks, and track uptime, SSL, SEO, and page-speed health from one dashboard."
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const paidAccess = cookieStore.get("dhs_paid")?.value === "1";
  const email = cookieStore.get("dhs_email")?.value || "";

  if (!paidAccess || !email) {
    return (
      <main className="min-h-screen bg-[#0d1117] px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-4xl rounded-2xl border border-slate-800 bg-slate-950/70 p-8">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-300">
            <Lock className="h-3.5 w-3.5" />
            Paid Feature
          </p>
          <h1 className="text-3xl font-bold text-white">Unlock the monitoring dashboard</h1>
          <p className="mt-3 text-slate-300">
            Complete checkout, then enter the same purchase email to activate your cookie-based
            access.
          </p>

          <form
            action="/api/access"
            method="post"
            className="mt-6 grid gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 sm:grid-cols-[1fr_auto]"
          >
            <Input
              required
              type="email"
              name="email"
              placeholder="you@yourdomain.com"
              className="w-full"
            />
            <button
              type="submit"
              className="rounded-md bg-emerald-500 px-4 py-2 font-semibold text-black transition hover:bg-emerald-400"
            >
              Verify purchase
            </button>
          </form>

          <p className="mt-3 text-xs text-slate-400">
            Stripe webhooks mark your email as active. If verification fails, check that you used
            the exact email from checkout.
          </p>
        </div>

        <div className="mx-auto mt-10 w-full max-w-6xl">
          <PricingCards />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0d1117] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="rounded-xl border border-slate-800 bg-slate-950/60 p-6">
          <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            Active Subscription
          </p>
          <h1 className="text-3xl font-bold text-white">Monitoring Dashboard</h1>
          <p className="mt-2 text-slate-300">
            Signed in as <span className="font-semibold text-slate-100">{email}</span>. Add URLs,
            run checks, and review recent health trends.
          </p>
        </header>

        <MonitorDashboard userEmail={email} />
      </div>
    </main>
  );
}
