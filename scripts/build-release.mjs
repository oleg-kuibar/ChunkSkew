import { spawnSync } from "node:child_process";
import { cpSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const releaseId = process.argv[2];
if (!releaseId) {
  console.error("Usage: node scripts/build-release.mjs <release-id>");
  process.exit(1);
}

const env = {
  ...process.env,
  VITE_RELEASE_ID: releaseId,
  VITE_DEPLOYMENT_ID: `deployment-${releaseId}`,
  VITE_ASSET_BASE_PATH: `/releases/${releaseId}/`
};

const result = spawnSync("pnpm", ["build"], { stdio: "inherit", env, shell: process.platform === "win32" });
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const releaseDir = resolve("releases", releaseId);
rmSync(releaseDir, { recursive: true, force: true });
cpSync(resolve("dist"), releaseDir, { recursive: true });
console.log(`Copied dist to ${releaseDir}`);
