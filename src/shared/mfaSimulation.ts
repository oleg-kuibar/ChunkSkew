import { readJson, writeJson } from "./storage";
import type { SensitiveMutationIntent } from "./types";

type MfaState = Record<string, { verifiedAt: string; intent: SensitiveMutationIntent }>;

export function isMfaVerified(intent: SensitiveMutationIntent) {
  const state = readJson<MfaState>("mfa", {});
  const entry = state[intent];
  if (!entry) {
    return false;
  }
  return Date.now() - new Date(entry.verifiedAt).getTime() < 10 * 60 * 1000;
}

export function verifyMfa(intent: SensitiveMutationIntent) {
  const state = readJson<MfaState>("mfa", {});
  state[intent] = { intent, verifiedAt: new Date().toISOString() };
  writeJson("mfa", state);
}

export function clearMfa(intent: SensitiveMutationIntent) {
  const state = readJson<MfaState>("mfa", {});
  delete state[intent];
  writeJson("mfa", state);
}
