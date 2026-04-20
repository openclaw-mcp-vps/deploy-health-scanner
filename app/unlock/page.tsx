"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function UnlockPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleUnlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email.trim()) {
      setError("Enter the email used during checkout.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/access/unlock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const payload = (await response.json()) as { error?: string; success?: boolean };

      if (!response.ok) {
        throw new Error(payload.error || "Access could not be granted.");
      }

      if (payload.success) {
        setSuccess("Access granted. Redirecting to your dashboard...");
        window.location.href = "/dashboard";
      }
    } catch (unlockError) {
      setError(unlockError instanceof Error ? unlockError.message : "Unable to unlock dashboard.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-16 sm:px-6">
      <div className="w-full rounded-xl border border-slate-800 bg-slate-900/70 p-8">
        <h1 className="text-3xl font-semibold">Unlock your dashboard</h1>
        <p className="mt-2 text-sm text-slate-300">
          Enter the purchase email from Lemon Squeezy to activate your session cookie and access monitoring tools.
        </p>

        <form onSubmit={handleUnlock} className="mt-6 space-y-4">
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@yourdomain.com"
            required
          />

          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-300">{success}</p> : null}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Verifying purchase..." : "Unlock dashboard"}
          </Button>
        </form>

        <p className="mt-6 text-sm text-slate-400">
          Need a plan first? Return to the{" "}
          <Link href="/" className="font-medium text-emerald-300 hover:text-emerald-200">
            pricing section
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
