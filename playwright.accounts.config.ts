import { defineConfig, devices } from '@playwright/test';

// UI checks for the opt-in demo client accounts panel. The Google Sheets calls
// are mocked in the tests, so no rows are written to a real spreadsheet.
const port = process.env.PLAYWRIGHT_ACCOUNTS_PORT || '3002';
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: './tests/accounts',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run dev:demo -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      DEMO_MODE: 'true', NEXT_PUBLIC_DEMO_MODE: 'true',
      DEMO_ACCOUNTS_ENABLED: 'true', DEMO_SHEETS_ENABLED: 'false',
      GOOGLE_SCRIPT_URL: 'https://example.test/exec', GOOGLE_SCRIPT_SECRET: 'accounts-e2e-secret',
      NEXTAUTH_SECRET: 'accounts-e2e-session-secret',
      DATABASE_URL: '', SMTP_HOST: '', SMTP_USER: '', SMTP_PASS: '', GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '',
    },
  },
});
