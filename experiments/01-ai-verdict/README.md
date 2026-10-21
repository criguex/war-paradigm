# Experiment #01 · AI output changes every run. Your verdict can't.

> Part of [WAR Paradigm](../../README.md) · Track 2, functionality. The guard under test: **the judge (oracles and a scorer for AI output)**.

**Specimen:** an agent that writes a test plan for a user story. Same input, three runs, three different outputs. So, did it pass?

There is no single "expected result" for what an agent produces. This experiment splits the problem in two and makes the verdict repeatable.

## Run it

```bash
npm test          # 27 checks with the Playwright test runner, no browser involved (+1 live-agent check, skipped without an agent)
npm run demo      # the scorecards and the stability check, both recorded sets
```

Requires Node 20+. No API key: the runs are recorded fixtures (see [What is real](#what-is-real-what-is-recorded)).

## The method

### 1. Two questions, two oracles

| | Question | How | Where |
|---|---|---|---|
| **Q1** | Does it run as specified? | schema, roles, actions, status codes, reference integrity: pass / fail | [`src/checks.ts`](src/checks.ts) |
| **Q2** | Is what it produced good? | score against explicit acceptance criteria, with evidence | [`src/criteria.ts`](src/criteria.ts), [`src/scorer.ts`](src/scorer.ts) |

Mixing the two is how you end up arguing about a test plan instead of measuring it.

### 2. Pin everything before you run

`meta.model`, `meta.temperature`, `meta.promptVersion`, `meta.traceId` are part of the artifact. `checkPins()` warns when a run is not pinned (temperature above 0, prompt tagged `latest`, model without a version). An unpinned run cannot be trusted by the stability check.

### 3. Score against acceptance criteria, not a feeling

| id | criterion | type | weight |
|---|---|---|---|
| AC-1 | Every scenario cites its source in the story (`US-42/R-n`) | must | blocks |
| AC-2 | Every must-requirement of the story is covered | must | blocks |
| AC-3 | Role contract: no scenario expects success from a forbidden role | must | blocks |
| AC-4 | A negative (403) scenario for every protected action | should | 30 |
| AC-5 | Covers the story's boundary cases | should | 28 |
| AC-6 | Follows the team's scenario template | should | 20 |
| AC-7 | Lists risks and assumptions | should | 12 |
| AC-8 | No duplicate scenarios | should | 10 |

Each criterion returns a fraction (0..1) and evidence lines, computed by code. Nothing asks a model for its opinion of itself.

### 4. `must` blocks, `should` adds to the score

```
any must not met            → REJECTED, whatever the score
score below the gate (70)   → REJECTED
otherwise                   → APPROVED
```

The gate is a number the team agreed on. Not a vibe.

### 5. Same input, three runs

```
── set: pinned ──────────────────────────────────
  pins   model planner-agent@2026.06 · temperature 0 · prompt test-plan@v3
  run 1 approved 86  ·  run 2 approved 84  ·  run 3 approved 87
  verdict STABLE · 3/3 runs agree

── set: unpinned ────────────────────────────────
  pins   model planner-agent · temperature 1 · prompt latest
         ⚠ temperature is 1 (pinned runs use 0)
         ⚠ promptVersion "latest" is a moving target, tag it
  run 1 approved 83  ·  run 2 approved 74  ·  run 3 REJECTED 76
  verdict UNSTABLE → finding: verdict flipped approved → rejected on run 3 ...
```

Scores may move. The verdict may not. Note that run 3 of the unpinned set scores **above** the gate and is still rejected: two scenarios lost their source and one lets an editor approve their own draft. That is what `must` is for.

## Plug in a real agent

The lab ships with recorded runs. Any command that reads the story as JSON on stdin and prints the artifact as JSON on stdout can sit behind the same verdict:

```bash
# RUN=1..3 is set in the environment on each call
MUTANT_LAB_GENERATOR_CMD="python my_agent.py" npm run demo:live
MUTANT_LAB_GENERATOR_CMD="python my_agent.py" npm test     # enables the "live agent" stability test
```

The contract is in [`src/generator.ts`](src/generator.ts) (`Generator` interface, `RecordedGenerator`, `CommandGenerator`). [`scripts/fake-agent.mjs`](scripts/fake-agent.mjs) is a working stand-in used by the tests. The expected artifact shape is in [`src/types.ts`](src/types.ts); the story it must answer is [`fixtures/story-US-42.json`](fixtures/story-US-42.json).

## Layout

```
fixtures/story-US-42.json        the input: roles, permission matrix, requirements, boundaries
fixtures/runs/pinned/run-*.json  three recorded outputs, pinned agent → stable verdict
fixtures/runs/unpinned/run-*.json three recorded outputs, unpinned agent → verdict flips on run 3
src/checks.ts                    Q1: schema + enumerations + references, checkPins()
src/criteria.ts                  Q2: the acceptance criteria, each one a function with evidence
src/scorer.ts                    evaluate(): one artifact in, one verdict out
src/stability.ts                 N reports in, STABLE or a finding out
src/generator.ts                 Generator interface, recorded + command adapters
src/cli.ts                       npm run demo
tests/*.spec.ts                  checks, scorer, stability, generator
```

## What is real, what is recorded

- The checks, criteria, scorer, stability logic and the command adapter are real code, exercised by the tests.
- The six runs are recorded fixtures written by hand for this experiment, shaped after what a planning agent typically returns for a story like this, and kept deterministic on purpose so the demo needs no key and the numbers are reproducible. `meta.model` is a label, not a claim about a specific vendor model.
- Nothing in this folder calls a model unless you set `MUTANT_LAB_GENERATOR_CMD`.
