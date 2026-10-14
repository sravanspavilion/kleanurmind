// Public demo mode.
//
// Enabled with DEMO_MODE (server) and NEXT_PUBLIC_DEMO_MODE (inlined into the
// client bundle). When enabled the site serves fictional sample data and needs
// no authentication or database; all real accounts, payments, uploads and
// integrations stay disabled. Set both to "false" (or unset) to restore the
// real authentication and user data.

export const DEMO_LABEL = 'Demo — sample data';

function enabled(value: string | undefined): boolean {
  return value === 'true' || value === '1';
}

export function isDemoMode(): boolean {
  if (typeof process === 'undefined') return false;
  return enabled(process.env.DEMO_MODE) || enabled(process.env.NEXT_PUBLIC_DEMO_MODE);
}
