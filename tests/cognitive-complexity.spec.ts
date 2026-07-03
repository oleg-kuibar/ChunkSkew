import { expect, test } from "@playwright/test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

interface FunctionScore {
  file: string;
  name: string;
  line: number;
  lines: number;
  branches: number;
}

const knownTradeoffs: Record<string, string> = {
  "src/pages/VersionSkewDebug.tsx:VersionSkewDebugPage":
    "Lab controls intentionally keep scenario setup, reset, diagnostics, and audit proof in one visible teaching surface.",
  "src/shared/updatePolicyEngine.ts:decideUpdatePolicyForState":
    "The ordered product decision matrix is deliberately explicit so readers can copy the rules without chasing indirection.",
  "src/workflows/KybWorkflow.tsx:KybWorkflow":
    "KYB demonstrates migration, incompatible drafts, document review, and submit safety in one realistic workflow.",
  "src/workflows/PaymentWorkflow.tsx:PaymentWorkflow":
    "Payment is the primary walkthrough, keeping autosave, MFA, idempotency, and required-update recovery together."
};

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      return sourceFiles(path);
    }
    return /\.(ts|tsx)$/.test(path) && !path.endsWith("routeTree.gen.ts") ? [path] : [];
  });
}

function scanCode(text: string, start: number, onChar: (char: string, index: number) => number | undefined) {
  let quote = "";
  let lineComment = false;
  let blockComment = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (lineComment) {
      if (char === "\n") {
        lineComment = false;
      }
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === quote) {
        quote = "";
      }
      continue;
    }
    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    const result = onChar(char, index);
    if (result !== undefined) {
      return result;
    }
  }

  return -1;
}

function bodyOpenAfterParameters(text: string, start: number) {
  const openParen = text.indexOf("(", start);
  if (openParen < 0) {
    return -1;
  }

  let depth = 0;
  let parametersClosed = false;
  return scanCode(text, openParen, (char, index) => {
    if (!parametersClosed) {
      if (char === "(") {
        depth += 1;
      }
      if (char === ")" && --depth === 0) {
        parametersClosed = true;
      }
      return undefined;
    }
    if (char === "{") {
      return index;
    }
    if (char === ";" || char === "=") {
      return -1;
    }
    return undefined;
  });
}

function closingBrace(text: string, open: number) {
  let depth = 0;
  return scanCode(text, open, (char, index) => {
    if (char === "{") {
      depth += 1;
    }
    if (char === "}" && --depth === 0) {
      return index;
    }
    return undefined;
  });
}

function stripNoise(code: string) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/`[\s\S]*?`/g, "")
    .replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, "");
}

function lineNumber(text: string, index: number) {
  return text.slice(0, index).split("\n").length;
}

function scoreFile(file: string): FunctionScore[] {
  const text = readFileSync(file, "utf8");
  const normalizedFile = file.replace(/\\/g, "/");
  const scores: FunctionScore[] = [];
  const functionPattern = /(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(/g;
  let match: RegExpExecArray | null;

  while ((match = functionPattern.exec(text))) {
    const open = bodyOpenAfterParameters(text, match.index);
    const end = open >= 0 ? closingBrace(text, open) : -1;
    if (end < 0) {
      continue;
    }
    const body = stripNoise(text.slice(open, end + 1));
    scores.push({
      file: normalizedFile,
      name: match[1],
      line: lineNumber(text, match.index),
      lines: lineNumber(text, end) - lineNumber(text, match.index) + 1,
      branches: (body.match(/\b(if|for|while|case|catch)\b|&&|\|\||\?\?|\?/g) ?? []).length
    });
  }

  return scores;
}

test("cognitive complexity scan documents only known learning tradeoffs", () => {
  const scores = [...sourceFiles("src"), ...sourceFiles("server")].flatMap(scoreFile);
  const flagged = scores.filter((item) => item.branches > 15 || item.lines > 160);
  const unexpected = flagged.filter((item) => !knownTradeoffs[`${item.file}:${item.name}`]);

  expect(unexpected).toEqual([]);
  expect(flagged.length).toBeGreaterThan(0);
  expect(Object.values(knownTradeoffs).every((reason) => reason.length > 40)).toBe(true);
});
