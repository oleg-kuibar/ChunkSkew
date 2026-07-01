import { shouldSimulateChunkFailure } from "./assetRetentionSimulator";
import { createSyntheticChunkError } from "./chunkErrorClassifier";
import { handleChunkFailure } from "./chunkRecoveryController";
import type { RouterMode, WorkflowType } from "./types";

export function reactRouterLazy<TModule extends Record<string, unknown>>(
  routeId: string,
  workflowType: WorkflowType,
  importer: () => Promise<TModule>
) {
  return async () => {
    try {
      if (shouldSimulateChunkFailure(routeId, "react-router")) {
        throw createSyntheticChunkError(routeId);
      }
      return await importer();
    } catch (error) {
      await handleChunkFailure(error, {
        routeId,
        routerMode: "react-router",
        workflowType,
        currentPath: window.location.pathname
      });
      throw error;
    }
  };
}

export function tanstackLazyImport<TModule>(
  routeId: string,
  workflowType: WorkflowType,
  importer: () => Promise<TModule>
) {
  return async () => {
    try {
      if (shouldSimulateChunkFailure(routeId, "tanstack-router")) {
        throw createSyntheticChunkError(routeId);
      }
      return await importer();
    } catch (error) {
      await handleChunkFailure(error, {
        routeId,
        routerMode: "tanstack-router",
        workflowType,
        currentPath: window.location.pathname
      });
      throw error;
    }
  };
}

export function componentLazyImport<TModule>(
  routeId: string,
  routerMode: RouterMode,
  workflowType: WorkflowType,
  importer: () => Promise<TModule>
) {
  return async () => {
    try {
      if (shouldSimulateChunkFailure(routeId, routerMode)) {
        throw createSyntheticChunkError(routeId);
      }
      return await importer();
    } catch (error) {
      await handleChunkFailure(error, {
        routeId,
        routerMode,
        workflowType,
        currentPath: window.location.pathname
      });
      throw error;
    }
  };
}
