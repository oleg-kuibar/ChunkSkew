import type { Request } from "express";

export type Role = "owner" | "admin" | "finance-manager" | "employee" | "auditor";
export type SkewMode =
  | "no-affinity"
  | "affinity"
  | "asset-retention"
  | "broken"
  | "compatibility-window-expired"
  | "api-contract-incompatible";

export interface AuditEvent {
  id: string;
  type: string;
  message: string;
  actorId: string;
  organizationId: string;
  releaseId: string;
  deploymentId: string;
  routerMode: string;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export const users = [
  {
    id: "usr_olivia",
    name: "Olivia Harper",
    email: "olivia.harper@example.test",
    role: "owner" as Role,
    mfaEnabled: true
  },
  {
    id: "usr_miles",
    name: "Miles Chen",
    email: "miles.chen@example.test",
    role: "finance-manager" as Role,
    mfaEnabled: true
  },
  {
    id: "usr_auditor",
    name: "Rina Patel",
    email: "rina.patel@example.test",
    role: "auditor" as Role,
    mfaEnabled: false
  }
];

export const organization = {
  id: "org_northstar",
  name: "Northstar Fabrication LLC",
  industry: "Industrial design services",
  jurisdiction: "US-DE",
  riskTier: "medium",
  fakeDataNotice: "All companies, people, accounts, cards, invoices, and compliance records are fake."
};

export const accounts = [
  {
    id: "acct_ops",
    name: "Operating account",
    maskedNumber: "**** 4921",
    balanceCents: 483_293_44,
    availableCents: 472_115_12,
    currency: "USD"
  },
  {
    id: "acct_tax",
    name: "Tax reserve",
    maskedNumber: "**** 1180",
    balanceCents: 82_400_00,
    availableCents: 82_400_00,
    currency: "USD"
  },
  {
    id: "acct_payroll",
    name: "Payroll clearing",
    maskedNumber: "**** 7037",
    balanceCents: 134_950_00,
    availableCents: 134_950_00,
    currency: "USD"
  }
];

export const vendors = [
  {
    id: "ven_steel",
    name: "Atlas Steel Supply",
    accountMask: "**** 2014",
    risk: "low",
    category: "Materials"
  },
  {
    id: "ven_cloud",
    name: "Kestrel Cloud Services",
    accountMask: "**** 8801",
    risk: "medium",
    category: "Software"
  },
  {
    id: "ven_legal",
    name: "Cedar Legal Group",
    accountMask: "**** 6632",
    risk: "low",
    category: "Professional services"
  }
];

export const payments = [
  {
    id: "pay_seed_001",
    vendorId: "ven_cloud",
    amountCents: 12_450_00,
    status: "scheduled",
    fundingAccountId: "acct_ops",
    paymentDate: "2026-07-02",
    idempotencyKey: "seed-payment-001",
    createdAt: "2026-06-20T14:22:00.000Z"
  }
];

export const invoices = [
  {
    id: "inv_10041",
    vendorId: "ven_steel",
    vendorName: "Atlas Steel Supply",
    amountCents: 34_918_44,
    dueDate: "2026-07-01",
    status: "pending",
    risk: "low",
    approver: "Olivia Harper"
  },
  {
    id: "inv_10042",
    vendorId: "ven_cloud",
    vendorName: "Kestrel Cloud Services",
    amountCents: 18_700_00,
    dueDate: "2026-06-29",
    status: "pending",
    risk: "medium",
    approver: "Miles Chen"
  },
  {
    id: "inv_10043",
    vendorId: "ven_legal",
    vendorName: "Cedar Legal Group",
    amountCents: 6_800_00,
    dueDate: "2026-07-05",
    status: "needs-review",
    risk: "low",
    approver: "Olivia Harper"
  }
];

export const cards = [
  {
    id: "card_ops_01",
    holder: "Nora Adams",
    maskedPan: "4242 **** **** 1088",
    status: "active",
    spendLimitCents: 15_000_00,
    spentThisMonthCents: 8_310_19,
    categories: ["Travel", "Software", "Meals"],
    attention: "Receipt missing"
  },
  {
    id: "card_ops_02",
    holder: "Diego Rivera",
    maskedPan: "5555 **** **** 7421",
    status: "frozen",
    spendLimitCents: 7_500_00,
    spentThisMonthCents: 2_144_20,
    categories: ["Fuel", "Materials"],
    attention: "Frozen by risk policy"
  },
  {
    id: "card_ops_03",
    holder: "Iris Wong",
    maskedPan: "3782 ****** 9005",
    status: "active",
    spendLimitCents: 20_000_00,
    spentThisMonthCents: 13_800_10,
    categories: ["Advertising", "Software"],
    attention: "Limit review due"
  }
];

export const transactions = Array.from({ length: 42 }, (_, index) => {
  const vendorsForRows = ["Atlas Steel Supply", "Kestrel Cloud Services", "Cedar Legal Group", "Harbor Freight Test Co."];
  const statuses = ["posted", "pending", "flagged"] as const;
  return {
    id: `txn_${String(index + 1).padStart(4, "0")}`,
    postedAt: new Date(Date.UTC(2026, 5, 1 + (index % 25), 13, index)).toISOString(),
    description: vendorsForRows[index % vendorsForRows.length],
    amountCents: (index % 9 === 0 ? -1 : 1) * (4_500_00 + index * 12_345),
    accountId: accounts[index % accounts.length].id,
    status: statuses[index % statuses.length],
    riskScore: index % 9 === 0 ? 87 : 18 + (index % 30),
    maskedCounterparty: `**** ${2000 + index}`
  };
});

export const kybApplication = {
  id: "kyb_2026_northstar",
  status: "draft",
  businessDetails: {
    legalName: "Northstar Fabrication LLC",
    taxIdMask: "**-***4821",
    address: "100 Market Street, Test City, DE"
  },
  owners: [
    { id: "own_olivia", name: "Olivia Harper", ownershipPercent: 62, verificationStatus: "verified" },
    { id: "own_miles", name: "Miles Chen", ownershipPercent: 18, verificationStatus: "pending" }
  ],
  documents: [
    { id: "doc_articles", type: "Articles of organization", status: "uploaded" },
    { id: "doc_ein", type: "EIN letter", status: "missing" }
  ]
};

export const apiKeys: Array<{
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}> = [
  {
    id: "key_public_test",
    name: "Treasury sandbox sync",
    prefix: "sk_test_9f3...",
    createdAt: "2026-06-12T15:00:00.000Z",
    lastUsedAt: "2026-06-24T20:11:00.000Z"
  }
];

export const roleMatrix: Record<Role, string[]> = {
  owner: ["payments:create", "invoices:approve", "cards:update", "kyb:submit", "admin:write", "api-keys:create"],
  admin: ["payments:create", "invoices:approve", "cards:update", "admin:read", "api-keys:create"],
  "finance-manager": ["payments:create", "invoices:approve", "cards:update", "admin:read"],
  employee: ["cards:read", "payments:read"],
  auditor: ["audit:read", "transactions:read", "admin:read"]
};

export function cents(value: number) {
  return Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value / 100);
}

