import { readJson, writeJson } from "./storage";
import type { SensitiveMutationIntent } from "./types";

type IdempotencyStore = Record<string, { key: string; intent: SensitiveMutationIntent; createdAt: string }>;

function idFor(intent: SensitiveMutationIntent, workflowId: string) {
  return `${intent}:${workflowId}`;
}

export function getOrCreateIdempotencyKey(intent: SensitiveMutationIntent, workflowId: string) {
  const store = readJson<IdempotencyStore>("idempotency-keys", {});
  const id = idFor(intent, workflowId);
  if (store[id]) {
    return store[id].key;
  }
  const key = `${intent}:${workflowId}:${crypto.randomUUID()}`;
  store[id] = { key, intent, createdAt: new Date().toISOString() };
  writeJson("idempotency-keys", store);
  return key;
}

export function peekIdempotencyKey(intent: SensitiveMutationIntent, workflowId: string) {
  return readJson<IdempotencyStore>("idempotency-keys", {})[idFor(intent, workflowId)]?.key;
}

export function clearIdempotencyKey(intent: SensitiveMutationIntent, workflowId: string) {
  const store = readJson<IdempotencyStore>("idempotency-keys", {});
  delete store[idFor(intent, workflowId)];
  writeJson("idempotency-keys", store);
}
