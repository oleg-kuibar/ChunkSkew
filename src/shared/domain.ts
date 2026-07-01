export interface Account {
  id: string;
  name: string;
  maskedNumber: string;
  balanceCents: number;
  availableCents: number;
  currency: string;
}

export interface Vendor {
  id: string;
  name: string;
  accountMask: string;
  risk: string;
  category: string;
}

export interface Payment {
  id: string;
  vendorId: string;
  amountCents: number;
  status: string;
  fundingAccountId: string;
  paymentDate: string;
  idempotencyKey: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  vendorId: string;
  vendorName: string;
  amountCents: number;
  dueDate: string;
  status: string;
  risk: string;
  approver: string;
}

export interface CardAccount {
  id: string;
  holder: string;
  maskedPan: string;
  status: string;
  spendLimitCents: number;
  spentThisMonthCents: number;
  categories: string[];
  attention: string;
}

export interface Transaction {
  id: string;
  postedAt: string;
  description: string;
  amountCents: number;
  accountId: string;
  status: string;
  riskScore: number;
  maskedCounterparty: string;
}

export interface KybApplication {
  id: string;
  status: string;
  businessDetails: {
    legalName: string;
    taxIdMask: string;
    address: string;
  };
  owners: Array<{ id: string; name: string; ownershipPercent: number; verificationStatus: string }>;
  documents: Array<{ id: string; type: string; status: string }>;
}

export interface DashboardSnapshot {
  accounts: Account[];
  pendingApprovals: Invoice[];
  recentTransactions: Transaction[];
  riskAlerts: Array<{ id: string; severity: string; title: string; entity: string }>;
  cardsRequiringAttention: CardAccount[];
  invoicesDueSoon: Invoice[];
}

export interface IdempotentResponse<T> {
  deduped: boolean;
  result: T;
}
