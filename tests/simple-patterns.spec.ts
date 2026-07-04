import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import {
  blocksSensitiveMutation,
  guidedScenarioCatalog,
  guidedScenarioSetupLabel,
  guidedScenarioTitle,
  primaryGuidedScenario,
  safeRefreshReady,
  simplePatternCatalog,
  updateAvailable
} from "../src/examples/simpleVersionSkewPatterns";

const docsWithReleaseStatusExamples = [
  "README.md",
  "docs/guides/retest-runbook.md",
  "docs/guides/build-version-skew.md",
  "docs/examples/save-text-safe-refresh.md",
  "docs/patterns/release-identity.md"
].map((path) => readFileSync(path, "utf8")).join("\n");

test("simple version skew patterns stay copy-pasteable", () => {
  expect(simplePatternCatalog.map((pattern) => pattern.stepTitle)).toEqual([
    "Detect release skew",
    "Preserve work",
    "Block submit"
  ]);

  expect(guidedScenarioCatalog.map((scenario) => scenario.id)).toEqual([
    "save-refresh",
    "missing-chunk",
    "bad-draft",
    "block-submit",
    "asset-strategy"
  ]);
  expect(primaryGuidedScenario.id).toBe("save-refresh");
  expect(guidedScenarioTitle("missing-chunk")).toBe("Missing file");
  expect(guidedScenarioSetupLabel("missing-chunk")).toBe("Open Missing file setup");
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

  expect(safeRefreshReady({ saved: true, idempotencyKeyPresent: true })).toBe(true);
  expect(safeRefreshReady({ saved: true, idempotencyKeyPresent: false })).toBe(false);

  expect(blocksSensitiveMutation(true, true)).toBe(true);
  expect(blocksSensitiveMutation(false, false)).toBe(true);
  expect(blocksSensitiveMutation(false, true)).toBe(false);

  expect(docsWithReleaseStatusExamples).toContain("bundle/session/latest/status build stamps");
  expect(docsWithReleaseStatusExamples).toContain("Session dev-local` with `in sync` status");
  expect(docsWithReleaseStatusExamples).toContain("Bundle dev-local / Session release-b / Latest release-b / session recovered");
  expect(docsWithReleaseStatusExamples).toContain("Keep `Update policy` separate from `Status`");
  expect(docsWithReleaseStatusExamples).not.toContain("bundle/session/latest build stamps");
  expect(docsWithReleaseStatusExamples).not.toMatch(/Bundle dev-local \/ Session release-b \/ Latest release-b[`.\n]/);
});
