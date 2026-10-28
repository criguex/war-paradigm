# WAR row template

One row per mutation. Fill "Prediction" and commit BEFORE running.

| Field | Value |
|---|---|
| Date | |
| What I broke (one sentence) | |
| Operator | see [catalogo.md](catalogo.md) |
| Guard under test | suite 02 · AI verdict 01 · hook 03 · your own project |
| Prediction (committed before) | KILLED / SURVIVED, and which check catches it |
| Command | `npm run demo:02` … |
| Observed | status code, failing check or exit code |
| Verdict | PASS / KILLED / SURVIVED |
| If SURVIVED | real bug (the app is wrong) or blind spot (the guard does not look) |
| Evidence | scoreboard line, test output or `test-results/mutant-evidence.json` |
| Restored | baseline green again: yes / no |

Example (course module 02, part 2):

| Field | Value |
|---|---|
| What I broke | the actor of S-2 in pinned run 2: approver → editor |
| Guard under test | AI verdict (experiment 01) |
| Prediction | KILLED by AC-3, run 2 → REJECTED |
| Command | `npm run demo:pinned -w experiments/01-ai-verdict` and `npm run test:01` |
| Observed | AC-3 failed · 3 tests fail, 24 pass |
| Verdict | KILLED |
| Restored | yes, 27 passed |
