import { test, expect } from '@playwright/test';

test.describe('Booking Flow E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Start from home page
    await page.goto('/');
  });

  test('should display home page with hero section', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('A clean home');
    await expect(page.locator('text=SERVING KOZHIKODE')).toBeVisible();
  });

  test('should navigate to booking page', async ({ page }) => {
    await page.click('a[href="/book"]');
    await expect(page).toHaveURL(/\/book/);
    await expect(page.locator('h1')).toContainText('Schedule Your Service');
  });

  test('should show service selection on booking page', async ({ page }) => {
    await page.goto('/book');
    await expect(page.locator('text=Home Cleaning')).toBeVisible();
    await expect(page.locator('text=Laundry Pickup')).toBeVisible();
    await expect(page.locator('text=Both Services')).toBeVisible();
  });

  test('should allow selecting cleaning service and proceed to details', async ({ page }) => {
    await page.goto('/book');
    
    // Select cleaning
    await page.click('button:has-text("Home Cleaning")');
    await expect(page.locator('button[aria-pressed="true"]:has-text("Home Cleaning")')).toBeVisible();
    
    // Click continue
    await page.click('button:has-text("Continue to Details")');
    
    // Should show details step
    await expect(page.locator('h2:has-text("A Little About Your Needs")')).toBeVisible();
    await expect(page.locator('text=Home cleaning')).toBeVisible();
  });

  test('should allow selecting laundry service and proceed to details', async ({ page }) => {
    await page.goto('/book');
    
    // Select laundry
    await page.click('button:has-text("Laundry Pickup")');
    await expect(page.locator('button[aria-pressed="true"]:has-text("Laundry Pickup")')).toBeVisible();
    
    // Click continue
    await page.click('button:has-text("Continue to Details")');
    
    // Should show details step
    await expect(page.locator('h2:has-text("A Little About Your Needs")')).toBeVisible();
    await expect(page.locator('text=Laundry care')).toBeVisible();
  });

  test('should navigate to services pages', async ({ page }) => {
    // Test cleaning service page
    await page.goto('/services/cleaning');
    await expect(page.locator('h1')).toContainText('Home cleaning');
    
    // Test laundry service page
    await page.goto('/services/laundry');
    await expect(page.locator('h1')).toContainText('Laundry pickup');
  });

  test('should show sign-in page', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(page.locator('h1')).toContainText('Sign in');
  });
});

test.describe('Admin Flow E2E', () => {
  test('should redirect to sign-in for admin without auth', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/sign-in/);
  });
});

test.describe('Responsive Design', () => {
  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check mobile layout
    await expect(page.locator('h1')).toBeVisible();
    
    // Navigation should be responsive
    await page.goto('/book');
    await expect(page.locator('button:has-text("Home Cleaning")')).toBeVisible();
  });
});