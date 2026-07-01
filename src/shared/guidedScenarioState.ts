import { readJson, removeKey, writeJson } from "./storage";

const guidedScenarioKey = "guided-scenario";

export interface GuidedScenarioState {
  id: string;
  title: string;
  outcome: string;
  href: string;
  steps: string[];
  targetStepIndex?: number;
  startedAt: string;
}

export function readGuidedScenarioState() {
  return readJson<GuidedScenarioState | null>(guidedScenarioKey, null);
}

export function writeGuidedScenarioState(scenario: Omit<GuidedScenarioState, "startedAt">) {
  writeJson(guidedScenarioKey, { ...scenario, startedAt: new Date().toISOString() });
}

export function clearGuidedScenarioState() {
  removeKey(guidedScenarioKey);
}
