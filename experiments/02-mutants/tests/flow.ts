// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Cristian Guerra
import type { APIRequestContext, APIResponse } from '@playwright/test';

export type Role = 'viewer' | 'editor' | 'approver' | 'admin';
export type Step = 'create' | 'approve' | 'publish' | 'grant';

export type Mutant = {
  id: string;
  name: string;
  step: Step;
  expect: number;
  as?: Role;
  body?: Record<string, unknown>;
  ttl?: number;
  order?: Step[];
  postcondition?: { kind: 'member-role'; role: Role };
  known?: string;
};

export const golden = {
  order: ['create', 'approve', 'publish'] as Step[],
  actor: { create: 'editor', approve: 'approver', publish: 'editor', grant: 'editor' } as Record<Step, Role>,
  body: { create: { title: 'Q4 launch plan', owner: 'editor@demo.io' } } as Partial<Record<Step, Record<string, unknown>>>,
};

export type Session = { token: string; user: { id: string; email: string; role: Role } };

export async function login(request: APIRequestContext, role: Role, ttl?: number): Promise<Session> {
  const res = await request.post('/api/auth/login', {
    data: { email: `${role}@demo.io`, password: 'demo123', ...(ttl !== undefined && { ttl }) },
  });
  return res.json();
}

export function runStep(
  request: APIRequestContext,
  step: Step,
  ctx: Session & { docId?: string; body?: Record<string, unknown> },
): Promise<APIResponse> {
  const headers = { Authorization: `Bearer ${ctx.token}` };
  switch (step) {
    case 'create':
      return request.post('/api/docs', { headers, data: ctx.body });
    case 'approve':
      return request.post(`/api/docs/${ctx.docId}/approve`, { headers });
    case 'publish':
      return request.post(`/api/docs/${ctx.docId}/publish`, { headers });
    case 'grant':
      return request.post(`/api/members/${ctx.user.id}/role`, { headers, data: ctx.body });
  }
}
