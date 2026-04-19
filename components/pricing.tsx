import { Check } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const pricingTiers = [
  {
    name: "Starter",
    price: "$12",
    cadence: "/month",
    description: "For founders running a handful of product sites and landing pages.",
    features: [
      "Up to 10 monitored URLs",
      "Checks every 5 minutes",
      "Uptime + SSL + SEO + load speed",
      "Email alerts with incident timeline",
      "14-day check history",
    ],
  },
  {
    name: "Unlimited",
    price: "$39",
    cadence: "/month",
    description: "For agencies and indie studios tracking everything they deploy.",
    features: [
      "Unlimited URLs and projects",
      "Team-ready Slack alerts",
      "90-day check and alert history",
      "Instant incident digest",
      "Priority support",
    ],
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-6 py-20">
      <div className="mb-10 text-center">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">Pricing</p>
        <h2 className="text-3xl font-semibold text-slate-100 md:text-4xl">Simple pricing between basic pings and enterprise tooling</h2>
        <p className="mx-auto mt-3 max-w-3xl text-slate-400">
          Deploy Health Scanner gives you deeper checks than status-only tools without pushing you into enterprise pricing.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {pricingTiers.map((tier) => (
          <Card key={tier.name} className="relative overflow-hidden border-slate-700/70">
            <CardHeader>
              <CardTitle className="text-2xl">{tier.name}</CardTitle>
              <CardDescription>{tier.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-4xl font-semibold text-cyan-300">
                {tier.price}
                <span className="text-base font-normal text-slate-400">{tier.cadence}</span>
              </p>
              <ul className="space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-slate-300">
                    <Check className="mt-0.5 h-4 w-4 text-emerald-400" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
