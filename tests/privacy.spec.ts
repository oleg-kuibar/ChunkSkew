import { expect, test, type Page } from "@playwright/test";
import { redactSensitiveMetadata } from "../src/shared/privacy";

const rawValues = [
  "123456789012",
  "4242424242424242",
  "doc_raw_001",
  "sk_test_raw",
  "12-3456789",
  "payment.submit:workflow-raw:key"
];

async function prepare(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem("chunk-skew-finance:debug", "1");
    window.localStorage.setItem("chunk-skew-finance:router-mode", "react-router");
    window.localStorage.setItem(
      "chunk-skew-finance:telemetry-events",
      JSON.stringify([
        {
          id: "tel_raw",
          name: "version_check_failed",
          createdAt: new Date().toISOString(),
          releaseId: "release-a",
          routerMode: "react-router",
          workflowType: "payment",
          properties: {
            accountNumber: "123456789012",
            cardPan: "4242424242424242",
            documentIds: ["doc_raw_001"],
            nested: { secret: "sk_test_raw", taxId: "12-3456789" },
            idempotencyKey: "payment.submit:workflow-raw:key",
            safeRoute: "/audit"
          }
        }
      ])
    );
  });
  await page.request.post("/api/debug/version-skew/reset");
}

test("privacy redaction masks nested sensitive metadata", () => {
  const redacted = redactSensitiveMetadata({
    accountNumber: "123456789012",
    cardPan: "4242424242424242",
    documentCount: 2,
    documentIds: ["doc_raw_001"],
    nested: { secret: "sk_test_raw", taxId: "12-3456789" },
    idempotencyKey: "payment.submit:workflow-raw:key",
    safeRoute: "/audit"
  });
  const json = JSON.stringify(redacted);

  for (const raw of rawValues) {
    expect(json).not.toContain(raw);
  }
  expect(redacted).toMatchObject({
    documentCount: 2,
    idempotencyKey: "present",
    safeRoute: "/audit"
  });
});

test("privacy redaction covers audit table and telemetry storage", async ({ page }) => {
  await prepare(page);
  await page.request.post("/api/audit-events", {
    data: {
      type: "privacy.raw",
      message: "Raw metadata should not leave debug surfaces.",
      metadata: {
        accountNumber: "123456789012",
        cardPan: "4242424242424242",
        documentIds: ["doc_raw_001"],
        nested: { secret: "sk_test_raw", taxId: "12-3456789" },
        idempotencyKey: "payment.submit:workflow-raw:key",
        safeRoute: "/audit"
      }
    }
  });

  const auditJson = await page.request.get("/api/audit-events").then((response) => response.json());
  const auditText = JSON.stringify(auditJson);
  for (const raw of rawValues) {
    expect(auditText).not.toContain(raw);
  }

  await page.goto("/audit?debug=1&router=react");
  await expect(page.getByRole("heading", { name: "Audit and telemetry events" })).toBeVisible();
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
        accountNumber: "123456789012",
        cardPan: "4242424242424242",
        documentIds: ["doc_raw_001"],
        nested: { secret: "sk_test_raw", taxId: "12-3456789" },
        idempotencyKey: "payment.submit:workflow-raw:key",
        safeRoute: "/audit"
      },
      "payment"
    );
    return JSON.stringify(event);
  });
  for (const raw of rawValues) {
    expect(telemetryText).not.toContain(raw);
  }
});
