import { expect, test } from "@playwright/test";
import {
  blocksSensitiveMutation,
  chunkRecoveryDecision,
  replayIdempotentMutation,
  safeRefreshReady,
  simplePatternCatalog,
  staticHostKeepsOldChunks,
  updateAvailable
} from "../src/examples/simpleVersionSkewPatterns";

test("simple version skew patterns stay copy-pasteable", () => {
  expect(simplePatternCatalog.map((pattern) => pattern.stepTitle)).toEqual([
    "Detect release skew",
    "Recover lazy chunks",
    "Preserve work",
    "Gate risky actions",
    "Prove no duplicates",
    "Host for compatibility"
  ]);

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
});
