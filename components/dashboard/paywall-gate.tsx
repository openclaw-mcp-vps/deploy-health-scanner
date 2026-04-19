"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

declare global {
  interface Window {
    LemonSqueezy?: {
      Url?: {
        Open: (url: string) => void;
      };
    };
  }
}

type Plan = "starter" | "unlimited";

export function PaywallGate() {
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<Plan>("starter");
  const [busyAction, setBusyAction] = useState<"checkout" | "claim" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = async (): Promise<void> => {
    setBusyAction("checkout");
    setError(null);
    setMessage(null);

    const response = await fetch("/api/payments/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, plan }),
    });

    const payload = (await response.json().catch(() => null)) as { checkoutUrl?: string; error?: string } | null;

    if (!response.ok || !payload?.checkoutUrl) {
      setError(payload?.error ?? "Unable to create checkout session.");
      setBusyAction(null);
      return;
    }

    setMessage("Checkout opened. Complete payment, then click Unlock Dashboard.");

    if (window.LemonSqueezy?.Url?.Open) {
      window.LemonSqueezy.Url.Open(payload.checkoutUrl);
    } else {
      window.open(payload.checkoutUrl, "_blank", "noopener,noreferrer");
    }

    setBusyAction(null);
  };

  const claimAccess = async (): Promise<void> => {
    setBusyAction("claim");
    setError(null);
    setMessage(null);

    const response = await fetch("/api/payments/claim", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setError(payload?.error ?? "Unable to verify purchase yet.");
      setBusyAction(null);
      return;
    }

    setMessage("Purchase confirmed. Loading dashboard...");
    window.location.reload();
  };

  return (
    <Card className="mx-auto max-w-xl border-cyan-500/30">
      <CardHeader>
        <CardTitle>Unlock the monitoring dashboard</CardTitle>
        <CardDescription>
          Purchase access to start continuous checks every 5 minutes with email and Slack incident alerts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-slate-300" htmlFor="purchase-email">
            Work email
          </label>
          <Input
            id="purchase-email"
            inputMode="email"
            placeholder="founder@yourstartup.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            className={`rounded-md border px-4 py-3 text-left transition ${
              plan === "starter"
                ? "border-cyan-400 bg-cyan-500/10 text-cyan-100"
                : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
            }`}
            onClick={() => setPlan("starter")}
            type="button"
          >
            <p className="font-medium">Starter · $12/mo</p>
            <p className="mt-1 text-xs text-slate-400">Up to 10 URLs</p>
          </button>

          <button
            className={`rounded-md border px-4 py-3 text-left transition ${
              plan === "unlimited"
                ? "border-cyan-400 bg-cyan-500/10 text-cyan-100"
                : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
            }`}
            onClick={() => setPlan("unlimited")}
            type="button"
          >
            <p className="font-medium">Unlimited · $39/mo</p>
            <p className="mt-1 text-xs text-slate-400">Unlimited URLs</p>
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button disabled={!email || busyAction !== null} onClick={startCheckout}>
            {busyAction === "checkout" ? "Opening checkout..." : "Open Lemon Squeezy checkout"}
          </Button>
          <Button disabled={!email || busyAction !== null} onClick={claimAccess} variant="secondary">
            {busyAction === "claim" ? "Verifying..." : "Unlock dashboard"}
          </Button>
        </div>

        {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <p className="text-xs text-slate-400">
          After checkout completes, Lemon Squeezy sends a webhook to activate your account. Then click Unlock Dashboard to set your
          secure access cookie.
        </p>
      </CardContent>
    </Card>
  );
}
