import { expect, test, type Page } from "@playwright/test";
import { requiredUpdateState } from "./release-fixtures";

test.describe.configure({ mode: "serial" });

type RouterChoice = "react" | "tanstack";
type RouterMode = "react-router" | "tanstack-router";

function routerMode(router: RouterChoice): RouterMode {
  return router === "tanstack" ? "tanstack-router" : "react-router";
}

async function prepare(page: Page, router: RouterChoice = "react", mode = "asset-retention") {
  await page.addInitScript(
    ({ modeName, skewMode }) => {
      if (!window.sessionStorage.getItem("chunk-skew-e2e-initialized")) {
        window.localStorage.clear();
        window.sessionStorage.setItem("chunk-skew-e2e-initialized", "1");
      }
      window.localStorage.setItem("chunk-skew-lab:debug", "1");
      window.localStorage.setItem("chunk-skew-lab:router-mode", modeName);
      window.localStorage.setItem(
        "chunk-skew-lab:local-skew-mode",
        JSON.stringify({ "react-router": skewMode, "tanstack-router": skewMode })
      );
      window.__CHUNK_SKEW_TEST_NO_RELOAD__ = true;
    },
    { modeName: routerMode(router), skewMode: mode }
  );
  await page.request.post("/api/debug/version-skew/mode", { data: { mode } });
}

async function open(page: Page, path = "/", router: RouterChoice = "react") {
  await page.goto(`${path}${path.includes("?") ? "&" : "?"}debug=1&router=${router}`);
}

async function forceRequiredUpdate(page: Page, mode: RouterMode = "react-router") {
  await page.request.post("/api/debug/version-skew/mode", { data: { mode: "broken" } });
  await page.evaluate((state) => {
    window.localStorage.setItem("chunk-skew-lab:version-state", JSON.stringify(state));
    window.dispatchEvent(new CustomEvent("chunk-skew-storage", { detail: { key: "version-state" } }));
  }, requiredUpdateState(mode));
}

async function openSubmitStep(page: Page, router: RouterChoice = "react") {
  await open(page, "/draft/submit", router);
  await expect(page.getByText("Try submit")).toBeVisible();
}

async function openDiagnostics(page: Page) {
  const diagnostics = page.getByTestId("advanced-diagnostics");
  await diagnostics.locator("summary").click();
  return diagnostics;
}

async function waitForEventTrace(page: Page, name: string) {
  await page.waitForFunction(
    (eventName) => {
      const events = JSON.parse(window.localStorage.getItem("chunk-skew-lab:telemetry-events") ?? "[]");
      return events.some((event: { name?: string }) => event.name === eventName);
    },
    name
  );
}

