import type { Artifact, Priority, Scenario, Story } from './types';

/**
 * Q2 — "Is what it produced good?"
 * Acceptance criteria for the ARTIFACT (the test plan), each one computed by code
 * with evidence. `must` criteria block the verdict; `should` criteria add to a
 * weighted score. Nothing here asks a model for its opinion of itself.
 */

export type CheckResult = { fraction: number; evidence: string[] };

export type Criterion = {
  id: string;
  title: string;
  priority: Priority;
  /** should-criteria weights add up to 100; must-criteria carry no weight, they gate */
  weight: number;
  check: (artifact: Artifact, story: Story) => CheckResult;
};

const ratio = (hit: number, total: number) => (total === 0 ? 1 : hit / total);
const list = (ids: string[]) => (ids.length ? ids.join(', ') : 'none');
const allowed = (story: Story, s: Scenario) => story.permissions[s.action]?.allowed.includes(s.actor) ?? false;

export const GATE = 70;

export const criteria: Criterion[] = [
  {
    id: 'AC-1',
    title: 'Every scenario cites its source in the story',
    priority: 'must',
    weight: 0,
    check(artifact, story) {
      const pattern = new RegExp(`^${story.id}/(${story.requirements.map((r) => r.id).join('|')})$`);
      const bad = artifact.scenarios.filter((s) => !pattern.test(s.source) || s.covers.length === 0);
      return {
        fraction: ratio(artifact.scenarios.length - bad.length, artifact.scenarios.length),
        evidence: bad.length
          ? bad.map((s) => `${s.id} has no valid source (source="${s.source}", covers=[${s.covers.join(', ')}])`)
          : [`${artifact.scenarios.length}/${artifact.scenarios.length} scenarios cite ${story.id}/R-n`],
      };
    },
  },
  {
    id: 'AC-2',
    title: 'Every must-requirement of the story is covered',
    priority: 'must',
    weight: 0,
    check(artifact, story) {
      const covered = new Set(artifact.scenarios.flatMap((s) => s.covers));
      const musts = story.requirements.filter((r) => r.priority === 'must');
      const missing = musts.filter((r) => !covered.has(r.id)).map((r) => r.id);
      return {
        fraction: ratio(musts.length - missing.length, musts.length),
        evidence: missing.length
          ? [`not covered by any scenario: ${list(missing)}`]
          : [`all ${musts.length} must-requirements covered: ${list(musts.map((r) => r.id))}`],
      };
    },
  },
  {
    id: 'AC-3',
    title: 'Role contract: no scenario expects success from a forbidden role',
    priority: 'must',
    weight: 0,
    check(artifact, story) {
      const violations = artifact.scenarios.filter((s) => {
        const ok = allowed(story, s);
        return ok ? s.expected.status === 403 : s.expected.status !== 403;
      });
      return {
        fraction: ratio(artifact.scenarios.length - violations.length, artifact.scenarios.length),
        evidence: violations.length
          ? violations.map((s) => `${s.id}: ${s.actor} → ${s.action} expects ${s.expected.status} (matrix says ${allowed(story, s) ? 'allowed' : 'forbidden → 403'})`)
          : [`${artifact.scenarios.length} scenarios agree with the permission matrix`],
      };
    },
  },
  {
    id: 'AC-4',
    title: 'A negative (403) scenario for every protected action',
    priority: 'should',
    weight: 30,
    check(artifact, story) {
      const actions = Object.keys(story.permissions);
      const hit = actions.filter((a) => artifact.scenarios.some((s) => s.action === a && !allowed(story, s) && s.expected.status === 403));
      const missing = actions.filter((a) => !hit.includes(a));
      return {
        fraction: ratio(hit.length, actions.length),
        evidence: [`${hit.length}/${actions.length} actions have a forbidden-role scenario${missing.length ? ` · missing: ${list(missing)}` : ''}`],
      };
    },
  },
  {
    id: 'AC-5',
    title: "Covers the story's boundary cases",
    priority: 'should',
    weight: 28,
    check(artifact, story) {
      const covered = new Set(artifact.scenarios.flatMap((s) => s.covers));
      const hit = story.boundaries.filter((b) => covered.has(b.id));
      const missing = story.boundaries.filter((b) => !covered.has(b.id)).map((b) => b.id);
      return {
        fraction: ratio(hit.length, story.boundaries.length),
        evidence: [`${hit.length}/${story.boundaries.length} boundaries covered${missing.length ? ` · missing: ${list(missing)}` : ''}`],
      };
    },
  },
  {
    id: 'AC-6',
    title: "Follows the team's scenario template",
    priority: 'should',
    weight: 20,
    check(artifact) {
      const compliant = (s: Scenario) => /^S-\d+$/.test(s.id) && s.title.length >= 8 && s.steps.length >= 2;
      const bad = artifact.scenarios.filter((s) => !compliant(s));
      return {
        fraction: ratio(artifact.scenarios.length - bad.length, artifact.scenarios.length),
        evidence: bad.length
          ? bad.map((s) => `${s.id}: id S-n, title ≥ 8 chars and ≥ 2 steps required (has ${s.steps.length} step${s.steps.length === 1 ? '' : 's'})`)
          : [`${artifact.scenarios.length}/${artifact.scenarios.length} scenarios follow the template (id, title, ≥ 2 steps, expected)`],
      };
    },
  },
  {
    id: 'AC-7',
    title: 'Lists risks and assumptions',
    priority: 'should',
    weight: 12,
    check(artifact) {
      const parts = [
        ['risks', artifact.risks.length],
        ['assumptions', artifact.assumptions.length],
      ] as const;
      const hit = parts.filter(([, n]) => n > 0).length;
      return {
        fraction: ratio(hit, parts.length),
        evidence: parts.map(([name, n]) => `${n} ${name}`),
      };
    },
  },
  {
    id: 'AC-8',
    title: 'No duplicate scenarios',
    priority: 'should',
    weight: 10,
    check(artifact) {
      const key = (s: Scenario) => `${s.actor}|${s.action}|${s.expected.status}|${[...s.covers].sort().join(',')}`;
      const seen = new Map<string, string>();
      const dupes: string[] = [];
      for (const s of artifact.scenarios) {
        const k = key(s);
        if (seen.has(k)) dupes.push(`${s.id} duplicates ${seen.get(k)}`);
        else seen.set(k, s.id);
      }
      return {
        fraction: ratio(artifact.scenarios.length - dupes.length, artifact.scenarios.length),
        evidence: dupes.length ? dupes : [`${artifact.scenarios.length} distinct scenarios`],
      };
    },
  },
];

const totalWeight = criteria.filter((c) => c.priority === 'should').reduce((n, c) => n + c.weight, 0);
if (totalWeight !== 100) throw new Error(`should-criteria weights add up to ${totalWeight}, expected 100`);
