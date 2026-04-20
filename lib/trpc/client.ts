"use client";

import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@/lib/trpc/router";

let singletonClient: ReturnType<typeof createTRPCProxyClient<AppRouter>> | null = null;

export function getTRPCClient() {
  if (singletonClient) {
    return singletonClient;
  }

  singletonClient = createTRPCProxyClient<AppRouter>({
    links: [
      httpBatchLink({
        url: "/api/trpc",
      }),
    ],
  });

  return singletonClient;
}
