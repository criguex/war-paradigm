# Experiment #02 · Your suite is green. Would it notice if the app broke?

> Part of [WAR Paradigm](../../README.md) · Track 2, functionality. The guard under test: **the suite (a green Playwright golden flow)**.

**Specimen:** a golden flow with every happy-path test passing. Login → create → approve → publish. All green.

A passing suite proves the happy path works. It says nothing about whether your checks would catch a wrong role, a missing field or a step done out of order. So: take the golden flow, change exactly ONE step, and the app must reject it. A recorded 2xx means the mutant *survived*. A failed reset, login or unmutated baseline is not a mutant result and is excluded from the score.

## Run it

```bash
npx playwright install --with-deps chromium   # once
npm test                # golden flow + 80-char title boundary + 7 mutants against the API
npm run test:mutants    # only the mutants, prints the MUTANT SCOREBOARD
npm run report          # Playwright HTML report
npm run app             # poke at the app yourself: http://localhost:4310 (password for every user: demo123)
```

Users: `viewer@demo.io`, `editor@demo.io`, `approver@demo.io`, `admin@demo.io`.

## What you will see

```
  ✓  golden: create → approve → publish
  ✓  boundary: a title of exactly 80 chars is accepted and listed
  ✓  role-swap: expect 403
  ✓  drop-input: expect 422
  ✓  reorder: expect 409
  ✓  stale-token: expect 401
  ✓  boundary: expect 422
  ✘  self-grant: expect 403
  ✘  viewer-create: expect 403

  MUTANT SCENARIO EVIDENCE
  KILLED            role-swap      Expected rejection HTTP 403 observed.
  KILLED            drop-input     Expected rejection HTTP 422 observed.
  KILLED            reorder        Expected rejection HTTP 409 observed.
  KILLED            stale-token    Expected rejection HTTP 401 observed.
  KILLED            boundary       Expected rejection HTTP 422 observed.
  KNOWN SURVIVOR    self-grant     Mutation was accepted with HTTP 200.
  KNOWN SURVIVOR    viewer-create  Mutation was accepted with HTTP 201.

  5/7 scored mutants killed · 2 survived · 0 excluded from score
  JSON evidence: test-results/mutant-evidence.json
```

Five mutants are killed and two known mutations survive. Those findings are kept visible without hiding baseline or infrastructure failures. `MUTANT_LAB_STRICT=1` fails the run on both.

## Mutants are data, not scripts

[`tests/scenarios.ts`](tests/scenarios.ts) defines one contract per mutant. [`tests/mutants.spec.ts`](tests/mutants.spec.ts) executes each contract through [`tests/scenario-runner.ts`](tests/scenario-runner.ts), which gates reset, login and unmutated baseline steps before mutating exactly one step.

```ts
const mutants: Mutant[] = [
  { id: 'role-swap', name: 'role-swap', expect: 403, step: 'approve', as: 'viewer' },
  { id: 'self-grant', name: 'self-grant', expect: 403, step: 'grant', order: ['grant'], body: { role: 'admin' },
    postcondition: { kind: 'member-role', role: 'editor' }, known: '...' },
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

### Evidence, classification and score gate

The JSON report records each scenario id, expected and observed HTTP status, phase, reason, Git revision and SHA-256 hashes for the app, scenario, runner, test and lockfile inputs. The run is deterministic and records `randomSeed: null` because it does not use random generation. A known finding receives Playwright's expected-failure marker and annotation only after an accepted mutation is observed; reset, login, baseline and runner failures cannot be hidden as known survivors.

Only `KILLED` and `SURVIVED` count toward the score. An unexpected 5xx or mismatched rejection is `INCONCLUSIVE`; failed preconditions are `INVALID_BASELINE`; request/runner failures and tests without attached evidence are `INFRA_ERROR`. Those outcomes stay visible but are excluded from the score. A known survivor keeps the default run green and is printed in red. `MUTANT_LAB_STRICT=1 npm run test:mutants` makes an actual known survivor fail the run.

The current oracle is HTTP-level, plus a read-only member-role check for `self-grant`. A passing response or matching status does not prove semantic equivalence, so the runner does not emit `EQUIVALENT` or claim global state invariants.

### Kill it yourself

Fix the rule in `app/server.js` so only admins can change roles:

```js
editMember: (actor) => actor.role === 'admin',
```

Run `npm run test:mutants` again. Now the mutant gets `403`, the scoreboard shows `FIXED self-grant`, and the JSON includes the observed member role. Remove the `known:` field after the finding is closed.

## The second finding: a viewer can create drafts

Found while preparing the course: the WAR Paradigm found a hole in its own example app. The roles matrix in the vault ([`Roles and permissions`](../03-second-brain/vault/03%20Knowledge/Roles%20and%20permissions.md), row "create draft") says a viewer gets `403`. `POST /api/docs` in [`app/server.js`](app/server.js) checks the title and the owner but never the role, so the `viewer-create` mutant gets `201` and survives. It stays as a known finding until the route gets a role check.

## The boundary that was not tested

The `boundary` mutant sends 81 characters and expects `422`. Nothing sent exactly 80, so lowering `TITLE_MAX` to 79 kept the suite green. [`tests/golden.spec.ts`](tests/golden.spec.ts) now creates a draft with an 80-character title and expects `201` and the title in `GET /api/docs`; with `TITLE_MAX = 79` that test fails with `422`.

## Layout

```
app/                         tiny web app + JSON API (plain node, no DB)
tests/golden.spec.ts         happy-path E2E in the browser + 80-char title boundary
tests/scenarios.ts           scenario contracts and known-finding description
tests/mutants.spec.ts        Playwright adapter for scenario evidence
tests/scenario-runner.ts     reset, login, baseline gate and single mutation
tests/scenario-evidence.ts   conservative result classifier and provenance
tests/flow.ts                golden flow definition + runStep helper
tests/ui.ts                  browser helpers (signIn, signOut, createDoc)
tests/mutant-reporter.ts     scoreboard + test-results/mutant-evidence.json
tests/unit/                  unit tests for status and gate classification
tests/evidence/              browser reproduction of the self-grant survivor (excluded from the default run)
playwright.config.ts         webServer boots app/server.js on :4310
playwright.evidence.config.ts same, with slowMo + video for the evidence run
```

## The same engine at scale

A larger, real-world example of mutant scenarios on top of a Playwright + TypeScript framework (page objects, golden flows mutated into scenarios, an insights ledger, CI): [criguex/civica-playwright-challenge](https://github.com/criguex/civica-playwright-challenge).
