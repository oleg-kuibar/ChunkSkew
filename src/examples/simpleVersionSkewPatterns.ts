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
  safeRefresh: "saveDraft(); preserveIdempotencyKey(); location.reload();",
  requiredUpdateGate: "const blocked = required || !apiContractCompatible;"
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
  seedBadDraft?: boolean;
}

export const primaryGuidedScenario = {
  id: "save-refresh",
  title: "2. Save text",
  mode: "asset-retention",
  modeLabel: "Retained file",
  href: "/draft/write",
  startLabel: "Write step",
  action: "Start save text example",
  outcome: "Type text, refresh safely, keep the text.",
  steps: ["Open write step", "Type text", "Refresh safely"],
  targetStepIndex: 1
} as const satisfies GuidedScenarioDefinition;

export const guidedScenarioCatalog = [
  primaryGuidedScenario,
  {
    id: "missing-chunk",
    title: "Missing file",
    mode: "broken",
    modeLabel: "Missing file",
    href: "/draft/check",
    startLabel: "Lazy step",
    action: "Start missing file example",
    outcome: "Open a missing file and stop the reload loop.",
    steps: ["Hide old file", "Open lazy step", "Show fallback"],
    targetStepIndex: 2
  },
  {
    id: "bad-draft",
    title: "Old draft",
    mode: "asset-retention",
    modeLabel: "Retained file",
    href: "/bad-draft/check",
    startLabel: "Check step",
    action: "Start bad draft example",
    outcome: "Load an old saved shape and ask for check.",
    steps: ["Seed old draft", "Open check", "Ask for check"],
    targetStepIndex: 2,
    seedBadDraft: true
  },
  {
    id: "block-submit",
    title: "3. Block submit",
    mode: "api-contract-incompatible",
    modeLabel: "Submit block",
    href: "/draft/submit",
    startLabel: "Submit step",
    action: "Start block submit example",
    outcome: "Try submit while the tab is too old.",
    steps: ["Make tab old", "Try submit"],
    targetStepIndex: 1
  },
  {
    id: "asset-strategy",
    title: "Retained file",
    mode: "asset-retention",
    modeLabel: "Retained file",
    href: "/retained-file",
    startLabel: "Retained asset route",
    action: "Start retained file example",
    outcome: "Open a lazy route while old files are still retained.",
    steps: ["Keep old files", "Open lazy route", "Confirm it loads"],
    targetStepIndex: 2
  }
] as const satisfies readonly GuidedScenarioDefinition[];

export type GuidedScenarioId = (typeof guidedScenarioCatalog)[number]["id"];

export function guidedScenarioTitle(scenarioId: GuidedScenarioId) {
  return guidedScenarioCatalog.find((scenario) => scenario.id === scenarioId)?.title ?? scenarioId;
}

export function guidedScenarioSetupLabel(scenarioId: GuidedScenarioId) {
  return `Open ${guidedScenarioTitle(scenarioId)} setup`;
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
    slug: "safe-refresh",
    stepTitle: "Preserve work",
    title: "Save then refresh",
    summary: "Save drafts and idempotency keys before refresh or route recovery.",
    rule: "Save draft and idempotency context before refreshing an old tab onto the latest release.",
    hook: "Required gates, sticky banners, and chunk fallbacks.",
    code: simplePatternSnippets.safeRefresh,
    anchor: "src/shared/versionCheckClient.ts",
    scenarioId: "save-refresh"
  },
  {
    slug: "required-update-gate",
    stepTitle: "Block submit",
    title: "Block submit",
    summary: "Block submit when a required update is pending or the API contract is incompatible.",
    rule: "Block submit only when the update is required or the API contract is incompatible.",
    hook: "Policy decisions feeding submit guards without page crashes or surprise refreshes.",
    code: simplePatternSnippets.requiredUpdateGate,
    anchor: "src/shared/updatePolicyEngine.ts",
    scenarioId: "block-submit"
  }
] as const satisfies readonly SimplePatternDefinition[];

export type SimplePatternSlug = (typeof simplePatternCatalog)[number]["slug"];

export function updateAvailable(session: ReleaseFact, latest: ReleaseFact) {
  return session.releaseId !== latest.releaseId;
}

export function safeRefreshReady(draft: SavedWorkflowDraft) {
  return draft.saved && draft.idempotencyKeyPresent;
}

export function blocksSensitiveMutation(requiredUpdatePending: boolean, apiContractCompatible: boolean) {
  return requiredUpdatePending || !apiContractCompatible;
}
