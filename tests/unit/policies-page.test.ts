import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';

vi.mock('@/lib/data', () => ({ getSettings: vi.fn() }));
import { getSettings } from '@/lib/data';
import Policies from '@/app/policies/page';

it('shows a recoverable notice without leaking database errors', async () => {
  vi.mocked(getSettings).mockRejectedValueOnce(new Error('private database details'));
  const html = renderToStaticMarkup(await Policies());
  expect(html).toContain('temporarily unavailable');
  expect(html).toContain('Try again');
  expect(html).not.toContain('private database details');
});