export function getActor(req: Request) {
  const requestedUser = req.header("x-user-id");
  return users.find((user) => user.id === requestedUser) ?? users[0];
}

export function getRequestMetadata(req: Request) {
  const actor = getActor(req);
  return {
    actorId: actor.id,
    organizationId: req.header("x-organization-id") ?? organization.id,
    releaseId: req.header("x-client-release") ?? "unknown-release",
    deploymentId: req.header("x-client-deployment-id") ?? "unknown-deployment",
    routerMode: req.header("x-router-mode") ?? "unknown-router",
    apiContractVersion: req.header("x-api-contract-version") ?? "unknown-contract",
    mutationIntent: req.header("x-mutation-intent") ?? undefined,
    mutationCreatedAt: req.header("x-mutation-created-at") ?? undefined
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function resetArray<T>(target: T[], initial: T[]) {
  target.splice(0, target.length, ...clone(initial));
}

const initialUsers = clone(users);
const initialOrganization = clone(organization);
const initialVendors = clone(vendors);
const initialPayments = clone(payments);
const initialInvoices = clone(invoices);
const initialCards = clone(cards);
const initialKybApplication = clone(kybApplication);
const initialApiKeys = clone(apiKeys);

export function resetMockData() {
  resetArray(users, initialUsers);
  Object.assign(organization, clone(initialOrganization));
  resetArray(vendors, initialVendors);
  resetArray(payments, initialPayments);
  resetArray(invoices, initialInvoices);
  resetArray(cards, initialCards);
  Object.assign(kybApplication, clone(initialKybApplication));
  resetArray(apiKeys, initialApiKeys);
}
