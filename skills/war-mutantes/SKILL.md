---
name: war-mutantes
description: Design, run and report a WAR mutant in this repo — break exactly one step of the golden flow (or one AI answer, or one command against the hook), write the prediction first, run the guard and record PASS / KILLED / SURVIVED without hiding survivors. Use when asked to "add a mutant", "test the tester", "mutation testing", "mutar", "agregar un mutante", "tabla WAR" or "is my suite awake?".
---

# WAR mutants

Tests are guards. A guard that never shouts may be good or may be asleep. A **mutant** is a copy of the world with exactly ONE thing broken on purpose. If the guard notices, the mutant is **KILLED**. If it stays quiet, the mutant **SURVIVED**, and that survivor is the finding.

This skill works on the three guards of this repo:

| Guard under test | Where | How you mutate it |
|---|---|---|
| Playwright suite of a golden flow | `experiments/02-mutants` | one contract in `tests/scenarios.ts` |
| AI verdict (scorer of an agent's test plan) | `experiments/01-ai-verdict` | one field of one run in `fixtures/runs/` |
| `git push` hook | `experiments/03-second-brain` | one command sent to the hook |

## The four steps

1. **Generate (baseline).** Run the guard untouched and confirm it is green. A broken baseline is not a mutant result.
   ```bash
   npm ci
   npm run test:02        # or test:01 / test:03
   ```
2. **Mutate one thing.** Change exactly one step, field or command. Two changes at once and you cannot tell which one the guard saw.
3. **Audit.** Before running, write the prediction (KILLED or SURVIVED, and which check will catch it) in the WAR row and commit it. Then run the guard:
   ```bash
   npm run demo:02        # MUTANT SCOREBOARD for experiment 02
   npm run demo:01        # scorecards for experiment 01 (pinned only: npm run demo:pinned -w experiments/01-ai-verdict)
   npm run test:03        # hook cases for experiment 03
   ```
4. **Validate.** Read the verdict and fill the WAR row (template: [plantilla-fila-war.md](plantilla-fila-war.md)). Restore the change and confirm the baseline is green again.

## Experiment 02: a mutant is data

Add one object to `experiments/02-mutants/tests/scenarios.ts`. The type is `Mutant` in `tests/flow.ts`:

| Field | Meaning |
|---|---|
| `id`, `name` | short kebab-case name of the trap |
| `step` | `'create' \| 'approve' \| 'publish' \| 'grant'`: the step you break |
| `expect` | the HTTP status the app MUST answer (403, 409, 422, 401…) |
| `as` | run the step as another role (`viewer`, `editor`, `approver`, `admin`) |
| `body` | override or remove (`undefined`) a field of the request |
| `order` | run the steps in another order |
| `ttl` | session lifetime; `0` sends an expired token |
| `postcondition` | extra read-only check after the step (`member-role`) |
| `known` | ONLY for a survivor already reported: why it survives |

```ts
{ id: 'role-swap', name: 'role-swap', expect: 403, step: 'approve', as: 'viewer' },
```

The runner resets the app, logs in and checks the unmutated baseline before applying your one change. Then:

- `KILLED`: the app answered `expect`.
- `SURVIVED`: the app accepted the mutation (2xx). Add `known` with the reason only after you have reported it; it then prints in red as `KNOWN SURVIVOR` and the default run stays green. `npm run test:strict -w experiments/02-mutants` fails on it.
- `INVALID_BASELINE`, `INCONCLUSIVE`, `INFRA_ERROR`: not a mutant result. Fix the setup; never count them in the score.
- `FIXED`: a `known` survivor is now rejected. Remove the `known` field.

Evidence of every run is written to `test-results/mutant-evidence.json` (expected and observed status, Git revision, SHA-256 of the inputs).

## Rules

- One mutation, one reason. If you cannot say what you broke in one sentence, split it.
- The prediction is written and committed BEFORE the run.
- Never delete, skip or loosen a check to turn a SURVIVED into KILLED. A survivor is published as it is, and you say whether it is a **real bug** (the app is wrong) or a **blind spot** (the guard does not look there).
- Report all three counts every time: PASS (baseline), KILLED, SURVIVED.
- Keep the mutation reversible and restore it; the baseline must be green at the end.
- New operators go to [catalogo.md](catalogo.md) with their real result. An idea that was never run stays under "ideas", never as a result.

## Done when

- The WAR row is filled with the prediction, the guard, the command, the observed result and the verdict.
- The scoreboard or test output that backs the verdict is pasted as evidence.
- The baseline is green again and `git status` shows only the intended change (the new contract or the WAR row).
