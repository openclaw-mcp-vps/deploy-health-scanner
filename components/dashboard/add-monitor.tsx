"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type AddMonitorFields = {
  name: string;
  url: string;
  alertEmail: string;
  slackChannel: string;
};

export function AddMonitor() {
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddMonitorFields>({
    defaultValues: {
      name: "",
      url: "",
      alertEmail: "",
      slackChannel: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmissionError(null);
    setSubmissionSuccess(null);

    const response = await fetch("/api/monitors", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });

    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setSubmissionError(payload?.error ?? "Unable to add monitor.");
      return;
    }

    setSubmissionSuccess("Monitor added and first check queued.");
    reset({
      name: "",
      url: "",
      alertEmail: values.alertEmail,
      slackChannel: values.slackChannel,
    });
    window.dispatchEvent(new Event("monitors:refresh"));
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add a monitor</CardTitle>
        <CardDescription>
          Add any production URL. Each endpoint is checked every 5 minutes for uptime, SSL expiry, SEO tags, and load speed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-sm text-slate-300" htmlFor="monitor-name">
              Label
            </label>
            <Input
              id="monitor-name"
              placeholder="Marketing Site"
              {...register("name", { required: "A monitor label helps identify alerts." })}
            />
            {errors.name ? <p className="mt-1 text-xs text-rose-300">{errors.name.message}</p> : null}
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-300" htmlFor="monitor-url">
              URL
            </label>
            <Input
              id="monitor-url"
              placeholder="https://example.com"
              {...register("url", {
                required: "A URL is required.",
                pattern: {
                  value: /^https?:\/\/.+/i,
                  message: "Enter a full URL including https://",
                },
              })}
            />
            {errors.url ? <p className="mt-1 text-xs text-rose-300">{errors.url.message}</p> : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-slate-300" htmlFor="alert-email">
                Alert email (optional)
              </label>
              <Input id="alert-email" placeholder="you@company.com" {...register("alertEmail")} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-300" htmlFor="slack-channel">
                Slack channel (optional)
              </label>
              <Input id="slack-channel" placeholder="#incidents" {...register("slackChannel")} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving monitor..." : "Add monitor"}
            </Button>
            {submissionSuccess ? <p className="text-sm text-emerald-300">{submissionSuccess}</p> : null}
            {submissionError ? <p className="text-sm text-rose-300">{submissionError}</p> : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
