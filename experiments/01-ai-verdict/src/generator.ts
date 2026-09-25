import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Story } from './types';

const here = path.dirname(fileURLToPath(import.meta.url));
export const FIXTURES = path.resolve(here, '../fixtures');

/**
 * Where an artifact comes from. The lab ships RECORDED runs (no API key, fully
 * deterministic). Plug a real agent in with MUTANT_LAB_GENERATOR_CMD, see README.
 */
export interface Generator {
  readonly name: string;
  generate(story: Story, run: number): Promise<unknown>;
}

/** Reads fixtures/runs/<set>/run-<n>.json */
export class RecordedGenerator implements Generator {
  readonly name: string;
  constructor(readonly set: string) {
    this.name = `recorded:${set}`;
  }
  async generate(_story: Story, run: number): Promise<unknown> {
    const file = path.join(FIXTURES, 'runs', this.set, `run-${run}.json`);
    return JSON.parse(await readFile(file, 'utf8'));
  }
}

/**
 * Runs a shell command, writes the story as JSON on stdin and expects the artifact
 * as JSON on stdout. RUN=<n> is set in the environment. Any CLI can sit behind it:
 * a Python script, an LLM CLI, curl against your own service.
 */
export class CommandGenerator implements Generator {
  readonly name: string;
  constructor(readonly command: string, readonly timeoutMs = 120_000) {
    this.name = `command:${command}`;
  }
  generate(story: Story, run: number): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.command, { shell: true, env: { ...process.env, RUN: String(run) }, stdio: ['pipe', 'pipe', 'inherit'] });
      let out = '';
      const timer = setTimeout(() => { child.kill(); reject(new Error(`generator timed out after ${this.timeoutMs} ms`)); }, this.timeoutMs);
      child.stdout.on('data', (c) => (out += c));
      child.on('error', (err) => { clearTimeout(timer); reject(err); });
      child.on('close', (code) => {
        clearTimeout(timer);
        if (code !== 0) return reject(new Error(`generator exited with code ${code}`));
        try { resolve(JSON.parse(out)); } catch { reject(new Error(`generator did not return JSON: ${out.slice(0, 200)}`)); }
      });
      // a generator that exits without reading stdin closes the pipe early (EPIPE); the exit code decides, not the pipe
      child.stdin.on('error', () => {});
      child.stdin.end(JSON.stringify(story));
    });
  }
}

export async function loadStory(id = 'US-42'): Promise<Story> {
  return JSON.parse(await readFile(path.join(FIXTURES, `story-${id}.json`), 'utf8'));
}

/** MUTANT_LAB_GENERATOR_CMD set → live command; otherwise the recorded set (default: pinned). */
export function resolveGenerator(set = 'pinned'): Generator {
  const cmd = process.env.MUTANT_LAB_GENERATOR_CMD;
  return cmd ? new CommandGenerator(cmd) : new RecordedGenerator(set);
}
