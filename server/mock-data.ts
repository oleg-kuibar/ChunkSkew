import type { Request } from "express";

export type Role = "owner" | "admin" | "reviewer" | "employee" | "auditor";
export type SkewMode =
  | "no-affinity"
  | "affinity"
  | "asset-retention"
  | "broken"
  | "compatibility-window-expired"
  | "api-contract-incompatible";

export interface AuditEvent {
  id: string;
  type: string;
  message: string;
  actorId: string;
  organizationId: string;
  releaseId: string;
  deploymentId: string;
  routerMode: string;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export const users = [
  {
    id: "usr_example",
    name: "Example User",
    email: "demo.user.a@example.test",
    role: "owner" as Role,
    challengeEnabled: true
  },
  {
    id: "usr_miles",
    name: "Demo User B",
    email: "demo.user.b@example.test",
    role: "reviewer" as Role,
    challengeEnabled: true
  },
  {
    id: "usr_auditor",
    name: "Demo User C",
    email: "demo.user.c@example.test",
    role: "auditor" as Role,
    challengeEnabled: false
  }
];

export const organization = {
  id: "org_example",
  name: "Example Org",
  fakeDataNotice: "All records and users are fake."
};

export const apiKeys: Array<{
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}> = [
  {
    id: "key_public_test",
    name: "Key proof seed",
    prefix: "sk_test_9f3...",
    createdAt: "2026-06-12T15:00:00.000Z",
    lastUsedAt: "2026-06-24T20:11:00.000Z"
  }
];

export const roleMatrix: Record<Role, string[]> = {
  owner: ["protected:create", "admin:write", "api-keys:create"],
  admin: ["protected:create", "admin:read", "api-keys:create"],
  reviewer: ["protected:create", "admin:read"],
  employee: [],
  auditor: ["audit:read", "admin:read"]
};

export function getActor(req: Request) {
  const requestedUser = req.header("x-user-id");
  return users.find((user) => user.id === requestedUser) ?? users[0];
}

export function getRequestMetadata(req: Request) {
  const actor = getActor(req);
  return {
    actorId: actor.id,
    organizationId: req.header("x-organization-id") ?? organization.id,
    releaseId: req.header("x-client-release") ?? "unknown-release",
    deploymentId: req.header("x-client-deployment-id") ?? "unknown-deployment",
    routerMode: req.header("x-router-mode") ?? "unknown-router",
    apiContractVersion: req.header("x-api-contract-version") ?? "unknown-contract",
    mutationIntent: req.header("x-mutation-intent") ?? undefined,
    mutationCreatedAt: req.header("x-mutation-created-at") ?? undefined
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function resetArray<T>(target: T[], initial: T[]) {
  target.splice(0, target.length, ...clone(initial));
}

const initialUsers = clone(users);
const initialOrganization = clone(organization);
const initialApiKeys = clone(apiKeys);

export function resetMockData() {
  resetArray(users, initialUsers);
  Object.assign(organization, clone(initialOrganization));
  resetArray(apiKeys, initialApiKeys);
}
