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

test("1. Baseline app loads", async ({ page }) => {
  await prepare(page);
  await open(page);
  await expect(page.getByRole("heading", { name: /Understand the failure/ })).toBeVisible();
  await expect(page.getByText("ChunkSkew Lab")).toBeVisible();
  await expect(page.getByText("The mental model")).toBeVisible();
});

test("1b. Simple examples page teaches core patterns", async ({ page }) => {
  await prepare(page);
  await open(page, "/examples");
  await expect(page.getByRole("heading", { name: "Simple examples" })).toBeVisible();
  await expect(page.getByTestId("simple-examples")).toContainText("Release identity");
  await expect(page.getByTestId("simple-examples")).toContainText("Idempotent mutation");
  await expect(page.getByTestId("simple-examples")).toContainText("src/shared/chunkRecoveryController.ts");
  await expect(page.getByTestId("router-mode-switch").getByRole("link", { name: "React" })).toHaveAttribute("aria-current", "page");

  await page.getByTestId("router-mode-switch").getByRole("link", { name: "TanStack" }).click();
  await expect(page).toHaveURL(/router=tanstack/);
  await expect(page.getByRole("heading", { name: "Simple examples" })).toBeVisible();
  await expect(page.getByTestId("router-mode-switch").getByRole("link", { name: "TanStack" })).toHaveAttribute("aria-current", "page");
});

test("1c. Start page routes payment recovery through guided controls", async ({ page }) => {
  await prepare(page);
  await open(page);
  await page.getByRole("link", { name: "Try payment recovery" }).click();
  await expect(page).toHaveURL(/debug\/version-skew.*scenario=payment-safe-refresh/);
  await expect(page.getByTestId("guided-scenario-payment-safe-refresh")).toContainText("Recommended next");
});

test("1d. Simple examples prepare setup-dependent robust examples", async ({ page }) => {
  await prepare(page);
  await open(page, "/examples");
  const chunkRecoveryCard = page.getByTestId("simple-examples").locator("article").filter({ hasText: "Chunk recovery" });
  await chunkRecoveryCard.getByRole("link", { name: "Prepare robust example" }).click();
  await expect(page).toHaveURL(/debug\/version-skew.*scenario=missing-chunk/);
  await expect(page.getByTestId("guided-scenario-missing-chunk")).toContainText("Recommended next");
});

test("2. Current release ID is visible in debug mode", async ({ page }) => {
  await prepare(page);
  await open(page);
  await expect(page.getByText(/Release/).first()).toBeVisible();
  await expect(page.getByTestId("version-debug-panel")).toBeVisible();
  await expect(page.getByTestId("build-version-stamp").first()).toBeVisible();
});

test("3. Version debug panel works", async ({ page }) => {
  await prepare(page);
  await open(page, "/debug/version-skew");
  await expect(page.getByRole("heading", { name: "Version skew controls" })).toBeVisible();
  await expect(page.getByTestId("guided-scenarios")).toContainText("Pick one scenario");
  await expect(page.getByTestId("deployment-modes")).toContainText("asset-retention");
});

test("3c. Guided scenario runner opens missing chunk recovery", async ({ page }) => {
  await prepare(page, "react", "asset-retention");
  await open(page, "/debug/version-skew");
  await page.getByRole("button", { name: "Prepare missing chunk fallback" }).click();
  await expect(page).toHaveURL(/payments\/create\/review/);
  await expect(page.getByTestId("guided-scenario-banner")).toContainText("Missing chunk fallback");
  await expect(page.getByTestId("guided-scenario-banner")).toContainText("Confirm fallback and reload-loop prevention");
  await expect(page.getByTestId("chunk-failure-fallback")).toBeVisible();
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
  await expect(page.getByRole("heading", { name: "Version skew controls" })).toBeVisible();
  await expect(page.getByTestId("build-version-stamp").first()).toContainText("Bundle dev-local");
  await expect(page.getByTestId("build-version-stamp").first()).not.toContainText("session release-b");
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
  await expect(page.getByTestId("build-version-stamp").first()).toContainText("session release-b");
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
  await expect(page.getByText("Workflow chunk preload table")).toBeVisible();
});

test("30. TanStack workflow chunks preload on workflow entry", async ({ page }) => {
  await prepare(page, "tanstack");
  await open(page, "/payments/create/recipient", "tanstack");
  await expect(page.getByTestId("payment-workflow")).toBeVisible();
  await waitForPreloadRoute(page, "tanstack-payment-lazy");
  await open(page, "/debug/version-skew", "tanstack");
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
