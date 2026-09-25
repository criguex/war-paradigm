import type { Artifact, RunMeta, Story } from './types';

/**
 * Q1 — "Does it run as specified?"
 * Deterministic, pass/fail checks on the SHAPE of what the agent produced:
 * schema, enumerations (roles, actions, status codes) and reference integrity.
 * No judgement about quality here; that is the scorer's job (Q2).
 */

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');
const isHttpStatus = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 100 && (n as number) <= 599;

export type ValidationResult = { ok: true; artifact: Artifact; errors: [] } | { ok: false; artifact?: undefined; errors: string[] };

export function validateArtifact(raw: unknown, story: Story): ValidationResult {
  const errors: string[] = [];

  if (!isObject(raw)) return { ok: false, errors: ['artifact must be a JSON object'] };

  if (raw.story !== story.id) errors.push(`story: expected "${story.id}", got ${JSON.stringify(raw.story)}`);

  if (!isObject(raw.meta)) errors.push('meta: missing object');
  else {
    const m = raw.meta;
    if (typeof m.model !== 'string' || !m.model) errors.push('meta.model: required string');
    if (typeof m.temperature !== 'number') errors.push('meta.temperature: required number');
    if (typeof m.promptVersion !== 'string' || !m.promptVersion) errors.push('meta.promptVersion: required string');
    if (typeof m.traceId !== 'string' || !m.traceId) errors.push('meta.traceId: required string');
  }

  if (!isStringArray(raw.risks)) errors.push('risks: must be an array of strings');
  if (!isStringArray(raw.assumptions)) errors.push('assumptions: must be an array of strings');

  if (!Array.isArray(raw.scenarios)) errors.push('scenarios: must be an array');
  else if (raw.scenarios.length === 0) errors.push('scenarios: must not be empty');
  else {
    const knownIds = new Set([...story.requirements.map((r) => r.id), ...story.boundaries.map((b) => b.id)]);
    const seen = new Set<string>();
    raw.scenarios.forEach((s: unknown, i: number) => {
      const at = `scenarios[${i}]`;
      if (!isObject(s)) return errors.push(`${at}: must be an object`);
      if (typeof s.id !== 'string' || !s.id) errors.push(`${at}.id: required string`);
      else if (seen.has(s.id)) errors.push(`${at}.id: duplicate id "${s.id}"`);
      else seen.add(s.id);
      if (typeof s.title !== 'string' || !s.title) errors.push(`${at}.title: required string`);
      if (typeof s.actor !== 'string' || !story.roles.includes(s.actor)) errors.push(`${at}.actor: "${s.actor}" is not one of ${story.roles.join(', ')}`);
      if (typeof s.action !== 'string' || !(s.action in story.permissions)) errors.push(`${at}.action: "${s.action}" is not one of ${Object.keys(story.permissions).join(', ')}`);
      if (!isStringArray(s.covers)) errors.push(`${at}.covers: must be an array of ids`);
      else for (const id of s.covers) if (!knownIds.has(id)) errors.push(`${at}.covers: unknown id "${id}"`);
      if (typeof s.source !== 'string') errors.push(`${at}.source: required string`);
      if (!isStringArray(s.steps)) errors.push(`${at}.steps: must be an array of strings`);
      if (!isObject(s.expected) || !isHttpStatus(s.expected.status)) errors.push(`${at}.expected.status: must be an HTTP status code`);
    });
  }

  return errors.length ? { ok: false, errors } : { ok: true, artifact: raw as unknown as Artifact, errors: [] };
}

/**
 * Pins — things that must be fixed BEFORE a run can be compared with another one.
 * Not a pass/fail: a warning that the stability check will refuse to trust.
 */
export function checkPins(meta: RunMeta): string[] {
  const warnings: string[] = [];
  if (meta.temperature > 0) warnings.push(`temperature is ${meta.temperature} (pinned runs use 0)`);
  if (/^(latest|main|head)$/i.test(meta.promptVersion)) warnings.push(`promptVersion "${meta.promptVersion}" is a moving target, tag it`);
  if (!/^[a-z0-9._-]+@[a-z0-9._-]+$/i.test(meta.model)) warnings.push(`model "${meta.model}" has no version tag (expected name@version)`);
  return warnings;
}
