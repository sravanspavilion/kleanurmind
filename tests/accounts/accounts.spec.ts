import { expect, test } from '@playwright/test';

// The panel talks to /api/demo/accounts/*; every call is mocked so nothing is
// written to a real Google Sheet.
test('demo account panel creates, signs in, signs out and reports errors', async ({ page }) => {
  await page.route('**/api/demo/accounts/session', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ account: null }) }));
  await page.route('**/api/demo/accounts/register', async route => {
    const data = route.request().postDataJSON();
    if (data.email === 'taken@example.test') return route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'An account with this email already exists. Try signing in instead.' }) });
    return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ok: true, account: { id: 'ACC-1', name: data.name, email: data.email } }) });
  });
  await page.route('**/api/demo/accounts/login', async route => {
    const data = route.request().postDataJSON();
    if (data.password !== 'longenough1') return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Email or password is incorrect.' }) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, account: { id: 'ACC-1', name: 'Ananya Demo', email: data.email } }) });
  });
  await page.route('**/api/demo/accounts/logout', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }));

  await page.goto('/sign-in');
  await expect(page.getByRole('heading', { name: 'Sign in or create an account' })).toBeVisible();
  const tabs = page.locator('[aria-label="Account options"]');
  const form = page.locator('form');

  // Create an account
  await form.getByLabel('Your name').fill('Ananya Demo');
  await form.getByLabel('Email address').fill('ananya@example.test');
  await form.getByLabel('Mobile number (optional)').fill('+91 98470 12345');
  await form.getByLabel('Password', { exact: true }).fill('longenough1');
  await form.getByLabel('Confirm password').fill('longenough1');
  await form.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('heading', { name: /Hello, Ananya/ })).toBeVisible();
  await expect(page.getByText('Signed in as')).toContainText('ananya@example.test');

  // Sign out
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(tabs.getByRole('button', { name: 'Sign in' })).toBeVisible();

  // Wrong password, then correct
  await tabs.getByRole('button', { name: 'Sign in' }).click();
  await form.getByLabel('Email address').fill('ananya@example.test');
  await form.getByLabel('Password', { exact: true }).fill('wrongpassword');
  await form.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.locator('p.error[role="alert"]')).toContainText('Email or password is incorrect.');
  await form.getByLabel('Password', { exact: true }).fill('longenough1');
  await form.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: /Hello, Ananya/ })).toBeVisible();

  // Duplicate email
  await page.getByRole('button', { name: 'Sign out' }).click();
  await tabs.getByRole('button', { name: 'Create account' }).click();
  await form.getByLabel('Your name').fill('Someone Else');
  await form.getByLabel('Email address').fill('taken@example.test');
  await form.getByLabel('Password', { exact: true }).fill('longenough1');
  await form.getByLabel('Confirm password').fill('longenough1');
  await form.getByRole('button', { name: 'Create account' }).click();
  await expect(page.locator('p.error[role="alert"]')).toContainText('already exists');

  // Mismatched passwords never hit the server
  await form.getByLabel('Email address').fill('new@example.test');
  await form.getByLabel('Password', { exact: true }).fill('longenough1');
  await form.getByLabel('Confirm password').fill('different1');
  await form.getByRole('button', { name: 'Create account' }).click();
  await expect(page.locator('p.error[role="alert"]')).toContainText('Passwords do not match.');
});
