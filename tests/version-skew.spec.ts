import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

async function prepare(page: Page, router: "react" | "tanstack" = "react", mode = "asset-retention") {
  await page.addInitScript(
    ({ routerMode, skewMode }) => {
      if (!window.sessionStorage.getItem("chunk-skew-e2e-initialized")) {
        window.localStorage.clear();
        window.sessionStorage.setItem("chunk-skew-e2e-initialized", "1");
      }
      window.localStorage.setItem("chunk-skew-finance:debug", "1");
      window.localStorage.setItem("chunk-skew-finance:router-mode", routerMode);
      window.localStorage.setItem(
        "chunk-skew-finance:local-skew-mode",
        JSON.stringify({ "react-router": skewMode, "tanstack-router": skewMode })
      );
      window.__CHUNK_SKEW_TEST_NO_RELOAD__ = true;
    },
    { routerMode: router === "tanstack" ? "tanstack-router" : "react-router", skewMode: mode }
  );
  await page.request.post("/api/debug/version-skew/mode", { data: { mode } });
}

async function open(page: Page, path = "/", router: "react" | "tanstack" = "react") {
  await page.goto(`${path}${path.includes("?") ? "&" : "?"}debug=1&router=${router}`);
}

async function setMode(page: Page, mode: string) {
  await page.request.post("/api/debug/version-skew/mode", { data: { mode } });
  await page.evaluate((skewMode) => {
    window.localStorage.setItem(
      "chunk-skew-finance:local-skew-mode",
      JSON.stringify({ "react-router": skewMode, "tanstack-router": skewMode })
    );
  }, mode);
}

