import Link from "next/link";
import { cookies } from "next/headers";
import { DashboardShell } from "@/components/dashboard-shell";
import { PricingCards } from "@/components/pricing-cards";
import { ACCESS_COOKIE_NAME, verifyAccessCookie } from "@/lib/auth/paywall";

type DashboardPageProps = {
  searchParams?: Promise<{
    unlock?: string;
  }>;
};

export const dynamic = "force-dynamic";

function renderUnlockMessage(unlockCode?: string): string {
  if (unlockCode === "success") {
    return "Subscription validated. Your dashboard is now unlocked.";
  }

  if (unlockCode === "not-found") {
    return "No paid subscription matched that order + email. Use the same email used during checkout.";
  }

  if (unlockCode === "missing-fields") {
    return "Enter both order ID and email to unlock dashboard access.";
  }

  return "";
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const cookieStore = await cookies();
  const accessCookie = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
  const access = verifyAccessCookie(accessCookie);

  if (access.valid && access.payload) {
    return (
      <main className="mx-auto max-w-6xl px-5 pb-16 pt-8 sm:px-8 lg:px-10">
        <DashboardShell planName={access.payload.planName} email={access.payload.email} />
      </main>
    );
  }

  const unlockMessage = renderUnlockMessage(resolvedSearchParams?.unlock);
  const checkoutUrl =
    process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID && process.env.NEXT_PUBLIC_LEMON_SQUEEZY_STORE_ID
      ? `https://app.lemonsqueezy.com/checkout/buy/${process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID}?store=${process.env.NEXT_PUBLIC_LEMON_SQUEEZY_STORE_ID}`
      : "/#pricing";

  return (
    <main className="mx-auto max-w-5xl px-5 pb-16 pt-8 sm:px-8 lg:px-10">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-7">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Paid Tool Access</p>
        <h1 className="mt-2 text-3xl font-semibold">Unlock the monitoring dashboard</h1>
        <p className="mt-3 max-w-3xl text-sm text-[var(--muted)]">
          The full scanner is behind the subscription paywall. Complete checkout, then enter your Lemon Squeezy order
          number and purchase email to activate your secure dashboard cookie.
        </p>

        {unlockMessage ? (
          <div className="mt-4 rounded-lg border border-[var(--border)] bg-black/20 px-4 py-3 text-sm">{unlockMessage}</div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={checkoutUrl}
            className="lemonsqueezy-button rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-soft)]"
          >
            Start Checkout
          </a>
          <Link
            href="/"
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold hover:border-[var(--primary)]"
          >
            Back to Landing
          </Link>
        </div>

        <form action="/api/paywall/unlock" method="post" className="mt-8 grid gap-4 rounded-xl border border-[var(--border)] bg-black/15 p-5 sm:grid-cols-2">
          <div>
            <label htmlFor="orderId" className="mb-1 block text-sm font-medium">
              Lemon Squeezy Order ID
            </label>
            <input
              id="orderId"
              name="orderId"
              required
              placeholder="e.g. 734112"
              className="w-full rounded-lg border border-[var(--border)] bg-[#0f141a] px-3 py-2 text-sm outline-none ring-[var(--primary)]/60 focus:ring"
            />
          </div>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              Checkout Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@company.com"
              className="w-full rounded-lg border border-[var(--border)] bg-[#0f141a] px-3 py-2 text-sm outline-none ring-[var(--primary)]/60 focus:ring"
            />
          </div>
          <button
            type="submit"
            className="sm:col-span-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-soft)]"
          >
            Unlock Dashboard
          </button>
        </form>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">Choose your plan</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Starter covers up to 10 deployed URLs. Unlimited is built for founders and agencies running many projects.
        </p>
        <div className="mt-6">
          <PricingCards />
        </div>
      </section>
    </main>
  );
}
