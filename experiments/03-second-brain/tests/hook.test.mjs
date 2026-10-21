// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Cristian Guerra
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HOOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../hooks/block-push-to-main.sh');

/** Runs the hook exactly like Claude Code does: tool call as JSON on stdin, project dir in the env. */
function hook(command, projectDir, toolName = 'Bash') {
  const input = JSON.stringify({ tool_name: toolName, tool_input: { command } });
  const r = spawnSync('bash', [HOOK], { input, cwd: projectDir, env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir }, encoding: 'utf8' });
  return { status: r.status, stderr: r.stderr.trim() };
}

function gitRepoOn(branch) {
  const dir = mkdtempSync(path.join(tmpdir(), 'mutant-lab-hook-'));
  const git = (...args) => spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
  git('init', '-q');
  git('checkout', '-q', '-b', branch);
  return dir;
}

let onMain, onFeature;
before(() => {
  onMain = gitRepoOn('main');
  onFeature = gitRepoOn('feature/mutants');
});
after(() => {
  rmSync(onMain, { recursive: true, force: true });
  rmSync(onFeature, { recursive: true, force: true });
});

const blocked = (command, dir) => {
  const r = hook(command, dir);
  assert.equal(r.status, 2, `expected exit 2 for: ${command}\nstderr: ${r.stderr}`);
  assert.match(r.stderr, /blocked by hook: block-push-to-main\.sh/);
};
const allowed = (command, dir) => {
  const r = hook(command, dir);
  assert.equal(r.status, 0, `expected exit 0 for: ${command}\nstderr: ${r.stderr}`);
  assert.equal(r.stderr, '');
};

describe('blocks a push to main/master', () => {
  test('explicit branch', () => blocked('git push origin main', onFeature));
  test('explicit branch with -u', () => blocked('git push -u origin main', onFeature));
  test('master', () => blocked('git push origin master', onFeature));
  test('force push', () => blocked('git push --force origin main', onFeature));
  test('HEAD:main refspec', () => blocked('git push origin HEAD:main', onFeature));
  test('feature:master refspec', () => blocked('git push origin feature/x:master', onFeature));
  test('full ref', () => blocked('git push origin refs/heads/main', onFeature));
  test('forced full ref', () => blocked('git push origin +refs/heads/main', onFeature));
  test('bare `git push` while on main', () => blocked('git push', onMain));
  test('`git push origin` while on main', () => blocked('git push origin', onMain));
  test('`git push origin HEAD` while on main', () => blocked('git push origin HEAD', onMain));
  test('chained after other commands', () => blocked('npm test && git push origin main', onFeature));
  test('chained with ;', () => blocked('git add -A; git commit -m x; git push origin main', onFeature));
  test('git -C <dir> push', () => blocked('git -C /tmp/some-repo push origin main', onFeature));
});

describe('lets everything else through', () => {
  test('feature branch', () => allowed('git push origin feature/mutants', onMain));
  test('feature branch with -u', () => allowed('git push -u origin feature/mutants', onMain));
  test('force-with-lease to a feature branch', () => allowed('git push --force-with-lease origin feature/mutants', onMain));
  test('bare `git push` on a feature branch', () => allowed('git push', onFeature));
  test('`git push origin HEAD` on a feature branch', () => allowed('git push origin HEAD', onFeature));
  test('git pull from main is fine', () => allowed('git pull origin main', onFeature));
  test('git status', () => allowed('git status', onMain));
  test('unrelated command mentioning main', () => allowed('echo "main branch is protected"', onMain));
  test('npm test', () => allowed('npm test', onMain));
});

describe('is robust to what Claude Code may send', () => {
  test('empty stdin', () => {
    const r = spawnSync('bash', [HOOK], { input: '', encoding: 'utf8' });
    assert.equal(r.status, 0);
  });
  test('not JSON', () => {
    const r = spawnSync('bash', [HOOK], { input: 'garbage', encoding: 'utf8' });
    assert.equal(r.status, 0);
  });
  test('a tool without a command', () => {
    const r = spawnSync('bash', [HOOK], { input: JSON.stringify({ tool_name: 'Read', tool_input: { file_path: 'x' } }), encoding: 'utf8' });
    assert.equal(r.status, 0);
  });
});

describe('works without jq (node fallback) and without jq or node (sed fallback)', () => {
  // A PATH with only the tools each fallback needs; the hook must reach the same verdicts.
  const binWith = (...tools) => {
    const dir = mkdtempSync(path.join(tmpdir(), 'mutant-lab-bin-'));
    for (const tool of ['bash', 'cat', 'sed', 'git', ...tools]) {
      const found = spawnSync('bash', ['-lc', `command -v ${tool}`], { encoding: 'utf8' }).stdout.trim();
      if (found) symlinkSync(found, path.join(dir, tool));
    }
    return dir;
  };
  const run = (command, projectDir, bin) => {
    const input = JSON.stringify({ tool_name: 'Bash', tool_input: { command } });
    return spawnSync('bash', [HOOK], { input, cwd: projectDir, env: { PATH: bin, CLAUDE_PROJECT_DIR: projectDir }, encoding: 'utf8' });
  };

  for (const [name, tools] of [['node fallback', ['node']], ['sed fallback', []]]) {
    test(name, () => {
      const bin = binWith(...tools);
      try {
        assert.equal(spawnSync('bash', ['-c', 'command -v jq'], { env: { PATH: bin } }).status, 1, 'jq must not be reachable');
        assert.equal(run('git push origin main', onFeature, bin).status, 2);
        assert.equal(run('git push', onMain, bin).status, 2);
        assert.equal(run('git push origin feature/mutants', onMain, bin).status, 0);
        assert.equal(run('git status', onMain, bin).status, 0);
      } finally {
        rmSync(bin, { recursive: true, force: true });
      }
    });
  }
});