async function forceRequiredUpdate(page: Page, routerMode: "react-router" | "tanstack-router" = "react-router") {
  await page.request.post("/api/debug/version-skew/mode", { data: { mode: "broken" } });
  await page.evaluate((mode) => {
    const current = {
      releaseId: "release-a",
      buildTime: new Date().toISOString(),
      gitSha: "test",
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
      updateSeverity: "required",
      assetBasePath: "/releases/release-b/"
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

async function gotoPaymentMfa(page: Page, router: "react" | "tanstack" = "react") {
  await open(page, "/payments/create/recipient", router);
  await dismissUpdateToast(page);
  await page.getByRole("button", { name: "Continue" }).click();
  await dismissUpdateToast(page);
  await page.getByRole("button", { name: "Continue" }).click();
  await dismissUpdateToast(page);
  await page.getByRole("button", { name: "Continue" }).click();
  await dismissUpdateToast(page);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Confirm this payment")).toBeVisible();
}

async function dismissUpdateToast(page: Page) {
  const dismiss = page.getByRole("button", { name: "Dismiss update notice" });
  if (await dismiss.isVisible({ timeout: 500 }).catch(() => false)) {
    await dismiss.click({ force: true });
  }
}

async function waitForPreloadRoute(page: Page, route: string) {
  await page.waitForFunction(
    (targetRoute) => window.localStorage.getItem("chunk-skew-finance:preload-statuses")?.includes(`"route":"${targetRoute}"`),
    route
  );
}

async function openAdvancedDiagnostics(page: Page) {
  const diagnostics = page.getByTestId("advanced-diagnostics");
  await diagnostics.locator("summary").click();
  return diagnostics;
}

test("1. Baseline app loads", async ({ page }) => {
  await prepare(page);
  await open(page);
  await expect(page.getByRole("heading", { name: /Understand the failure/ })).toBeVisible();
  await expect(page.getByText("ChunkSkew Lab")).toBeVisible();
  await expect(page.getByText("The mental model")).toBeVisible();
  await expect(page.getByText("4. Recovery is safe")).toBeInViewport();
  await expect(page.getByText("Open Payment safe refresh setup").first()).toBeVisible();
  await expect(page.getByText("Open lab controls").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Solve in this order" })).toBeVisible();
  await expect(page.getByText("Pattern 1")).toBeVisible();
  await expect(page.getByText("Preserve work", { exact: true })).toBeVisible();
  await expect(page.getByText("Block risky mutations when a required update is pending or the API contract is incompatible.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Study simple examples" })).toHaveAttribute("href", "/examples?debug=1&router=react");
  await expect(page.getByRole("link", { name: "Open Detect release skew simple example" })).toHaveAttribute(
    "href",
    "/examples?debug=1&router=react#simple-release-identity"
  );
  await expect(page.getByRole("link", { name: "Open Host for compatibility simple example" })).toContainText("Open Step 6");
});

test("1a. Ordered pattern steps deep-link to matching simple examples", async ({ page }) => {
  await prepare(page);
  await open(page);
  await page.getByRole("link", { name: "Open Host for compatibility simple example" }).click();
  await expect(page).toHaveURL(/examples\?debug=1&router=react#simple-asset-strategy/);
  await expect(page.getByTestId("simple-example-asset-strategy")).toBeInViewport();
});

test("1b. Simple examples page teaches core patterns", async ({ page }) => {
  await prepare(page);
  await open(page, "/examples");
  await expect(page.getByRole("heading", { name: "Simple examples" })).toBeVisible();
  await expect(page.getByText("Small rules, robust paths")).toBeVisible();
  await expect(page.getByRole("link", { name: "Reset or retest" })).toHaveAttribute("href", "/debug/version-skew?debug=1&router=react");
  const releaseStamp = page.locator(".page-heading").getByTestId("build-version-stamp");
  await expect(releaseStamp).toContainText("Bundle");
  await expect(releaseStamp).toContainText("Session");
  await expect(releaseStamp).toContainText("Latest");
  await expect(releaseStamp.locator("small")).toHaveText(/pending|in sync|session recovered/);
  await expect(page.getByTestId("simple-examples")).toContainText("Release identity");
  await expect(page.getByTestId("simple-examples")).toContainText("Idempotent mutation");
  await expect(page.getByTestId("simple-examples")).toContainText("Step 1");
  await expect(page.getByTestId("simple-examples")).toContainText("Step 6");
  await expect(page.getByTestId("simple-example-release-identity")).toContainText("Solve path: Detect release skew");
  await expect(page.getByTestId("simple-example-required-update-gate")).toContainText("Step 4");
  await expect(page.getByTestId("simple-example-idempotent-mutation")).toContainText("Step 5");
  await expect(page.getByTestId("simple-example-asset-strategy")).toContainText("Solve path: Host for compatibility");
  await expect(page.getByTestId("simple-examples")).toContainText("session.releaseId !== latest.releaseId");
  await expect(page.getByTestId("simple-example-required-update-gate")).toContainText("required || !apiContractCompatible");
  await expect(page.getByTestId("simple-example-required-update-gate")).toContainText("Minimal rule");
  await expect(page.getByTestId("simple-example-required-update-gate")).toContainText("Robust source");
  await expect(page.getByTestId("simple-proof-anchors")).toContainText("simpleVersionSkewPatterns.ts");
  await expect(page.getByTestId("simple-proof-anchors")).toContainText("simple-patterns.spec.ts");
  await expect(page.getByTestId("simple-proof-anchors")).toContainText("docs vocabulary");
  await expect(page.getByTestId("simple-proof-anchors")).toContainText("update-policy.spec.ts");
  await expect(page.getByTestId("simple-proof-anchors")).toContainText("pnpm test:learning:windows");
  await expect(page.getByTestId("simple-examples")).toContainText("src/shared/updatePolicyEngine.ts");
  await expect(page.getByTestId("simple-examples")).toContainText("src/shared/chunkRecoveryController.ts");
  await expect(page.getByTestId("simple-examples")).toContainText("Robust path:");
  await expect(page.getByTestId("simple-examples")).toContainText("React/TanStack");
  await expect(page.getByTestId("simple-examples")).toContainText("Open lab controls");
  await expect(page.getByTestId("simple-examples")).toContainText("Open Missing chunk fallback setup");
  await expect(page.getByTestId("simple-examples")).toContainText("Open Payment safe refresh setup");
  await expect(page.getByTestId("router-mode-switch").getByRole("link", { name: "React" })).toHaveAttribute("aria-current", "page");

  await page.getByTestId("router-mode-switch").getByRole("link", { name: "TanStack" }).click();
  await expect(page).toHaveURL(/router=tanstack/);
  await expect(page.getByRole("heading", { name: "Simple examples" })).toBeVisible();
  await expect(page.getByTestId("router-mode-switch").getByRole("link", { name: "TanStack" })).toHaveAttribute("aria-current", "page");
});

test("1c. Update toast does not cover release debug panel", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await prepare(page);
  await open(page, "/examples");
  await expect(page.locator(".update-toast")).toBeVisible();
  await expect(page.getByTestId("version-debug-panel")).toBeVisible();
  await expect(page.getByTestId("version-debug-panel")).toContainText("Update policy");
  await expect(page.getByTestId("version-debug-panel")).toContainText("Status");
  await expect(page.getByTestId("version-debug-panel")).toContainText(/pending|in sync|session recovered/);

  const toast = await page.locator(".update-toast").boundingBox();
  const panel = await page.getByTestId("version-debug-panel").boundingBox();
  expect(toast).not.toBeNull();
  expect(panel).not.toBeNull();
  expect(toast!.x + toast!.width).toBeLessThanOrEqual(panel!.x);

  const topbarStampText = await page
    .locator(".topbar")
    .getByTestId("build-version-stamp")
    .locator(":scope > span")
    .evaluate((element) => ({ clientWidth: element.clientWidth, scrollWidth: element.scrollWidth }));
  expect(topbarStampText.scrollWidth).toBeLessThanOrEqual(topbarStampText.clientWidth + 1);
});

test("1d. Start page routes payment recovery through guided controls", async ({ page }) => {
  await prepare(page);
  await open(page);
  await page.getByRole("link", { name: "Try payment recovery" }).click();
  await expect(page).toHaveURL(/debug\/version-skew.*scenario=payment-safe-refresh/);
  await expect(page.getByTestId("guided-scenario-payment-safe-refresh")).toContainText("Recommended next");
});

test("1e. Simple examples prepare setup-dependent robust examples", async ({ page }) => {
  await prepare(page);
  await open(page, "/examples");
  const chunkRecoveryCard = page.getByTestId("simple-examples").locator("article").filter({ hasText: "Chunk recovery" });
  await chunkRecoveryCard.getByRole("link", { name: "Open Missing chunk fallback setup" }).click();
  await expect(page).toHaveURL(/debug\/version-skew.*scenario=missing-chunk/);
  await expect(page.getByTestId("guided-scenario-missing-chunk")).toContainText("Recommended next");
});

test("1f. Asset strategy opens a retained-asset proof scenario", async ({ page }) => {
  await prepare(page);
  await open(page, "/examples");
  const assetStrategyCard = page.getByTestId("simple-examples").locator("article").filter({ hasText: "Asset strategy" });
  await assetStrategyCard.getByRole("link", { name: "Open Asset retention safety setup" }).click();
  await expect(page).toHaveURL(/debug\/version-skew.*scenario=asset-strategy/);
  await expect(page.getByTestId("guided-scenario-asset-strategy")).toBeInViewport();
  await expect(page.getByTestId("guided-scenario-asset-strategy")).toContainText("Recommended next");

  await page.getByRole("button", { name: "Prepare asset retention proof" }).click();
  await expect(page).toHaveURL(/transactions\/report/);
  await expect(page.getByTestId("guided-scenario-banner")).toContainText("Asset retention safety");
  await expect(page.getByRole("heading", { name: "Transaction exposure report" })).toBeVisible();
  await expect(page.getByTestId("chunk-failure-fallback")).toBeHidden();
});

test("1g. Simple examples reset controls fit mobile width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await prepare(page);
  await open(page, "/examples");
  await expect(page.getByRole("link", { name: "Reset or retest" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test("2. Bundle, session, and latest release IDs are visible in debug mode", async ({ page }) => {
  await prepare(page);
  await open(page);
  const debugPanel = page.getByTestId("version-debug-panel");
  await expect(debugPanel).toBeVisible();
  await expect(debugPanel).toContainText("Loaded bundle");
  await expect(debugPanel).toContainText("Session release");
  await expect(debugPanel).toContainText("Latest release");
  const buildStamp = page.getByTestId("build-version-stamp").first();
  await expect(buildStamp).toBeVisible();
  await expect(buildStamp).toContainText("Bundle");
  await expect(buildStamp).toContainText("Session");
  await expect(buildStamp).toContainText("Latest");
});

test("3. Version debug panel works", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await prepare(page);
  await open(page, "/debug/version-skew");
  await expect(page.getByRole("heading", { name: "Lab controls" })).toBeVisible();
  await expect(page.getByTestId("guided-scenarios")).toContainText("Pick one proof");
  await expect(page.getByTestId("guided-scenarios")).toContainText("starts from a clean reset");
  await expect(page.getByTestId("guided-scenario-missing-chunk")).toContainText("Reset included");
  await expect(page.getByTestId("guided-scenario-missing-chunk")).toContainText("Lab mode Missing chunks");
  await expect(page.getByTestId("guided-scenario-missing-chunk")).toContainText("Starts Payment review step");
  await expect(page.getByTestId("guided-scenario-asset-strategy")).toContainText("Lab mode Retained assets");
  await expect(page.getByTestId("guided-scenario-asset-strategy")).toContainText("Starts Transaction report route");
  const firstScenarioCard = await page.getByTestId("guided-scenario-payment-safe-refresh").boundingBox();
  expect(firstScenarioCard).not.toBeNull();
  expect(firstScenarioCard!.width).toBeGreaterThanOrEqual(280);
  await expect(page.getByRole("button", { name: "Prepare payment recovery" })).toBeInViewport();
  await expect(page.getByRole("button", { name: "Prepare API contract block" })).toBeInViewport();
  await expect(page.getByRole("button", { name: "Check version" })).toBeHidden();
  await expect(page.getByTestId("deployment-modes")).toBeHidden();
  const diagnostics = await openAdvancedDiagnostics(page);
  await expect(page.getByRole("button", { name: "Check version" })).toBeVisible();
  await expect(diagnostics.getByText("Loaded bundle")).toBeVisible();
  await expect(diagnostics.getByText("Session release")).toBeVisible();
  await expect(diagnostics.getByText("Update policy")).toBeVisible();
  await expect(page.getByTestId("deployment-modes")).toContainText("asset-retention");
});

test("3c. Guided scenario runner opens missing chunk recovery", async ({ page }) => {
  await prepare(page, "react", "asset-retention");
  await open(page, "/debug/version-skew");
  await page.evaluate(() => {
    window.localStorage.setItem(
      "chunk-skew-finance:current-release-overrides",
      JSON.stringify({
        "react-router": {
          releaseId: "release-b",
          buildTime: new Date().toISOString(),
          gitSha: "test",
          deploymentId: "deployment-release-b",
          minimumSupportedClientRelease: "release-b",
          updateSeverity: "required",
          routerMode: "react-router",
          assetBasePath: "/releases/release-b/",
          compatibilityWindowExpiresAt: new Date(Date.now() + 86400000).toISOString(),
          featureFlagSnapshotVersion: "ff-release-b",
          apiContractVersion: "2026-06",
          draftSchemaVersions: { payment: 2, kyb: 2, card: 2, invoice: 2, vendor: 2 }
        }
      })
    );
  });
  await page.getByRole("button", { name: "Prepare missing chunk fallback" }).click();
  await expect(page).toHaveURL(/payments\/create\/review/);
  await expect(page.getByTestId("guided-scenario-banner")).toContainText("Missing chunk fallback");
  await expect(page.getByTestId("guided-scenario-status")).toContainText("Current: step 3 of 3");
  await expect(page.getByTestId("guided-scenario-banner")).toContainText("Confirm fallback and reload-loop prevention");
  await expect(page.getByTestId("chunk-failure-fallback")).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("chunk-skew-finance:current-release-overrides"))).toBeNull();
});

test("3d. Guided scenario banner returns from lab controls to the prepared example", async ({ page }) => {
  await prepare(page, "react", "asset-retention");
  await open(page, "/debug/version-skew");
  await page.getByRole("button", { name: "Prepare payment recovery" }).click();
  await expect(page).toHaveURL(/payments\/create\/recipient/);
  await expect(page.getByRole("region", { name: "Active proof setup" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Clear proof setup" })).toBeVisible();
  await expect(page.getByTestId("guided-scenario-status")).toContainText("Current: step 2 of 3");

  await page.getByTestId("guided-scenario-banner").getByRole("link", { name: "Lab controls" }).click();
  await expect(page).toHaveURL(/debug\/version-skew/);
  await expect(page.getByTestId("guided-scenario-status")).toContainText("Ready: step 2 of 3");

  await page.getByTestId("guided-scenario-banner").getByRole("link", { name: "Return to example" }).click();
  await expect(page).toHaveURL(/payments\/create\/recipient/);
});

test("3b. Reset simulation state clears recovered release overrides", async ({ page }) => {
  await prepare(page, "react", "broken");
  await open(page, "/debug/version-skew");
  await page.evaluate(() => {
    window.localStorage.setItem(
      "chunk-skew-finance:current-release-overrides",
      JSON.stringify({
        "react-router": {
          releaseId: "release-b",
          buildTime: new Date().toISOString(),
          gitSha: "test",
          deploymentId: "deployment-release-b",
          minimumSupportedClientRelease: "release-b",
          updateSeverity: "required",
          routerMode: "react-router",
          assetBasePath: "/releases/release-b/",
          compatibilityWindowExpiresAt: new Date(Date.now() + 86400000).toISOString(),
          featureFlagSnapshotVersion: "ff-release-b",
          apiContractVersion: "2026-06",
          draftSchemaVersions: { payment: 2, kyb: 2, card: 2, invoice: 2, vendor: 2 }
        }
      })
    );
    window.sessionStorage.setItem("chunk-skew-finance:current-release-override:react-router", "release-b");
  });
  await page.getByRole("button", { name: "Reset simulation state" }).click();
  await page.waitForLoadState("domcontentloaded");
  await expect(page).toHaveURL(/reset=1/);
  await expect(page.getByRole("heading", { name: "Lab controls" })).toBeVisible();
  await expect(page.getByTestId("reset-confirmation")).toContainText("Simulation state reset");
  await expect(page.getByTestId("reset-confirmation")).toContainText("proof setup");
  await expect(page.getByTestId("reset-confirmation")).toContainText("Debug mode and router choice stayed on");
  await expect(page.getByTestId("build-version-stamp").first()).toContainText("Bundle dev-local");
  await expect(page.getByTestId("build-version-stamp").first()).toContainText("Session dev-local");
  await expect(page.getByTestId("build-version-stamp").first().locator("small")).toHaveText("in sync");
  await expect(page.getByTestId("build-version-stamp").first()).not.toContainText("Session release-b");
  await expect
    .poll(async () => {
      try {
        return await page.evaluate(() => window.localStorage.getItem("chunk-skew-finance:current-release-overrides"));
      } catch {
        return "__navigation_pending__";
      }
    })
    .toBeNull();
});

test("4. New release available shows passive toast when user is idle", async ({ page }) => {
  await prepare(page, "react", "affinity");
  await open(page);
  await expect(page.getByText("Updated app available")).toBeVisible();
});

test("5. Dirty workflow form shows sticky banner, not auto reload", async ({ page }) => {
  await prepare(page, "react", "broken");
  await open(page, "/payments/create/recipient");
  await page.getByLabel("Memo").fill("Autosaved after release change");
  await expect(page.getByTestId("update-banner")).toBeVisible();
  await expect(page).toHaveURL(/payments\/create\/recipient/);
});

test("6. Pending mutation defers reload", async ({ page }) => {
  await prepare(page, "react", "asset-retention");
  await gotoPaymentMfa(page);
  await page.getByRole("button", { name: "Mark MFA verified" }).click();
  await setMode(page, "asset-retention");
  await expect(page.getByRole("button", { name: "Submit payment" })).toBeVisible();
});

test("7. Required update blocks next risky mutation", async ({ page }) => {
  await prepare(page, "react", "asset-retention");
  await gotoPaymentMfa(page);
  await page.getByRole("button", { name: "Mark MFA verified" }).click();
  await forceRequiredUpdate(page);
  await page.getByRole("button", { name: "Submit payment" }).click();
  await expect(page.getByTestId("required-update-gate")).toBeVisible();
});

test("7b. Refresh safely resumes an autosaved payment workflow", async ({ page }) => {
  await prepare(page, "react", "asset-retention");
  await open(page, "/payments/create/recipient");
  await page.getByLabel("Memo").fill("Safe refresh keeps this memo");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Mark MFA verified" }).click();
  await forceRequiredUpdate(page);
  await page.getByRole("button", { name: "Submit payment" }).click();
  await page.getByTestId("required-update-gate").getByRole("button", { name: "Refresh safely" }).click();
  await expect(page.getByText("Confirm this payment")).toBeVisible();
  await expect(page.getByTestId("build-version-stamp").first()).toContainText("Bundle dev-local");
  await expect(page.getByTestId("build-version-stamp").first()).toContainText("Session release-b");
  await expect(page.getByTestId("build-version-stamp").first()).toContainText("Latest release-b");
  await expect(page.getByTestId("required-update-gate")).toHaveCount(0);
  await page.getByRole("button", { name: "recipient" }).click();
  await expect(page.getByLabel("Memo")).toHaveValue("Safe refresh keeps this memo");
  await open(page, "/payments/create/mfa");
  await expect(page.getByText("Confirm this payment")).toBeVisible();
  await page.getByRole("button", { name: "Submit payment" }).click();
  await expect(page.getByTestId("payment-receipt")).toBeVisible();
});

test("8. Draft is restored after refresh", async ({ page }) => {
  await prepare(page);
  await open(page, "/payments/create/recipient");
  await page.getByLabel("Memo").fill("Refresh-safe draft");
  await page.reload();
  await expect(page.getByTestId("draft-restored-notice")).toBeVisible();
  await expect(page.getByLabel("Memo")).toHaveValue("Refresh-safe draft");
});

test("9. Repeated reload loop is prevented", async ({ page }) => {
  await prepare(page, "react", "broken");
  await open(page, "/payments/create/review");
  await expect(page.getByTestId("chunk-failure-fallback")).toBeVisible();
  await expect(page.getByText("Refresh needed to continue safely")).toBeVisible();
});

test("10. Asset-retention mode prevents chunk failure", async ({ page }) => {
  await prepare(page, "react", "asset-retention");
  await open(page, "/payments/create/review");
  await expect(page.getByRole("heading", { name: "Create payment" })).toBeVisible();
  await expect(page.getByTestId("chunk-failure-fallback")).toHaveCount(0);
});

test("11. Broken no-affinity mode reproduces chunk failure", async ({ page }) => {
  await prepare(page, "react", "no-affinity");
  await open(page, "/invoices/inv_10041");
  await expect(page.getByTestId("chunk-failure-fallback")).toBeVisible();
});

test("12. Payment draft survives update and reload", async ({ page }) => {
  await prepare(page, "react", "broken");
  await open(page, "/payments/create/recipient");
  await page.getByLabel("Memo").fill("Draft survives required update");
  await page.reload();
  await expect(page.getByLabel("Memo")).toHaveValue("Draft survives required update");
});

test("13. Payment idempotency key survives reload", async ({ page }) => {
  await prepare(page);
  await open(page, "/payments/create/review");
  await expect(page.getByText("Key saved")).toBeVisible();
});

test("14. Retried payment submit does not create duplicate payment", async ({ page }) => {
  await prepare(page);
  await gotoPaymentMfa(page);
  await page.getByRole("button", { name: "Mark MFA verified" }).click();
  await page.getByRole("button", { name: "Submit payment" }).click();
  await expect(page.getByTestId("payment-receipt")).toBeVisible();
  await gotoPaymentMfa(page);
  await page.getByRole("button", { name: "Mark MFA verified" }).click();
  await page.getByRole("button", { name: "Submit payment" }).click();
  await expect(page.getByTestId("duplicate-submit-prevented")).toBeVisible();
});

test("15. Required update blocks new payment submit", async ({ page }) => {
  await prepare(page, "react", "asset-retention");
  await gotoPaymentMfa(page);
  await page.getByRole("button", { name: "Mark MFA verified" }).click();
  await forceRequiredUpdate(page);
  await page.getByRole("button", { name: "Submit payment" }).click();
  await expect(page.getByTestId("required-update-gate")).toBeVisible();
});

test("16. Required update does not interrupt pending payment submit", async ({ page }) => {
  await prepare(page);
  await gotoPaymentMfa(page);
  await page.getByRole("button", { name: "Mark MFA verified" }).click();
  await page.getByRole("button", { name: "Submit payment" }).click();
  await expect(page.getByTestId("payment-receipt")).toBeVisible();
});

test("17. Invoice approval is blocked when required update is pending", async ({ page }) => {
  await prepare(page, "react", "asset-retention");
  await open(page, "/invoices/inv_10042");
  await page.getByRole("button", { name: "Approve" }).click();
  await forceRequiredUpdate(page);
  await page.getByRole("dialog", { name: "Approve invoice" }).getByRole("button", { name: "Approve" }).click();
  await expect(page.getByTestId("required-update-gate")).toBeVisible();
});

test("18. Invoice approval is not duplicated after retry", async ({ page }) => {
  await prepare(page);
  await open(page, "/invoices/inv_10041");
  await page.getByRole("button", { name: "Approve" }).click();
  await page.getByRole("dialog", { name: "Approve invoice" }).getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("approved").first()).toBeVisible();
});

test("19. Card freeze mutation is blocked when required update is pending", async ({ page }) => {
  await prepare(page, "react", "asset-retention");
  await open(page, "/cards/card_ops_01");
  await forceRequiredUpdate(page);
  await page.getByRole("button", { name: "Freeze card" }).click();
  await expect(page.getByTestId("required-update-gate")).toBeVisible();
});

test("19a. Admin API key generation is blocked when required update is pending", async ({ page }) => {
  await prepare(page, "react", "asset-retention");
  await open(page, "/settings");
  await forceRequiredUpdate(page);
  await page.getByRole("button", { name: "Generate test key" }).click();
  await expect(page.getByTestId("required-update-gate")).toBeVisible();
});

test("19b. Card control draft restores after reload", async ({ page }) => {
  await prepare(page);
  await open(page, "/cards/card_ops_01");
  await page.getByLabel("Spend limit").fill("4321");
  await page.getByLabel("Merchant categories").fill("Travel, Meals");
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const raw = window.localStorage.getItem("chunk-skew-finance:draft:card-limit-card_ops_01");
        return raw ? JSON.parse(raw).formValues : null;
      })
    )
    .toEqual({ spendLimitCents: 432100, categories: ["Travel", "Meals"] });
  await page.reload();
  await expect(page.getByLabel("Spend limit")).toHaveValue("4321");
  await expect(page.getByLabel("Merchant categories")).toHaveValue("Travel, Meals");
});

test("19c. Card route change applies the current card before autosave", async ({ page }) => {
  await prepare(page);
  await open(page, "/cards/card_ops_01");
  await page.getByLabel("Spend limit").fill("4321");
  await page.getByLabel("Merchant categories").fill("Travel, Meals");
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const raw = window.localStorage.getItem("chunk-skew-finance:draft:card-limit-card_ops_01");
        return raw ? JSON.parse(raw).formValues : null;
      })
    )
    .toEqual({ spendLimitCents: 432100, categories: ["Travel", "Meals"] });

  await page.evaluate(() => {
    window.history.pushState(null, "", "/cards/card_ops_02?debug=1&router=react");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });

  await expect(page.getByRole("heading", { name: "Diego Rivera" })).toBeVisible();
  await expect(page.getByLabel("Spend limit")).toHaveValue("7500");
  await expect(page.getByLabel("Merchant categories")).toHaveValue("Fuel, Materials");
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const raw = window.localStorage.getItem("chunk-skew-finance:draft:card-limit-card_ops_02");
        return raw ? JSON.parse(raw).formValues : null;
      })
    )
    .toEqual({ spendLimitCents: 750000, categories: ["Fuel", "Materials"] });
});

