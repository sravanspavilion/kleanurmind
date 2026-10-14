import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './tests/sheets', workers: 1, reporter: 'list', use: { baseURL: 'http://localhost:3000', browserName: 'chromium' } });
