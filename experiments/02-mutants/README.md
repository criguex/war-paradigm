# Experiment #02 · Your suite is green. Would it notice if the app broke?

> Part of [WAR Paradigm](../../README.md) · Track 2, functionality. The guard under test: **the suite (a green Playwright golden flow)**.

**Specimen:** a golden flow with every happy-path test passing. Login → create → approve → publish. All green.

A passing suite proves the happy path works. It says nothing about whether your checks would catch a wrong role, a missing field or a step done out of order. So: take the golden flow, change exactly ONE step, and the app must reject it. If it doesn't, the mutant *survived*, and that is either a bug or a gap in your checks. Either way, a finding.

## Run it

```bash
npx playwright install --with-deps chromium   # once
npm test                # golden flow in the browser + 6 mutants against the API
npm run test:mutants    # only the mutants, prints the MUTANT SCOREBOARD
npm run report          # Playwright HTML report
npm run app             # poke at the app yourself: http://localhost:4310 (password for every user: demo123)
```

Users: `viewer@demo.io`, `editor@demo.io`, `approver@demo.io`, `admin@demo.io`.

## What you will see

```
  ✓  golden: create → approve → publish
  ✓  role-swap: expect 403
  ✓  drop-input: expect 422
  ✓  reorder: expect 409
  ✓  stale-token: expect 401
  ✓  boundary: expect 422
  ✘  self-grant: expect 403

  MUTANT SCOREBOARD
  ✓ killed    role-swap    rejected with 403
  ✓ killed    drop-input   rejected with 422
  ✓ killed    reorder      rejected with 409
  ✓ killed    stale-token  rejected with 401
  ✓ killed    boundary     rejected with 422
  ✘ SURVIVED  self-grant   (known finding) got 200, expected 403 · privilege escalation — ...

  5/6 mutants killed · 1 survived (1 known, tracked as open finding)
```

Five mutants killed, one survived, and the run still exits 0. That is deliberate, see below.

## Mutants are data, not scripts

[`tests/mutants.spec.ts`](tests/mutants.spec.ts): one line per mutant, one test that loops over them and replays the golden flow ([`tests/flow.ts`](tests/flow.ts)) through Playwright's `APIRequestContext`, mutating exactly one step.

```ts
const mutants: Mutant[] = [
  { name: 'role-swap',   expect: 403, step: 'approve', as: 'viewer' },
  { name: 'drop-input',  expect: 422, step: 'create',  body: { owner: undefined } },
  { name: 'reorder',     expect: 409, step: 'publish', order: ['create', 'publish'] },
  { name: 'stale-token', expect: 401, step: 'approve', ttl: 0 },
  { name: 'boundary',    expect: 422, step: 'create',  body: { title: 'x'.repeat(81) } },
  { name: 'self-grant',  expect: 403, step: 'grant',   order: ['grant'], body: { role: 'admin' }, known: '...' },
];
```

API-first because it is fast and stable; the browser is used for the golden flow and for evidence.

## The finding: a user can grant themself a higher role

`POST /api/members/:id/role` in [`app/server.js`](app/server.js) reuses the "members can edit their own profile" rule:

```js
editMember: (actor, target) => actor.role === 'admin' || actor.id === target.id,
```

so an editor can set their OWN role to `admin`, then approve and publish alone. Every other rule is enforced correctly. Every happy-path test was green while this was open.

Browser reproduction (recorded on video, slowed down):

```bash
npm run evidence        # tests/evidence/self-grant.spec.ts → test-results/**/video.webm
```

### Why CI is green with a survivor, and why that is honest

The `self-grant` mutant carries a `known:` field. While it is set, the test is marked with Playwright's `test.fail()` and an annotation, so:

- the run **exits 0** and CI stays green;
- the scoreboard still prints the mutant in red as `SURVIVED (known finding)` on every run, so nobody forgets it;
- `MUTANT_LAB_STRICT=1 npm run test:mutants` (or `npm run test:strict`) ignores the flag and turns the run red, for the day you want the survivor to block a release.

### Kill it yourself

Fix the rule in `app/server.js` so only admins can change roles:

```js
editMember: (actor) => actor.role === 'admin',
```

Run `npm run test:mutants` again. Now the mutant gets `403`, the scoreboard shows `! FIXED self-grant`, and Playwright reports the test as *"expected to fail but passed"*, which makes the run fail on purpose: the flag no longer describes reality. Delete the `known:` line and the suite is 6/6 killed and green for the right reason.

## Layout

```
app/                         tiny web app + JSON API (plain node, no DB)
tests/golden.spec.ts         happy-path E2E in the browser
tests/mutants.spec.ts        mutants as data, replayed API-first
tests/flow.ts                golden flow definition + login/runStep helpers
tests/ui.ts                  browser helpers (signIn, signOut, createDoc)
tests/mutant-reporter.ts     custom reporter: MUTANT SCOREBOARD (killed / SURVIVED / known / FIXED)
tests/evidence/              browser reproduction of the survivor (excluded from the default run)
playwright.config.ts         webServer boots app/server.js on :4310
playwright.evidence.config.ts same, with slowMo + video for the evidence run
```

## The same engine at scale

A larger, real-world example of mutant scenarios on top of a Playwright + TypeScript framework (page objects, golden flows mutated into scenarios, an insights ledger, CI): [criguex/civica-playwright-challenge](https://github.com/criguex/civica-playwright-challenge).
