import { getSessionSnapshot } from "./sessionSimulation";

export function can(permission: string) {
  const session = getSessionSnapshot();
  return session.authenticated && session.permissions.includes(permission);
}

export function permissionDeniedMessage(permission: string) {
  return `Your current role cannot perform ${permission}. Ask an owner or admin to make this change.`;
}
