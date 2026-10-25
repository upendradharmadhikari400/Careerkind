import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import { SiteFooter, SUPPORT_EMAIL } from '@/components/SiteFooter';

afterEach(cleanup);

async function renderFooter() {
  const rootRoute = createRootRoute({ component: () => <SiteFooter /> });
  const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory({ initialEntries: ['/'] }) });
  render(<RouterProvider router={router} />);
  await screen.findByText('Contact us');
}

describe('Site footer', () => {
  it('links to the privacy policy page', async () => {
    await renderFooter();
    expect(screen.getByRole('link', { name: 'Privacy policy' }).getAttribute('href')).toBe('/privacy-policy');
  });

  it('shows contact us and the support email as plain text, not links', async () => {
    await renderFooter();
    expect(SUPPORT_EMAIL).toBe('Help.Contactus23@gmail.com');
    expect(screen.getByText('Help.Contactus23@gmail.com').closest('a')).toBeNull();
    expect(screen.getByText('Contact us').closest('a')).toBeNull();
  });
});
