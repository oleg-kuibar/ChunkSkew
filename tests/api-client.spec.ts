import { expect, test } from "@playwright/test";
import { buildApiHeaders } from "../src/shared/apiClient";
import type { ReleaseMetadata, SessionSnapshot } from "../src/shared/types";

const release: ReleaseMetadata = {
  releaseId: "release-a",
  buildTime: "2026-07-01T00:00:00.000Z",
  gitSha: "test",
  deploymentId: "deployment-release-a",
  minimumSupportedClientRelease: "release-a",
  updateSeverity: "optional",
  routerMode: "react-router",
  assetBasePath: "/releases/release-a/",
  compatibilityWindowExpiresAt: "2026-07-04T00:00:00.000Z",
  featureFlagSnapshotVersion: "ff-release-a",
  apiContractVersion: "2026-06",
  draftSchemaVersions: { payment: 2, kyb: 2, card: 2, invoice: 2, vendor: 2 }
};

const session: SessionSnapshot = {
  authenticated: true,
  user: {
    id: "usr_test",
    name: "Test User",
    email: "test@example.test",
    role: "owner",
    mfaEnabled: true
  },
  organization: {
    id: "org_test",
    name: "Test Org LLC",
    fakeDataNotice: "All data is fake.",
    riskTier: "medium"
  },
  permissions: ["payments:create"],
  mfaRequiredForSensitiveActions: true,
  expiresAt: "2026-07-01T01:00:00.000Z"
};

test("api client sends fintech mutation metadata headers", () => {
  const headers = buildApiHeaders(
    "react-router",
    {
      idempotencyKey: "payment.submit:workflow-1:key",
      mutationIntent: "payment.submit"
    },
    release,
    session
  );

  expect(headers.get("content-type")).toBe("application/json");
  expect(headers.get("x-client-release")).toBe("release-a");
  expect(headers.get("x-client-deployment-id")).toBe("deployment-release-a");
  expect(headers.get("x-router-mode")).toBe("react-router");
  expect(headers.get("x-user-id")).toBe("usr_test");
  expect(headers.get("x-organization-id")).toBe("org_test");
  expect(headers.get("x-api-contract-version")).toBe("2026-06");
  expect(headers.get("idempotency-key")).toBe("payment.submit:workflow-1:key");
  expect(headers.get("x-mutation-intent")).toBe("payment.submit");
  expect(Date.parse(headers.get("x-mutation-created-at") ?? "")).not.toBeNaN();
});
