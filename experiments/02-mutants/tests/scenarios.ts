// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Cristian Guerra
import type { Mutant } from './flow';

export const mutants: Mutant[] = [
  { id: 'role-swap', name: 'role-swap', expect: 403, step: 'approve', as: 'viewer' },
  { id: 'drop-input', name: 'drop-input', expect: 422, step: 'create', body: { owner: undefined } },
  { id: 'reorder', name: 'reorder', expect: 409, step: 'publish', order: ['create', 'publish'] },
  { id: 'stale-token', name: 'stale-token', expect: 401, step: 'approve', ttl: 0 },
  { id: 'boundary', name: 'boundary', expect: 422, step: 'create', body: { title: 'x'.repeat(81) } },
  {
    id: 'self-grant', name: 'self-grant', expect: 403, step: 'grant', order: ['grant'],
    body: { role: 'admin' }, postcondition: { kind: 'member-role', role: 'editor' },
    known: 'privilege escalation — POST /api/members/:id/role lets a user change their own role',
  },
];
