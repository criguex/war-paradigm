// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Cristian Guerra
import type { APIRequestContext } from '@playwright/test';
import { golden, runStep, type Mutant, type Role, type Session, type Step } from './flow';
import {
  classifyBaseline,
  classifyMutation,
  createRunProvenance,
  type Outcome,
  type ScenarioEvidence,
} from './scenario-evidence';

const run = createRunProvenance();

const baselineStatus: Record<Step, number> = { create: 201, approve: 200, publish: 200, grant: 200 };

function evidence(mutant: Mutant, outcome: Outcome, phase: ScenarioEvidence['phase'], reason: string,
  fields: Partial<ScenarioEvidence> = {}): ScenarioEvidence {
  return {
    scenarioId: mutant.id,
    expectedStatus: mutant.expect,
    outcome,
    phase,
    reason,
    ...(mutant.known && { knownFinding: mutant.known }),
    run,
    ...fields,
  };
}

function validate(mutant: Mutant, steps: Step[]): string | undefined {
  if (!mutant.id || !mutant.name) return 'Scenario id and name are required.';
  if (!Number.isInteger(mutant.expect) || mutant.expect < 400 || mutant.expect >= 500) {
    return 'Expected rejection must be an HTTP 4xx status.';
  }
  if (steps.filter((step) => step === mutant.step).length !== 1) {
    return 'Mutation step must occur exactly once in the scenario order.';
  }
  if (new Set(steps).size !== steps.length) return 'Scenario order cannot repeat steps.';
  return undefined;
}

function sessionFrom(value: unknown): Session | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const body = value as Partial<Session>;
  if (typeof body.token !== 'string' || !body.user || typeof body.user.id !== 'string' ||
      typeof body.user.email !== 'string' || typeof body.user.role !== 'string') return undefined;
  return body as Session;
}

type MemberInspection = { ok: true; role: Role } | { ok: false; error: string };

async function inspectMemberRole(request: APIRequestContext, session: Session, memberId: string): Promise<MemberInspection> {
  const response = await request.get('/api/members', {
    headers: { Authorization: `Bearer ${session.token}` },
  });
  if (response.status() !== 200) return { ok: false, error: `GET /api/members returned ${response.status()}` };
  const members: unknown = await response.json();
  if (!Array.isArray(members)) return { ok: false, error: 'GET /api/members returned a non-array body' };
  const member = members.find((item: unknown) => item && typeof item === 'object' &&
    (item as { id?: unknown }).id === memberId) as { role?: unknown } | undefined;
  if (!member || typeof member.role !== 'string') return { ok: false, error: 'Target member was absent from GET /api/members' };
  return { ok: true, role: member.role as Role };
}

export async function executeScenario(request: APIRequestContext, mutant: Mutant): Promise<ScenarioEvidence> {
  const steps = mutant.order ?? golden.order;
  const invalid = validate(mutant, steps);
  if (invalid) return evidence(mutant, 'INFRA_ERROR', 'contract', invalid);

  try {
    const reset = await request.post('/api/_reset');
    if (reset.status() !== 204) {
      const outcome = reset.status() >= 500 ? 'INFRA_ERROR' : 'INVALID_BASELINE';
      return evidence(mutant, outcome, 'reset', `Expected reset HTTP 204; got ${reset.status()}.`, { observedStatus: reset.status() });
    }
  } catch (error) {
    return evidence(mutant, 'INFRA_ERROR', 'reset', `Reset request failed: ${String(error)}`);
  }

  let docId: string | undefined;
  for (const step of steps) {
    const mutated = step === mutant.step;
    const role = (mutated && mutant.as ? mutant.as : golden.actor[step]) as Role;
    let loginResponse;
    try {
      loginResponse = await request.post('/api/auth/login', {
        data: { email: `${role}@demo.io`, password: 'demo123', ...(mutated && mutant.ttl !== undefined && { ttl: mutant.ttl }) },
      });
    } catch (error) {
      return evidence(mutant, 'INFRA_ERROR', 'login', `Login request failed: ${String(error)}`);
    }
    if (loginResponse.status() !== 200) {
      const outcome = loginResponse.status() >= 500 ? 'INFRA_ERROR' : 'INVALID_BASELINE';
      return evidence(mutant, outcome, 'login', `Expected login HTTP 200; got ${loginResponse.status()}.`, { observedStatus: loginResponse.status() });
    }
    let session: Session | undefined;
    try {
      session = sessionFrom(await loginResponse.json());
    } catch {}
    if (!session) return evidence(mutant, 'INFRA_ERROR', 'login', 'Login response did not contain a valid token and user.');

    const body = { ...golden.body[step], ...(mutated ? mutant.body : {}) };
    let response;
    try {
      response = await runStep(request, step, { ...session, docId, body });
    } catch (error) {
      return evidence(mutant, 'INFRA_ERROR', mutated ? 'mutation' : 'baseline', `Step request failed: ${String(error)}`);
    }
    const observedStatus = response.status();

    if (mutated) {
      const outcome = classifyMutation(mutant.expect, observedStatus);
      let observedState: Record<string, unknown> | undefined;
      let observationError: string | undefined;
      if (mutant.postcondition?.kind === 'member-role' && (outcome === 'KILLED' || outcome === 'SURVIVED')) {
        try {
          const state = await inspectMemberRole(request, session, session.user.id);
          if (!state.ok) {
            if (outcome === 'KILLED') {
              return evidence(mutant, 'INFRA_ERROR', 'observation', state.error, { observedStatus });
            }
            observationError = state.error;
          } else {
            observedState = { memberId: session.user.id, role: state.role, expectedRole: mutant.postcondition.role };
            if (outcome === 'KILLED' && state.role !== mutant.postcondition.role) {
              return evidence(mutant, 'SURVIVED', 'observation', `HTTP rejection was expected, but member role changed to ${state.role}.`, { observedStatus, observedState });
            }
          }
        } catch (error) {
          if (outcome === 'KILLED') {
            return evidence(mutant, 'INFRA_ERROR', 'observation', `Read-only postcondition failed: ${String(error)}`, { observedStatus });
          }
          observationError = `Read-only postcondition failed: ${String(error)}`;
        }
      }
      const reason = outcome === 'KILLED' ? `Expected rejection HTTP ${mutant.expect} observed.`
        : outcome === 'SURVIVED' ? `Mutation was accepted with HTTP ${observedStatus}.`
        : `HTTP ${observedStatus} does not establish either the expected rejection or acceptance.`;
      return evidence(mutant, outcome, 'mutation', reason, { observedStatus,
        ...(observedState && { observedState }), ...(observationError && { observationError }) });
    }

    const baselineOutcome = classifyBaseline(baselineStatus[step], observedStatus);
    if (baselineOutcome !== 'KILLED') {
      return evidence(mutant, baselineOutcome, 'baseline', `Baseline step ${step} expected HTTP ${baselineStatus[step]}; got ${observedStatus}.`, { observedStatus });
    }
    if (step === 'create') {
      try {
        const created: unknown = await response.json();
        const doc = created as { id?: unknown } | null;
        docId = doc && typeof doc === 'object' && typeof doc.id === 'string' ? doc.id : undefined;
      } catch {}
      if (!docId) return evidence(mutant, 'INVALID_BASELINE', 'baseline', 'Create baseline returned no document id.', { observedStatus });
    }
  }
  return evidence(mutant, 'INFRA_ERROR', 'contract', 'Scenario ended without executing its mutation.');
}
