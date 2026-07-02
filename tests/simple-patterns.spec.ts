import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import {
  blocksSensitiveMutation,
  chunkRecoveryDecision,
  guidedScenarioCatalog,
  guidedScenarioSetupLabel,
  guidedScenarioTitle,
  primaryGuidedScenario,
  replayIdempotentMutation,
  safeRefreshReady,
  simplePatternCatalog,
  startPageScenarioCatalog,
  staticHostKeepsOldChunks,
  updateAvailable
} from "../src/examples/simpleVersionSkewPatterns";

const docsWithReleaseStatusExamples = [
  "README.md",
  "docs/guides/retest-runbook.md",
  "docs/guides/build-version-skew.md",
  "docs/examples/payment-safe-refresh.md",
  "docs/patterns/release-identity.md"
].map((path) => readFileSync(path, "utf8")).join("\n");

test("simple version skew patterns stay copy-pasteable", () => {
  expect(simplePatternCatalog.map((pattern) => pattern.stepTitle)).toEqual([
    "Detect release skew",
    "Recover lazy chunks",
    "Preserve work",
    "Gate risky actions",
    "Prove no duplicates",
    "Host for compatibility"
  ]);

  expect(guidedScenarioCatalog.map((scenario) => scenario.id)).toEqual([
    "payment-safe-refresh",
    "missing-chunk",
    "kyb-draft",
    "api-contract",
    "asset-strategy"
  ]);
  expect(primaryGuidedScenario.id).toBe("payment-safe-refresh");
  expect(startPageScenarioCatalog.map((scenario) => scenario.id)).toEqual(["payment-safe-refresh", "missing-chunk", "kyb-draft"]);
  expect(guidedScenarioTitle("missing-chunk")).toBe("Missing chunk fallback");
  expect(guidedScenarioSetupLabel("missing-chunk")).toBe("Open Missing chunk fallback setup");
  expect(simplePatternCatalog.find((pattern) => pattern.slug === "required-update-gate")).toMatchObject({
    anchor: "src/shared/updatePolicyEngine.ts",
    code: "const blocked = required || !apiContractCompatible;"
  });

  const guidedScenarioIds = new Set(guidedScenarioCatalog.map((scenario) => scenario.id));
  for (const pattern of simplePatternCatalog) {
    if (pattern.scenarioId) {
      expect(guidedScenarioIds.has(pattern.scenarioId)).toBe(true);
    }
  }

  expect(updateAvailable({ releaseId: "release-a" }, { releaseId: "release-b" })).toBe(true);
  expect(updateAvailable({ releaseId: "release-b" }, { releaseId: "release-b" })).toBe(false);

  expect(chunkRecoveryDecision("Failed to fetch dynamically imported module", false)).toBe("reload-once");
  expect(chunkRecoveryDecision("Failed to fetch dynamically imported module", true)).toBe("show-fallback");
  expect(chunkRecoveryDecision("validation failed", false)).toBe("throw");

  expect(safeRefreshReady({ saved: true, idempotencyKeyPresent: true })).toBe(true);
  expect(safeRefreshReady({ saved: true, idempotencyKeyPresent: false })).toBe(false);

  expect(blocksSensitiveMutation(true, true)).toBe(true);
  expect(blocksSensitiveMutation(false, false)).toBe(true);
  expect(blocksSensitiveMutation(false, true)).toBe(false);

  const seen = new Map<string, string>();
  expect(replayIdempotentMutation(seen, "payment:1", () => "created")).toBe("created");
  expect(replayIdempotentMutation(seen, "payment:1", () => "duplicate")).toBe("created");

  expect(staticHostKeepsOldChunks(true, true)).toBe(true);
  expect(staticHostKeepsOldChunks(true, false)).toBe(false);

  expect(docsWithReleaseStatusExamples).toContain("bundle/session/latest/status build stamps");
  expect(docsWithReleaseStatusExamples).toContain("Session dev-local` with `in sync` status");
  expect(docsWithReleaseStatusExamples).toContain("Bundle dev-local / Session release-b / Latest release-b / session recovered");
  expect(docsWithReleaseStatusExamples).toContain("Keep `Update policy` separate from `Status`");
  expect(docsWithReleaseStatusExamples).not.toContain("bundle/session/latest build stamps");
  expect(docsWithReleaseStatusExamples).not.toMatch(/Bundle dev-local \/ Session release-b \/ Latest release-b[`.\n]/);
});
