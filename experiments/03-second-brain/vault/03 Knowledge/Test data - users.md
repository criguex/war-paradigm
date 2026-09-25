---
type: data
status: certified
tags: [docflow, test-data]
updated: 2026-09-24
---

# Test data · users

Seeded on every `POST /api/_reset`. Password for all of them: `demo123`. Local demo only; never reuse in a real environment.

| id | email | role |
|---|---|---|
| u1 | viewer@demo.io | viewer |
| u2 | editor@demo.io | editor |
| u3 | approver@demo.io | approver |
| u4 | admin@demo.io | admin |

Sessions expire by `ttl` (seconds) passed at login; `ttl: 0` produces an expired token on the next call.

Roles → [[Roles and permissions]] · Flow → [[DocFlow - golden flow]]
