"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface MonitorCheck {
  checkedAt: string;
  httpStatus: number | null;
  sslExpiry: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  loadMs: number | null;
  ok: boolean | null;
  failureReason: string | null;
}

interface MonitorHistoryPoint {
  checkedAt: string;
  loadMs: number | null;
}

interface MonitorItem {
  id: string;
  name: string;
  url: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  latestCheck: MonitorCheck | null;
  history: MonitorHistoryPoint[];
}

interface MonitorsResponse {
  monitors: MonitorItem[];
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusBadge(check: MonitorCheck | null): { label: string; variant: "default" | "success" | "warning" | "danger" } {
  if (!check) {
    return { label: "Awaiting first check", variant: "default" };
  }

  if (check.ok) {
    return { label: "Healthy", variant: "success" };
  }

  if (check.httpStatus !== null && check.httpStatus >= 500) {
    return { label: "Outage", variant: "danger" };
  }

  return { label: "Needs attention", variant: "warning" };
}

export function MonitorList() {
  const [monitors, setMonitors] = useState<MonitorItem[]>([]);
  const [selectedMonitorId, setSelectedMonitorId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMonitors = async (): Promise<void> => {
    setError(null);

    const response = await fetch("/api/monitors", {
      method: "GET",
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as MonitorsResponse | { error?: string } | null;

    if (!response.ok) {
      setError((payload as { error?: string } | null)?.error ?? "Unable to load monitors.");
      setIsLoading(false);
      return;
    }

    const loadedMonitors = (payload as MonitorsResponse).monitors;
    setMonitors(loadedMonitors);

    if (!selectedMonitorId && loadedMonitors.length > 0) {
      setSelectedMonitorId(loadedMonitors[0].id);
    }

    if (selectedMonitorId && !loadedMonitors.find((monitor) => monitor.id === selectedMonitorId)) {
      setSelectedMonitorId(loadedMonitors[0]?.id ?? null);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    void loadMonitors();

    const refreshHandler = () => {
      void loadMonitors();
    };

    const interval = window.setInterval(() => {
      void loadMonitors();
    }, 30_000);

    window.addEventListener("monitors:refresh", refreshHandler);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("monitors:refresh", refreshHandler);
    };
  }, [selectedMonitorId]);

  const selectedMonitor = useMemo(
    () => monitors.find((monitor) => monitor.id === selectedMonitorId) ?? null,
    [monitors, selectedMonitorId]
  );

  const chartData = useMemo(
    () =>
      (selectedMonitor?.history ?? []).map((point) => ({
        label: new Date(point.checkedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        loadMs: point.loadMs ?? 0,
      })),
    [selectedMonitor]
  );

  const deleteMonitor = async (monitorId: string): Promise<void> => {
    const response = await fetch("/api/monitors", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: monitorId }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Unable to delete monitor.");
      return;
    }

    window.dispatchEvent(new Event("monitors:refresh"));
  };

  const runManualCheck = async (monitorId: string): Promise<void> => {
    const response = await fetch(`/api/cron/check-monitors?monitorId=${encodeURIComponent(monitorId)}`, {
      method: "POST",
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Unable to trigger manual check.");
      return;
    }

    window.setTimeout(() => {
      window.dispatchEvent(new Event("monitors:refresh"));
    }, 1500);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-slate-400">Loading monitor inventory...</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {error ? (
        <Card className="border-rose-500/30">
          <CardContent className="py-4 text-sm text-rose-300">{error}</CardContent>
        </Card>
      ) : null}

      {monitors.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-slate-300">
            No monitors yet. Add your first production URL above to start continuous health scans.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <Card>
            <CardHeader>
              <CardTitle>Monitor inventory</CardTitle>
              <CardDescription>
                Every endpoint is checked for status code, SSL expiry, SEO metadata, and load speed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {monitors.map((monitor) => {
                const status = getStatusBadge(monitor.latestCheck);

                return (
                  <div
                    key={monitor.id}
                    className={`rounded-lg border p-4 transition ${
                      selectedMonitorId === monitor.id
                        ? "border-cyan-500/60 bg-slate-900"
                        : "border-slate-700/80 bg-slate-950/50 hover:border-slate-600"
                    }`}
                  >
                    <button
                      className="w-full text-left"
                      onClick={() => setSelectedMonitorId(monitor.id)}
                      type="button"
                    >
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-slate-100">{monitor.name}</p>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>
                      <p className="truncate text-sm text-slate-400">{monitor.url}</p>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400 sm:grid-cols-4">
                        <span>HTTP: {monitor.latestCheck?.httpStatus ?? "n/a"}</span>
                        <span>Load: {monitor.latestCheck?.loadMs ? `${monitor.latestCheck.loadMs}ms` : "n/a"}</span>
                        <span>
                          SSL: {monitor.latestCheck?.sslExpiry ? new Date(monitor.latestCheck.sslExpiry).toLocaleDateString() : "n/a"}
                        </span>
                        <span>Checked: {monitor.latestCheck?.checkedAt ? formatDateTime(monitor.latestCheck.checkedAt) : "pending"}</span>
                      </div>
                    </button>

                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => runManualCheck(monitor.id)}>
                        Check now
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteMonitor(monitor.id)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{selectedMonitor?.name ?? "Performance trend"}</CardTitle>
              <CardDescription>
                Recent response times in milliseconds. Healthy targets remain below 3000ms.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedMonitor ? (
                <>
                  <div className="mb-4 space-y-2 text-sm text-slate-300">
                    <p>
                      <span className="text-slate-500">Latest issue:</span> {selectedMonitor.latestCheck?.failureReason ?? "No incidents in latest check"}
                    </p>
                    <p>
                      <span className="text-slate-500">SEO title:</span> {selectedMonitor.latestCheck?.seoTitle ?? "missing"}
                    </p>
                  </div>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid stroke="#1f2937" strokeDasharray="4 4" />
                        <XAxis dataKey="label" stroke="#94a3b8" tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} width={40} />
                        <Tooltip
                          contentStyle={{
                            background: "#0f172a",
                            border: "1px solid #334155",
                            borderRadius: 8,
                            color: "#e2e8f0",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="loadMs"
                          stroke="#22d3ee"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-400">Select a monitor to inspect recent performance history.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
