export interface ReleaseFact {
  releaseId: string;
}

export interface SavedWorkflowDraft {
  saved: boolean;
  idempotencyKeyPresent: boolean;
}

export const simplePatternSnippets = {
  releaseIdentity: "const updateAvailable = session.releaseId !== latest.releaseId;",
  chunkRecovery: "if (isChunkLoadError(error)) recoverOnceOrShowFallback();",
  safeRefresh: "saveDraft(); preserveIdempotencyKey(); location.reload();",
  idempotentMutation: "if (seen.has(key)) return seen.get(key);",
  requiredUpdateGate: "const blocked = required || !apiContractCompatible;",
  assetStrategy: "cache(indexHtml, noStore); keep(oldChunks, compatibilityWindow);"
} as const;

export function updateAvailable(session: ReleaseFact, latest: ReleaseFact) {
  return session.releaseId !== latest.releaseId;
}

export function chunkRecoveryDecision(errorMessage: string, reloadAlreadyTried: boolean) {
  const isChunkLoadError = /Failed to fetch dynamically imported module|ChunkLoadError|vite:preloadError/i.test(
    errorMessage
  );
  if (!isChunkLoadError) {
    return "throw";
  }
  return reloadAlreadyTried ? "show-fallback" : "reload-once";
}

export function safeRefreshReady(draft: SavedWorkflowDraft) {
  return draft.saved && draft.idempotencyKeyPresent;
}

export function replayIdempotentMutation<T>(seen: Map<string, T>, key: string, createResult: () => T) {
  if (seen.has(key)) {
    return seen.get(key)!;
  }
  const result = createResult();
  seen.set(key, result);
  return result;
}

export function blocksSensitiveMutation(requiredUpdatePending: boolean, apiContractCompatible: boolean) {
  return requiredUpdatePending || !apiContractCompatible;
}

export function staticHostKeepsOldChunks(indexHtmlNoStore: boolean, oldChunksRetained: boolean) {
  return indexHtmlNoStore && oldChunksRetained;
}
