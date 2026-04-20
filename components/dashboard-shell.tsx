"use client";

import { useState } from "react";

import { ProviderImportForm } from "@/components/provider-import-form";
import { StatusDashboard } from "@/components/status-dashboard";
import { UrlForm } from "@/components/url-form";

export function DashboardShell() {
  const [refreshToken, setRefreshToken] = useState(0);

  return (
    <>
      <ProviderImportForm onImported={() => setRefreshToken((value) => value + 1)} />
      <UrlForm onCreated={() => setRefreshToken((value) => value + 1)} />
      <StatusDashboard refreshToken={refreshToken} />
    </>
  );
}
