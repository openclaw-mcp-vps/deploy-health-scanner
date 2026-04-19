import Bull from "bull";

export interface MonitorQueueJob {
  monitorId: string;
  ownerKey: string;
  url: string;
  name: string;
}

const redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

declare global {
  // eslint-disable-next-line no-var
  var __deployHealthQueue: Bull.Queue<MonitorQueueJob> | undefined;
}

export const monitorQueue =
  global.__deployHealthQueue ??
  new Bull<MonitorQueueJob>("monitor-checks", redisUrl, {
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 4_000,
      },
      removeOnComplete: 500,
      removeOnFail: 1_000,
    },
  });

if (process.env.NODE_ENV !== "production") {
  global.__deployHealthQueue = monitorQueue;
}
