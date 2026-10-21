// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Cristian Guerra
import { CommandGenerator, RecordedGenerator, loadStory, type Generator } from './generator';
import { evaluate } from './scorer';
import { stability } from './stability';
import type { CriterionResult, Report } from './types';

const paint = (code: number, s: string) => (process.stdout.isTTY || process.env.FORCE_COLOR ? `\x1b[${code}m${s}\x1b[0m` : s);
const green = (s: string) => paint(32, s);
const red = (s: string) => paint(31, s);
const yellow = (s: string) => paint(33, s);
const bold = (s: string) => paint(1, s);
const dim = (s: string) => paint(2, s);

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const option = (name: string, fallback: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const runs = Number(option('runs', '3'));
const live = flag('live');
const failOnFlip = flag('fail-on-flip');
const setArg = option('set', live ? 'live' : 'all');

const statusIcon = (r: CriterionResult) =>
  r.status === 'met' ? green('✔ met    ') : r.status === 'partial' ? yellow('◐ partial') : red('✘ failed ');

function printReport(run: number, report: Report) {
  console.log(`  ${bold(`run ${run}`)}  ${dim(`trace ${report.meta?.traceId ?? '-'}`)}`);
  if (report.schemaErrors.length) {
    console.log(red('    schema invalid:'));
    for (const e of report.schemaErrors) console.log(red(`      · ${e}`));
  }
  for (const c of report.criteria) {
    const tag = c.priority === 'must' ? bold('must  ') : dim(`should`);
    console.log(`    ${c.id.padEnd(5)} ${tag} ${statusIcon(c)}  ${dim(c.evidence[0] ?? '')}`);
    for (const e of c.evidence.slice(1)) console.log(dim(`                              ${e}`));
  }
  const verdict = report.verdict === 'approved' ? green('APPROVED') : red('REJECTED');
  const why = report.reasons.length ? dim(` · ${report.reasons.join(' · ')}`) : '';
  console.log(`    score ${bold(`${report.score}/100`)} · gate ${report.gate} · verdict ${verdict}${why}\n`);
}

async function evaluateSet(name: string, generator: Generator) {
  const story = await loadStory();
  console.log(bold(`── set: ${name} `).padEnd(60, '─'));
  const reports: Report[] = [];
  for (let run = 1; run <= runs; run++) {
    const raw = await generator.generate(story, run);
    const report = evaluate(raw, story);
    reports.push(report);
    if (run === 1 && report.meta) {
      const m = report.meta;
      console.log(`  pins   model ${bold(m.model)} · temperature ${bold(String(m.temperature))} · prompt ${bold(m.promptVersion)}`);
      for (const w of report.pinWarnings) console.log(yellow(`         ⚠ ${w}`));
      console.log('');
    }
    printReport(run, report);
  }
  const s = stability(reports);
  const line = reports.map((r, i) => (r.verdict === 'approved' ? green(`run ${i + 1} approved ${r.score}`) : red(`run ${i + 1} REJECTED ${r.score}`))).join(dim('  ·  '));
  console.log(`  ${line}`);
  if (s.stable) console.log(`  verdict ${green('STABLE')} ${dim(`· ${s.runs}/${s.runs} runs agree`)}\n`);
  else console.log(`  verdict ${red('UNSTABLE')} → ${bold('finding')}: ${s.finding}\n`);
  return s;
}

async function main() {
  const story = await loadStory();
  console.log('');
  console.log(bold('  THE MUTANT LAB · Experiment #01 · AI output changes every run. Your verdict can\'t.'));
  console.log(dim(`  story ${story.id} · ${story.title} · ${runs} runs per set\n`));

  const sets: [string, Generator][] = [];
  if (live) {
    const cmd = process.env.MUTANT_LAB_GENERATOR_CMD;
    if (!cmd) {
      console.error(red('  --live needs MUTANT_LAB_GENERATOR_CMD (a command that reads the story on stdin and prints the artifact JSON). See README.'));
      process.exit(2);
    }
    sets.push(['live', new CommandGenerator(cmd)]);
  } else {
    for (const set of setArg === 'all' ? ['pinned', 'unpinned'] : [setArg]) sets.push([set, new RecordedGenerator(set)]);
  }

  let flips = 0;
  for (const [name, generator] of sets) {
    const s = await evaluateSet(name, generator);
    if (!s.stable) flips++;
  }
  if (failOnFlip && flips) process.exit(1);
}

main().catch((err) => {
  console.error(red(`  ${err instanceof Error ? err.message : String(err)}`));
  process.exit(1);
});