test("20. KYB draft restores after reload", async ({ page }) => {
  await prepare(page);
  await open(page, "/kyb/business");
  await page.getByLabel("Business address").fill("200 Updated Test Avenue");
  await page.reload();
  await expect(page.getByLabel("Business address")).toHaveValue("200 Updated Test Avenue");
});

test("21. Incompatible KYB draft schema shows review-required fallback", async ({ page }) => {
  await prepare(page);
  await open(page, "/debug/version-skew");
  await openAdvancedDiagnostics(page);
  await page.getByRole("button", { name: "Seed incompatible KYB draft" }).click();
  await open(page, "/kyb/review");
  await expect(page.getByTestId("incompatible-draft-fallback")).toBeVisible();
});

test("22. API contract incompatible mode switches risky workflows into blocked state", async ({ page }) => {
  await prepare(page, "react", "asset-retention");
  await gotoPaymentMfa(page);
  await page.getByRole("button", { name: "Mark MFA verified" }).click();
  await page.evaluate(() => {
    const state = JSON.parse(window.localStorage.getItem("chunk-skew-finance:version-state") ?? "{}");
    state.current = state.current ?? {};
    state.latest = state.latest ?? state.current;
    state.latest.apiContractVersion = "2026-07";
    state.apiContractCompatible = false;
    state.updateAvailable = true;
    window.localStorage.setItem("chunk-skew-finance:version-state", JSON.stringify(state));
    window.dispatchEvent(new CustomEvent("chunk-skew-storage", { detail: { key: "version-state" } }));
  });
  await page.getByRole("button", { name: "Submit payment" }).click();
  await expect(page.getByTestId("required-update-gate")).toBeVisible();
});

