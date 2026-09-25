---
type: process
status: approved
tags: [strategy, playwright, mutants]
updated: 2026-09-24
---

# Test strategy

How DocFlow is tested and why. For what "done" means per story see [[Definition of done for a story]].

## Layers

| Layer | Tool | What it proves |
|---|---|---|
| API-first scenarios | Playwright `request` | roles, gates, status codes, order of steps |
| Golden flows in the browser | Playwright `page` | the happy path a user sees works end to end |
| Mutant scenarios | golden flow + one change | the checks have teeth (see [[Design scenarios with AI]]) |
| Evidence | Playwright video/trace | proof for the findings that matter |

## Principles

- **Golden flow first.** A flow that is not green cannot be mutated. Flows live in `03 Knowledge/`, e.g. [[DocFlow - golden flow]].
- **Mutants are data, not scripts.** One test loops over a list of mutations. Operators: role-swap, drop-input, reorder, stale-state, boundary, self-grant.
- **A surviving mutant is a finding**, either a product bug or a gap in the checks. Open it with [[Report a defect]]; the current open one is [[DEF-001 self-grant role]].
- **Roles come from the matrix**, never from the UI. See [[Roles and permissions]].
- **Test data is seeded and reset** before every test. See [[Test data - users]].
