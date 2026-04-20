import { TRPCError, initTRPC } from "@trpc/server";
import { z } from "zod";
import { createMonitorsBatch, createMonitor, deactivateMonitor, listMonitors, listRecentChecks } from "@/lib/db/queries";
import { fetchNetlifySiteUrls } from "@/lib/integrations/netlify";
import { fetchVercelProjectUrls } from "@/lib/integrations/vercel";
import { enqueueDueHealthChecks, enqueueHealthCheckNow, processHealthCheckQueue } from "@/lib/monitoring/queue";
import type { TRPCContext } from "@/lib/trpc/context";

const t = initTRPC.context<TRPCContext>().create();

const requirePaid = t.middleware(({ ctx, next }) => {
  if (!ctx.isPaid) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "A paid subscription is required to access monitors.",
    });
  }

  return next();
});

const paidProcedure = t.procedure.use(requirePaid);

function normalizeUserUrl(url: string): string {
  const withProtocol = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  const parsed = new URL(withProtocol);
  parsed.hash = "";
  return parsed.toString();
}

export const appRouter = t.router({
  billing: t.router({
    hasAccess: t.procedure.query(({ ctx }) => ({
      hasAccess: ctx.isPaid,
      planName: ctx.accessPayload?.planName ?? null,
      email: ctx.accessPayload?.email ?? null,
    })),
  }),
  monitors: t.router({
    dashboard: paidProcedure.query(async () => {
      const [monitors, checks] = await Promise.all([listMonitors(), listRecentChecks(200)]);
      return {
        monitors,
        checks,
      };
    }),
    add: paidProcedure
      .input(
        z.object({
          url: z.string().min(3),
        })
      )
      .mutation(async ({ input }) => {
        const normalized = normalizeUserUrl(input.url);
        const monitor = await createMonitor(normalized, "manual");
        await enqueueHealthCheckNow(monitor.id);

        return {
          id: monitor.id,
          url: monitor.url,
        };
      }),
    remove: paidProcedure
      .input(
        z.object({
          monitorId: z.string().uuid(),
        })
      )
      .mutation(async ({ input }) => {
        await deactivateMonitor(input.monitorId);
        return { ok: true };
      }),
    triggerOne: paidProcedure
      .input(
        z.object({
          monitorId: z.string().uuid(),
        })
      )
      .mutation(async ({ input }) => {
        await enqueueHealthCheckNow(input.monitorId);
        const result = await processHealthCheckQueue(8);
        return {
          ok: true,
          ...result,
        };
      }),
    triggerDue: paidProcedure.mutation(async () => {
      const queued = await enqueueDueHealthChecks(5);
      const processed = await processHealthCheckQueue(20);
      return {
        queued,
        ...processed,
      };
    }),
    importFromVercel: paidProcedure
      .input(
        z.object({
          token: z.string().min(12).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const urls = await fetchVercelProjectUrls(input.token);
        const imported = await createMonitorsBatch(urls, "vercel");
        return {
          discovered: urls.length,
          imported,
        };
      }),
    importFromNetlify: paidProcedure
      .input(
        z.object({
          token: z.string().min(12).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const urls = await fetchNetlifySiteUrls(input.token);
        const imported = await createMonitorsBatch(urls, "netlify");
        return {
          discovered: urls.length,
          imported,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
