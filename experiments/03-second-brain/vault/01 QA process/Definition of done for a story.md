---
type: process
status: approved
tags: [dod, checklist]
updated: 2026-09-24
---

# Definition of done for a story

A story is certified when every line below is true. Copy the checklist into the session note.

- [ ] Scenarios designed from the story's acceptance criteria, each one citing its source (`US-nn/R-n`)
- [ ] Every must-requirement covered by at least one scenario
- [ ] A negative (403) scenario for every protected action in [[Roles and permissions]]
- [ ] Boundary cases covered (min, max, min-1, max+1)
- [ ] Golden flow green in the browser
- [ ] Mutant run: every mutant killed, or each survivor reported with [[Report a defect]]
- [ ] Green **3 times in a row**, not once
- [ ] Evidence attached (trace or video) for anything reported
- [ ] Session note written, see [[Session note]]

Related: [[Test strategy]].
