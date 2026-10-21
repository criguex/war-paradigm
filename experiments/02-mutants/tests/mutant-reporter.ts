// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Cristian Guerra
import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';

const paint = (code: number, s: string) => `\x1b[${code}m${s}\x1b[0m`;
const green = (s: string) => paint(32, s);
const red = (s: string) => paint(31, s);
const yellow = (s: string) => paint(33, s);
const bold = (s: string) => paint(1, s);
const dim = (s: string) => paint(2, s);
const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, '');

type Outcome = 'killed' | 'survived' | 'known' | 'fixed';
type Row = { name: string; outcome: Outcome; detail: string };

/**
 * Prints the MUTANT SCOREBOARD after the list reporter.
 *
 *   killed    the app rejected the mutant (test passed)
 *   SURVIVED  the app accepted the mutant → new finding (test failed, run goes red)
 *   known     declared survivor (`known:` in mutants.spec.ts) → still reported, run stays green
 *   FIXED     a declared survivor got killed → the bug is fixed, remove its `known:` flag
 */
class MutantReporter implements Reporter {
  private rows: Row[] = [];

  printsToStdio() {
    return true;
  }

  onTestEnd(test: TestCase, result: TestResult) {
    if (!test.location.file.endsWith('mutants.spec.ts')) return;
    const [name, rest] = test.title.split(': ');
    const expected = rest?.split('expect ')[1] ?? '';
    const known = test.annotations.find((a) => a.type === 'known finding')?.description ?? '';
    const firstLine = stripAnsi(result.error?.message ?? '').split('\n')[0];
    const why = firstLine.replace(/^(Error: )?SURVIVED: [^—]+— /, '');

    let outcome: Outcome;
    if (result.status === 'passed') outcome = known ? 'fixed' : 'killed';
    else outcome = known ? 'known' : 'survived';

    const detail =
      outcome === 'killed' ? `rejected with ${expected}`
      : outcome === 'fixed' ? `rejected with ${expected} · known finding no longer reproduces, remove its \`known\` flag`
      : outcome === 'known' ? `${why} · ${known}`
      : why;
    this.rows.push({ name, outcome, detail });
  }

  onEnd() {
    if (!this.rows.length) return;
    const width = Math.max(...this.rows.map((r) => r.name.length)) + 2;
    const line = (r: Row) => {
      switch (r.outcome) {
        case 'killed':   return green(`  ✓ killed    ${r.name.padEnd(width)}`) + dim(r.detail);
        case 'known':    return red(`  ✘ SURVIVED  ${r.name.padEnd(width)}`) + yellow(`(known finding) `) + dim(r.detail);
        case 'fixed':    return yellow(`  ! FIXED     ${r.name.padEnd(width)}`) + dim(r.detail);
        case 'survived': return red(`  ✘ SURVIVED  ${r.name.padEnd(width)}${r.detail}`);
      }
    };
    const killed = this.rows.filter((r) => r.outcome === 'killed' || r.outcome === 'fixed').length;
    const survived = this.rows.length - killed;
    const known = this.rows.filter((r) => r.outcome === 'known').length;
    const summary = survived
      ? red(`${survived} survived`) + (known ? dim(` (${known} known, tracked as open finding)`) : '')
      : green('0 survived');
    const lines = ['', bold('  MUTANT SCOREBOARD'), ...this.rows.map(line), '', `  ${killed}/${this.rows.length} mutants killed · ${summary}`, ''];
    process.stdout.write(lines.join('\n') + '\n');
  }
}

export default MutantReporter;
