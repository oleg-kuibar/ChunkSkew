import { expect, test } from "@playwright/test";
import { buildApiHeaders } from "../src/shared/apiClient";
import type { SessionSnapshot } from "../src/shared/types";
import { testRelease } from "./release-fixtures";

const release = testRelease("release-a");

const session: SessionSnapshot = {
  authenticated: true,
  user: {
    id: "usr_test",
    name: "Test User",
    email: "test@example.test",
    role: "owner",
    challengeEnabled: true
  },
  organization: {
    id: "org_test",
    name: "Test Org",
    fakeDataNotice: "All data is fake."
  },
  permissions: ["protected:create"],
  challengeRequiredForSensitiveActions: true,
  expiresAt: "2026-07-01T01:00:00.000Z"
};

test("api client sends protected action metadata headers", () => {
  const headers = buildApiHeaders(
    "react-router",
    {
      idempotencyKey: "protected.submit:workflow-1:key",
      mutationIntent: "api-key.generate"
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
  expect(headers.get("idempotency-key")).toBe("protected.submit:workflow-1:key");
  expect(headers.get("x-mutation-intent")).toBe("api-key.generate");
  expect(Date.parse(headers.get("x-mutation-created-at") ?? "")).not.toBeNaN();
});
