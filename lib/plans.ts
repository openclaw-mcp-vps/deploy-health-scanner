import type { Subscription } from "@/lib/database";

export function isSubscriptionActive(subscription: Subscription | null) {
  if (!subscription) {
    return false;
  }

  return ["active", "trialing", "on_trial"].includes(subscription.status.toLowerCase());
}

export function getUrlLimitForSubscription(subscription: Subscription | null) {
  if (!subscription) {
    return 0;
  }

  const plan = `${subscription.plan || ""}`.toLowerCase();
  if (plan.includes("unlimited") || plan.includes("39")) {
    return null;
  }

  return 10;
}
