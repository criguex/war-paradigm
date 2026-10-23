// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Cristian Guerra
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyBaseline,
  classifyMutation,
  displayOutcome,
  isKnownSurvivor,
  noEvidence,
  type RunProvenance,
} from '../scenario-evidence';

const run: RunProvenance = {
  runId: 'unit-test', createdAt: '2026-01-01T00:00:00.000Z', gitSha: 'test',
  deterministic: true, randomSeed: null, inputSha256: {},
};

test('expected rejection kills only when the configured 4xx status matches', () => {
  assert.equal(classifyMutation(403, 403), 'KILLED');
  assert.equal(classifyMutation(403, 422), 'INCONCLUSIVE');
});

test('accepted mutation survives, but server errors are inconclusive', () => {
  assert.equal(classifyMutation(403, 200), 'SURVIVED');
  assert.equal(classifyMutation(403, 500), 'INCONCLUSIVE');
});

test('baseline failures are kept out of the mutation score', () => {
  assert.equal(classifyBaseline(200, 422), 'INVALID_BASELINE');
  assert.equal(classifyBaseline(200, 503), 'INFRA_ERROR');
});

test('a skipped or interrupted scenario without attached evidence is infrastructure, not a survivor', () => {
  const evidence = noEvidence('self-grant', 403, run);
  assert.equal(evidence.outcome, 'INFRA_ERROR');
  assert.equal(isKnownSurvivor(evidence.outcome, 'known finding'), false);
});

test('known finding annotation is reserved for a real survivor and a killed known case is fixed', () => {
  assert.equal(isKnownSurvivor('SURVIVED', 'known finding'), true);
  assert.equal(isKnownSurvivor('INVALID_BASELINE', 'known finding'), false);
  assert.equal(displayOutcome('KILLED', 'known finding'), 'FIXED');
});
