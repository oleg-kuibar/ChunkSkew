const sensitiveKeyPattern = /(account|card|document|pan|routing|secret|ssn|tax)/i;

function maskString(value: string) {
  return value.length <= 4 ? "****" : `${"*".repeat(Math.max(4, value.length - 4))}${value.slice(-4)}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function redactSensitiveMetadata(value: unknown, key = ""): unknown {
  const lower = key.toLowerCase();

  if (lower.includes("idempotency")) {
    return value ? "present" : "missing";
  }

  if (sensitiveKeyPattern.test(lower)) {
    if (lower.endsWith("count")) {
      return value;
    }
    return typeof value === "string" ? maskString(value) : "[redacted]";
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveMetadata(item));
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [childKey, redactSensitiveMetadata(childValue, childKey)]));
  }

  return value;
}
