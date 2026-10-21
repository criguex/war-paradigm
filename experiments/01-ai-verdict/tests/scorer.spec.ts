// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Cristian Guerra
import { test, expect } from '@playwright/test';
import { GATE, criteria } from '../src/criteria';
import { RecordedGenerator, loadStory } from '../src/generator';
import { evaluate } from '../src/scorer';
import type { Artifact } from '../src/types';

// Q2 — is what it produced good? Score against explicit acceptance criteria, with evidence.

const load = async (set: string, run: number) => (await new RecordedGenerator(set).generate(await loadStory(), run)) as Artifact;

test('the gate is a number the team agreed on', () => {
  expect(GATE).toBe(70);
  expect(criteria.filter((c) => c.priority === 'must').map((c) => c.id)).toEqual(['AC-1', 'AC-2', 'AC-3']);
  expect(criteria.filter((c) => c.priority === 'should').reduce((n, c) => n + c.weight, 0)).toBe(100);
});

test('pinned runs: the output changes, the verdict does not', async () => {
  const story = await loadStory();
  const scores: number[] = [];
  for (const run of [1, 2, 3]) {
    const report = evaluate(await load('pinned', run), story);
    expect(report.verdict, `run ${run}`).toBe('approved');
    expect(report.reasons).toEqual([]);
    expect(report.pinWarnings).toEqual([]);
    scores.push(report.score);
  }
  expect(scores).toEqual([86, 84, 87]);
});

test('every criterion carries evidence computed by code', async () => {
  const story = await loadStory();
  const report = evaluate(await load('pinned', 1), story);
  expect(report.criteria).toHaveLength(criteria.length);
  for (const c of report.criteria) {
    expect(c.evidence.length, c.id).toBeGreaterThan(0);
    expect(c.fraction).toBeGreaterThanOrEqual(0);
    expect(c.fraction).toBeLessThanOrEqual(1);
  }
  const ac5 = report.criteria.find((c) => c.id === 'AC-5')!;
  expect(ac5.status).toBe('partial');
  expect(ac5.evidence).toEqual(['2/4 boundaries covered · missing: B-2, B-3']);
});

test('a failed must rejects the artifact no matter the score', async () => {
  const story = await loadStory();
  const artifact = await load('pinned', 1);
  artifact.scenarios[3].source = '';
  const report = evaluate(artifact, story);
  expect(report.score).toBe(86);
  expect(report.verdict).toBe('rejected');
  expect(report.reasons).toEqual(['must failed: AC-1']);
  expect(report.criteria[0].evidence).toEqual(['S-4 has no valid source (source="", covers=[R-3])']);
});

test('a forbidden role expecting success breaks the role contract', async () => {
  const story = await loadStory();
  const artifact = await load('pinned', 1);
  artifact.scenarios.push({
    id: 'S-12', title: 'Viewer approves a draft', actor: 'viewer', action: 'approve', covers: ['R-2'], source: 'US-42/R-2',
    steps: ['Sign in as viewer', 'POST /api/docs/:id/approve'], expected: { status: 200 },
  });
  const report = evaluate(artifact, story);
  expect(report.verdict).toBe('rejected');
  expect(report.reasons).toEqual(['must failed: AC-3']);
  expect(report.criteria.find((c) => c.id === 'AC-3')!.evidence).toEqual(['S-12: viewer → approve expects 200 (matrix says forbidden → 403)']);
});

test('a score below the gate rejects even when every must is met', async () => {
  const story = await loadStory();
  const artifact = await load('pinned', 1);
  // drop two of the three negative scenarios and every boundary case, keep the must-requirements covered
  artifact.scenarios = artifact.scenarios.filter((s) => !['S-3', 'S-7'].includes(s.id) && !s.covers.some((id) => id.startsWith('B-')));
  artifact.risks = [];
  artifact.assumptions = [];
  const report = evaluate(artifact, story);
  expect(report.criteria.filter((c) => c.priority === 'must').every((c) => c.status === 'met')).toBe(true);
  expect(report.score).toBe(40);
  expect(report.verdict).toBe('rejected');
  expect(report.reasons).toEqual(['score 40 below gate 70']);
});

test('an artifact that fails Q1 is rejected before scoring', async () => {
  const story = await loadStory();
  const report = evaluate({ story: 'US-42', scenarios: [] }, story);
  expect(report.verdict).toBe('rejected');
  expect(report.score).toBe(0);
  expect(report.criteria).toEqual([]);
  expect(report.reasons[0]).toMatch(/^schema: /);
});
