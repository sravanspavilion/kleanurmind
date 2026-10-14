import { test, expect, type Page } from '@playwright/test';

async function continueToReview(page: Page) {
  await page.getByRole('button', { name: 'Continue to Details' }).click();
  await expect(page.getByLabel('Full name', { exact: true })).toHaveValue('Ananya Demo');
  await page.getByLabel('Full name', { exact: true }).fill('Fictional Tester');
  await page.getByRole('button', { name: 'Continue to Schedule' }).click();
  await page.getByRole('button', { name: 'Continue to Review' }).click();
}

test('complete request, edit, refresh, deduplicate, repeat and reset', async ({ page }, testInfo) => {
  const errors: string[] = [];
  const mutations: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', request => { if (request.method() === 'POST' && request.url().includes('/api/')) mutations.push(request.url()); });
  await page.goto('/');
  await page.getByRole('link', { name: 'Home cleaning', exact: true }).last().click();
  await expect(page).toHaveURL(/services\/cleaning/);
  await page.getByRole('link', { name: 'Need both? Request a combined service →' }).click();
  await expect(page.getByRole('button', { name: /Both Services/ })).toHaveAttribute('aria-pressed', 'true');
  await continueToReview(page);
  await expect(page.getByRole('heading', { name: 'Requested times · IST' })).toBeVisible();
  await expect(page.getByText('Sign in to verify contact', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Place service request' })).toBeEnabled();
  await page.getByRole('button', { name: 'Edit details' }).click();
  await expect(page.getByLabel('Full name', { exact: true })).toHaveValue('Fictional Tester');
  await page.getByLabel('Additional tasks').fill('Sample balcony cleaning');
  await page.getByRole('button', { name: 'Continue to Schedule' }).click();
  const schedule = await page.getByLabel('Requested cleaning appointment').inputValue();
  await page.getByLabel('Request laundry collection during cleaning', { exact: true }).check();
  await page.getByRole('button', { name: 'Previous step' }).click();
  await expect(page.getByLabel('Additional tasks')).toHaveValue('Sample balcony cleaning');
  await page.getByRole('button', { name: 'Continue to Schedule' }).click();
  await page.reload();
  await expect(page.getByLabel('Requested cleaning appointment')).toHaveValue(schedule);
  await expect(page.getByLabel('Request laundry collection during cleaning', { exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Continue to Review' }).click();
  await page.getByRole('button', { name: 'Edit schedule' }).click();
  await expect(page.getByLabel('Requested cleaning appointment')).toHaveValue(schedule);
  await page.getByRole('button', { name: 'Continue to Review' }).click();
  await page.screenshot({ path: testInfo.outputPath('review.png'), fullPage: true });
  await page.getByRole('button', { name: 'Place service request' }).dblclick();
  await expect(page.getByRole('heading', { name: 'Service request placed' })).toBeVisible();
  await expect(page.getByText('Tasks: Sample balcony cleaning')).toBeVisible();
  await expect(page.getByText(/Cleaning: .*10:00 am IST/i)).toBeVisible();
  await expect(page.getByText('Requested · Pending quote', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('confirmation.png'), fullPage: true });
  const confirmationUrl = page.url();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Service request placed' })).toBeVisible();
  const requests = await page.evaluate(() => JSON.parse(localStorage.getItem('kum-demo-v1:requests') || '[]'));
  expect(requests).toHaveLength(1);
  await page.getByRole('link', { name: 'View all requests' }).click();
  await expect(page.getByRole('region', { name: 'Your simulated requests' }).getByText('Fictional Tester · Mananchira')).toBeVisible();
  await page.goto(confirmationUrl);
  await page.getByRole('link', { name: 'Book again with these details' }).click();
  await page.getByRole('button', { name: 'Continue to Details' }).click();
  await expect(page.getByLabel('Full name', { exact: true })).toHaveValue('Fictional Tester');
  await page.reload();
  await expect(page.getByLabel('Full name', { exact: true })).toHaveValue('Fictional Tester');
  await page.getByRole('button', { name: 'Reset demo data' }).click();
  await page.getByRole('button', { name: 'Continue to Details' }).click();
  await expect(page.getByLabel('Full name', { exact: true })).toHaveValue('Ananya Demo');
  expect(await page.evaluate(() => localStorage.getItem('kum-demo-v1:requests'))).toBeNull();
  await page.goto(confirmationUrl);
  await expect(page.getByRole('heading', { name: 'Demo request not found' })).toBeVisible();
  expect(mutations).toEqual([]);
  expect(errors).toEqual([]);
});

test('invalid fields, past dates, laundry-only flow and keyboard navigation', async ({ page }) => {
  await page.goto('/book?service=LAUNDRY');
  await page.getByRole('button', { name: 'Continue to Details' }).click();
  await page.getByLabel('Full name', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Continue to Schedule' }).click();
  await expect(page.getByRole('heading', { name: 'A Little About Your Needs' })).toBeVisible();
  await page.getByLabel('Full name', { exact: true }).fill('Demo Tester');
  await page.getByLabel('Mobile number').fill('invalid');
  await page.getByRole('button', { name: 'Continue to Schedule' }).click();
  await page.getByRole('button', { name: 'Continue to Review' }).click();
  await expect(page.locator('main').getByRole('alert')).toContainText('Enter a valid mobile number');
  await page.getByRole('button', { name: 'Previous step' }).click();
  await page.getByLabel('Mobile number').fill('0000000000');
  await page.getByRole('button', { name: 'Continue to Schedule' }).click();
  await page.getByLabel('Requested laundry pickup window starts').fill('2020-01-01T10:00');
  await page.getByRole('button', { name: 'Continue to Review' }).click();
  await expect(page.locator('main').getByRole('alert')).toContainText('future appointment');
  await page.getByLabel('Requested laundry pickup window starts').fill('2090-01-01T16:00');
  await page.getByRole('button', { name: 'Continue to Review' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Review Your Request' })).toBeVisible();
  await page.getByRole('button', { name: 'Place service request' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Service request placed' })).toBeVisible();
  await expect(page.getByText(/Pickup: .*4:00 pm IST/i)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('public navigation and protected API isolation', async ({ page, request }) => {
  for (const path of ['/bookings', '/dashboard', '/account', '/admin', '/staff', '/services/laundry', '/policies']) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page).not.toHaveURL(/sign-in/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.goto('/sign-in');
  await expect(page).toHaveURL(/\/$/);
  for (const path of ['/api/register', '/api/operations', '/api/uploads', '/api/auth/callback/email-password']) {
    const response = await request.post(path, { data: {} });
    expect(response.status()).toBe(403);
  }
});

test('storage failures are visible and do not claim submission success', async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('Storage disabled', 'QuotaExceededError'); }; });
  await page.goto('/book');
  await expect(page.locator('main').getByRole('alert')).toContainText('storage');
  await expect(page.getByRole('button', { name: 'Continue to Details' })).toBeDisabled();
  await expect(page.getByRole('heading', { name: 'Service request placed' })).toHaveCount(0);
});

test('profile simulation persists and mobile menu opens with keyboard', async ({ page, isMobile }) => {
  await page.goto('/account');
  await page.getByLabel('Full name', { exact: true }).fill('Sample Profile Tester');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.getByText('Simulation saved in this browser’s demo activity. No real action was taken.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Full name', { exact: true })).toHaveValue('Sample Profile Tester');
  if (isMobile) {
    await page.getByRole('button', { name: 'Open menu' }).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'My Bookings' }).click();
    await expect(page).toHaveURL(/bookings/);
  }
});
