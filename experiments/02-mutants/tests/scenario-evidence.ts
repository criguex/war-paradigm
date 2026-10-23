// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Cristian Guerra
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export type Outcome = 'KILLED' | 'SURVIVED' | 'INCONCLUSIVE' | 'INVALID_BASELINE' | 'INFRA_ERROR';
export type ScenarioEvidence = {
  scenarioId: string;
  expectedStatus: number;
  outcome: Outcome;
  phase: 'contract' | 'reset' | 'login' | 'baseline' | 'mutation' | 'observation' | 'runner';
  reason: string;
  observedStatus?: number;
  observedState?: Record<string, unknown>;
  observationError?: string;
  knownFinding?: string;
  run: RunProvenance;
};

export type RunProvenance = {
  runId: string;
  createdAt: string;
  gitSha: string;
  deterministic: true;
  randomSeed: null;
  inputSha256: Record<string, string>;
};

const inputs = [
  'app/server.js',
  'tests/flow.ts',
  'tests/scenarios.ts',
  'tests/scenario-runner.ts',
  'tests/scenario-evidence.ts',
  'tests/mutants.spec.ts',
  '../../package-lock.json',
];

export function createRunProvenance(): RunProvenance {
  const inputSha256 = Object.fromEntries(inputs.map((path) => {
    const bytes = readFileSync(path);
    return [path, createHash('sha256').update(bytes).digest('hex')];
  }));
  let gitSha = 'unavailable';
  try {
    gitSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {}
  const createdAt = new Date().toISOString();
  return {
    runId: `${createdAt}-${process.pid}`,
    createdAt,
    gitSha,
    deterministic: true,
    randomSeed: null,
    inputSha256,
  };
}

export function classifyBaseline(expected: number, observed: number): Outcome {
  if (observed === expected) return 'KILLED';
  return observed >= 500 ? 'INFRA_ERROR' : 'INVALID_BASELINE';
}

export function classifyMutation(expected: number, observed: number): Outcome {
  if (observed >= 500) return 'INCONCLUSIVE';
  if (observed >= 200 && observed < 300) return 'SURVIVED';
  if (observed === expected && expected >= 400 && expected < 500) return 'KILLED';
  return 'INCONCLUSIVE';
}

export function isKnownSurvivor(outcome: Outcome, knownFinding?: string): boolean {
  return outcome === 'SURVIVED' && Boolean(knownFinding);
}

export function displayOutcome(outcome: Outcome, knownFinding?: string): string {
  if (knownFinding && outcome === 'SURVIVED') return 'KNOWN SURVIVOR';
  if (knownFinding && outcome === 'KILLED') return 'FIXED';
  return outcome;
}

export function noEvidence(scenarioId: string, expectedStatus: number, run: RunProvenance): ScenarioEvidence {
  return {
    scenarioId,
    expectedStatus,
    outcome: 'INFRA_ERROR',
    phase: 'runner',
    reason: 'No scenario evidence was attached; the test may have been skipped or interrupted before recording a result.',
    run,
  };
}
