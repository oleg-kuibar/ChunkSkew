import { expect, test, type Locator, type Page } from "@playwright/test";
import { requiredUpdateState } from "./release-fixtures";

async function prepare(page: Page, mode = "asset-retention") {
  await page.addInitScript((skewMode) => {
    if (!window.sessionStorage.getItem("chunk-skew-accessibility-initialized")) {
      window.localStorage.clear();
      window.sessionStorage.setItem("chunk-skew-accessibility-initialized", "1");
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

async function open(page: Page, path: string) {
  await page.goto(`${path}${path.includes("?") ? "&" : "?"}debug=1&router=react`);
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
}

async function forceRequiredUpdate(page: Page) {
  await page.request.post("/api/debug/version-skew/mode", { data: { mode: "api-contract-incompatible" } });
  await page.evaluate((state) => {
    window.localStorage.setItem(
      "chunk-skew-lab:version-state",
      JSON.stringify(state)
    );
    window.dispatchEvent(new CustomEvent("chunk-skew-storage", { detail: { key: "version-state" } }));
  }, requiredUpdateState("react-router"));
}

async function expectContrast(locator: Locator, minimum = 4.5) {
  const result = await locator.evaluate((element) => {
    function colorParts(value: string) {
      const match = value.match(/rgba?\(([^)]+)\)/);
      if (!match) {
        return { r: 255, g: 255, b: 255, a: 0 };
      }
      const [r, g, b, a = "1"] = match[1].split(",").map((part) => part.trim());
      return { r: Number(r), g: Number(g), b: Number(b), a: Number(a) };
    }
    function channel(value: number) {
      const normalized = value / 255;
      return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
    }
    function luminance({ r, g, b }: { r: number; g: number; b: number }) {
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    }
    function effectiveBackground(start: Element) {
      let current: Element | null = start;
      while (current) {
        const background = colorParts(getComputedStyle(current).backgroundColor);
        if (background.a > 0) {
          return background;
        }
        current = current.parentElement;
      }
      return { r: 255, g: 255, b: 255, a: 1 };
    }

    const foreground = colorParts(getComputedStyle(element).color);
    const background = effectiveBackground(element);
    const fgLum = luminance(foreground);
    const bgLum = luminance(background);
    const ratio = (Math.max(fgLum, bgLum) + 0.05) / (Math.min(fgLum, bgLum) + 0.05);
    return {
      background,
      foreground,
      ratio: Number(ratio.toFixed(2)),
      text: element.textContent?.trim()
    };
  });

  expect(result.ratio, `${result.text} contrast ${result.ratio}`).toBeGreaterThanOrEqual(minimum);
}

test("learning and recovery surfaces reflow at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await prepare(page);

  await open(page, "/examples");
  await expect(page.getByRole("heading", { name: "Old tab. Saved text. Blocked submit." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Reset or retest" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await open(page, "/debug/version-skew?scenario=save-refresh");
  await expect(page.getByRole("button", { name: "Start save text example" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await open(page, "/draft/write");
  await page.getByLabel("Main text").fill("Narrow viewport draft");
  await page.reload();
  await expect(page.getByTestId("draft-restored-notice")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await open(page, "/debug/version-skew?scenario=missing-chunk");
  await page.getByRole("button", { name: "Start missing file example" }).click();
  await expect(page.getByTestId("chunk-failure-fallback")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("primary learning and recovery colors meet normal text contrast", async ({ page }) => {
  await prepare(page);
  await open(page, "/debug/version-skew?scenario=save-refresh");
  await expectContrast(page.getByRole("button", { name: "Reset simulation state" }));
  await expectContrast(page.getByRole("button", { name: "Start save text example" }));
  await expectContrast(page.getByText("Next").first());

  await open(page, "/draft/write");
  await page.getByLabel("Main text").fill("Contrast draft");
  await page.reload();
  await expectContrast(page.getByTestId("draft-restored-notice").locator("span"));

  await open(page, "/guarded-action");
  await forceRequiredUpdate(page);
  await page.getByRole("button", { name: "Run guarded action" }).click();
  await expectContrast(page.getByTestId("required-update-gate").locator(":scope > div > span").first());

  await open(page, "/debug/version-skew?scenario=missing-chunk");
  await page.getByRole("button", { name: "Start missing file example" }).click();
  await expectContrast(page.getByTestId("chunk-failure-fallback").locator("p"));
});
