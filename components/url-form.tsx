"use client";

import { useState } from "react";
import { Loader2, PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface UrlFormProps {
  userEmail: string;
  onCreated: () => Promise<void> | void;
}

export default function UrlForm({ userEmail, onCreated }: UrlFormProps) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [sslDaysThreshold, setSslDaysThreshold] = useState("14");
  const [alertEmail, setAlertEmail] = useState(userEmail);
  const [slackWebhook, setSlackWebhook] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim() || !url.trim()) {
      setError("Project name and URL are required.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/monitors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: userEmail,
          name,
          url,
          sslDaysThreshold: Number(sslDaysThreshold),
          alertEmail,
          slackWebhook
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to add monitor.");
      }

      setSuccess(`Added ${payload.monitor.name} and ran the first health check.`);
      setName("");
      setUrl("");
      setSlackWebhook("");

      await onCreated();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unexpected error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-slate-800 bg-slate-950/60">
      <CardHeader>
        <CardTitle className="text-xl">Add a monitored project</CardTitle>
        <CardDescription>
          We run checks every 5 minutes for uptime, SSL expiry, SEO metadata, and load speed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-200" htmlFor="monitor-name">
              Project name
            </label>
            <Input
              id="monitor-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Marketing site, API docs, Checkout app"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-200" htmlFor="monitor-url">
              URL
            </label>
            <Input
              id="monitor-url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://yourdomain.com"
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
            <div className="grid gap-2">
              <label
                className="text-sm font-medium text-slate-200"
                htmlFor="ssl-days-threshold"
              >
                SSL alert threshold (days)
              </label>
              <Input
                id="ssl-days-threshold"
                type="number"
                min={1}
                value={sslDaysThreshold}
                onChange={(event) => setSslDaysThreshold(event.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-200" htmlFor="alert-email">
                Alert email
              </label>
              <Input
                id="alert-email"
                type="email"
                value={alertEmail}
                onChange={(event) => setAlertEmail(event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-200" htmlFor="slack-webhook">
              Slack webhook (optional)
            </label>
            <Input
              id="slack-webhook"
              value={slackWebhook}
              onChange={(event) => setSlackWebhook(event.target.value)}
              placeholder="https://hooks.slack.com/services/..."
            />
          </div>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-300">{success}</p> : null}

          <Button type="submit" disabled={saving} className="mt-1 w-full sm:w-fit">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving monitor
              </>
            ) : (
              <>
                <PlusCircle className="h-4 w-4" />
                Add monitor
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
