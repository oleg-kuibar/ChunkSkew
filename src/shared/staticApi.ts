import {
  accounts,
  apiKeys,
  cards,
  invoices,
  kybApplication,
  payments,
  transactions,
  vendors
} from "../../server/mock-data";
import type { CardAccount, IdempotentResponse, Invoice, KybApplication, Payment, Vendor } from "./domain";

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

function findInvoice(invoiceId: string) {
  return invoices.find((item) => item.id === invoiceId) ?? invoices[0];
}

function findCard(cardId: string) {
  return cards.find((item) => item.id === cardId) ?? cards[0];
}

function staticGet(pathname: string, searchParams: URLSearchParams) {
  if (pathname === "/api/dashboard") {
    return {
      accounts,
      pendingApprovals: invoices.filter((invoice) => invoice.status === "pending").slice(0, 3),
      recentTransactions: transactions.slice(0, 6),
      riskAlerts: [
        { id: "risk_static_1", severity: "medium", title: "Vendor review due", entity: "Kestrel Cloud Services" },
        { id: "risk_static_2", severity: "low", title: "Card receipt missing", entity: "Nora Adams" }
      ],
      cardsRequiringAttention: cards.filter((card) => Boolean(card.attention)),
      invoicesDueSoon: invoices.slice(0, 3)
    };
  }
  if (pathname === "/api/accounts") return accounts;
  if (pathname === "/api/vendors") return vendors;
  if (pathname === "/api/payments") return payments;
  if (pathname === "/api/invoices") return invoices;
  if (pathname === "/api/cards") return cards;
  if (pathname === "/api/kyb") return kybApplication;
  if (pathname === "/api/admin/api-keys") return apiKeys;
  if (pathname === "/api/transactions") {
    const query = searchParams.get("q")?.toLowerCase();
    return query ? transactions.filter((item) => item.description.toLowerCase().includes(query)) : transactions;
  }
  const invoiceMatch = pathname.match(/^\/api\/invoices\/([^/]+)$/);
  if (invoiceMatch) return findInvoice(invoiceMatch[1]);
  const cardMatch = pathname.match(/^\/api\/cards\/([^/]+)$/);
  if (cardMatch) return findCard(cardMatch[1]);
  return undefined;
}

function staticPostCollection(pathname: string, body: Record<string, unknown>) {
  if (pathname === "/api/vendors") {
    return idempotent<Vendor>({
      id: `ven_static_${Date.now()}`,
      name: String(body.name ?? "Static demo vendor"),
      accountMask: "**** 4242",
      risk: "low",
      category: String(body.category ?? "Demo")
    });
  }
  if (pathname === "/api/payments") {
    return idempotent<Payment>({
      id: `pay_static_${Date.now()}`,
      vendorId: String(body.vendorId ?? vendors[0].id),
      amountCents: Number(body.amountCents ?? 0),
      status: "scheduled",
      fundingAccountId: String(body.fundingAccountId ?? accounts[0].id),
      paymentDate: String(body.paymentDate ?? new Date().toISOString().slice(0, 10)),
      idempotencyKey: "static-demo",
      createdAt: new Date().toISOString()
    });
  }
  if (pathname === "/api/kyb") {
    return idempotent<KybApplication>({ ...kybApplication, status: "submitted" });
  }
  return undefined;
}

function staticPostInvoice(pathname: string) {
  const invoiceAction = pathname.match(/^\/api\/invoices\/([^/]+)\/(approve|reject)$/);
  if (invoiceAction) {
    const invoice = findInvoice(invoiceAction[1]);
    return idempotent<Invoice>({ ...invoice, status: invoiceAction[2] === "approve" ? "approved" : "rejected" });
  }
  return undefined;
}

function staticPostCard(pathname: string, body: Record<string, unknown>) {
  const cardAction = pathname.match(/^\/api\/cards\/([^/]+)\/(freeze|unfreeze)$/);
  if (cardAction) {
    const card = findCard(cardAction[1]);
    return idempotent<CardAccount>({ ...card, status: cardAction[2] === "freeze" ? "frozen" : "active" });
  }
  const cardLimits = pathname.match(/^\/api\/cards\/([^/]+)\/limits$/);
  if (cardLimits) {
    const card = findCard(cardLimits[1]);
    return idempotent<CardAccount>({
      ...card,
      spendLimitCents: Number(body.spendLimitCents ?? card.spendLimitCents),
      categories: Array.isArray(body.categories) ? body.categories.map(String) : card.categories
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
    return idempotent({ user: { id: "usr_olivia", role: String(body.role ?? "owner") }, permissions: [] });
  }
  return undefined;
}

function staticPost(pathname: string, options: RequestInit) {
  const body = requestBody(options);
  return (
    staticPostCollection(pathname, body) ??
    staticPostInvoice(pathname) ??
    staticPostCard(pathname, body) ??
    staticPostAdmin(pathname, body)
  );
}

export function staticApiResponse<T>(path: string, options: RequestInit = {}) {
  const url = new URL(path, "https://static.local");
  const method = (options.method ?? "GET").toUpperCase();
  const payload = method === "GET" ? staticGet(url.pathname, url.searchParams) : staticPost(url.pathname, options);
  return payload === undefined ? undefined : (clone(payload) as T);
}
