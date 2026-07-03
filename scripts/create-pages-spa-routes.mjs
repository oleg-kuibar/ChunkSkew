import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const routes = [
  "examples",
  "payments/create/recipient",
  "payments/create/amount",
  "payments/create/funding",
  "payments/create/schedule",
  "payments/create/review",
  "payments/create/mfa",
  "invoices",
  "invoices/inv_10041",
  "cards",
  "cards/card_1001",
  "kyb/business",
  "kyb/owners",
  "kyb/documents",
  "kyb/review",
  "transactions",
  "transactions/report",
  "settings",
  "audit",
  "debug/version-skew"
];

const indexPath = resolve("dist/index.html");
if (!existsSync(indexPath)) {
  throw new Error("dist/index.html does not exist. Run the Vite build first.");
}

for (const route of routes) {
  const target = resolve("dist", route, "index.html");
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(indexPath, target);
}

console.log(`Created ${routes.length} GitHub Pages SPA route entries.`);
