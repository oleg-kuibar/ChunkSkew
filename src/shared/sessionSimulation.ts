import { readJson, writeJson } from "./storage";
import type { SessionSnapshot } from "./types";

const defaultSession: SessionSnapshot = {
  authenticated: true,
  user: {
    id: "usr_example",
    name: "Reader",
    email: "demo.user@example.test",
    role: "owner",
    challengeEnabled: true
  },
  organization: {
    id: "org_example",
    name: "Example Org",
    fakeDataNotice: "All data in this POC is fake and deterministic."
  },
  permissions: ["protected:create", "admin:write", "api-keys:create"],
  challengeRequiredForSensitiveActions: true,
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
    owner: ["protected:create", "admin:write", "api-keys:create"],
    admin: ["protected:create", "admin:read", "api-keys:create"],
    reviewer: ["protected:create", "admin:read"],
    employee: [],
    auditor: ["audit:read", "admin:read"]
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
