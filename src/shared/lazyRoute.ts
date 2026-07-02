import { shouldSimulateChunkFailure } from "./assetRetentionSimulator";
import { createSyntheticChunkError } from "./chunkErrorClassifier";
import { handleChunkFailure } from "./chunkRecoveryController";
import type { RouterMode, WorkflowType } from "./types";

type LazyRouteOptions<TModule> = {
  routeId: string;
  routerMode: RouterMode;
  workflowType: WorkflowType;
  importer: () => Promise<TModule>;
};

async function importLazyRouteModule<TModule>(routeId: string, routerMode: RouterMode, importer: () => Promise<TModule>) {
  if (shouldSimulateChunkFailure(routeId, routerMode)) {
    throw createSyntheticChunkError(routeId);
  }
  return importer();
}

async function rethrowAfterChunkRecovery<TModule>(error: unknown, options: LazyRouteOptions<TModule>): Promise<never> {
  await handleChunkFailure(error, {
    routeId: options.routeId,
    routerMode: options.routerMode,
    workflowType: options.workflowType,
    currentPath: window.location.pathname
  });
  throw error;
}

async function loadLazyRoute<TModule>(options: LazyRouteOptions<TModule>) {
  try {
    return await importLazyRouteModule(options.routeId, options.routerMode, options.importer);
  } catch (error) {
    return rethrowAfterChunkRecovery(error, options);
  }
}

export function reactRouterLazy<TModule extends Record<string, unknown>>(
  routeId: string,
  workflowType: WorkflowType,
  importer: () => Promise<TModule>
) {
  return () => loadLazyRoute({ routeId, routerMode: "react-router", workflowType, importer });
}

export function tanstackLazyImport<TModule>(
  routeId: string,
  workflowType: WorkflowType,
  importer: () => Promise<TModule>
) {
  return () => loadLazyRoute({ routeId, routerMode: "tanstack-router", workflowType, importer });
}

export function componentLazyImport<TModule>(
  routeId: string,
  routerMode: RouterMode,
  workflowType: WorkflowType,
  importer: () => Promise<TModule>
) {
  return () => loadLazyRoute({ routeId, routerMode, workflowType, importer });
}
