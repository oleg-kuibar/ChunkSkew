import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { trackTelemetry } from "./telemetry";
import type { RouterMode } from "./types";

let pendingMutations = 0;

export function createAppQueryClient(routerMode: RouterMode) {
  return new QueryClient({
    queryCache: new QueryCache({
      onError(error, query) {
        console.warn("Query failed", query.queryKey, error);
      }
    }),
    mutationCache: new MutationCache({
      onMutate() {
        pendingMutations += 1;
      },
      onSuccess(_data, _variables, _context, mutation) {
        pendingMutations = Math.max(0, pendingMutations - 1);
        if (mutation.options.meta?.sensitive) {
          trackTelemetry("mutation_deferred_due_to_pending_update", routerMode, {
            intent: mutation.options.meta.intent
          });
        }
      },
      onError() {
        pendingMutations = Math.max(0, pendingMutations - 1);
      }
    }),
    defaultOptions: {
      queries: {
        staleTime: 20_000,
        retry: 1,
        refetchOnWindowFocus: false
      },
      mutations: {
        retry: 0
      }
    }
  });
}

export function hasPendingMutation() {
  return pendingMutations > 0;
}