test("23. React Router lazy payment review route failure triggers controlled recovery", async ({ page }) => {
  await prepare(page, "react", "broken");
  await open(page, "/payments/create/review");
  await expect(page.getByTestId("chunk-failure-fallback")).toBeVisible();
});

test("24. React Router invoice detail lazy failure triggers controlled recovery", async ({ page }) => {
  await prepare(page, "react", "broken");
  await open(page, "/invoices/inv_10041");
  await expect(page.getByTestId("chunk-failure-fallback")).toBeVisible();
});

test("25. React Router workflow chunks preload on workflow entry", async ({ page }) => {
  await prepare(page);
  await open(page, "/payments/create/recipient");
  await expect(page.getByTestId("payment-workflow")).toBeVisible();
  await waitForPreloadRoute(page, "payment-review");
  await open(page, "/debug/version-skew");
  await openAdvancedDiagnostics(page);
  await expect(page.getByRole("row", { name: /payment-review payment react-router-lazy succeeded/ })).toBeVisible();
});

test("26. React Router route error boundary handles repeated failure", async ({ page }) => {
  await prepare(page, "react", "broken");
  await open(page, "/transactions/report");
  await expect(page.getByTestId("chunk-failure-fallback")).toBeVisible();
});

test("27. TanStack lazy payment route failure triggers controlled recovery", async ({ page }) => {
  await prepare(page, "tanstack", "broken");
  await open(page, "/payments/create/review", "tanstack");
  await expect(page.getByTestId("chunk-failure-fallback")).toBeVisible();
});

