import { QueryClientProvider } from "@tanstack/react-query";
import React, { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { AppErrorBoundary } from "./components/ErrorBoundary";
import { ChunkFailureFallback } from "./components/UpdateSurfaces";
import { createReactRouter } from "./router/reactRouter";
import { TanStackRouterApp } from "./router/tanstackRouter";
import { createAppQueryClient } from "./shared/queryClientVersionMiddleware";
import { registerVitePreloadErrorHandler, type ChunkFailureEventDetail } from "./shared/chunkRecoveryController";
import { startReleaseAwareness } from "./shared/releaseBusClient";
import { registerOptionalServiceWorker } from "./shared/serviceWorkerRegistration";
import type { RouterMode } from "./shared/types";
import "./styles.css";

function detectRouterMode(): RouterMode {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("router");
  if (requested === "tanstack") {
    window.localStorage.setItem("chunk-skew-finance:router-mode", "tanstack-router");
    return "tanstack-router";
  }
  if (requested === "react") {
    window.localStorage.setItem("chunk-skew-finance:router-mode", "react-router");
    return "react-router";
  }
  return (window.localStorage.getItem("chunk-skew-finance:router-mode") as RouterMode | null) ?? "react-router";
}

const initialRouterMode = detectRouterMode();
registerVitePreloadErrorHandler(initialRouterMode);

function App({ routerMode }: { routerMode: RouterMode }) {
  const queryClient = useMemo(() => createAppQueryClient(routerMode), [routerMode]);
  const [chunkFailure, setChunkFailure] = useState<ChunkFailureEventDetail | null>(null);

  useEffect(() => {
    registerOptionalServiceWorker(routerMode);
    return startReleaseAwareness(routerMode);
  }, [routerMode]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<ChunkFailureEventDetail>).detail;
      if (detail?.context.routerMode === routerMode && detail.context.routeId === "vite-module-preload") {
        setChunkFailure(detail);
      }
    };
    window.addEventListener("chunk-skew-chunk-failure", handler);
    return () => window.removeEventListener("chunk-skew-chunk-failure", handler);
  }, [routerMode]);

  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AppErrorBoundary routerMode={routerMode}>
          {chunkFailure ? (
            <ChunkFailureFallback
              error={new Error(chunkFailure.classification.message)}
              routerMode={routerMode}
              workflowType={chunkFailure.context.workflowType}
              routeId={chunkFailure.context.routeId}
              onRetry={() => setChunkFailure(null)}
            />
          ) : routerMode === "tanstack-router" ? (
            <TanStackRouterApp />
          ) : (
            <RouterProvider router={createReactRouter()} />
          )}
        </AppErrorBoundary>
      </QueryClientProvider>
    </StrictMode>
  );
}

createRoot(document.getElementById("root")!).render(<App routerMode={initialRouterMode} />);
