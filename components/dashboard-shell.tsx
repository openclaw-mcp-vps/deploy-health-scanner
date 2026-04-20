"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { DashboardTable } from "@/components/dashboard-table";
import { UrlForm } from "@/components/url-form";
import type { MonitorCheckRecord, MonitorRecord } from "@/lib/db/schema";
import { getTRPCClient } from "@/lib/trpc/client";

type DashboardShellProps = {
  planName: string;
  email: string;
};

export function DashboardShell({ planName, email }: DashboardShellProps) {
  const trpc = getTRPCClient();

  const [monitors, setMonitors] = useState<MonitorRecord[]>([]);
  const [checks, setChecks] = useState<MonitorCheckRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningAll, setRunningAll] = useState(false);
  const [error, setError] = useState<string>("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await trpc.monitors.dashboard.query();
      setMonitors(data.monitors);
      setChecks(data.checks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [trpc]);

  async function runAllDue() {
    setRunningAll(true);
    setError("");

    try {
      await trpc.monitors.triggerDue.mutate();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to run checks.");
    } finally {
      setRunningAll(false);
    }
  }

  async function runOne(monitorId: string) {
    setError("");

    try {
      await trpc.monitors.triggerOne.mutate({ monitorId });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to run monitor scan.");
    }
  }

  async function removeOne(monitorId: string) {
    setError("");

    try {
      await trpc.monitors.remove.mutate({ monitorId });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove monitor.");
    }
  }

  useEffect(() => {
    refresh().catch((err) => {
      setError(err instanceof Error ? err.message : "Unable to load dashboard.");
      setLoading(false);
    });
  }, [refresh]);

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
        <p className="text-xs uppercase tracking-widest text-[var(--muted)]">Paid Access Active</p>
        <h1 className="mt-2 text-3xl font-semibold">Deploy Health Scanner Dashboard</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
          Plan: <span className="font-medium text-[var(--text)]">{planName}</span> | Subscription email:
          <span className="ml-1 font-medium text-[var(--text)]">{email}</span>
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={runAllDue}
            disabled={runningAll}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-soft)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCcw className={`size-4 ${runningAll ? "animate-spin" : ""}`} />
            Run Due Checks Now
          </button>
          <button
            type="button"
            onClick={() => refresh()}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm hover:border-[var(--primary)]"
          >
            Refresh Data
          </button>
        </div>
      </header>

      <UrlForm onRefresh={refresh} />

      {error ? (
        <div className="rounded-lg border border-[var(--danger)]/40 bg-red-950/20 px-4 py-3 text-sm text-red-200">{error}</div>
      ) : null}

      {loading ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-6 text-sm text-[var(--muted)]">
          Loading monitors and recent checks...
        </div>
      ) : (
        <DashboardTable monitors={monitors} checks={checks} onRunOne={runOne} onDelete={removeOne} />
      )}
    </div>
  );
}
