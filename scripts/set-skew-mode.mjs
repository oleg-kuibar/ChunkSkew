import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const mode = process.argv[2];
const modes = new Set([
  "no-affinity",
  "affinity",
  "asset-retention",
  "broken",
  "compatibility-window-expired",
  "api-contract-incompatible"
]);

if (!modes.has(mode)) {
  console.error(`Usage: node scripts/set-skew-mode.mjs <${Array.from(modes).join("|")}>`);
  process.exit(1);
}

const state = {
  mode,
  activeReleaseId: mode === "no-affinity" ? "release-b" : "release-a",
  latestReleaseId: "release-b",
  updateSeverity:
    mode === "api-contract-incompatible" || mode === "compatibility-window-expired" ? "required" : "recommended",
  apiContractVersion: mode === "api-contract-incompatible" ? "2026-07" : "2026-06",
  compatibilityWindowExpiresAt:
    mode === "compatibility-window-expired" ? new Date(Date.now() - 60_000).toISOString() : new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date().toISOString()
};

mkdirSync(resolve("server"), { recursive: true });
writeFileSync(resolve("server/skew-state.json"), `${JSON.stringify(state, null, 2)}\n`);
console.log(`Skew mode set to ${mode}`);
