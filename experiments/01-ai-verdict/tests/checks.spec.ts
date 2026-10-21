// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Cristian Guerra
import { test, expect } from '@playwright/test';
import { checkPins, validateArtifact } from '../src/checks';
import { RecordedGenerator, loadStory } from '../src/generator';
import type { Artifact } from '../src/types';

// Q1 — does it run as specified? Schema, enumerations, reference integrity.

const load = async (set: string, run: number) => (await new RecordedGenerator(set).generate(await loadStory(), run)) as Artifact;

for (const set of ['pinned', 'unpinned']) {
  for (const run of [1, 2, 3]) {
    test(`schema: ${set}/run-${run} is a valid artifact`, async () => {
      const story = await loadStory();
      const result = validateArtifact(await load(set, run), story);
      expect(result.errors).toEqual([]);
      expect(result.ok).toBe(true);
    });
  }
}

test('schema: a non-object is rejected', async () => {
  const story = await loadStory();
  expect(validateArtifact('just text', story).errors).toEqual(['artifact must be a JSON object']);
  expect(validateArtifact(null, story).ok).toBe(false);
});

test('schema: missing meta, scenarios, risks and assumptions are all reported', async () => {
  const story = await loadStory();
  const result = validateArtifact({ story: 'US-42' }, story);
  expect(result.errors).toEqual(expect.arrayContaining([
    'meta: missing object',
    'scenarios: must be an array',
    'risks: must be an array of strings',
    'assumptions: must be an array of strings',
  ]));
});

test('contract: unknown role, unknown action and bad status code are rejected', async () => {
  const story = await loadStory();
  const artifact = await load('pinned', 1);
  artifact.scenarios[0].actor = 'superuser';
  artifact.scenarios[1].action = 'delete';
  artifact.scenarios[2].expected.status = 42;
  const { errors } = validateArtifact(artifact, story);
  expect(errors).toContain('scenarios[0].actor: "superuser" is not one of viewer, editor, approver, admin');
  expect(errors).toContain('scenarios[1].action: "delete" is not one of create, approve, publish');
  expect(errors).toContain('scenarios[2].expected.status: must be an HTTP status code');
});

test('references: covers must point to requirement or boundary ids that exist', async () => {
  const story = await loadStory();
  const artifact = await load('pinned', 1);
  artifact.scenarios[0].covers = ['R-99'];
  expect(validateArtifact(artifact, story).errors).toEqual(['scenarios[0].covers: unknown id "R-99"']);
});

test('references: duplicate scenario ids and a wrong story id are rejected', async () => {
  const story = await loadStory();
  const artifact = await load('pinned', 1);
  artifact.scenarios[1].id = artifact.scenarios[0].id;
  artifact.story = 'US-41';
  const { errors } = validateArtifact(artifact, story);
  expect(errors).toContain('scenarios[1].id: duplicate id "S-1"');
  expect(errors).toContain('story: expected "US-42", got "US-41"');
});

test('pins: a pinned run has no warnings, an unpinned run has three', async () => {
  const pinned = await load('pinned', 1);
  const unpinned = await load('unpinned', 1);
  expect(checkPins(pinned.meta)).toEqual([]);
  expect(checkPins(unpinned.meta)).toEqual([
    'temperature is 1 (pinned runs use 0)',
    'promptVersion "latest" is a moving target, tag it',
    'model "planner-agent" has no version tag (expected name@version)',
  ]);
});
