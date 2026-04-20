"use client";

import { type FormEvent, useState } from "react";

import { Loader2, PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type UrlFormProps = {
  onCreated: () => void;
};

export function UrlForm({ onCreated }: UrlFormProps) {
  const [url, setUrl] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [alertEmail, setAlertEmail] = useState("");
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (!url.trim()) {
      setError("Please enter a URL to monitor.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/checks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          displayName,
          alertEmail,
          slackWebhookUrl,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Unable to add this URL.");
      }

      setMessage("URL added and first health check completed.");
      setUrl("");
      setDisplayName("");
      if (!alertEmail.trim()) {
        setAlertEmail("");
      }
      if (!slackWebhookUrl.trim()) {
        setSlackWebhookUrl("");
      }
      onCreated();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to create monitoring target.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-50">Add deployment URL</h2>
        <p className="text-sm text-slate-400">Checks start immediately and continue every 5 minutes.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://your-project.com"
          autoComplete="off"
          required
        />
        <Input
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Project label (optional)"
          autoComplete="off"
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Input
          value={alertEmail}
          onChange={(event) => setAlertEmail(event.target.value)}
          placeholder="alerts@yourdomain.com (optional)"
          type="email"
          autoComplete="off"
        />
        <Input
          value={slackWebhookUrl}
          onChange={(event) => setSlackWebhookUrl(event.target.value)}
          placeholder="Slack webhook URL (optional)"
          autoComplete="off"
        />
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving} className="min-w-44">
          {isSaving ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Running check...
            </>
          ) : (
            <>
              <PlusCircle className="size-4" />
              Add URL
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
