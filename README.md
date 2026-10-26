<p align="center">
  <img src="assets/banner.png" alt="WAR Paradigm · Test the tester. Mutate reality." width="100%">
</p>

<p align="center">
  <a href="https://github.com/criguex/war-paradigm/actions/workflows/ci.yml"><img src="https://github.com/criguex/war-paradigm/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <img src="https://img.shields.io/badge/Playwright-1.63-2EAD33?logo=playwright&logoColor=white&style=flat-square" alt="Playwright 1.63">
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white&style=flat-square" alt="TypeScript">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-GPL--3.0-55DFBD?style=flat-square&labelColor=071B2B" alt="GPL-3.0"></a>
</p>

# WAR Paradigm

**Don't test the software. Test the tester.** · [Leer en español](README.es.md)

Every test suite, oracle, proof checker or AI judge is a guard that is supposed to shout when something is wrong. A guard that never shouts might be excellent, or it might be asleep. WAR Paradigm is how you tell the difference: build a world where you know exactly what is wrong, because you broke it on purpose, and check whether the guard notices.

- Break a law of physics inside a simulation. Does the oracle notice?
- Break one step of a business flow. Does the suite notice?
- Disguise a forbidden command. Does the guard rail notice?

If the guard stays quiet, the guard failed. That is the finding.

> Formerly **The Mutant Lab**: same experiments, and now the name says what ties them together. *WAR* comes from Guerra, the author's surname (*guerra* is Spanish for war): a war on bugs, starting with the ones hiding inside the checks. Old links to `criguex/mutant-lab` redirect here.

```bash
git clone https://github.com/criguex/war-paradigm.git && cd war-paradigm
npm ci && npx playwright install --with-deps chromium
npm test
```

## The paradigm in four steps

| Step | What happens | Physical simulation | Functional flow |
|---|---|---|---|
| **1 · Generate** | Build the base reality and confirm the guard accepts it | Snell refraction with the real indices | The golden flow: login → create → approve → publish |
| **2 · Mutate** | Change exactly one rule, on purpose | Swap the two refractive indices | A viewer tries to approve |
| **3 · Audit** | Run the broken world past the guard | An independent oracle with a frozen 10⁻⁶ tolerance | Playwright checks against the API |
| **4 · Validate** | Read the verdict | **KILLED**: the oracle rejects it | **KILLED**: the app answers 403 |

Three verdicts, always reported, never hidden:

- **PASS**: the unmutated baseline behaves as specified, so the guard is not crying wolf.
- **KILLED**: the guard caught the mutation. The check has teeth.
- **SURVIVED**: the guard missed it. Either a real bug or a blind spot in the checks. It stays visible, printed in red and tracked, until someone fixes it.

## Two tracks, one paradigm

### Track 1 · Physical simulations → [criguex/scientific-qa-evidence](https://github.com/criguex/scientific-qa-evidence)

Nine synthetic numerical models: RC circuit, Newton cooling, second-order chemical kinetics, Beer–Lambert attenuation, logistic response, Snell refraction, thin lens, acoustic interface and Fechner response. Each one has an independent oracle that shares no solver code with the implementation, and a contract whose tolerance was frozen before any run. Then the physics gets broken on purpose: a doubled time constant, a halved cooling rate, swapped refractive indices.

- **84 paired variants**, run on macOS arm64 and on Linux x86_64 with identical classifications.
- **27 PASS** · **54 KILLED** (51 distinct behaviors; two acoustic mutants produce identical outputs) · **3 SURVIVED**: the deliberately tiny RC mutation, kept visible on purpose.

The same repository applies the idea to formal proofs: two independent proof checkers, the Lean kernel and nanoda, must reject a deliberately wrong proof, and both do. That track is a QA reproduction of OpenAI's published Lean proofs for Navier–Stokes and Euler. It proves nothing new and claims no Millennium Prize result; its limitations are listed in its README.

### Track 2 · Functionality → this repository

| # | Experiment | The guard under test | The question it answers | Status | Run it |
|---|---|---|---|---|---|
| 01 | [**AI verdict**](experiments/01-ai-verdict) | The judge: oracles and a scorer for AI output | AI output changes every run. Can the verdict stay the same? | ✅ runnable | `npm run demo:01` |
| 02 | [**Mutant scenarios**](experiments/02-mutants) | The suite: a green Playwright golden flow | Your suite is green. Would it notice if the app broke? | ✅ runnable · 1 known finding | `npm run demo:02` |
| 03 | [**Second brain**](experiments/03-second-brain) | The guard rail: a Claude Code hook | AI without context writes generic tests. What fixes it? | ✅ runnable | `npm run demo:03` |
| 04 | next specimen | | | 🧪 planned | |

#### 01 · AI verdict

