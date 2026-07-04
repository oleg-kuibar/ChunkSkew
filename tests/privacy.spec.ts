import { expect, test, type Page } from "@playwright/test";
import { redactSensitiveMetadata } from "../src/shared/privacy";

const rawValues = [
  "doc_raw_001",
  "sk_test_raw",
  "12-3456789",
  "protected.action:workflow-raw:key"
];

async function prepare(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem("chunk-skew-lab:debug", "1");
    window.localStorage.setItem("chunk-skew-lab:router-mode", "react-router");
    window.localStorage.setItem(
      "chunk-skew-lab:telemetry-events",
      JSON.stringify([
        {
          id: "tel_raw",
          name: "version_check_failed",
          createdAt: new Date().toISOString(),
          releaseId: "release-a",
          routerMode: "react-router",
          workflowType: "guarded",
          properties: {
            documentIds: ["doc_raw_001"],
            nested: { secret: "sk_test_raw", taxId: "12-3456789" },
            idempotencyKey: "protected.action:workflow-raw:key",
            safeRoute: "/event-log"
          }
        }
      ])
    );
  });
  await page.request.post("/api/debug/version-skew/reset");
}

test("privacy redaction masks nested sensitive metadata", () => {
  const redacted = redactSensitiveMetadata({
    documentCount: 2,
    documentIds: ["doc_raw_001"],
    nested: { secret: "sk_test_raw", taxId: "12-3456789" },
    idempotencyKey: "protected.action:workflow-raw:key",
    safeRoute: "/event-log"
  });
  const json = JSON.stringify(redacted);

  for (const raw of rawValues) {
    expect(json).not.toContain(raw);
  }
  expect(redacted).toMatchObject({
    documentCount: 2,
    idempotencyKey: "present",
    safeRoute: "/event-log"
  });
});

test("privacy redaction covers event trace and stored events", async ({ page }) => {
  await prepare(page);
  await page.request.post("/api/audit-events", {
    data: {
      type: "privacy.raw",
      message: "Raw metadata should not leave debug surfaces.",
      metadata: {
        documentIds: ["doc_raw_001"],
        nested: { secret: "sk_test_raw", taxId: "12-3456789" },
        idempotencyKey: "protected.action:workflow-raw:key",
        safeRoute: "/event-log"
      }
    }
  });

  const auditJson = await page.request.get("/api/audit-events").then((response) => response.json());
  const auditText = JSON.stringify(auditJson);
  for (const raw of rawValues) {
    expect(auditText).not.toContain(raw);
  }

  await page.goto("/event-log?debug=1&router=react");
  await expect(page.getByRole("heading", { name: "Event trace" })).toBeVisible();
  const tableText = await page.locator("table").innerText();
  for (const raw of rawValues) {
    expect(tableText).not.toContain(raw);
  }
  expect(tableText).toContain('"idempotencyKey":"present"');

  const telemetryText = await page.evaluate(async () => {
    const { trackTelemetry } = await (0, eval)('import("/src/shared/telemetry.ts")');
    const event = trackTelemetry(
      "version_check_failed",
      "react-router",
      {
        documentIds: ["doc_raw_001"],
        nested: { secret: "sk_test_raw", taxId: "12-3456789" },
        idempotencyKey: "protected.action:workflow-raw:key",
        safeRoute: "/event-log"
      },
      "admin"
    );
    return JSON.stringify(event);
  });
  for (const raw of rawValues) {
    expect(telemetryText).not.toContain(raw);
  }
});