test("article path shows three examples and simple controls", async ({ page }) => {
  await prepare(page);
  await open(page);

  await expect(page.getByRole("heading", { name: "Three simple examples" })).toBeVisible();
  await expect(page.getByText("Old tab. Saved text. Blocked submit.")).toBeVisible();
  await expect(page.locator(".sidebar").getByRole("link", { name: "Start", exact: true })).toBeVisible();
  await expect(page.locator(".sidebar").getByRole("link", { name: "Examples", exact: true })).toBeVisible();
  await expect(page.locator(".sidebar").getByRole("link", { name: "Controls", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Try it for 2. Save text" })).toHaveAttribute(
    "href",
    "/debug/version-skew?debug=1&router=react&scenario=save-refresh"
  );

  await open(page, "/debug/version-skew?scenario=save-refresh");
  await expect(page.getByRole("heading", { name: "Lab controls" })).toBeVisible();
  await expect(page.getByTestId("guided-scenario-save-refresh")).toContainText("Next");
  await expect(page.getByTestId("advanced-diagnostics")).not.toHaveAttribute("open", "");
});

test("persistent lab controls can change and reset state from an example", async ({ page }) => {
  await prepare(page);
  await open(page, "/draft/write");

  await page.getByTestId("lab-controls-toggle").click();
  const dock = page.getByTestId("lab-controls-dock");
  await expect(dock).toBeVisible();
  await dock.getByTestId("lab-dock-mode-broken").click();
  await expect(dock).toContainText("Missing file active");
  await expect(page.getByTestId("update-banner")).toBeVisible();
  await dock.getByTestId("lab-dock-reset").click();
  await expect(dock).toContainText("Simulation state reset");
  await expect(page).toHaveURL(/draft\/write/);
});

test("safe refresh blocks submit, recovers session, and keeps text", async ({ page }) => {
  await prepare(page);
  await open(page, "/draft/write");
  await page.getByLabel("Main text").fill("Save-refresh keeps this text");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  await forceRequiredUpdate(page);
  await page.getByRole("button", { name: "Submit action" }).click();
  await page.getByTestId("required-update-gate").getByRole("button", { name: "Refresh safely" }).click();

  await expect(page.getByText("Try submit")).toBeVisible();
  await expect(page.getByTestId("build-version-stamp").first()).toContainText("Session release-b");
  await page.getByRole("button", { name: "Write" }).click();
  await expect(page.getByLabel("Main text")).toHaveValue("Save-refresh keeps this text");
});

test("missing React Router chunk shows controlled fallback", async ({ page }) => {
  await prepare(page, "react", "broken");
  await open(page, "/draft/check");

  await expect(page.getByTestId("chunk-failure-fallback")).toBeVisible();
  await expect(page.getByText("Refresh needed to continue safely")).toBeVisible();
});

test("guarded submit blocks risky action while update is required", async ({ page }) => {
  await prepare(page);

  await openSubmitStep(page);
  await forceRequiredUpdate(page);
  await page.getByRole("button", { name: "Submit action" }).click();
  await expect(page.getByTestId("required-update-gate")).toBeVisible();
});

test("retry key survives reload", async ({ page }) => {
  await prepare(page);
  await open(page, "/draft/write");
  await expect(page.getByRole("heading", { name: "Example 2: save before refresh" })).toBeVisible();
  await page.waitForFunction(() => Boolean(window.localStorage.getItem("chunk-skew-lab:idempotency-keys")));
  const before = await page.evaluate(() => window.localStorage.getItem("chunk-skew-lab:idempotency-keys"));
  await page.reload();
  const after = await page.evaluate(() => window.localStorage.getItem("chunk-skew-lab:idempotency-keys"));

  expect(before).toBeTruthy();
  expect(after).toBe(before);
});

test("old draft example shows the check fallback", async ({ page }) => {
  await prepare(page);
  await open(page, "/debug/version-skew");
  await openDiagnostics(page);
  await page.getByRole("button", { name: "Seed old draft" }).click();
  await open(page, "/bad-draft/check");

  await expect(page.getByTestId("incompatible-draft-fallback")).toBeVisible();
  await expect(page.getByText("Draft needs checking")).toBeVisible();
});

test("TanStack lazy route also recovers from missing chunk", async ({ page }) => {
  await prepare(page, "tanstack", "broken");
  await open(page, "/draft/check", "tanstack");

  await expect(page.getByTestId("chunk-failure-fallback")).toBeVisible();
});

test("event trace records core recovery signals", async ({ page }) => {
  await prepare(page, "react", "broken");
  await open(page, "/draft/check");
  await open(page, "/event-log");
  await expect(page.getByText("Chunk load failed").first()).toBeVisible();

  await prepare(page, "react", "asset-retention");
  await openSubmitStep(page);
  await forceRequiredUpdate(page);
  await page.getByRole("button", { name: "Submit action" }).click();
  await open(page, "/event-log");
  await expect(page.getByText("Required update blocked submit").first()).toBeVisible();
});

test("advanced diagnostics stay collapsed but still expose preload and rare event proof", async ({ page }) => {
  await prepare(page);
  await open(page, "/debug/version-skew");

  await expect(page.getByTestId("deployment-modes")).toBeHidden();
  await openDiagnostics(page);
  await expect(page.getByText("Chunk preload table")).toBeVisible();

  await page.evaluate(() => window.localStorage.setItem("chunk-skew-lab:telemetry-events", "[]"));
  await page.getByTestId("mode-compatibility-window-expired").click();
  await waitForEventTrace(page, "asset_retention_expiring_detected");
});
