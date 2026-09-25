---
type: session
status: closed
tags: [session, docflow, mutants]
date: 2026-09-24
---

# 2026-09-24 · mutants on DocFlow

## Goal

Run the first mutant round on [[DocFlow - golden flow]] after the golden flow went green.

## What happened

- 6 mutants as data, API-first. 5 killed, 1 survived.
- The survivor is a privilege escalation: an editor can promote themself. Opened [[DEF-001 self-grant role]].
- The assistant read [[00 - READ FIRST]] and the matrix before designing; the scenarios came back with roles, status codes and data from the vault instead of placeholders.

## Decisions

- The surviving mutant stays in the suite marked as a known finding, so CI is green and the finding is still visible on every run.
- Added the "nobody changes their own role" rule to [[Roles and permissions]].

## Next

- [ ] Re-run the round after the fix; the `self-grant` mutant must be killed
- [ ] Add `interrupt` mutants (abort mid-flow, then resume)

Template: [[Session note]]
