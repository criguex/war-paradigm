---
type: defect
status: open
severity: high
tags: [docflow, rbac, privilege-escalation]
found-by: mutant self-grant
updated: 2026-09-24
---

# DEF-001 · a user can grant themself a higher role

**Rule broken:** nobody changes their own role, see [[Roles and permissions]].

## Steps

1. Login as `editor@demo.io` ([[Test data - users]])
2. `POST /api/members/u2/role` with `{ "role": "admin" }` using the editor's token

**Expected:** `403 forbidden`
**Actual:** `200`, the editor is now `admin` and can approve and publish alone.

## Root cause

The endpoint reuses the "members can edit their own profile" rule (`actor.role === 'admin' || actor.id === target.id`), so the self check that was meant for profile fields also covers the role field.

## Evidence

Browser reproduction recorded from the mutant run on [[DocFlow - golden flow]]; every happy-path test was green while this was open.

## Status

Open. The `self-grant` mutant stays in the suite as a known finding until the fix lands. Reported following [[Report a defect]].
