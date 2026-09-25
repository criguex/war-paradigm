import { test, expect } from '@playwright/test';
import { RecordedGenerator, loadStory, resolveGenerator } from '../src/generator';
import { evaluate } from '../src/scorer';
import { stability } from '../src/stability';
import type { Report } from '../src/types';

// Same input, three runs. The verdict must not flip.

async function runSet(set: string, runs = 3) {
  const story = await loadStory();
  const generator = new RecordedGenerator(set);
  const reports = [];
  for (let run = 1; run <= runs; run++) reports.push(evaluate(await generator.generate(story, run), story));
  return stability(reports);
}

test('pinned agent: 3/3 runs agree → trust the verdict', async () => {
  const s = await runSet('pinned');
  expect(s.verdicts).toEqual(['approved', 'approved', 'approved']);
  expect(s.scores).toEqual([86, 84, 87]);
  expect(s.stable).toBe(true);
  expect(s.flips).toEqual([]);
  expect(s.finding).toBeUndefined();
});

test('unpinned agent: the verdict flips on run 3 → logged as a finding', async () => {
  const s = await runSet('unpinned');
  expect(s.verdicts).toEqual(['approved', 'approved', 'rejected']);
  expect(s.scores).toEqual([83, 74, 76]);
  expect(s.stable).toBe(false);
  expect(s.flips).toEqual([{ run: 3, from: 'approved', to: 'rejected' }]);
  expect(s.finding).toContain('verdict flipped approved → rejected on run 3 (scores 83 / 74 / 76)');
  expect(s.finding).toContain('run was not pinned: temperature is 1');
  test.info().annotations.push({ type: 'finding', description: s.finding! });
});

test('the flip is a must failure, not a score below the gate', async () => {
  const story = await loadStory();
  const report = evaluate(await new RecordedGenerator('unpinned').generate(story, 3), story);
  expect(report.score).toBeGreaterThanOrEqual(report.gate);
  expect(report.reasons).toEqual(['must failed: AC-1, AC-3']);
});

test('stability of a single run is trivially stable', () => {
  const report: Report = { verdict: 'approved', score: 90, gate: 70, reasons: [], schemaErrors: [], pinWarnings: [], criteria: [] };
  expect(stability([report]).stable).toBe(true);
  expect(stability([]).stable).toBe(true);
});

test('live agent: same check against MUTANT_LAB_GENERATOR_CMD', async () => {
  test.skip(!process.env.MUTANT_LAB_GENERATOR_CMD, 'set MUTANT_LAB_GENERATOR_CMD to evaluate a real agent (see README)');
  const story = await loadStory();
  const generator = resolveGenerator();
  const reports = [];
  for (let run = 1; run <= 3; run++) reports.push(evaluate(await generator.generate(story, run), story));
  const s = stability(reports);
  if (s.finding) test.info().annotations.push({ type: 'finding', description: s.finding });
  expect(s.stable, s.finding).toBe(true);
});
