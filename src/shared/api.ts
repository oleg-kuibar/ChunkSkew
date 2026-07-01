import { apiFetch } from "./apiClient";
import type {
  Account,
  CardAccount,
  DashboardSnapshot,
  IdempotentResponse,
  Invoice,
  KybApplication,
  Payment,
  Transaction,
  Vendor
} from "./domain";
import type { RouterMode, SensitiveMutationIntent } from "./types";

export const api = {
  dashboard: (routerMode: RouterMode) => apiFetch<DashboardSnapshot>("/api/dashboard", routerMode),
  accounts: (routerMode: RouterMode) => apiFetch<Account[]>("/api/accounts", routerMode),
  vendors: (routerMode: RouterMode) => apiFetch<Vendor[]>("/api/vendors", routerMode),
  createVendor: (routerMode: RouterMode, idempotencyKey: string, body: Partial<Vendor>) =>
    apiFetch<IdempotentResponse<Vendor>>("/api/vendors", routerMode, {
      method: "POST",
      idempotencyKey,
      mutationIntent: "vendor.create",
      body: JSON.stringify(body)
    }),
  payments: (routerMode: RouterMode) => apiFetch<Payment[]>("/api/payments", routerMode),
  createPayment: (
    routerMode: RouterMode,
    idempotencyKey: string,
    body: {
      vendorId: string;
      amountCents: number;
      fundingAccountId: string;
      paymentDate: string;
    }
  ) =>
    apiFetch<IdempotentResponse<Payment>>("/api/payments", routerMode, {
      method: "POST",
      idempotencyKey,
      mutationIntent: "payment.submit",
      body: JSON.stringify(body)
    }),
  invoices: (routerMode: RouterMode) => apiFetch<Invoice[]>("/api/invoices", routerMode),
  invoice: (routerMode: RouterMode, invoiceId: string) => apiFetch<Invoice>(`/api/invoices/${invoiceId}`, routerMode),
  invoiceAction: (
    routerMode: RouterMode,
    invoiceId: string,
    action: "approve" | "reject",
    idempotencyKey: string,
    body: Record<string, unknown> = {}
  ) =>
    apiFetch<IdempotentResponse<Invoice>>(`/api/invoices/${invoiceId}/${action}`, routerMode, {
      method: "POST",
      idempotencyKey,
      mutationIntent: `invoice.${action}` as SensitiveMutationIntent,
      body: JSON.stringify(body)
    }),
  cards: (routerMode: RouterMode) => apiFetch<CardAccount[]>("/api/cards", routerMode),
  card: (routerMode: RouterMode, cardId: string) => apiFetch<CardAccount>(`/api/cards/${cardId}`, routerMode),
  cardAction: (routerMode: RouterMode, cardId: string, action: "freeze" | "unfreeze", idempotencyKey: string) =>
    apiFetch<IdempotentResponse<CardAccount>>(`/api/cards/${cardId}/${action}`, routerMode, {
      method: "POST",
      idempotencyKey,
      mutationIntent: `card.${action}` as SensitiveMutationIntent,
      body: JSON.stringify({})
    }),
  updateCardLimits: (
    routerMode: RouterMode,
    cardId: string,
    idempotencyKey: string,
    body: { spendLimitCents: number; categories: string[] }
  ) =>
    apiFetch<IdempotentResponse<CardAccount>>(`/api/cards/${cardId}/limits`, routerMode, {
      method: "POST",
      idempotencyKey,
      mutationIntent: "card.limit.update",
      body: JSON.stringify(body)
    }),
  transactions: (routerMode: RouterMode, q = "") =>
    apiFetch<Transaction[]>(`/api/transactions${q ? `?q=${encodeURIComponent(q)}` : ""}`, routerMode),
  kyb: (routerMode: RouterMode) => apiFetch<KybApplication>("/api/kyb", routerMode),
  submitKyb: (routerMode: RouterMode, idempotencyKey: string, body: unknown) =>
    apiFetch<IdempotentResponse<KybApplication>>("/api/kyb", routerMode, {
      method: "POST",
      idempotencyKey,
      mutationIntent: "kyb.submit",
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
