import { expect, test } from '@playwright/test';

test('demo confirmation reports Sheet failure and retries without creating another request', async ({ page }) => {
  const calls: string[] = [];
  await page.route('**/api/demo/service-requests', async route => {
    const data = route.request().postDataJSON();
    calls.push(data.requestKey);
    await route.fulfill({ status: calls.length === 1 ? 503 : 200, contentType: 'application/json', body: JSON.stringify(calls.length === 1 ? { error: 'Google Sheets setup is incomplete. Your demo request remains saved in this browser.' } : { ok: true, id: `DEMO-${data.requestKey}` }) });
  });
  await page.goto('/book?new=1');
  await expect(page.getByText(/Submitting also copies these details to Google Sheets/)).toBeVisible();
  await page.getByRole('button', { name: 'Continue to Details' }).click();
  await page.getByRole('button', { name: 'Continue to Schedule' }).click();
  await page.getByRole('button', { name: 'Continue to Review' }).click();
  await page.getByRole('button', { name: 'Place service request' }).click();
  await expect(page.getByRole('heading', { name: 'Service request placed' })).toBeVisible();
  await expect(page.getByText(/Google Sheets setup is incomplete/)).toBeVisible();
  await page.getByRole('button', { name: 'Retry Google Sheets sync' }).click();
  await expect(page.getByText('Saved to Google Sheets as a simulated demo request.')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Saved to Google Sheets as a simulated demo request.')).toBeVisible();
  expect(calls).toHaveLength(2);
  expect(calls[0]).toBe(calls[1]);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('kum-demo-v1:requests') || '[]').length)).toBe(1);
});
