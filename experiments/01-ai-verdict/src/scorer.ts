// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Cristian Guerra
import { checkPins, validateArtifact } from './checks';
import { GATE, criteria } from './criteria';
import type { CriterionResult, CriterionStatus, Priority, Report, Story } from './types';

// A `must` is met or failed, there is no partial credit for a blocking criterion.
const statusOf = (priority: Priority, fraction: number): CriterionStatus =>
  fraction >= 1 ? 'met' : priority === 'must' || fraction <= 0 ? 'failed' : 'partial';

/**
 * One artifact in, one verdict out. The rule:
 *   - schema invalid            → rejected (Q1 failed, nothing to score)
 *   - any `must` not fully met  → rejected, whatever the score
 *   - score below the gate      → rejected
 *   - otherwise                 → approved
 * The gate is a number the team agreed on (see GATE in criteria.ts), not a vibe.
 */
export function evaluate(raw: unknown, story: Story, gate = GATE): Report {
  const validation = validateArtifact(raw, story);
  if (!validation.ok) {
    return { verdict: 'rejected', score: 0, gate, reasons: ['schema: ' + validation.errors[0]], schemaErrors: validation.errors, pinWarnings: [], criteria: [] };
  }
  const artifact = validation.artifact;

  const results: CriterionResult[] = criteria.map((c) => {
    const { fraction, evidence } = c.check(artifact, story);
    const clamped = Math.min(1, Math.max(0, fraction));
    return { id: c.id, title: c.title, priority: c.priority, weight: c.weight, status: statusOf(c.priority, clamped), fraction: clamped, evidence };
  });

  const score = Math.round(results.filter((r) => r.priority === 'should').reduce((n, r) => n + r.weight * r.fraction, 0));
  const blocking = results.filter((r) => r.priority === 'must' && r.status !== 'met');

  const reasons: string[] = [];
  if (blocking.length) reasons.push(`must failed: ${blocking.map((r) => r.id).join(', ')}`);
  if (score < gate) reasons.push(`score ${score} below gate ${gate}`);

  return {
    verdict: reasons.length ? 'rejected' : 'approved',
    score,
    gate,
    reasons,
    schemaErrors: [],
    pinWarnings: checkPins(artifact.meta),
    criteria: results,
    meta: artifact.meta,
  };
}
