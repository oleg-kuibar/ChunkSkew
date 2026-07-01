import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function gitSha() {
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "dev";
  }
}

const releaseId = process.env.VITE_RELEASE_ID ?? process.env.RELEASE_ID ?? `dev-${new Date().toISOString().slice(0, 10)}`;
const deploymentId = process.env.VITE_DEPLOYMENT_ID ?? process.env.DEPLOYMENT_ID ?? `deployment-${releaseId}`;
const severity = process.env.VITE_UPDATE_SEVERITY ?? "optional";
const routerMode = process.env.VITE_ROUTER_MODE ?? "react-router";
const assetBasePath = process.env.VITE_ASSET_BASE_PATH ?? "/";
const buildTime = new Date().toISOString();
const compatibilityWindowExpiresAt =
  process.env.VITE_COMPAT_WINDOW_EXPIRES_AT ?? new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

const version = {
  releaseId,
  buildTime,
  gitSha: gitSha(),
  deploymentId,
  minimumSupportedClientRelease: process.env.VITE_MIN_SUPPORTED_RELEASE ?? releaseId,
  updateSeverity: severity,
  routerMode,
  assetBasePath,
  compatibilityWindowExpiresAt,
  featureFlagSnapshotVersion: process.env.VITE_FEATURE_FLAGS_VERSION ?? `ff-${releaseId}`,
  apiContractVersion: process.env.VITE_API_CONTRACT_VERSION ?? "2026-06",
  draftSchemaVersions: {
    payment: 2,
    kyb: 2,
    card: 2,
    invoice: 2,
    vendor: 2
  }
};

mkdirSync(resolve("public"), { recursive: true });
writeFileSync(resolve("public/version.json"), `${JSON.stringify(version, null, 2)}\n`);
console.log(`Generated public/version.json for ${releaseId}`);
