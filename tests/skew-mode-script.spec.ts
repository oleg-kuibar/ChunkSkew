import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const statePath = ".chunk-skew/test-skew-state.json";

function setMode(mode: string) {
  const result = spawnSync(process.execPath, ["scripts/set-skew-mode.mjs", mode], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      CHUNK_SKEW_STATE_PATH: statePath
    }
  });
  expect(result.status, result.stderr || result.stdout).toBe(0);
  return JSON.parse(readFileSync(resolve(statePath), "utf8")) as { mode: string; updateSeverity: string };
}

test("skew mode script matches lab severity rules without touching tracked seed state", () => {
  const seedBefore = readFileSync("server/skew-state.json", "utf8");

  expect(setMode("broken")).toMatchObject({ mode: "broken", updateSeverity: "required" });
  expect(setMode("affinity")).toMatchObject({ mode: "affinity", updateSeverity: "optional" });
  expect(setMode("asset-retention")).toMatchObject({ mode: "asset-retention", updateSeverity: "recommended" });

  expect(readFileSync("server/skew-state.json", "utf8")).toBe(seedBefore);
});
