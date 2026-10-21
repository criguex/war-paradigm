// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Cristian Guerra
// Shows the hook doing its job: same JSON Claude Code sends, exit code decides.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HOOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../hooks/block-push-to-main.sh');
const paint = (code, s) => (process.stdout.isTTY ? `\x1b[${code}m${s}\x1b[0m` : s);

const commands = [
  'git push origin main',
  'git push --force origin HEAD:main',
  'npm test && git push origin master',
  'git push origin feature/mutants',
  'git push -u origin feature/mutants',
  'git pull origin main',
];

console.log('\n  hooks/block-push-to-main.sh · PreToolUse(Bash)\n');
for (const command of commands) {
  const input = JSON.stringify({ tool_name: 'Bash', tool_input: { command } });
  const r = spawnSync('bash', [HOOK], { input, encoding: 'utf8' });
  const tag = r.status === 2 ? paint(31, '✘ BLOCKED (exit 2)') : paint(32, '✓ allowed (exit 0)');
  console.log(`  $ ${command.padEnd(40)} ${tag}`);
  if (r.stderr) console.log(paint(2, `      ${r.stderr.trim()}`));
}
console.log('');
