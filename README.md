<p align="center">
  <img src="assets/banner.png" alt="THE MUTANT LAB · I test what AI builds" width="100%">
</p>

<p align="center">
  <a href="https://github.com/criguex/mutant-lab/actions/workflows/ci.yml"><img src="https://github.com/criguex/mutant-lab/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <img src="https://img.shields.io/badge/Playwright-1.63-2EAD33?logo=playwright&logoColor=white" alt="Playwright 1.63">
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/license-MIT-C6FF3D" alt="MIT">
</p>

# THE MUTANT LAB

**I test what AI builds.** One experiment at a time: take something an AI produced (a plan, a test, a feature), break it on purpose, and show what a repeatable verdict looks like.

Every experiment in this repo is real and runnable. No API keys, no mocks pretending to be results, no green CI hiding a finding.

```bash
git clone https://github.com/criguex/mutant-lab.git && cd mutant-lab
npm ci && npx playwright install --with-deps chromium
npm test
```

## Experiments

| # | Experiment | The question it answers | Status | Run it |
|---|---|---|---|---|
| 01 | [**AI verdict**](experiments/01-ai-verdict) | AI output changes every run. Can the verdict stay the same? | ✅ runnable | `npm run demo:01` |
| 02 | [**Mutant scenarios**](experiments/02-mutants) | Your suite is green. Would it notice if the app broke? | ✅ runnable · 1 known finding | `npm run demo:02` |
| 03 | [**Second brain**](experiments/03-second-brain) | AI without context writes generic tests. What fixes it? | ✅ runnable | `npm run demo:03` |
| 04 | next specimen | | 🧪 planned | |

### 01 · AI verdict

Two questions, two oracles. *Does it run as specified?* is deterministic: schema, roles, status codes, asserted in code. *Is what it produced good?* is a score against explicit acceptance criteria: `must` criteria block, `should` criteria add to a weighted score, every criterion with evidence computed by code. Then the same input runs three times; if the verdict flips, that is a finding. Ships with recorded runs (one set pinned and stable, one set unpinned that flips) and an adapter to plug in any real agent through an environment variable.

### 02 · Mutant scenarios

A tiny web app with a golden flow (login → create → approve → publish) and a green Playwright suite. Mutants are data: one line each, one change to the flow, the app must reject it. Five get killed. One survives and reveals a real authorization bug in the demo app: a user can grant themself a higher role. CI stays green **and** honest: the survivor is declared as a known finding, printed in red on every run, and the day the bug is fixed the test forces you to remove the flag. A larger, real-world example of the same engine: [criguex/civica-playwright-challenge](https://github.com/criguex/civica-playwright-challenge).

### 03 · Second brain

An Obsidian vault template for AI-assisted QA: a `READ FIRST` map, golden rules, five predictable folders, notes that answer one question each and link to the rest. Plus the part a prompt cannot do: a Claude Code `PreToolUse` hook that blocks any `git push` to `main` with exit 2. The hook has its own test suite (28 cases, including chained commands and the bare `git push` on `main`) and a link checker keeps the vault consistent.

## Why

AI now writes documents, plans, tests and code faster than anyone can read them. The bottleneck moved from *producing* to *deciding*: is this good enough to ship? A decision that depends on how the output feels is not a decision, it is a mood. This lab is about turning that mood into something measurable and repeatable: assertions where the answer is binary, scores against agreed criteria where it is not, mutants to prove the checks have teeth, and context so the AI stops guessing.

## How the lab works

- **Real, runnable, offline.** Every experiment runs with `npm test`, no keys, no network. Where a real model could plug in, it is an explicit opt-in.
- **Recorded, not faked.** Fixtures are deterministic recorded artifacts so the verdict is reproducible; the code that grades them is the experiment.
- **Findings are never hidden.** A known surviving mutant is marked as an expected failure and printed in red, not deleted or skipped.
- **Small on purpose.** Each experiment is one folder you can read in a sitting and copy into your own project.

```
mutant-lab/
├── experiments/
│   ├── 01-ai-verdict/      Playwright test runner, TypeScript, recorded runs, scorer, stability check
│   ├── 02-mutants/         node web app + Playwright golden flow + mutants as data + scoreboard reporter
│   └── 03-second-brain/    Obsidian vault template + Claude Code hook + node:test suite
├── assets/                 brand
└── .github/workflows/      one job runs every experiment
```

Per-experiment commands are documented in each folder's README. Root shortcuts: `npm run test:01`, `test:02`, `test:03`, `demo:01`, `demo:02`, `demo:03`, `typecheck`.

## Author

**Cristian Guerra** · Senior SDET / AI-QA · Medellín, Colombia
[linkedin.com/in/criguex](https://www.linkedin.com/in/criguex) · [github.com/criguex](https://github.com/criguex)

Released under the [MIT License](LICENSE).
