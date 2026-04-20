import cron, { type ScheduledTask } from "node-cron";
import { enqueueDueHealthChecks, processHealthCheckQueue } from "@/lib/monitoring/queue";

let task: ScheduledTask | null = null;

export function startLocalCronWorker(): void {
  if (task) {
    return;
  }

  task = cron.schedule("*/5 * * * *", async () => {
    try {
      await enqueueDueHealthChecks(5);
      await processHealthCheckQueue(30);
    } catch (error) {
      console.error("Local cron worker failed", error);
    }
  });
}

export function stopLocalCronWorker(): void {
  if (!task) {
    return;
  }

  task.stop();
  task = null;
}
