import type { SkewMode } from "../shared/types";

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

export interface GuidedScenarioDefinition {
  id: string;
  title: string;
  mode: SkewMode;
  modeLabel: string;
  href: string;
  startLabel: string;
  action: string;
  outcome: string;
  steps: readonly string[];
  targetStepIndex?: number;
  seedKybDraft?: boolean;
  featuredOnStart?: true;
}

export const primaryGuidedScenario = {
  id: "payment-safe-refresh",
  title: "Payment safe refresh",
  mode: "asset-retention",
  modeLabel: "Retained assets",
  href: "/payments/create/recipient",
  startLabel: "Payment recipient step",
  action: "Prepare payment recovery",
  outcome: "Autosave a payment, force a required update, then refresh safely without duplicate submit.",
  steps: ["Start with retained assets", "Fill the payment memo", "Force required update before submit"],
  targetStepIndex: 1,
  featuredOnStart: true
} as const satisfies GuidedScenarioDefinition;

export const guidedScenarioCatalog = [
  primaryGuidedScenario,
  {
    id: "missing-chunk",
    title: "Missing chunk fallback",
    mode: "broken",
    modeLabel: "Missing chunks",
    href: "/payments/create/review",
    startLabel: "Payment review step",
    action: "Prepare missing chunk fallback",
    outcome: "Open a lazy review route while old chunks are unavailable and see controlled recovery.",
    steps: ["Switch to broken assets", "Open lazy payment review", "Confirm fallback and reload-loop prevention"],
    targetStepIndex: 2,
    featuredOnStart: true
  },
  {
    id: "kyb-draft",
    title: "KYB incompatible draft",
    mode: "asset-retention",
    modeLabel: "Retained assets",
    href: "/kyb/review",
    startLabel: "KYB review step",
    action: "Prepare KYB draft review",
    outcome: "Seed an incompatible KYB draft and verify the app asks for review instead of submitting.",
    steps: ["Seed incompatible draft", "Open KYB review", "Review the compatibility fallback"],
    targetStepIndex: 2,
    seedKybDraft: true,
    featuredOnStart: true
  },
  {
    id: "api-contract",
    title: "API contract blocking",
    mode: "api-contract-incompatible",
    modeLabel: "API contract block",
    href: "/payments/create/mfa",
    startLabel: "Payment MFA step",
    action: "Prepare API contract block",
    outcome: "Open a risky payment step with an incompatible API contract and watch mutation get paused.",
    steps: ["Switch API contract", "Verify MFA", "Submit to see the guard"],
    targetStepIndex: 1
  },
  {
    id: "asset-strategy",
    title: "Asset retention safety",
    mode: "asset-retention",
    modeLabel: "Retained assets",
    href: "/transactions/report",
    startLabel: "Transaction report route",
    action: "Prepare asset retention proof",
    outcome: "Open a heavy lazy report while old assets are retained so the route loads instead of falling back.",
    steps: ["Switch to retained assets", "Open lazy transaction report", "Confirm retained assets prevent fallback"],
    targetStepIndex: 2
  }
] as const satisfies readonly GuidedScenarioDefinition[];

export type GuidedScenarioId = (typeof guidedScenarioCatalog)[number]["id"];

export const startPageScenarioCatalog = guidedScenarioCatalog.filter(
  (scenario) => "featuredOnStart" in scenario && scenario.featuredOnStart
);

export function guidedScenarioTitle(scenarioId: GuidedScenarioId) {
  return guidedScenarioCatalog.find((scenario) => scenario.id === scenarioId)?.title ?? scenarioId;
}

export interface SimplePatternDefinition {
  slug: string;
  stepTitle: string;
  title: string;
  summary: string;
  rule: string;
  hook: string;
  code: string;
  anchor: string;
  scenarioId?: GuidedScenarioId;
}

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
    scenarioId: "asset-strategy"
  }
] as const satisfies readonly SimplePatternDefinition[];

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
