import Link from "next/link";

function appendQuery(base: string, key: string, value: string): string {
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

function getCheckoutBaseUrl(): string {
  const productId = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID;
  const storeId = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_STORE_ID;

  if (!productId || !storeId) {
    return "/dashboard";
  }

  return `https://app.lemonsqueezy.com/checkout/buy/${productId}?store=${storeId}`;
}

export function PricingCards() {
  const checkoutBase = getCheckoutBaseUrl();
  const starterCheckout = appendQuery(checkoutBase, "checkout[custom][plan]", "starter-12");
  const unlimitedCheckout = appendQuery(checkoutBase, "checkout[custom][plan]", "unlimited-39");

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
        <p className="text-sm uppercase tracking-widest text-[var(--muted)]">Starter</p>
        <h3 className="mt-2 text-3xl font-semibold">$12/mo</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">Monitor 10 URLs with every check enabled.</p>
        <ul className="mt-6 space-y-3 text-sm text-[var(--text)]/90">
          <li>5-minute HTTP uptime checks</li>
          <li>SSL expiry countdown with alerts</li>
          <li>SEO tag health score and snapshots</li>
          <li>Speed trend history and regressions</li>
          <li>Email + Slack alert delivery</li>
        </ul>
        <a
          href={starterCheckout}
          className="lemonsqueezy-button mt-8 inline-flex w-full items-center justify-center rounded-lg bg-[var(--primary)] px-4 py-3 font-semibold text-white hover:bg-[var(--primary-soft)]"
        >
          Start Starter Plan
        </a>
      </article>

      <article className="relative rounded-2xl border border-[var(--primary)] bg-gradient-to-b from-[#1a2332] to-[var(--card)] p-6 shadow-lg shadow-blue-950/30">
        <span className="absolute right-4 top-4 rounded-full border border-blue-300/20 bg-blue-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-200">
          Most Popular
        </span>
        <p className="text-sm uppercase tracking-widest text-[var(--muted)]">Unlimited</p>
        <h3 className="mt-2 text-3xl font-semibold">$39/mo</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">Unlimited projects for agencies and serial builders.</p>
        <ul className="mt-6 space-y-3 text-sm text-[var(--text)]/90">
          <li>Unlimited URLs + grouped environments</li>
          <li>Priority queue for near-real-time checks</li>
          <li>Vercel + Netlify auto import</li>
          <li>Incident timeline with recovery notices</li>
          <li>Webhook alert fan-out to team channels</li>
        </ul>
        <a
          href={unlimitedCheckout}
          className="lemonsqueezy-button mt-8 inline-flex w-full items-center justify-center rounded-lg bg-[var(--primary)] px-4 py-3 font-semibold text-white hover:bg-[var(--primary-soft)]"
        >
          Go Unlimited
        </a>
      </article>

      <p className="md:col-span-2 text-sm text-[var(--muted)]">
        Checkout opens in Lemon Squeezy overlay. After payment, use your order number and purchase email to unlock
        <Link href="/dashboard" className="ml-1 text-[var(--primary)] underline underline-offset-4">
          the dashboard
        </Link>
        .
      </p>
    </div>
  );
}
