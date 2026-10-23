// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Cristian Guerra
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import { createRunProvenance, displayOutcome, noEvidence, type Outcome, type ScenarioEvidence } from './scenario-evidence';

const paint = (code: number, value: string) => `\x1b[${code}m${value}\x1b[0m`;
const green = (value: string) => paint(32, value);
const red = (value: string) => paint(31, value);
const yellow = (value: string) => paint(33, value);
const bold = (value: string) => paint(1, value);

type Row = { evidence: ScenarioEvidence; playwrightStatus: string };

function attachedEvidence(result: TestResult): ScenarioEvidence | undefined {
  const attachment = result.attachments.find((item) => item.name === 'scenario-evidence.json');
  if (!attachment) return undefined;
  try {
    const bytes = attachment.body ?? (attachment.path ? readFileSync(attachment.path) : undefined);
    return bytes ? JSON.parse(bytes.toString()) as ScenarioEvidence : undefined;
  } catch {
    return undefined;
  }
}

function expectedStatus(test: TestCase): number {
  const match = test.title.match(/expect (\d+)/);
  return match ? Number(match[1]) : 0;
}

class MutantReporter implements Reporter {
  private rows: Row[] = [];

  printsToStdio() {
    return true;
  }

  onTestEnd(test: TestCase, result: TestResult) {
    if (!test.location.file.endsWith('mutants.spec.ts')) return;
    const scenarioId = test.title.split(': ')[0];
    const evidence = attachedEvidence(result) ?? noEvidence(scenarioId, expectedStatus(test), createRunProvenance());
    this.rows.push({ evidence, playwrightStatus: result.status });
  }

  onEnd() {
    if (!this.rows.length) return;
    const provenance = this.rows[0].evidence.run;
    const counts: Record<Outcome, number> = {
      KILLED: 0, SURVIVED: 0, INCONCLUSIVE: 0, INVALID_BASELINE: 0, INFRA_ERROR: 0,
    };
    for (const row of this.rows) counts[row.evidence.outcome] += 1;

    const report = {
      schemaVersion: 1,
      run: provenance,
      summary: {
        total: this.rows.length,
        scored: counts.KILLED + counts.SURVIVED,
        excludedFromScore: counts.INCONCLUSIVE + counts.INVALID_BASELINE + counts.INFRA_ERROR,
        counts,
      },
      scenarios: this.rows.map((row) => ({ ...row.evidence, playwrightStatus: row.playwrightStatus })),
      limitation: 'HTTP status and declared read-only postconditions only; EQUIVALENT is not inferred from a passing check or matching response.',
    };
    const reportPath = 'test-results/mutant-evidence.json';
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

    const width = Math.max(...this.rows.map((row) => row.evidence.scenarioId.length)) + 2;
    const lines = this.rows.map(({ evidence }) => {
      const label = displayOutcome(evidence.outcome, evidence.knownFinding);
      const content = `  ${label.padEnd(18)}${evidence.scenarioId.padEnd(width)}${evidence.reason}`;
      if (evidence.outcome === 'KILLED') return green(content);
      if (evidence.outcome === 'SURVIVED') return red(content);
      return yellow(content);
    });
    const scored = counts.KILLED + counts.SURVIVED;
    const summary = `  ${counts.KILLED}/${scored} scored mutants killed · ${counts.SURVIVED} survived · ${counts.INCONCLUSIVE + counts.INVALID_BASELINE + counts.INFRA_ERROR} excluded from score`;
    process.stdout.write(['', bold('  MUTANT SCENARIO EVIDENCE'), ...lines, '', summary, `  JSON evidence: ${reportPath}`, ''].join('\n') + '\n');
  }
}

export default MutantReporter;
