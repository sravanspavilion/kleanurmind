import { defineConfig, devices } from '@playwright/test';

const port = process.env.PLAYWRIGHT_DEMO_PORT || '3001';
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: './tests/demo',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: { baseURL, trace: 'retain-on-failure', timezoneId: 'America/New_York' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: `npm run dev:demo -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: { DEMO_SHEETS_ENABLED: 'false', DATABASE_URL: '', NEXTAUTH_SECRET: '', GOOGLE_SCRIPT_URL: '', GOOGLE_SCRIPT_SECRET: '', SMTP_HOST: '', SMTP_USER: '', SMTP_PASS: '', GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '' },
  },
});
