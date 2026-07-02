import { getCurrentReleaseIdentity } from "./releaseIdentity";
import { getSessionSnapshot } from "./sessionSimulation";
import type { ReleaseMetadata, RouterMode, SensitiveMutationIntent, SessionSnapshot } from "./types";

export interface ApiOptions extends RequestInit {
  idempotencyKey?: string;
  mutationIntent?: SensitiveMutationIntent;
}

export function buildApiHeaders(
  routerMode: RouterMode,
  options: ApiOptions = {},
  release: ReleaseMetadata = getCurrentReleaseIdentity(routerMode),
  session: SessionSnapshot = getSessionSnapshot()
) {
  const headers = new Headers(options.headers);
  headers.set("content-type", headers.get("content-type") ?? "application/json");
  headers.set("x-client-release", release.releaseId);
  headers.set("x-client-deployment-id", release.deploymentId);
  headers.set("x-router-mode", routerMode);
  headers.set("x-user-id", session.user.id);
  headers.set("x-organization-id", session.organization.id);
  headers.set("x-api-contract-version", release.apiContractVersion);
  if (options.idempotencyKey) {
    headers.set("idempotency-key", options.idempotencyKey);
  }
  if (options.mutationIntent) {
    headers.set("x-mutation-intent", options.mutationIntent);
    headers.set("x-mutation-created-at", new Date().toISOString());
  }
  return headers;
}

export async function apiFetch<T>(path: string, routerMode: RouterMode, options: ApiOptions = {}): Promise<T> {
  const headers = buildApiHeaders(routerMode, options);
  const response = await fetch(path, { ...options, headers });
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    const error = new Error(typeof payload === "string" ? payload : payload.error ?? "Request failed");
    Object.assign(error, { status: response.status, payload });
    throw error;
  }
  return payload as T;
}