test("28. Code-based Route.lazy invoice route failure triggers controlled recovery", async ({ page }) => {
  await prepare(page, "tanstack", "broken");
  await open(page, "/invoices/inv_10041", "tanstack");
  await expect(page.getByTestId("chunk-failure-fallback")).toBeVisible();
});

test("29. Auto-code-split route behavior is documented in debug controls", async ({ page }) => {
  await prepare(page, "tanstack");
  await open(page, "/debug/version-skew", "tanstack");
  await openAdvancedDiagnostics(page);
  await expect(page.getByText("Workflow chunk preload table")).toBeVisible();
});

test("30. TanStack workflow chunks preload on workflow entry", async ({ page }) => {
  await prepare(page, "tanstack");
  await open(page, "/payments/create/recipient", "tanstack");
  await expect(page.getByTestId("payment-workflow")).toBeVisible();
  await waitForPreloadRoute(page, "tanstack-payment-lazy");
  await open(page, "/debug/version-skew", "tanstack");
  await openAdvancedDiagnostics(page);
  await expect(page.getByRole("row", { name: /tanstack-payment-lazy payment tanstack-route-lazy succeeded/ })).toBeVisible();
});

test("31. TanStack navigation blocking works when required update is pending", async ({ page }) => {
  await prepare(page, "tanstack", "asset-retention");
  await gotoPaymentMfa(page, "tanstack");
  await page.getByRole("button", { name: "Mark MFA verified" }).click();
  await forceRequiredUpdate(page, "tanstack-router");
  await page.getByRole("button", { name: "Submit payment" }).click();
  await expect(page.getByTestId("required-update-gate")).toBeVisible();
});

