import { test, expect } from '@playwright/test';
import { signIn, signOut, createDoc } from './ui';

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
