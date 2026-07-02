import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  name: string;
  private: boolean;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

test("project contract stays standalone and fake-data only", () => {
  const packages = { ...packageJson.dependencies, ...packageJson.devDependencies };
  const bannedPackages = ["next", "@next/env", "stripe", "plaid", "@auth0/auth0-react", "firebase", "aws-amplify"];

  expect(packageJson).toMatchObject({
    name: "chunk-skew-fintech-poc",
    private: true
  });
  for (const name of bannedPackages) {
    expect(packages[name], `${name} must not be a dependency`).toBeUndefined();
  }
  expect(packages).toMatchObject({
    react: expect.any(String),
    vite: expect.any(String),
    "react-router-dom": expect.any(String),
    "@tanstack/react-router": expect.any(String),
    "@tanstack/react-query": expect.any(String),
    express: expect.any(String),
    "@playwright/test": expect.any(String)
  });

  const readme = readFileSync("README.md", "utf8");
  expect(readme).toContain("standalone React/Vite");
  expect(readme).toContain("fake deterministic fintech data only");
  expect(readme).toContain("does not import from, inspect, or depend on any production app");
  expect(readme).toContain("real money movement, real banking integrations, real auth, real customer data");

  const mockData = readFileSync("server/mock-data.ts", "utf8");
  expect(mockData).toContain("fakeDataNotice");
  expect(mockData).toContain("example.test");

  const versionClient = readFileSync("src/shared/versionCheckClient.ts", "utf8");
  expect(versionClient).toContain('import.meta.env.VITE_RELEASE_BUS_MODE ?? "sse"');
  expect(versionClient).toContain("new WebSocket");
  expect(versionClient).toContain("new EventSource");
  expect(versionClient).toContain("release.required");
  expect(versionClient).toContain("api.contract.deprecating");

  const serviceWorkerRegistration = readFileSync("src/shared/serviceWorkerRegistration.ts", "utf8");
  expect(serviceWorkerRegistration).toContain('VITE_ENABLE_SERVICE_WORKER !== "true"');
  expect(serviceWorkerRegistration).toContain('register("/service-worker.js", { updateViaCache: "none" })');

  const serviceWorker = readFileSync("public/service-worker.js", "utf8");
  expect(serviceWorker).toContain('url.pathname === "/version.json"');
  expect(serviceWorker).toContain('event.data?.type === "WARM_WORKFLOW_ASSETS"');
  expect(serviceWorker).toContain('type: "WORKFLOW_ASSETS_WARMED"');
  expect(serviceWorker).not.toContain("index.html");
  expect(serviceWorker).not.toContain("clients.openWindow");
});
