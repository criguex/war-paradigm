import { test, expect } from '@playwright/test';
import path from 'node:path';
import { CommandGenerator, FIXTURES, RecordedGenerator, loadStory, resolveGenerator } from '../src/generator';
import { evaluate } from '../src/scorer';

// The adapter that lets a real agent sit behind the same verdict.

const fakeAgent = `node ${path.resolve(FIXTURES, '../scripts/fake-agent.mjs')}`;

test('recorded is the default generator, a command takes over when the env var is set', () => {
  expect(resolveGenerator().name).toBe('recorded:pinned');
  process.env.MUTANT_LAB_GENERATOR_CMD = 'echo {}';
  try {
    expect(resolveGenerator().name).toBe('command:echo {}');
  } finally {
    delete process.env.MUTANT_LAB_GENERATOR_CMD;
  }
});

test('command generator: story in on stdin, artifact out on stdout, RUN in the environment', async () => {
  const story = await loadStory();
  const live = new CommandGenerator(fakeAgent);
  const recorded = new RecordedGenerator('pinned');
  for (const run of [1, 2, 3]) {
    const fromCommand = await live.generate(story, run);
    expect(fromCommand).toEqual(await recorded.generate(story, run));
    expect(evaluate(fromCommand, story).verdict).toBe('approved');
  }
});

test('command generator: a non-zero exit is an error, not a verdict', async () => {
  const story = await loadStory();
  await expect(new CommandGenerator('exit 3').generate(story, 1)).rejects.toThrow('generator exited with code 3');
});

test('command generator: output that is not JSON is an error, not a verdict', async () => {
  const story = await loadStory();
  await expect(new CommandGenerator('echo not-json').generate(story, 1)).rejects.toThrow('generator did not return JSON');
});
