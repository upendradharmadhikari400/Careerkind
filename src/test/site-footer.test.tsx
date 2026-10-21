import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import { SiteFooter, SUPPORT_EMAIL } from '@/components/SiteFooter';

afterEach(cleanup);

function renderFooter() {
  const rootRoute = createRootRoute({ component: () => <SiteFooter /> });
  const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory({ initialEntries: ['/'] }) });
  render(<RouterProvider router={router} />);
}

describe('Site footer', () => {
  it('links to the privacy policy page', () => {
    renderFooter();
    const link = screen.getByRole('link', { name: 'Privacy policy' });
    expect(link.getAttribute('href')).toBe('/privacy-policy');
  });

  it('offers the support email as contact us', () => {
    renderFooter();
    expect(SUPPORT_EMAIL).toBe('Help.Contactus23@gmail.com');
    const link = screen.getByRole('link', { name: /Contact us/i });
    expect(link.getAttribute('href')).toBe('mailto:Help.Contactus23@gmail.com');
  });
});
