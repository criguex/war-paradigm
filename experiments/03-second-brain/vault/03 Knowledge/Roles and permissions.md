---
type: rules
status: certified
tags: [docflow, rbac]
updated: 2026-09-24
---

# Roles and permissions

The matrix the tests assert against. The UI hides buttons; the API is the contract.

| Action | viewer | editor | approver | admin |
|---|---|---|---|---|
| create draft | 403 | 201 | 201 | 201 |
| approve | 403 | 403 | 200 | 200 |
| publish | 403 | 200 | 200 | 200 |
| change a member's role | 403 | 403 | 403 | 200 |

Rules:

- A forbidden role always gets `403`, before any validation (`422`) or state (`409`) check.
- Nobody changes their own role. The current implementation breaks this rule, see [[DEF-001 self-grant role]].
- Expired or missing tokens get `401` on every protected call.

Used by [[DocFlow - golden flow]] and [[Test strategy]].
