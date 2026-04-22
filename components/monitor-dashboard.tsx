"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  RefreshCw,
  ShieldAlert,
  Timer
} from "lucide-react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import UrlForm from "@/components/url-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

interface MonitorHistoryPoint {
  checkedAt: string;
  isUp: boolean;
  loadTimeMs: number | null;
  status: number | null;
}

interface MonitorRecord {
  id: number;
  user_id: number;
  name: string;
  url: string;
  status: string;
  latest_http_status: number | null;
  latest_is_up: boolean | null;
  latest_ssl_valid: boolean | null;
  latest_ssl_days_remaining: number | null;
  latest_seo_title: boolean | null;
  latest_seo_description: boolean | null;
  latest_load_time_ms: number | null;
  latest_error: string | null;
  latest_checked_at: string | null;
  uptime_24h: number | null;
  history: MonitorHistoryPoint[];
}

interface MonitorDashboardProps {
  userEmail: string;
}

function formatDateLabel(value: string) {
  const date = new Date(value);
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatAgo(value: string | null) {
  if (!value) {
    return "Not checked yet";
  }

  const now = Date.now();
  const then = new Date(value).getTime();
  const minutes = Math.floor((now - then) / 60000);

  if (minutes <= 1) {
    return "Checked just now";
  }

  if (minutes < 60) {
    return `Checked ${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);
  return `Checked ${hours}h ago`;
}

export default function MonitorDashboard({ userEmail }: MonitorDashboardProps) {
  const [monitors, setMonitors] = useState<MonitorRecord[]>([]);
  const [selectedMonitorId, setSelectedMonitorId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshingId, setRefreshingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const fetchMonitors = useCallback(async () => {
    setError("");

    try {
      const response = await fetch(
        `/api/monitors?email=${encodeURIComponent(userEmail)}`,
        {
          cache: "no-store"
        }
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to load monitors.");
      }

      setMonitors(payload.monitors || []);
      if ((payload.monitors || []).length > 0) {
        setSelectedMonitorId((current) => current ?? payload.monitors[0].id);
      } else {
        setSelectedMonitorId(null);
      }
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    void fetchMonitors();
  }, [fetchMonitors]);

  async function runManualCheck(monitorId: number) {
    setRefreshingId(monitorId);
    setError("");

    try {
      const response = await fetch("/api/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          monitorId,
          email: userEmail
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to run manual check.");
      }

      await fetchMonitors();
    } catch (checkError) {
      setError(checkError instanceof Error ? checkError.message : "Manual check failed.");
    } finally {
      setRefreshingId(null);
    }
  }

  const metrics = useMemo(() => {
    const total = monitors.length;
    const healthy = monitors.filter((monitor) => monitor.latest_is_up).length;
    const warning = monitors.filter((monitor) => {
      if (!monitor.latest_is_up) {
        return true;
      }

      const sslLow =
        monitor.latest_ssl_days_remaining !== null &&
        monitor.latest_ssl_days_remaining <= 14;

      const missingSeo =
        monitor.latest_seo_title === false || monitor.latest_seo_description === false;

      return sslLow || missingSeo;
    }).length;

    const avgResponse =
      monitors
        .map((monitor) => monitor.latest_load_time_ms)
        .filter((value): value is number => typeof value === "number")
        .reduce((sum, value, _, list) => sum + value / list.length, 0) || 0;

    return {
      total,
      healthy,
      warning,
      avgResponse: Math.round(avgResponse)
    };
  }, [monitors]);

  const selectedMonitor =
    monitors.find((monitor) => monitor.id === selectedMonitorId) || monitors[0] || null;

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-slate-800 bg-slate-950/40">
        <p className="text-slate-300">Loading your monitor dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-slate-800 bg-slate-950/60">
          <CardHeader className="pb-3">
            <CardDescription>Total URLs</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Activity className="h-5 w-5 text-emerald-400" />
              {metrics.total}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-slate-800 bg-slate-950/60">
          <CardHeader className="pb-3">
            <CardDescription>Healthy now</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              {metrics.healthy}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-slate-800 bg-slate-950/60">
          <CardHeader className="pb-3">
            <CardDescription>Needs attention</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              {metrics.warning}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-slate-800 bg-slate-950/60">
          <CardHeader className="pb-3">
            <CardDescription>Avg response time</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Gauge className="h-5 w-5 text-cyan-400" />
              {metrics.avgResponse > 0 ? `${metrics.avgResponse} ms` : "n/a"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <UrlForm userEmail={userEmail} onCreated={fetchMonitors} />

      {error ? (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <Card className="border-slate-800 bg-slate-950/60">
        <CardHeader>
          <CardTitle>Active monitors</CardTitle>
          <CardDescription>
            Manual checks run instantly. Automatic checks run every 5 minutes via cron.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {monitors.length === 0 ? (
            <p className="text-sm text-slate-300">
              No monitors yet. Add your first URL above to start receiving health signals.
            </p>
          ) : (
            monitors.map((monitor) => {
              const healthy = Boolean(monitor.latest_is_up);
              const sslWarning =
                monitor.latest_ssl_days_remaining !== null &&
                monitor.latest_ssl_days_remaining <= 14;
              const missingSeo =
                monitor.latest_seo_title === false ||
                monitor.latest_seo_description === false;

              return (
                <article
                  key={monitor.id}
                  className="rounded-lg border border-slate-800 bg-slate-900/60 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <button
                        type="button"
                        onClick={() => setSelectedMonitorId(monitor.id)}
                        className="text-left"
                      >
                        <h3 className="text-lg font-semibold text-white">{monitor.name}</h3>
                        <p className="text-sm text-slate-400">{monitor.url}</p>
                      </button>
                      <p className="mt-2 text-xs text-slate-500">
                        {formatAgo(monitor.latest_checked_at)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          healthy
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-red-500/15 text-red-300"
                        }`}
                      >
                        {healthy ? "Healthy" : "Down"}
                      </span>

                      {sslWarning ? (
                        <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-300">
                          SSL expiring
                        </span>
                      ) : null}

                      {missingSeo ? (
                        <span className="rounded-full bg-cyan-500/15 px-2.5 py-1 text-xs font-semibold text-cyan-300">
                          SEO issue
                        </span>
                      ) : null}

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={refreshingId === monitor.id}
                        onClick={() => runManualCheck(monitor.id)}
                      >
                        <RefreshCw
                          className={`h-4 w-4 ${
                            refreshingId === monitor.id ? "animate-spin" : ""
                          }`}
                        />
                        Run check
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 text-xs text-slate-300 sm:grid-cols-4">
                    <p>
                      HTTP: <span className="font-semibold">{monitor.latest_http_status ?? "n/a"}</span>
                    </p>
                    <p>
                      SSL days: <span className="font-semibold">{monitor.latest_ssl_days_remaining ?? "n/a"}</span>
                    </p>
                    <p>
                      Load: <span className="font-semibold">{monitor.latest_load_time_ms ?? "n/a"} ms</span>
                    </p>
                    <p>
                      24h uptime: <span className="font-semibold">{monitor.uptime_24h ?? 0}%</span>
                    </p>
                  </div>

                  {monitor.latest_error ? (
                    <div className="mt-3 flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                      <ShieldAlert className="mt-0.5 h-4 w-4 flex-none" />
                      <span>{monitor.latest_error}</span>
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </CardContent>
      </Card>

      {selectedMonitor ? (
        <Card className="border-slate-800 bg-slate-950/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Timer className="h-5 w-5 text-cyan-400" />
              Response trend for {selectedMonitor.name}
            </CardTitle>
            <CardDescription>Latest 24 checks (about 2 hours at 5-minute intervals)</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedMonitor.history.length === 0 ? (
              <p className="text-sm text-slate-300">No history yet for this monitor.</p>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={selectedMonitor.history}>
                    <XAxis
                      dataKey="checkedAt"
                      tickFormatter={formatDateLabel}
                      tick={{ fill: "#94a3b8", fontSize: 12 }}
                    />
                    <YAxis
                      yAxisId="ms"
                      tick={{ fill: "#94a3b8", fontSize: 12 }}
                      tickFormatter={(value) => `${value}ms`}
                    />
                    <YAxis
                      yAxisId="up"
                      orientation="right"
                      domain={[0, 1]}
                      tick={{ fill: "#94a3b8", fontSize: 12 }}
                      tickFormatter={(value) => (value === 1 ? "up" : "down")}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#0f172a",
                        border: "1px solid #334155",
                        borderRadius: "0.5rem"
                      }}
                      labelFormatter={(value) =>
                        new Date(value as string).toLocaleString()
                      }
                    />
                    <Line
                      yAxisId="ms"
                      type="monotone"
                      dataKey="loadTimeMs"
                      name="Load time"
                      stroke="#22d3ee"
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                    <Line
                      yAxisId="up"
                      type="stepAfter"
                      dataKey={(entry: MonitorHistoryPoint) => (entry.isUp ? 1 : 0)}
                      name="Uptime"
                      stroke="#34d399"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
