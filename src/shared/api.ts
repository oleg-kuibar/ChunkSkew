import { apiFetch } from "./apiClient";
import type { IdempotentResponse } from "./domain";
import type { RouterMode } from "./types";

export const api = {
  submitDraftAction: (routerMode: RouterMode, idempotencyKey: string, body: { memo: string }) =>
    apiFetch<IdempotentResponse<{ id: string; memo: string }>>("/api/draft-action", routerMode, {
      method: "POST",
      idempotencyKey,
      mutationIntent: "draft.submit",
      body: JSON.stringify(body)
    }),
  apiKeys: (routerMode: RouterMode) => apiFetch<Array<{ id: string; name: string; prefix: string; createdAt: string }>>("/api/admin/api-keys", routerMode),
  generateApiKey: (routerMode: RouterMode, idempotencyKey: string, name: string) =>
    apiFetch<IdempotentResponse<{ id: string; name: string; prefix: string; createdAt: string }>>("/api/admin/api-keys", routerMode, {
      method: "POST",
      idempotencyKey,
      mutationIntent: "api-key.generate",
      body: JSON.stringify({ name })
    }),
  changeRole: (routerMode: RouterMode, idempotencyKey: string, role: string) =>
    apiFetch<IdempotentResponse<{ user: { id: string; role: string }; permissions: string[] }>>("/api/admin/roles", routerMode, {
      method: "POST",
      idempotencyKey,
      mutationIntent: "role.change",
      body: JSON.stringify({ role })
    })
};
