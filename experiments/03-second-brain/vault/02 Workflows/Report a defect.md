---
type: workflow
status: approved
tags: [workflow, defects, evidence]
updated: 2026-09-24
---

# Report a defect

Every surviving mutant or failed check becomes a note from the [[Defect note]] template before it goes anywhere else.

## Steps

1. Reproduce it twice: once API-first (status code and body), once in the browser if a user could hit it.
2. Fill the template: steps, expected vs actual, role, environment, evidence (trace, video or response body).
3. Link the flow ([[DocFlow - golden flow]]) and the rule it breaks ([[Roles and permissions]]).
4. Add the mutant that found it to the flow's mutant list so it stays covered.
5. Only then copy the summary to the tracker. The vault is the source of truth; the tracker is the notification.

## Example

[[DEF-001 self-grant role]] was found by the `self-grant` mutant: every happy-path test was green.
