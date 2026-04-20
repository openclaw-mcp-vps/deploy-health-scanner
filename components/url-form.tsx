"use client";

import { useState } from "react";
import { Link2, Loader2, Plus, RefreshCw } from "lucide-react";
import { getTRPCClient } from "@/lib/trpc/client";

type UrlFormProps = {
  onRefresh: () => Promise<void>;
};

export function UrlForm({ onRefresh }: UrlFormProps) {
  const trpc = getTRPCClient();

  const [url, setUrl] = useState("");
  const [vercelToken, setVercelToken] = useState("");
  const [netlifyToken, setNetlifyToken] = useState("");
  const [busyAction, setBusyAction] = useState<"none" | "add" | "vercel" | "netlify">("none");
  const [message, setMessage] = useState<string>("");

  async function addUrl() {
    if (!url.trim()) {
      setMessage("Add a valid URL first.");
      return;
    }

    setBusyAction("add");
    setMessage("");

    try {
      await trpc.monitors.add.mutate({ url: url.trim() });
      setUrl("");
      setMessage("URL added and queued for scanning.");
      await onRefresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to add URL.");
    } finally {
      setBusyAction("none");
    }
  }

  async function importFromVercel() {
    setBusyAction("vercel");
    setMessage("");

    try {
      const result = await trpc.monitors.importFromVercel.mutate({ token: vercelToken.trim() || undefined });
      setMessage(`Imported ${result.imported} of ${result.discovered} Vercel project URLs.`);
      await onRefresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to import from Vercel.");
    } finally {
      setBusyAction("none");
    }
  }

  async function importFromNetlify() {
    setBusyAction("netlify");
    setMessage("");

    try {
      const result = await trpc.monitors.importFromNetlify.mutate({ token: netlifyToken.trim() || undefined });
      setMessage(`Imported ${result.imported} of ${result.discovered} Netlify site URLs.`);
      await onRefresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to import from Netlify.");
    } finally {
      setBusyAction("none");
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="flex items-center gap-3">
        <div className="rounded-md border border-[var(--border)] bg-black/10 p-2">
          <Link2 className="size-4 text-[var(--muted)]" />
        </div>
        <h2 className="text-lg font-semibold">Add URLs or Sync Deployments</h2>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          type="url"
          placeholder="https://your-app.com"
          className="w-full rounded-lg border border-[var(--border)] bg-[#0f141a] px-4 py-3 text-sm outline-none ring-[var(--primary)]/60 transition focus:ring"
        />
        <button
          onClick={addUrl}
          disabled={busyAction !== "none"}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--primary-soft)] disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
        >
          {busyAction === "add" ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Add URL
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-[var(--border)] bg-black/10 p-4">
          <h3 className="font-medium">Import from Vercel</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">Uses `VERCEL_API_TOKEN` if field is empty.</p>
          <input
            value={vercelToken}
            onChange={(event) => setVercelToken(event.target.value)}
            type="password"
            placeholder="Optional Vercel token"
            className="mt-3 w-full rounded-lg border border-[var(--border)] bg-[#0f141a] px-3 py-2 text-sm outline-none ring-[var(--primary)]/60 focus:ring"
          />
          <button
            type="button"
            onClick={importFromVercel}
            disabled={busyAction !== "none"}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium hover:border-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busyAction === "vercel" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Sync Vercel Projects
          </button>
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-black/10 p-4">
          <h3 className="font-medium">Import from Netlify</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">Uses `NETLIFY_API_TOKEN` if field is empty.</p>
          <input
            value={netlifyToken}
            onChange={(event) => setNetlifyToken(event.target.value)}
            type="password"
            placeholder="Optional Netlify token"
            className="mt-3 w-full rounded-lg border border-[var(--border)] bg-[#0f141a] px-3 py-2 text-sm outline-none ring-[var(--primary)]/60 focus:ring"
          />
          <button
            type="button"
            onClick={importFromNetlify}
            disabled={busyAction !== "none"}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium hover:border-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busyAction === "netlify" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Sync Netlify Sites
          </button>
        </div>
      </div>

      {message ? <p className="mt-4 text-sm text-[var(--muted)]">{message}</p> : null}
    </section>
  );
}
