import { expect, test, type Page } from "@playwright/test";
import { requiredUpdateState } from "./release-fixtures";

test.describe.configure({ mode: "serial" });

async function prepare(page: Page, mode = "asset-retention") {
  await page.addInitScript((skewMode) => {
    if (!window.sessionStorage.getItem("chunk-skew-learning-initialized")) {
      window.localStorage.clear();
      window.sessionStorage.setItem("chunk-skew-learning-initialized", "1");
    }
    window.localStorage.setItem("chunk-skew-lab:debug", "1");
    window.localStorage.setItem("chunk-skew-lab:router-mode", "react-router");
    window.localStorage.setItem(
      "chunk-skew-lab:local-skew-mode",
      JSON.stringify({ "react-router": skewMode, "tanstack-router": skewMode })
    );
    window.__CHUNK_SKEW_TEST_NO_RELOAD__ = true;
  }, mode);
  await page.request.post("/api/debug/version-skew/mode", { data: { mode } });
}

async function open(page: Page, path = "/") {
  await page.goto(`${path}${path.includes("?") ? "&" : "?"}debug=1&router=react`);
}

async function requireUpdate(page: Page) {
  await page.request.post("/api/debug/version-skew/mode", { data: { mode: "broken" } });
  await page.evaluate((state) => {
    window.localStorage.setItem(
      "chunk-skew-lab:version-state",
      JSON.stringify(state)
    );
    window.dispatchEvent(new CustomEvent("chunk-skew-storage", { detail: { key: "version-state" } }));
  }, requiredUpdateState("react-router"));
}

async function goToSubmitStep(page: Page) {
  await open(page, "/draft/write");
  await continueToSubmitStep(page);
}

async function continueToSubmitStep(page: Page) {
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Try submit")).toBeVisible();
}

test("1. Read the three-example article", async ({ page }) => {
  await prepare(page);
  await open(page);
  await expect(page.getByRole("heading", { name: "Three simple examples" })).toBeVisible();
  await expect(page.getByText("Old tab. Saved text. Blocked submit.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Try these three" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Try it for 2. Save text" })).toHaveAttribute(
    "href",
    "/debug/version-skew?debug=1&router=react&scenario=save-refresh"
  );
  await expect(page.getByRole("link", { name: "Try it for 3. Block submit" })).toHaveAttribute(
    "href",
    "/debug/version-skew?debug=1&router=react&scenario=block-submit"
  );
});

test("2. Save text before refreshing", async ({ page }) => {
  await prepare(page);
  await open(page, "/draft/write");
  await page.getByLabel("Main text").fill("Learning path draft");
  await continueToSubmitStep(page);
  await requireUpdate(page);
  await page.getByRole("button", { name: "Submit action" }).click();
  await page.getByTestId("required-update-gate").getByRole("button", { name: "Refresh safely" }).click();

  await page.getByRole("button", { name: "Write" }).click();
  await expect(page.getByLabel("Main text")).toHaveValue("Learning path draft");
  await expect(page.getByTestId("build-version-stamp").first()).toContainText("session recovered");
});

test("3. Block submit until the tab is updated", async ({ page }) => {
  await prepare(page);
  await goToSubmitStep(page);
  await requireUpdate(page);
  await page.getByRole("button", { name: "Submit action" }).click();
  await expect(page.getByTestId("required-update-gate")).toContainText("Refresh before making this change");
});

test("4. Keep controls reachable from an example", async ({ page }) => {
  await prepare(page);
  await open(page, "/draft/write");
  await page.getByTestId("lab-controls-toggle").click();
  const dock = page.getByTestId("lab-controls-dock");

  await expect(dock).toBeVisible();
  await expect(dock.getByTestId("build-version-stamp")).toContainText("Build");
  await dock.getByTestId("lab-dock-mode-broken").click();
  await expect(dock).toContainText("Missing file active");
  await dock.getByTestId("lab-dock-reset").click();
  await expect(dock).toContainText("Simulation state reset");
  await expect(page).toHaveURL(/draft\/write/);
});
