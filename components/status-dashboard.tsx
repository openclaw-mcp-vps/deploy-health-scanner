"use client";

import { useEffect, useMemo, useState } from "react";

import {
  AlertTriangle,
  Activity,
  CircleCheckBig,
  Clock3,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type CheckSummary = {
  status: "healthy" | "warning" | "critical";
  httpStatus: number | null;
  responseTimeMs: number | null;
  sslDaysRemaining: number | null;
  pageSpeedScore: number | null;
  error: string | null;
  checkedAt: string | null;
};

type CheckHistoryItem = {
  id: number;
  checkedAt: string;
  status: "healthy" | "warning" | "critical";
  httpStatus: number | null;
  responseTimeMs: number | null;
  pageSpeedScore: number | null;
};

type UrlEntry = {
  id: number;
  url: string;
  displayName: string | null;
  createdAt: string;
  lastCheckedAt: string | null;
  latest: CheckSummary | null;
  history: CheckHistoryItem[];
};

type ApiPayload = {
  urls: UrlEntry[];
};

const STATUS_STYLES: Record<CheckSummary["status"], string> = {
  healthy: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
  warning: "text-amber-300 bg-amber-500/10 border-amber-500/30",
  critical: "text-red-300 bg-red-500/10 border-red-500/30",
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatNumber(value: number | null, suffix = "") {
  return value === null ? "n/a" : `${value}${suffix}`;
}

type StatusDashboardProps = {
  refreshToken?: number;
};

export function StatusDashboard({ refreshToken = 0 }: StatusDashboardProps) {
  const [urls, setUrls] = useState<UrlEntry[]>([]);
  const [selectedUrlId, setSelectedUrlId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadData() {
    try {
      const response = await fetch("/api/checks", { cache: "no-store" });
      const payload = (await response.json()) as ApiPayload & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Failed to fetch checks.");
      }

      setUrls(payload.urls);
      if (!selectedUrlId && payload.urls.length > 0) {
        setSelectedUrlId(payload.urls[0].id);
      }
      if (payload.urls.length === 0) {
        setSelectedUrlId(null);
      }
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load dashboard data.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    const timer = setInterval(() => {
      void loadData();
    }, 60000);

    return () => clearInterval(timer);
  }, [refreshToken]);

  const selectedUrl = useMemo(
    () => urls.find((entry) => entry.id === selectedUrlId) ?? urls[0] ?? null,
    [selectedUrlId, urls],
  );

  const totals = useMemo(() => {
    return urls.reduce(
      (acc, url) => {
        if (!url.latest) {
          return acc;
        }

        acc.total += 1;
        acc[url.latest.status] += 1;
        return acc;
      },
      {
        total: 0,
        healthy: 0,
        warning: 0,
        critical: 0,
      },
    );
  }, [urls]);

  const chartData = useMemo(() => {
    if (!selectedUrl) {
      return [] as Array<{
        timestamp: string;
        responseTimeMs: number | null;
        pageSpeedScore: number | null;
        httpStatus: number | null;
      }>;
    }

    return [...selectedUrl.history]
      .reverse()
      .map((item) => ({
        timestamp: formatDateTime(item.checkedAt),
        responseTimeMs: item.responseTimeMs,
        pageSpeedScore: item.pageSpeedScore,
        httpStatus: item.httpStatus,
      }));
  }, [selectedUrl]);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-8 text-slate-300">
        <div className="flex items-center gap-3">
          <Loader2 className="size-5 animate-spin" />
          Loading monitor data...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Tracked projects</CardDescription>
            <CardTitle className="text-2xl">{totals.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-emerald-300">Healthy</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl text-emerald-300">
              <CircleCheckBig className="size-5" />
              {totals.healthy}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-amber-300">Warning</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl text-amber-300">
              <AlertTriangle className="size-5" />
              {totals.warning}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-red-300">Critical</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl text-red-300">
              <ShieldAlert className="size-5" />
              {totals.critical}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {error ? (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="pt-6">
            <p className="text-sm text-red-300">{error}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Project health table</CardTitle>
          <CardDescription>Click a project to inspect trend history.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {urls.length === 0 ? (
            <p className="text-sm text-slate-400">No URLs yet. Add one above to start receiving checks and alerts.</p>
          ) : (
            urls.map((entry) => {
              const latestStatus = entry.latest?.status ?? "warning";

              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setSelectedUrlId(entry.id)}
                  className={cn(
                    "w-full rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-left transition hover:border-slate-700",
                    selectedUrl?.id === entry.id && "border-emerald-500/60 bg-emerald-500/5",
                  )}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm text-slate-300">{entry.displayName || entry.url}</p>
                      <p className="text-xs text-slate-500">{entry.url}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className={cn("rounded border px-2 py-1 font-medium", STATUS_STYLES[latestStatus])}>
                        {(entry.latest?.status ?? "no data").toUpperCase()}
                      </span>
                      <span className="rounded border border-slate-700 px-2 py-1 text-slate-300">
                        HTTP {formatNumber(entry.latest?.httpStatus ?? null)}
                      </span>
                      <span className="rounded border border-slate-700 px-2 py-1 text-slate-300">
                        SSL {formatNumber(entry.latest?.sslDaysRemaining ?? null, "d")}
                      </span>
                      <span className="rounded border border-slate-700 px-2 py-1 text-slate-300">
                        PSI {formatNumber(entry.latest?.pageSpeedScore ?? null)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="size-3" />
                      {formatDateTime(entry.latest?.checkedAt ?? entry.lastCheckedAt)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Activity className="size-3" />
                      {formatNumber(entry.latest?.responseTimeMs ?? null, "ms")}
                    </span>
                  </div>
                  {entry.latest?.error ? <p className="mt-2 text-xs text-red-300">{entry.latest.error}</p> : null}
                </button>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Performance trend</CardTitle>
          <CardDescription>
            {selectedUrl ? `Latest 40 checks for ${selectedUrl.displayName || selectedUrl.url}` : "Select a URL to view trend data."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedUrl && chartData.length > 0 ? (
            <div className="h-80 w-full">
              <ResponsiveContainer>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#243244" />
                  <XAxis dataKey="timestamp" stroke="#8da2bd" minTickGap={24} />
                  <YAxis yAxisId="left" stroke="#8da2bd" width={48} />
                  <YAxis yAxisId="right" orientation="right" stroke="#8da2bd" domain={[0, 100]} width={48} />
                  <Tooltip
                    contentStyle={{
                      background: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: "0.5rem",
                    }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="responseTimeMs"
                    name="Response (ms)"
                    stroke="#60a5fa"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="pageSpeedScore"
                    name="PageSpeed"
                    stroke="#34d399"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-700 p-12 text-sm text-slate-400">
              Trend chart will appear after at least one check completes.
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <Button variant="outline" onClick={() => void loadData()}>
              Refresh now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
