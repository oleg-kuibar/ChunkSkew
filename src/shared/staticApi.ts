import { apiKeys } from "../../server/mock-data";
import type { IdempotentResponse } from "./domain";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function requestBody(options: RequestInit) {
  if (typeof options.body !== "string") {
    return {};
  }
  try {
    return JSON.parse(options.body) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function idempotent<T>(result: T): IdempotentResponse<T> {
  return { deduped: false, result: clone(result) };
}

function staticGet(pathname: string) {
  if (pathname === "/api/admin/api-keys") return apiKeys;
  return undefined;
}

function staticPostCollection(pathname: string, body: Record<string, unknown>) {
  if (pathname === "/api/draft-action") {
    return idempotent({
      id: `draft_static_${Date.now()}`,
      memo: String(body.memo ?? ""),
      createdAt: new Date().toISOString()
    });
  }
  return undefined;
}

function staticPostAdmin(pathname: string, body: Record<string, unknown>) {
  if (pathname === "/api/admin/api-keys") {
    return idempotent({
      id: `key_static_${Date.now()}`,
      name: String(body.name ?? "Static demo key"),
      prefix: "sk_test_static...",
      createdAt: new Date().toISOString()
    });
  }
  if (pathname === "/api/admin/roles") {
    return idempotent({ user: { id: "usr_example", role: String(body.role ?? "owner") }, permissions: [] });
  }
  return undefined;
}

function staticPost(pathname: string, options: RequestInit) {
  const body = requestBody(options);
  return (
    staticPostCollection(pathname, body) ??
    staticPostAdmin(pathname, body)
  );
}

export function staticApiResponse<T>(path: string, options: RequestInit = {}) {
  const url = new URL(path, "https://static.local");
  const method = (options.method ?? "GET").toUpperCase();
  const payload = method === "GET" ? staticGet(url.pathname) : staticPost(url.pathname, options);
  return payload === undefined ? undefined : (clone(payload) as T);
}
