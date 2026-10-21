// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Cristian Guerra
import { test, expect } from '@playwright/test';
import { signIn, createDoc } from '../ui';

// Browser reproduction of the surviving mutant. Not part of the default run (see testIgnore).
test.beforeEach(({ request }) => request.post('/api/_reset'));

test('evidence: an editor promotes themself to admin, then approves and publishes alone', async ({ page }) => {
  await page.goto('/');
  await signIn(page, 'editor');
  const doc = await createDoc(page, 'Q4 launch plan', 'editor@demo.io');
  await expect(doc.getByRole('button', { name: 'Approve' })).toBeDisabled();

  await page.getByRole('tab', { name: 'Members' }).click();
  const me = page.getByTestId('member-row').filter({ hasText: 'editor@demo.io' });
  await me.getByRole('combobox').selectOption('admin');
  await me.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByTestId('me-role')).toHaveText('admin');

  await page.getByRole('tab', { name: 'Documents' }).click();
  await doc.getByRole('button', { name: 'Approve' }).click();
  await expect(doc.getByTestId('status')).toHaveText('approved');
  await doc.getByRole('button', { name: 'Publish' }).click();
  await expect(doc.getByTestId('status')).toHaveText('published');
});
