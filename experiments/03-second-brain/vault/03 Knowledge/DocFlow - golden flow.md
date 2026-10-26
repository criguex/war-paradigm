---
type: flow
status: certified
tags: [docflow, golden-flow, rbac]
updated: 2026-09-24
---

# DocFlow · golden flow

**create → approve → publish**, three roles, three status codes.

| # | Step | Actor | Call | Expected |
|---|---|---|---|---|
| 1 | Create draft | editor | `POST /api/docs {title, owner}` | `201`, status `draft` |
| 2 | Approve | approver | `POST /api/docs/:id/approve` | `200`, status `approved` |
| 3 | Publish | editor | `POST /api/docs/:id/publish` | `200`, status `published` |

Every call carries `Authorization: Bearer <token>` from `POST /api/auth/login`. State resets with `POST /api/_reset`.

## Mutants on this flow

| Mutant | Change | Expected | Status |
|---|---|---|---|
| role-swap | approve as viewer | 403 | killed |
| drop-input | create without owner | 422 | killed |
| reorder | publish before approve | 409 | killed |
| stale-token | approve with an expired token | 401 | killed |
| boundary | title of 81 characters | 422 | killed |
| self-grant | editor sets their own role to admin | 403 | **survived** → [[DEF-001 self-grant role]] |
| viewer-create | create a draft as viewer | 403 | **survived**, found while preparing the course: `POST /api/docs` has no role check |

Roles → [[Roles and permissions]] · Data → [[Test data - users]] · Strategy → [[Test strategy]]
