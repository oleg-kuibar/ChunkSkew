import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import express from "express";
import { WebSocketServer } from "ws";
import {
  accounts,
  apiKeys,
  cards,
  getActor,
  getRequestMetadata,
  invoices,
  kybApplication,
  organization,
  payments,
  resetMockData,
  roleMatrix,
  transactions,
  users,
  vendors,
  type AuditEvent,
  type SkewMode
} from "./mock-data";

type IdempotencyRecord = {
  key: string;
  intent: string;
  response: unknown;
  createdAt: string;
};

type SkewState = {
  mode: SkewMode;
  activeReleaseId: string;
  latestReleaseId: string;
  updateSeverity: "optional" | "recommended" | "required";
  apiContractVersion: string;
  compatibilityWindowExpiresAt: string;
  updatedAt: string;
};

const seedStatePath = resolve("server/skew-state.json");
const statePath = resolve(process.env.CHUNK_SKEW_STATE_PATH ?? ".chunk-skew/skew-state.json");
const auditEvents: AuditEvent[] = [];
const idempotencyRecords = new Map<string, IdempotencyRecord>();
const sseClients = new Set<express.Response>();

function createDefaultSkewState(): SkewState {
  return {
    mode: "asset-retention",
    activeReleaseId: "release-a",
    latestReleaseId: "release-a",
    updateSeverity: "optional",
    apiContractVersion: "2026-06",
    compatibilityWindowExpiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function readState(): SkewState {
  for (const path of [statePath, seedStatePath]) {
    if (existsSync(path)) {
      return JSON.parse(readFileSync(path, "utf8")) as SkewState;
    }
  }

  return createDefaultSkewState();
}

function writeState(next: SkewState) {
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath, `${JSON.stringify(next, null, 2)}\n`);
}

function versionMetadata(routerMode = "react-router", clientReleaseId?: string) {
  const state = readState();
  const releaseId = state.latestReleaseId;
  return {
    releaseId,
    buildTime: state.updatedAt,
    gitSha: "mock-server",
    deploymentId: `deployment-${releaseId}`,
    minimumSupportedClientRelease: state.updateSeverity === "required" ? releaseId : (clientReleaseId || state.activeReleaseId),
    updateSeverity: state.updateSeverity,
    routerMode,
    assetBasePath: state.mode === "affinity" ? `/releases/${state.activeReleaseId}/` : `/releases/${releaseId}/`,
    compatibilityWindowExpiresAt: state.compatibilityWindowExpiresAt,
    featureFlagSnapshotVersion: `ff-${releaseId}`,
    apiContractVersion: state.apiContractVersion,
    draftSchemaVersions: {
      payment: 2,
      kyb: 2,
      card: 2,
      invoice: 2,
      vendor: 2
    },
    skewMode: state.mode
  };
}

function appendAudit(req: express.Request, type: string, message: string, metadata: Record<string, unknown> = {}) {
  const requestMeta = getRequestMetadata(req);
  const event: AuditEvent = {
    id: `aud_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    type,
    message,
    actorId: requestMeta.actorId,
    organizationId: requestMeta.organizationId,
    releaseId: requestMeta.releaseId,
    deploymentId: requestMeta.deploymentId,
    routerMode: requestMeta.routerMode,
    createdAt: new Date().toISOString(),
    metadata: {
      ...metadata,
      mutationIntent: requestMeta.mutationIntent,
      mutationCreatedAt: requestMeta.mutationCreatedAt
    }
  };
  auditEvents.unshift(event);
  auditEvents.splice(250);
  return event;
}

function publishReleaseEvent(event: string, payload: Record<string, unknown>) {
  const data = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    client.write(data);
  }
  websocketServer?.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify({ event, payload }));
    }
  });
}

function primaryReleaseEvent(state: SkewState) {
  if (state.updateSeverity === "required") {
    return "release.required";
  }
  if (state.updateSeverity === "recommended") {
    return "release.recommended";
  }
  return "release.available";
}

function publishAuxiliaryReleaseEvents(state: SkewState, payload: Record<string, unknown>) {
  if (state.mode === "compatibility-window-expired") {
    publishReleaseEvent("asset.retention.expiring", {
      ...payload,
      compatibilityWindowExpiresAt: state.compatibilityWindowExpiresAt
    });
  }
  if (state.mode === "api-contract-incompatible") {
    publishReleaseEvent("api.contract.deprecating", {
      ...payload,
      apiContractVersion: state.apiContractVersion
    });
  }
  if (state.activeReleaseId !== state.latestReleaseId && state.updateSeverity === "optional") {
    publishReleaseEvent("release.rollback", payload);
  }
}

function requireIdempotency(req: express.Request, res: express.Response, intent: string, createResponse: () => unknown) {
  const key = req.header("idempotency-key");
  if (!key) {
    res.status(400).json({ error: "idempotency-key header is required", intent });
    return;
  }

  const existing = idempotencyRecords.get(key);
  if (existing) {
    appendAudit(req, `${intent}.deduped`, `Replayed ${intent} for an existing idempotency key.`, {
      idempotencyKeyPresent: true
    });
    res.json({ deduped: true, result: existing.response });
    return;
  }

  const response = createResponse();
  idempotencyRecords.set(key, { key, intent, response, createdAt: new Date().toISOString() });
  res.json({ deduped: false, result: response });
}

function hasPermission(req: express.Request, permission: string) {
  const actor = getActor(req);
  return roleMatrix[actor.role].includes(permission);
}

function permissionGuard(permission: string) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!hasPermission(req, permission)) {
      appendAudit(req, "permission.denied", `Permission ${permission} denied.`, { permission });
      res.status(403).json({ error: "permission_denied", permission });
      return;
    }
    next();
  };
}

function simulateLatency(_req: express.Request, _res: express.Response, next: express.NextFunction) {
  setTimeout(next, 90);
}

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use(simulateLatency);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "chunk-skew-mock-backend" });
});

app.get("/version.json", (req, res) => {
  res.setHeader("cache-control", "no-store");
  res.json(
    versionMetadata(
      String(req.query.routerMode ?? req.header("x-router-mode") ?? "react-router"),
      String(req.query.clientRelease ?? req.header("x-client-release") ?? "")
    )
  );
});

app.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  sseClients.add(res);
  const state = readState();
  const payload = versionMetadata(String(req.query.routerMode ?? "react-router"), String(req.query.clientRelease ?? ""));
  res.write(`event: ${primaryReleaseEvent(state)}\ndata: ${JSON.stringify(payload)}\n\n`);
  if (state.mode === "compatibility-window-expired") {
    res.write(`event: asset.retention.expiring\ndata: ${JSON.stringify(payload)}\n\n`);
  }
  if (state.mode === "api-contract-incompatible") {
    res.write(`event: api.contract.deprecating\ndata: ${JSON.stringify(payload)}\n\n`);
  }
  req.on("close", () => sseClients.delete(res));
});

app.get("/api/session", (req, res) => {
  const actor = getActor(req);
  const expired = req.header("x-session-expired") === "true";
  res.json({
    authenticated: !expired,
    user: actor,
    organization,
    permissions: roleMatrix[actor.role],
    mfaRequiredForSensitiveActions: true,
    expiresAt: expired ? new Date(Date.now() - 1000).toISOString() : new Date(Date.now() + 45 * 60 * 1000).toISOString()
  });
});

app.get("/api/org", (_req, res) => {
  res.json(organization);
});

app.get("/api/dashboard", (_req, res) => {
  res.json({
    accounts,
    pendingApprovals: invoices.filter((invoice) => invoice.status === "pending").slice(0, 3),
    recentTransactions: transactions.slice(0, 6),
    riskAlerts: [
      { id: "risk_001", severity: "medium", title: "New vendor above approval threshold", entity: "Kestrel Cloud Services" },
      { id: "risk_002", severity: "low", title: "Card receipt missing", entity: "Nora Adams" }
    ],
    cardsRequiringAttention: cards.filter((card) => Boolean(card.attention)),
    invoicesDueSoon: invoices.slice(0, 3)
  });
});

app.get("/api/accounts", (_req, res) => res.json(accounts));
app.get("/api/vendors", (_req, res) => res.json(vendors));

app.post("/api/vendors", permissionGuard("payments:create"), (req, res) => {
  requireIdempotency(req, res, "vendor.create", () => {
    const created = {
      id: `ven_${Date.now()}`,
      name: String(req.body.name ?? "New fake vendor"),
      accountMask: "**** 5401",
      risk: "medium",
      category: String(req.body.category ?? "General")
    };
    vendors.push(created);
    appendAudit(req, "vendor.created", `Vendor ${created.name} created.`, { vendorId: created.id });
    return created;
  });
});

app.get("/api/payments", (_req, res) => res.json(payments));
app.get("/api/payments/:id", (req, res) => {
  const payment = payments.find((item) => item.id === req.params.id);
  if (!payment) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(payment);
});

app.post("/api/payments", permissionGuard("payments:create"), (req, res) => {
  requireIdempotency(req, res, "payment.submit", () => {
    const payment = {
      id: `pay_${Date.now()}`,
      vendorId: String(req.body.vendorId),
      amountCents: Number(req.body.amountCents),
      fundingAccountId: String(req.body.fundingAccountId),
      paymentDate: String(req.body.paymentDate),
      status: "scheduled",
      idempotencyKey: req.header("idempotency-key") ?? "missing",
      createdAt: new Date().toISOString()
    };
    payments.push(payment);
    appendAudit(req, "payment.submitted", `Payment ${payment.id} scheduled.`, {
      paymentId: payment.id,
      amountCents: payment.amountCents,
      idempotencyKeyPresent: true
    });
    return payment;
  });
});

app.get("/api/invoices", (_req, res) => res.json(invoices));
app.get("/api/invoices/:id", (req, res) => {
  const invoice = invoices.find((item) => item.id === req.params.id);
  if (!invoice) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(invoice);
});

app.post("/api/invoices/:id/approve", permissionGuard("invoices:approve"), (req, res) => {
  requireIdempotency(req, res, "invoice.approve", () => {
    const invoice = invoices.find((item) => item.id === req.params.id);
    if (!invoice) {
      return { error: "not_found" };
    }
    invoice.status = "approved";
    appendAudit(req, "invoice.approved", `Invoice ${invoice.id} approved.`, { invoiceId: invoice.id });
    return invoice;
  });
});

app.post("/api/invoices/:id/reject", permissionGuard("invoices:approve"), (req, res) => {
  requireIdempotency(req, res, "invoice.reject", () => {
    const invoice = invoices.find((item) => item.id === req.params.id);
    if (!invoice) {
      return { error: "not_found" };
    }
    invoice.status = "rejected";
    appendAudit(req, "invoice.rejected", `Invoice ${invoice.id} rejected.`, {
      invoiceId: invoice.id,
      notePresent: Boolean(req.body.note)
    });
    return invoice;
  });
});

app.get("/api/cards", (_req, res) => res.json(cards));
app.get("/api/cards/:id", (req, res) => {
  const card = cards.find((item) => item.id === req.params.id);
  if (!card) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(card);
});

app.post("/api/cards/:id/freeze", permissionGuard("cards:update"), (req, res) => {
  requireIdempotency(req, res, "card.freeze", () => {
    const card = cards.find((item) => item.id === req.params.id);
    if (card) {
      card.status = "frozen";
    }
    appendAudit(req, "card.frozen", `Card ${req.params.id} frozen.`, { cardId: req.params.id });
    return card;
  });
});

app.post("/api/cards/:id/unfreeze", permissionGuard("cards:update"), (req, res) => {
  requireIdempotency(req, res, "card.unfreeze", () => {
    const card = cards.find((item) => item.id === req.params.id);
    if (card) {
      card.status = "active";
    }
    appendAudit(req, "card.unfrozen", `Card ${req.params.id} unfrozen.`, { cardId: req.params.id });
    return card;
  });
});

app.post("/api/cards/:id/limits", permissionGuard("cards:update"), (req, res) => {
  requireIdempotency(req, res, "card.limit.update", () => {
    const card = cards.find((item) => item.id === req.params.id);
    if (card) {
      card.spendLimitCents = Number(req.body.spendLimitCents);
      card.categories = Array.isArray(req.body.categories) ? req.body.categories : card.categories;
    }
    appendAudit(req, "card.limit_updated", `Card ${req.params.id} controls updated.`, {
      cardId: req.params.id,
      spendLimitCents: card?.spendLimitCents
    });
    return card;
  });
});

app.get("/api/transactions", (req, res) => {
  const q = String(req.query.q ?? "").toLowerCase();
  res.json(q ? transactions.filter((item) => item.description.toLowerCase().includes(q)) : transactions);
});

app.get("/api/kyb", (_req, res) => res.json(kybApplication));
app.post("/api/kyb", permissionGuard("kyb:submit"), (req, res) => {
  requireIdempotency(req, res, "kyb.submit", () => {
    kybApplication.status = "submitted";
    appendAudit(req, "kyb.submitted", "KYB application submitted for review.", {
      applicationId: kybApplication.id,
      documentCount: Array.isArray(req.body.documents) ? req.body.documents.length : 0
    });
    return { ...kybApplication, submittedAt: new Date().toISOString() };
  });
});

app.get("/api/audit-events", (_req, res) => res.json(auditEvents));
app.post("/api/audit-events", (req, res) => {
  const event = appendAudit(req, String(req.body.type ?? "client.event"), String(req.body.message ?? "Client event"), {
    ...(req.body.metadata ?? {})
  });
  res.status(201).json(event);
});

app.post("/api/admin/api-keys", permissionGuard("api-keys:create"), (req, res) => {
  requireIdempotency(req, res, "api-key.generate", () => {
    const key = {
      id: `key_${Date.now()}`,
      name: String(req.body.name ?? "Generated test key"),
      prefix: "sk_test_mock...",
      createdAt: new Date().toISOString(),
      lastUsedAt: null
    };
    apiKeys.push(key);
    appendAudit(req, "api_key.generated", "Mock API key generated.", { keyId: key.id });
    return key;
  });
});

app.get("/api/admin/api-keys", (_req, res) => res.json(apiKeys));

app.post("/api/admin/roles", permissionGuard("admin:write"), (req, res) => {
  requireIdempotency(req, res, "role.change", () => {
    const actor = getActor(req);
    const nextRole = String(req.body.role);
    if (!["owner", "admin", "finance-manager", "employee", "auditor"].includes(nextRole)) {
      return { error: "invalid_role" };
    }
    actor.role = nextRole as typeof actor.role;
    appendAudit(req, "role.changed", `Role changed to ${nextRole}.`, {
      targetUserId: actor.id,
      nextRole
    });
    return { user: actor, permissions: roleMatrix[actor.role] };
  });
});

app.get("/api/debug/version-skew", (req, res) => {
  res.json({
    ...readState(),
    version: versionMetadata(
      String(req.header("x-router-mode") ?? "react-router"),
      String(req.header("x-client-release") ?? "")
    )
  });
});

app.post("/api/debug/version-skew/mode", (req, res) => {
  const mode = String(req.body.mode) as SkewMode;
  const severities: Record<SkewMode, "optional" | "recommended" | "required"> = {
    "no-affinity": "recommended",
    affinity: "optional",
    "asset-retention": "recommended",
    broken: "required",
    "compatibility-window-expired": "required",
    "api-contract-incompatible": "required"
  };
  const next: SkewState = {
    mode,
    activeReleaseId: mode === "no-affinity" ? "release-b" : "release-a",
    latestReleaseId: "release-b",
    updateSeverity: severities[mode],
    apiContractVersion: mode === "api-contract-incompatible" ? "2026-07" : "2026-06",
    compatibilityWindowExpiresAt:
      mode === "compatibility-window-expired"
        ? new Date(Date.now() - 60_000).toISOString()
        : new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString()
  };
  writeState(next);
  const payload = versionMetadata(String(req.header("x-router-mode") ?? "react-router"), String(req.header("x-client-release") ?? ""));
  publishReleaseEvent(primaryReleaseEvent(next), payload);
  publishAuxiliaryReleaseEvents(next, payload);
  appendAudit(req, "debug.skew_mode_changed", `Skew mode changed to ${mode}.`, { mode });
  res.json({ ...next, version: payload });
});

app.post("/api/debug/version-skew/reset", (req, res) => {
  const clientRelease = String(req.header("x-client-release") ?? "");
  const routerMode = String(req.header("x-router-mode") ?? "react-router");
  const next = {
    ...createDefaultSkewState(),
    activeReleaseId: clientRelease || "release-a",
    latestReleaseId: clientRelease || "release-a"
  };
  writeState(next);
  resetMockData();
  idempotencyRecords.clear();
  auditEvents.length = 0;
  const payload = versionMetadata(routerMode, clientRelease);
  publishReleaseEvent(primaryReleaseEvent(next), payload);
  res.json({ ...next, version: payload });
});

app.post("/api/debug/session-expired", (req, res) => {
  appendAudit(req, "debug.session_expired", "Session expiry simulation toggled.", {});
  res.json({ ok: true });
});

if (process.argv.includes("--static")) {
  app.use("/releases/:releaseId", (req, res, next) => {
    const state = readState();
    const requestedRelease = req.params.releaseId;
    const oldRelease = requestedRelease !== state.latestReleaseId;
    if (state.mode === "broken" && oldRelease) {
      res.status(404).send("Old release assets intentionally removed in broken mode.");
      return;
    }
    if (state.mode === "no-affinity" && oldRelease) {
      res.status(404).send("No deployment affinity: old release assets are unavailable.");
      return;
    }
    if (state.mode === "compatibility-window-expired" && oldRelease) {
      res.status(410).send("Compatibility window expired for old release assets.");
      return;
    }
    if (state.mode === "affinity" && requestedRelease !== state.activeReleaseId) {
      res.status(404).send("Deployment affinity is pinned to the active release.");
      return;
    }
    next();
  });
  app.use("/releases", express.static(resolve("releases"), { immutable: true, maxAge: "1y" }));
  app.use(express.static(resolve("dist"), { etag: true, maxAge: "0" }));
  app.get("*", (_req, res) => {
    const indexPath = join(resolve("dist"), "index.html");
    if (existsSync(indexPath)) {
      res.setHeader("cache-control", "no-cache");
      res.sendFile(indexPath);
      return;
    }
    res.status(404).send("Build dist first with pnpm build or pnpm build:release-a.");
  });
}

const port = Number(process.env.PORT ?? 4177);
const server = createServer(app);
let websocketServer: WebSocketServer | undefined;

websocketServer = new WebSocketServer({ server, path: "/events-ws" });
websocketServer.on("connection", (socket) => {
  socket.send(JSON.stringify({ event: "release.available", payload: versionMetadata("react-router") }));
});

server.listen(port, () => {
  console.log(`ChunkSkew mock backend listening on http://localhost:${port}`);
});
