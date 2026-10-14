import { isDemoMode } from './mode';

// Server configuration only. Never expose the Apps Script signing secret.
export function demoSheetsEnabled() {
  return isDemoMode() && process.env.DEMO_SHEETS_ENABLED === 'true';
}
