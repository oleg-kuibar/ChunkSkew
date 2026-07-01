const { existsSync, readdirSync } = require("node:fs");
const { join } = require("node:path");
const { spawnSync } = require("node:child_process");

function findWindowsNode() {
  if (process.env.WINDOWS_NODE && existsSync(process.env.WINDOWS_NODE)) {
    return process.env.WINDOWS_NODE;
  }
  const usersRoot = "/mnt/c/Users";
  if (!existsSync(usersRoot)) {
    return null;
  }
  for (const user of readdirSync(usersRoot)) {
    const candidate = join(
      usersRoot,
      user,
      ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe"
    );
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

if (process.platform !== "win32" && process.env.CHUNK_SKEW_WINDOWS_SMOKE_CHILD !== "1") {
  const node = findWindowsNode();
  if (!node) {
    console.error("Could not find a Windows node.exe. Set WINDOWS_NODE to run this smoke check.");
    process.exit(1);
  }
  const result = spawnSync(node, [toWindowsPath(__filename)], {
    cwd: process.cwd(),
    stdio: "inherit",
    env: {
      ...process.env,
      CHUNK_SKEW_WINDOWS_SMOKE_CHILD: "1"
    }
  });
  if (result.error) {
    console.error(result.error);
  }
  process.exit(result.status ?? 1);
}

function toWindowsPath(path) {
  const match = path.match(/^\/mnt\/([a-z])\/(.*)$/i);
  if (!match) {
    return path;
  }
  return `${match[1].toUpperCase()}:\\${match[2].replaceAll("/", "\\")}`;
}

function findPnpmPackageRoot(packageName) {
  const pnpmRoot = join(process.cwd(), "node_modules", ".pnpm");
  const prefix = packageName.replace("/", "+") + "@";
  const match = readdirSync(pnpmRoot).find((entry) => entry.startsWith(prefix));
  if (!match) {
    throw new Error(`Could not find ${packageName} under ${pnpmRoot}`);
  }
  return join(pnpmRoot, match, "node_modules");
}

process.env.NODE_PATH = [findPnpmPackageRoot("playwright"), findPnpmPackageRoot("playwright-core")].join(";");
require("module").Module._initPaths();

const { chromium } = require("playwright");

async function withPage(callback) {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage();
  try {
    await callback(page);
  } finally {
    await browser.close();
  }
}

async function prime(page, routerMode, skewMode) {
  await page.addInitScript(
    ({ routerMode: mode, skew }) => {
      if (!window.sessionStorage.getItem("chunk-skew-e2e-initialized")) {
        window.localStorage.clear();
        window.sessionStorage.setItem("chunk-skew-e2e-initialized", "1");
      }
      window.localStorage.setItem("chunk-skew-finance:debug", "1");
      window.localStorage.setItem("chunk-skew-finance:router-mode", mode);
      window.localStorage.setItem(
        "chunk-skew-finance:local-skew-mode",
        JSON.stringify({ "react-router": skew, "tanstack-router": skew })
      );
      window.__CHUNK_SKEW_TEST_NO_RELOAD__ = true;
    },
    { routerMode, skew: skewMode }
  );
}

async function forceRequiredUpdate(page, routerMode) {
  await page.evaluate((mode) => {
    const current = {
      releaseId: "release-a",
      buildTime: new Date().toISOString(),
      gitSha: "smoke",
      deploymentId: "deployment-release-a",
      minimumSupportedClientRelease: "release-a",
      updateSeverity: "optional",
      routerMode: mode,
      assetBasePath: "/releases/release-a/",
      compatibilityWindowExpiresAt: new Date(Date.now() + 86400000).toISOString(),
      featureFlagSnapshotVersion: "ff-release-a",
      apiContractVersion: "2026-06",
      draftSchemaVersions: { payment: 2, kyb: 2, card: 2, invoice: 2, vendor: 2 }
    };
    const latest = {
      ...current,
      releaseId: "release-b",
      deploymentId: "deployment-release-b",
      minimumSupportedClientRelease: "release-b",
      updateSeverity: "required"
    };
    window.localStorage.setItem(
      "chunk-skew-finance:version-state",
      JSON.stringify({
        current,
        latest,
        updateAvailable: true,
        updateSeverity: "required",
        requiredUpdatePending: true,
        apiContractCompatible: true,
        checkedAt: new Date().toISOString()
      })
    );
    window.dispatchEvent(new CustomEvent("chunk-skew-storage", { detail: { key: "version-state" } }));
  }, routerMode);
}

async function main() {
  await withPage(async (page) => {
    await prime(page, "react-router", "asset-retention");
    await page.goto("http://localhost:5173/?debug=1&router=react");
    await page.getByRole("heading", { name: "Dashboard" }).waitFor();
    console.log("✓ React Router dashboard loads");
  });

  await withPage(async (page) => {
    await prime(page, "react-router", "broken");
    await page.goto("http://localhost:5173/payments/create/review?debug=1&router=react");
    await page.getByTestId("chunk-failure-fallback").waitFor();
    console.log("✓ React Router chunk failure fallback appears");
  });

  await withPage(async (page) => {
    await prime(page, "react-router", "asset-retention");
    await page.goto("http://localhost:5173/payments/create/mfa?debug=1&router=react");
    await page.getByRole("button", { name: "Mark MFA verified" }).click();
    await forceRequiredUpdate(page, "react-router");
    await page.getByRole("button", { name: "Submit payment" }).click();
    await page.getByTestId("required-update-gate").waitFor();
    console.log("✓ Required update blocks payment submit");
  });

  await withPage(async (page) => {
    await prime(page, "tanstack-router", "asset-retention");
    await page.goto("http://localhost:5173/?debug=1&router=tanstack");
    await page.getByRole("heading", { name: "Dashboard" }).waitFor();
    console.log("✓ TanStack Router dashboard loads");
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
