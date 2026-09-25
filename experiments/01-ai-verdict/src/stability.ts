import type { Report, Verdict } from './types';

export type Flip = { run: number; from: Verdict; to: Verdict };

export type StabilityReport = {
  runs: number;
  verdicts: Verdict[];
  scores: number[];
  stable: boolean;
  flips: Flip[];
  pinWarnings: string[];
  /** Present when the verdict is not stable: the finding to log, as text. */
  finding?: string;
};

/**
 * Same input, N runs. Scores may move; the VERDICT may not.
 * A flip between approved and rejected is a finding in itself: either the
 * criteria are too close to the gate, or the run was not pinned.
 */
export function stability(reports: Report[]): StabilityReport {
  const verdicts = reports.map((r) => r.verdict);
  const scores = reports.map((r) => r.score);
  const flips: Flip[] = [];
  for (let i = 1; i < verdicts.length; i++) {
    if (verdicts[i] !== verdicts[i - 1]) flips.push({ run: i + 1, from: verdicts[i - 1], to: verdicts[i] });
  }
  const pinWarnings = [...new Set(reports.flatMap((r) => r.pinWarnings))];
  const stable = flips.length === 0;
  const finding = stable
    ? undefined
    : `verdict flipped ${flips.map((f) => `${f.from} → ${f.to} on run ${f.run}`).join('; ')}` +
      ` (scores ${scores.join(' / ')})` +
      (pinWarnings.length ? ` · run was not pinned: ${pinWarnings.join('; ')}` : '');
  return { runs: reports.length, verdicts, scores, stable, flips, pinWarnings, finding };
}
