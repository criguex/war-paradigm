# Mutation operators

One operator = one kind of single break. The catalog grows: add a row when an operator has been RUN in this repo, with its real result. Untried ideas live in the last table.

## Run in experiment 02 (golden flow: login → create → approve → publish)

| Operator | What breaks | Contract | Expected | Observed | Verdict |
|---|---|---|---|---|---|
| role-swap | a forbidden role does the step | `step: 'approve', as: 'viewer'` | 403 | 403 | KILLED |
| drop-input | a required field is missing | `step: 'create', body: { owner: undefined }` | 422 | 422 | KILLED |
| reorder | a step runs before its precondition | `step: 'publish', order: ['create', 'publish']` | 409 | 409 | KILLED |
| stale-token | the session is expired | `step: 'approve', ttl: 0` | 401 | 401 | KILLED |
| boundary | a value one past the limit | `step: 'create', body: { title: 'x'.repeat(81) }` | 422 | 422 | KILLED |
| self-grant | a user raises their own role | `step: 'grant', order: ['grant'], body: { role: 'admin' }` | 403 | 200 | SURVIVED · real bug |
| viewer-create | a forbidden role creates | `step: 'create', as: 'viewer'` | 403 | 201 | SURVIVED · real bug |

Source: `experiments/02-mutants/tests/scenarios.ts` and the MUTANT SCOREBOARD of `npm run demo:02`.

## Run in experiment 01 (AI verdict)

| Operator | What breaks | Where | Verdict |
|---|---|---|---|
| actor-swap | the actor of one scenario of a pinned run becomes a forbidden role | `fixtures/runs/pinned/run-*.json` | KILLED by AC-3 (see the course module 02, part 2) |

## Ideas not run yet

Each one is a single break that fits the `Mutant` contract or the fixtures. Move it up only after running it and recording the observed result.

| Idea | Single break | Guard that should catch it |
|---|---|---|
| double-submit | publish the same document twice | expect 409 on the second publish |
| owner-swap | create with an owner that is not the caller | expect 403 or 422 |
| approve-own | the approver approves a draft they own | depends on the story: write the oracle first |
| boundary-low | title of exactly 2 characters | expect 422 |
| empty-title | title with only spaces | expect 422 |
| missing-source | an AI scenario without `source` | AC-1 must fail |
