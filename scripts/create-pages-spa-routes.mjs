import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const routes = [
  "examples",
  "draft/write",
  "draft/check",
  "draft/submit",
  "modal",
  "modal/row-1",
  "controls",
  "controls/control-1",
  "bad-draft/note",
  "bad-draft/check",
  "event-rows",
  "retained-file",
  "guarded-action",
  "event-log",
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
