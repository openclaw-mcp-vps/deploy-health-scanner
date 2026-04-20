"use client";

import { type FormEvent, useState } from "react";

import { DownloadCloud, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ProviderImportFormProps = {
  onImported: () => void;
};

export function ProviderImportForm({ onImported }: ProviderImportFormProps) {
  const [provider, setProvider] = useState<"vercel" | "netlify">("vercel");
  const [token, setToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);

    if (!token.trim()) {
      setError("API token is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/checks/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider,
          token,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        imported?: number;
        skipped?: number;
        totalDiscovered?: number;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Import request failed.");
      }

      setResult(
        `Imported ${payload.imported ?? 0} project URLs from ${provider}. Skipped ${payload.skipped ?? 0}.`,
      );
      setToken("");
      onImported();
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Unable to import provider URLs.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-50">Connect deployment provider</h2>
        <p className="text-sm text-slate-400">
          Import live URLs from Vercel or Netlify with a read token, then run initial checks automatically.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-[180px_1fr]">
        <select
          value={provider}
          onChange={(event) => setProvider(event.target.value as "vercel" | "netlify")}
          className="h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70"
        >
          <option value="vercel">Vercel</option>
          <option value="netlify">Netlify</option>
        </select>
        <Input
          type="password"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder={`Paste ${provider} personal access token`}
          autoComplete="off"
        />
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {result ? <p className="text-sm text-emerald-300">{result}</p> : null}

      <div className="flex justify-end">
        <Button type="submit" variant="outline" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <DownloadCloud className="size-4" />
              Import URLs
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
