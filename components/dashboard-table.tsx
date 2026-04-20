"use client";

import { Trash2, Zap } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonitorCheckRecord, MonitorRecord } from "@/lib/db/schema";

type DashboardTableProps = {
  monitors: MonitorRecord[];
  checks: MonitorCheckRecord[];
  onRunOne: (monitorId: string) => Promise<void>;
  onDelete: (monitorId: string) => Promise<void>;
};

function statusColor(statusLabel: string | undefined): string {
  if (statusLabel === "healthy") return "text-[var(--success)]";
  if (statusLabel === "warning") return "text-[var(--warning)]";
  return "text-[var(--danger)]";
}

function formatDate(value: string | null): string {
  if (!value) return "Never";
  return new Date(value).toLocaleString();
}

export function DashboardTable({ monitors, checks, onRunOne, onDelete }: DashboardTableProps) {
  const latestByMonitor = new Map<string, MonitorCheckRecord>();
  for (const check of checks) {
    if (!latestByMonitor.has(check.monitor_id)) {
      latestByMonitor.set(check.monitor_id, check);
    }
  }

  const chartData = checks
    .slice(0, 40)
    .reverse()
    .map((check) => ({
      at: new Date(check.checked_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      speed: check.load_time_ms ?? 0,
      seo: check.seo_score ?? 0,
    }));

  return (
    <section className="grid gap-5">
      <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
        <h2 className="text-lg font-semibold">Latest Check Trends</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Speed and SEO score across the most recent scans.</p>

        <div className="mt-4 h-72 w-full">
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <CartesianGrid stroke="#30363d" strokeDasharray="3 3" />
              <XAxis dataKey="at" stroke="#8b949e" tick={{ fill: "#8b949e", fontSize: 12 }} />
              <YAxis yAxisId="left" stroke="#58a6ff" tick={{ fill: "#8b949e", fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" stroke="#3fb950" tick={{ fill: "#8b949e", fontSize: 12 }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#161b22", border: "1px solid #30363d", color: "#f0f6fc" }}
              />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="speed" name="Load (ms)" stroke="#58a6ff" strokeWidth={2} />
              <Line yAxisId="right" type="monotone" dataKey="seo" name="SEO score" stroke="#3fb950" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </article>

      <article className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-black/20 text-xs uppercase tracking-wider text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3">URL</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">HTTP</th>
                <th className="px-4 py-3">SSL Days</th>
                <th className="px-4 py-3">SEO</th>
                <th className="px-4 py-3">Load</th>
                <th className="px-4 py-3">Last Checked</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {monitors.map((monitor) => {
                const check = latestByMonitor.get(monitor.id);
                const statusLabel = check?.status_label ?? "critical";

                return (
                  <tr key={monitor.id} className="border-b border-[var(--border)]/80 last:border-none">
                    <td className="px-4 py-3 align-top">
                      <a href={monitor.url} target="_blank" rel="noreferrer" className="underline decoration-dotted">
                        {monitor.url}
                      </a>
                      <p className="mt-1 text-xs text-[var(--muted)]">source: {monitor.source}</p>
                    </td>
                    <td className={`px-4 py-3 font-semibold capitalize ${statusColor(statusLabel)}`}>{statusLabel}</td>
                    <td className="px-4 py-3">{monitor.latest_status ?? "-"}</td>
                    <td className="px-4 py-3">{monitor.latest_ssl_days_remaining ?? "-"}</td>
                    <td className="px-4 py-3">{monitor.latest_seo_score ?? "-"}</td>
                    <td className="px-4 py-3">
                      {monitor.latest_load_time_ms ? `${monitor.latest_load_time_ms} ms` : "-"}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--muted)]">{formatDate(monitor.last_checked_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onRunOne(monitor.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-xs hover:border-[var(--primary)]"
                        >
                          <Zap className="size-3" />
                          Scan
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(monitor.id)}
                          className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-xs text-[var(--danger)] hover:border-[var(--danger)]"
                        >
                          <Trash2 className="size-3" />
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {monitors.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-[var(--muted)]" colSpan={8}>
                    No URLs added yet. Add your first deployed project above.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
