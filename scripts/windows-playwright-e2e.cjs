const { cpSync, existsSync, mkdirSync, readdirSync, rmSync } = require("node:fs");
const { join } = require("node:path");
const { spawnSync } = require("node:child_process");

function toWindowsPath(path) {
  const match = path.match(/^\/mnt\/([a-z])\/(.*)$/i);
  if (!match) {
    return path;
  }
  return `${match[1].toUpperCase()}:\\${match[2].replaceAll("/", "\\")}`;
}

function findWindowsNode() {
  if (process.env.WINDOWS_NODE && existsSync(process.env.WINDOWS_NODE)) {
    return process.env.WINDOWS_NODE;
  }
  const usersRoot = "/mnt/c/Users";
  if (!existsSync(usersRoot)) {
    return null;
  }
  for (const user of readdirSync(usersRoot)) {
    const candidate = join(
      usersRoot,
      user,
      ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe"
    );
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

if (process.platform !== "win32" && process.env.CHUNK_SKEW_WINDOWS_E2E_CHILD !== "1") {
  const node = findWindowsNode();
  if (!node) {
    console.error("Could not find a Windows node.exe. Set WINDOWS_NODE to run this E2E wrapper.");
    process.exit(1);
  }
  prepareWindowsResolvablePackages();
  const result = spawnSync(node, [toWindowsPath(__filename), ...process.argv.slice(2)], {
    cwd: process.cwd(),
    stdio: "inherit",
    env: {
      ...process.env,
      CHUNK_SKEW_WINDOWS_E2E_CHILD: "1",
      PLAYWRIGHT_USE_SYSTEM_CHROME: "1",
      PLAYWRIGHT_SKIP_WEBSERVER: "1"
    }
  });
  if (result.error) {
    console.error(result.error);
  }
  process.exit(result.status ?? 1);
}

function prepareWindowsResolvablePackages() {
  const packages = [
    { name: "@playwright/test", dest: join(process.cwd(), "node_modules", "@playwright", "test") },
    { name: "playwright", dest: join(process.cwd(), "node_modules", "playwright") },
    { name: "playwright-core", dest: join(process.cwd(), "node_modules", "playwright-core") }
  ];
  for (const pkg of packages) {
    const source = join(findPnpmPackageRoot(pkg.name), ...pkg.name.split("/"));
    mkdirSync(join(pkg.dest, ".."), { recursive: true });
    rmSync(pkg.dest, { recursive: true, force: true });
    cpSync(source, pkg.dest, { recursive: true });
  }
}

function findPnpmPackageRoot(packageName) {
  const pnpmRoot = join(process.cwd(), "node_modules", ".pnpm");
  const prefix = packageName.replace("/", "+") + "@";
  const match = readdirSync(pnpmRoot).find((entry) => entry.startsWith(prefix));
  if (!match) {
    throw new Error(`Could not find ${packageName} under ${pnpmRoot}`);
  }
  return join(pnpmRoot, match, "node_modules");
}

process.env.NODE_PATH = [
  findPnpmPackageRoot("@playwright/test"),
  findPnpmPackageRoot("playwright"),
  findPnpmPackageRoot("playwright-core")
].join(";");
process.env.PLAYWRIGHT_USE_SYSTEM_CHROME = "1";
process.env.PLAYWRIGHT_SKIP_WEBSERVER = "1";
require("module").Module._initPaths();

const { program } = require("playwright/lib/program");
const args = process.argv.slice(2);
process.argv = [
  process.argv[0],
  "playwright",
  ...(args.length > 0 ? args : ["test", "--project=chromium", "--reporter=list"])
];
program.parse(process.argv);
