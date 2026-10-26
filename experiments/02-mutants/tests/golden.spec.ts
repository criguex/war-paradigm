// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Cristian Guerra
import { test, expect } from '@playwright/test';
import { signIn, signOut, createDoc } from './ui';
import { login } from './flow';

test.beforeEach(({ request }) => request.post('/api/_reset'));

test('golden: create → approve → publish', async ({ page }) => {
  await page.goto('/');

  await signIn(page, 'editor');
  const doc = await createDoc(page, 'Q4 launch plan', 'editor@demo.io');
  await signOut(page);

  await signIn(page, 'approver');
  await doc.getByRole('button', { name: 'Approve' }).click();
  await expect(doc.getByTestId('status')).toHaveText('approved');
  await signOut(page);

  await signIn(page, 'editor');
  await doc.getByRole('button', { name: 'Publish' }).click();
  await expect(doc.getByTestId('status')).toHaveText('published');
});

test('boundary: a title of exactly 80 chars is accepted and listed', async ({ request }) => {
  const title = 'x'.repeat(80);
  const { token } = await login(request, 'editor');
  const headers = { Authorization: `Bearer ${token}` };
  const created = await request.post('/api/docs', { headers, data: { title, owner: 'editor@demo.io' } });
  expect(created.status()).toBe(201);
  const docs = await (await request.get('/api/docs', { headers })).json();
  expect(docs.map((doc: { title: string }) => doc.title)).toContain(title);
});
