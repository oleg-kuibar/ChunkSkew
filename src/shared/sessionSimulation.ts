import { readJson, writeJson } from "./storage";
import type { SessionSnapshot } from "./types";

const defaultSession: SessionSnapshot = {
  authenticated: true,
  user: {
    id: "usr_olivia",
    name: "Olivia Harper",
    email: "olivia.harper@example.test",
    role: "owner",
    mfaEnabled: true
  },
  organization: {
    id: "org_northstar",
    name: "Northstar Fabrication LLC",
    fakeDataNotice: "All data in this POC is fake and deterministic.",
    riskTier: "medium"
  },
  permissions: ["payments:create", "invoices:approve", "cards:update", "kyb:submit", "admin:write", "api-keys:create"],
  mfaRequiredForSensitiveActions: true,
  expiresAt: new Date(Date.now() + 45 * 60 * 1000).toISOString()
};

export function getSessionSnapshot() {
  return readJson<SessionSnapshot>("session", defaultSession);
}

export function setSessionSnapshot(session: SessionSnapshot) {
  writeJson("session", session);
}

export function expireSession() {
  const session = getSessionSnapshot();
  setSessionSnapshot({ ...session, authenticated: false, expiresAt: new Date(Date.now() - 1000).toISOString() });
}

export function switchRole(role: SessionSnapshot["user"]["role"]) {
  const permissionsByRole: Record<SessionSnapshot["user"]["role"], string[]> = {
    owner: ["payments:create", "invoices:approve", "cards:update", "kyb:submit", "admin:write", "api-keys:create"],
    admin: ["payments:create", "invoices:approve", "cards:update", "admin:read", "api-keys:create"],
    "finance-manager": ["payments:create", "invoices:approve", "cards:update", "admin:read"],
    employee: ["cards:read", "payments:read"],
    auditor: ["audit:read", "transactions:read", "admin:read"]
  };
  const session = getSessionSnapshot();
  setSessionSnapshot({
    ...session,
    user: { ...session.user, role },
    permissions: permissionsByRole[role],
    authenticated: true,
    expiresAt: new Date(Date.now() + 45 * 60 * 1000).toISOString()
  });
}