Two questions, two oracles. *Does it run as specified?* is deterministic: schema, roles, status codes, asserted in code. *Is what it produced good?* is a score against explicit acceptance criteria: `must` criteria block, `should` criteria add to a weighted score, every criterion with evidence computed by code. Then the same input runs three times; if the verdict flips, the judge is the one that failed. Ships with recorded runs (one set pinned and stable, one set unpinned that flips) and an adapter to plug in any real agent through an environment variable.

#### 02 · Mutant scenarios

A tiny web app with a golden flow (login → create → approve → publish) and a Playwright suite. Mutants are data: one change to the flow each, and the run classifies the HTTP result as evidence. Baseline and reset failures are kept out of the mutant score, a known finding is annotated only after an accepted mutation is actually observed, and every scenario attaches a JSON record with the source revision and input hashes. Five mutants are killed. One self-grant mutation survives and exposes a real authorization bug in the demo app: a user can grant themself a higher role. A larger, real-world example of the same engine: [criguex/civica-playwright-challenge](https://github.com/criguex/civica-playwright-challenge).

#### 03 · Second brain

An Obsidian vault template for AI-assisted QA: a `READ FIRST` map, golden rules, five predictable folders, notes that answer one question each and link to the rest. Plus the part a prompt cannot do: a Claude Code `PreToolUse` hook that blocks any `git push` to `main` with exit 2. The guard is tested the WAR way: 28 cases, including chained commands and the bare `git push` on `main`, try to sneak past it. A link checker keeps the vault consistent.

## Why

AI now writes documents, plans, tests and code faster than anyone can read them, and more and more often it also writes the checks. When the code and its tests come from the same place, a green run proves less than it looks. The bottleneck moved from *producing* to *deciding*: is this good enough to ship? A decision that depends on how the output feels is not a decision, it is a mood. WAR Paradigm turns that mood into evidence about the checks themselves: assertions where the answer is binary, scores against agreed criteria where it is not, and mutants, physical or functional, to prove the checks have teeth.

## How the lab works

- **Real, runnable, offline.** Every experiment runs with `npm test`, no keys, no network. Where a real model could plug in, it is an explicit opt-in.
- **Recorded, not faked.** Fixtures are deterministic recorded artifacts so the verdict is reproducible; the code that grades them is the experiment.
- **Findings are never hidden.** A known surviving mutant is marked as an expected failure and printed in red, not deleted or skipped.
- **Small on purpose.** Each experiment is one folder you can read in a sitting and copy into your own project.

```
war-paradigm/
├── experiments/
│   ├── 01-ai-verdict/      Playwright test runner, TypeScript, recorded runs, scorer, stability check
│   ├── 02-mutants/         node web app + Playwright golden flow + mutants as data + scoreboard reporter
│   └── 03-second-brain/    Obsidian vault template + Claude Code hook + node:test suite
├── assets/                 brand
└── .github/workflows/      one job runs every experiment
```

Per-experiment commands are documented in each folder's README. Root shortcuts: `npm run test:01`, `test:02`, `test:03`, `demo:01`, `demo:02`, `demo:03`, `typecheck`.

## Commercial services

The code is open. What I sell is the experience of applying it to real, complex systems:

- **Specialized consulting.** A WAR Paradigm audit of your test suites, oracles, simulations or AI evaluators, with a report of what your checks are missing and how to close each gap.
- **Technical support.** Help for companies adopting the framework: setup in your CI, your flows and your team's way of working.
- **Integrations and custom improvements.** Adapters for your stack, mutant catalogs for your domain, oracles for your simulations, and features built to your needs.

Write to me at [linkedin.com/in/criguex](https://www.linkedin.com/in/criguex) or criguex@gmail.com.

## License

WAR Paradigm is free software released under the [GNU General Public License v3.0 or later](LICENSE) (`GPL-3.0-or-later`). Copyright © 2026 Cristian Guerra.

What the GPL requires, in plain words. The [LICENSE](LICENSE) text is what governs; this summary is not legal advice.

- **You may** use, study, modify and share the code, for free or commercially.
- **If you distribute it**, as is or modified, or ship a product that includes its code, you must:
  - offer the complete source code of that version under the same license;
  - keep the copyright notices, the license text and the `SPDX-License-Identifier` line at the top of each file;
  - mark what you changed and when;
  - add no extra restrictions for the people who receive it.
- **Running it is not distributing it.** Using it internally or in your CI pipeline does not oblige you to publish anything, and the application you test with it does not become GPL.

Versions published before 21 October 2026 were released under the MIT License, and that grant still applies to those copies.

## Author

**Cristian Guerra** · Senior SDET / AI-QA · Medellín, Colombia
[linkedin.com/in/criguex](https://www.linkedin.com/in/criguex) · [github.com/criguex](https://github.com/criguex)
