"use client";

import Script from "next/script";
import Link from "next/link";

import { CheckCircle2, ShieldCheck, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

declare global {
  interface Window {
    createLemonSqueezy?: () => void;
    LemonSqueezy?: {
      Url?: {
        Open: (url: string) => void;
      };
    };
  }
}

function buildCheckoutUrl() {
  const productId = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID;
  const storeId = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_STORE_ID;

  if (!productId) {
    return "";
  }

  if (productId.startsWith("http://") || productId.startsWith("https://")) {
    return productId;
  }

  if (productId.includes("/buy/")) {
    return `https://${productId}`;
  }

  // Supports the common public Lemon Squeezy checkout slug format.
  if (storeId) {
    return `https://${storeId}.lemonsqueezy.com/buy/${productId}?embed=1&media=0&logo=0`;
  }

  return `https://checkout.lemonsqueezy.com/buy/${productId}?embed=1&media=0&logo=0`;
}

function openCheckout() {
  const checkoutUrl = buildCheckoutUrl();

  if (!checkoutUrl) {
    return;
  }

  if (typeof window !== "undefined") {
    window.createLemonSqueezy?.();
    if (window.LemonSqueezy?.Url?.Open) {
      window.LemonSqueezy.Url.Open(checkoutUrl);
      return;
    }

    window.open(checkoutUrl, "_blank", "noopener,noreferrer");
  }
}

export function PricingTable() {
  return (
    <section id="pricing" className="space-y-8">
      <Script src="https://app.lemonsqueezy.com/js/lemon.js" strategy="afterInteractive" />
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Simple pricing for real deployment risk</h2>
        <p className="mt-3 text-base text-slate-300">
          Built for indie founders running real products. Start small, then move to unlimited when your portfolio grows.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <ShieldCheck className="size-5 text-emerald-400" />
              Starter
            </CardTitle>
            <CardDescription>10 URLs for the projects that pay your bills.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-4xl font-semibold">$12/mo</p>
              <p className="text-sm text-slate-400">Status, SSL, SEO and speed checks every 5 minutes.</p>
            </div>
            <ul className="space-y-3 text-sm text-slate-200">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-400" />
                5-minute cron checks across all URLs
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-400" />
                Email + Slack webhook alerts
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-400" />
                Historical trend dashboard
              </li>
            </ul>
            <Button className="w-full" onClick={openCheckout}>
              Start Starter Plan
            </Button>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/50 bg-emerald-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Zap className="size-5 text-emerald-300" />
              Unlimited
            </CardTitle>
            <CardDescription>For studios, agencies and serial builders.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-4xl font-semibold">$39/mo</p>
              <p className="text-sm text-slate-300">Unlimited URLs with the same health engine and alerting pipeline.</p>
            </div>
            <ul className="space-y-3 text-sm text-slate-100">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-300" />
                Unlimited monitored deployments
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-300" />
                Priority cron processing
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-300" />
                Best for 20+ active client projects
              </li>
            </ul>
            <Button className="w-full" onClick={openCheckout}>
              Start Unlimited Plan
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 text-sm text-slate-300">
        Already purchased? Unlock your dashboard in under 30 seconds on the{" "}
        <Link className="font-semibold text-emerald-300 hover:text-emerald-200" href="/unlock">
          access page
        </Link>
        .
      </div>
    </section>
  );
}
