import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard-shell";
import { Button } from "@/components/ui/button";
import { getAccessEmailFromCookies } from "@/lib/auth";

export const metadata = {
  title: "Dashboard",
  description: "Real-time monitoring dashboard for uptime, SSL, SEO and performance checks.",
};

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const accessEmail = getAccessEmailFromCookies(cookieStore);

  if (!accessEmail) {
    redirect("/unlock");
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Deployment health dashboard</h1>
          <p className="text-sm text-slate-400">Signed in as {accessEmail}. Checks run every 5 minutes.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/">Back to landing page</Link>
        </Button>
      </header>

      <DashboardShell />
    </main>
  );
}