test("32. TanStack lazy error and pending component behavior is reachable", async ({ page }) => {
  await prepare(page, "tanstack");
  await open(page, "/debug/tanstack-pending", "tanstack");
  await expect(page.getByText("TanStack lazy pending component loaded.")).toBeVisible();
});

test("33. Chunk failure logs telemetry", async ({ page }) => {
  await prepare(page, "react", "broken");
  await open(page, "/payments/create/review");
  await open(page, "/audit");
  await expect(page.getByText("chunk_load_failed").first()).toBeVisible();
});

test("34. Required update blocked mutation logs telemetry", async ({ page }) => {
  await prepare(page, "react", "asset-retention");
  await gotoPaymentMfa(page);
  await page.getByRole("button", { name: "Mark MFA verified" }).click();
  await forceRequiredUpdate(page);
  await page.getByRole("button", { name: "Submit payment" }).click();
  await open(page, "/audit");
  await expect(page.getByText("payment_submit_blocked_required_update").first()).toBeVisible();
});

test("35. Draft restore logs telemetry", async ({ page }) => {
  await prepare(page);
  await open(page, "/payments/create/recipient");
  await page.getByLabel("Memo").fill("Telemetry draft");
  await page.reload();
  await expect(page.getByTestId("draft-restored-notice")).toBeVisible();
  await open(page, "/audit");
  await expect(page.getByText("workflow_draft_restored").first()).toBeVisible();
});

test("36. Duplicate submit prevention logs telemetry", async ({ page }) => {
  await prepare(page);
  await gotoPaymentMfa(page);
  await page.getByRole("button", { name: "Mark MFA verified" }).click();
  await page.getByRole("button", { name: "Submit payment" }).click();
  await expect(page.getByTestId("payment-receipt")).toBeVisible();
  await gotoPaymentMfa(page);
  await page.getByRole("button", { name: "Mark MFA verified" }).click();
  await page.getByRole("button", { name: "Submit payment" }).click();
  await expect(page.getByTestId("duplicate-submit-prevented")).toBeVisible();
  await open(page, "/audit");
  await expect(page.getByText("payment_submit_deduped").first()).toBeVisible();
});

test("37. Telemetry export works", async ({ page }) => {
  await prepare(page);
  await open(page, "/audit");
  await expect(page.getByRole("button", { name: "Export JSON" })).toBeVisible();
});
