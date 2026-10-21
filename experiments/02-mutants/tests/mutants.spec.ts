// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Cristian Guerra
import { test, expect } from '@playwright/test';
import { golden, login, runStep, type Mutant } from './flow';

// Same golden flow, ONE change each. The app must reject every one of them.
const mutants: Mutant[] = [
  { name: 'role-swap',   expect: 403, step: 'approve', as: 'viewer' },
  { name: 'drop-input',  expect: 422, step: 'create',  body: { owner: undefined } },
  { name: 'reorder',     expect: 409, step: 'publish', order: ['create', 'publish'] },
  { name: 'stale-token', expect: 401, step: 'approve', ttl: 0 },
  { name: 'boundary',    expect: 422, step: 'create',  body: { title: 'x'.repeat(81) } },
  {
    name: 'self-grant',  expect: 403, step: 'grant',   order: ['grant'], body: { role: 'admin' },
    // Open finding: an editor can promote themself to admin (app/server.js → can.editMember).
    // While the bug is open this mutant SURVIVES. It is declared here so CI stays green
    // without hiding it: Playwright marks it "expected to fail"; the day the bug is fixed,
    // this test flips to "expected to fail but passed" and forces you to delete this line.
    known: 'privilege escalation — POST /api/members/:id/role lets a user change their own role',
  },
];

// MUTANT_LAB_STRICT=1 ignores the `known` flag: any survivor turns the run red.
const strict = process.env.MUTANT_LAB_STRICT === '1';

test.beforeEach(({ request }) => request.post('/api/_reset'));

for (const m of mutants) {
  test(`${m.name}: expect ${m.expect}`, async ({ request }) => {
    if (m.known && !strict) {
      test.info().annotations.push({ type: 'known finding', description: m.known });
      test.fail(true, `known finding: ${m.known}`);
    }

    let docId: string | undefined;

    for (const step of m.order ?? golden.order) {
      const mutated = step === m.step;
      const role = mutated && m.as ? m.as : golden.actor[step];
      const session = await login(request, role, mutated ? m.ttl : undefined);
      const body = { ...golden.body[step], ...(mutated ? m.body : {}) };
      const res = await runStep(request, step, { ...session, docId, body });

      if (mutated) {
        const why = `SURVIVED: ${m.name} — got ${res.status()}, expected ${m.expect}`;
        expect(res.status(), why).toBe(m.expect);
        break;
      }
      expect(res.ok(), `golden step "${step}" broke: ${res.status()}`).toBeTruthy();
      if (step === 'create') docId = (await res.json()).id;
    }
  });
}
