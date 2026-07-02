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
  requiredUpdateGate: "const blocked = required || !apiContractCompatible;",
  idempotentMutation: "if (seen.has(key)) return seen.get(key);",
  assetStrategy: "cache(indexHtml, noStore); keep(oldChunks, compatibilityWindow);"
} as const;

export const simplePatternCatalog = [
  {
    slug: "release-identity",
    stepTitle: "Detect release skew",
    title: "Release identity",
    summary: "Compare bundle, session, and latest release before making update decisions.",
    rule: "Always compare the loaded bundle, the session release, and the latest release as separate facts.",
    hook: "Badges, request headers, and update decisions.",
    code: simplePatternSnippets.releaseIdentity,
    anchor: "src/shared/releaseIdentity.ts",
    href: "/debug/version-skew",
    scenarioId: undefined
  },
  {
    slug: "chunk-recovery",
    stepTitle: "Recover lazy chunks",
    title: "Chunk recovery",
    summary: "Classify React/TanStack lazy failures, reload once when safe, then stop the loop.",
    rule: "Classify lazy import failures, reload once when safe, then stop and show a controlled fallback.",
    hook: "React/TanStack route imports, modal imports, and preload errors.",
    code: simplePatternSnippets.chunkRecovery,
    anchor: "src/shared/chunkRecoveryController.ts",
    href: "/debug/version-skew",
    scenarioId: "missing-chunk"
  },
  {
    slug: "safe-refresh",
    stepTitle: "Preserve work",
    title: "Safe refresh",
    summary: "Save drafts and idempotency keys before refresh or route recovery.",
    rule: "Save draft and idempotency context before refreshing an old tab onto the latest release.",
    hook: "Required gates, sticky banners, and chunk fallbacks.",
    code: simplePatternSnippets.safeRefresh,
    anchor: "src/shared/versionCheckClient.ts",
    href: "/debug/version-skew",
    scenarioId: "payment-safe-refresh"
  },
  {
    slug: "required-update-gate",
    stepTitle: "Gate risky actions",
    title: "Required update gate",
    summary: "Block new sensitive mutations only for required updates or incompatible APIs.",
    rule: "Block new risky mutations only when the update is required or the API contract is incompatible.",
    hook: "Sensitive mutation guards without page crashes or surprise refreshes.",
    code: simplePatternSnippets.requiredUpdateGate,
    anchor: "src/shared/sensitiveMutationGuard.ts",
    href: "/debug/version-skew",
    scenarioId: "api-contract"
  },
  {
    slug: "idempotent-mutation",
    stepTitle: "Prove no duplicates",
    title: "Idempotent mutation",
    summary: "Retry with the same idempotency key and return the previous result.",
    rule: "Retry the same sensitive action with the same key and return the previous result.",
    hook: "Payment submit, approvals, card controls, KYB, vendors, roles, and API keys.",
    code: simplePatternSnippets.idempotentMutation,
    anchor: "src/shared/idempotencyKeyStore.ts",
    href: "/debug/version-skew",
    scenarioId: "payment-safe-refresh"
  },
  {
    slug: "asset-strategy",
    stepTitle: "Host for compatibility",
    title: "Asset strategy",
    summary: "Retain old chunks or pin deployments so recovery is a backup path.",
    rule: "Retain old chunks or pin clients to deployments so recovery is the backup, not the normal path.",
    hook: "CDN/static hosting with a defined compatibility window.",
    code: simplePatternSnippets.assetStrategy,
    anchor: "src/shared/assetRetentionSimulator.ts",
    href: "/debug/version-skew",
    scenarioId: "asset-strategy"
  }
] as const;

export type SimplePatternSlug = (typeof simplePatternCatalog)[number]["slug"];

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

export function blocksSensitiveMutation(requiredUpdatePending: boolean, apiContractCompatible: boolean) {
  return requiredUpdatePending || !apiContractCompatible;
}

export function replayIdempotentMutation<T>(seen: Map<string, T>, key: string, createResult: () => T) {
  if (seen.has(key)) {
    return seen.get(key)!;
  }
  const result = createResult();
  seen.set(key, result);
  return result;
}

export function staticHostKeepsOldChunks(indexHtmlNoStore: boolean, oldChunksRetained: boolean) {
  return indexHtmlNoStore && oldChunksRetained;
}
