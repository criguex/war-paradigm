import { expect, type Page } from '@playwright/test';

export async function signIn(page: Page, role: string) {
  await page.getByLabel('Email').fill(`${role}@demo.io`);
  await page.getByLabel('Password').fill('demo123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByTestId('me-role')).toHaveText(role);
}

export async function signOut(page: Page) {
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
}

export async function createDoc(page: Page, title: string, owner: string) {
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Owner').fill(owner);
  await page.getByRole('button', { name: 'Create' }).click();
  const row = page.getByTestId('doc-row').filter({ hasText: title });
  await expect(row.getByTestId('status')).toHaveText('draft');
  return row;
}
