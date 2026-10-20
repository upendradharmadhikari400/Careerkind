import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import { PremiumInvitation } from '@/components/PremiumInvitation';
import { counsellingPlan } from '@/lib/counselling-config';

afterEach(cleanup);

async function renderInvitation(mode: string, onViewResults = () => undefined) {
  const rootRoute = createRootRoute({ component: () => <PremiumInvitation mode={mode} onViewResults={onViewResults} /> });
  const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory({ initialEntries: ['/'] }) });
  render(<RouterProvider router={router} />);
  await screen.findByText('AI-powered Career Counsellor');
}

describe('Premium counselling invitation', () => {
  it('preserves solo and joint prices', () => {
    expect(counsellingPlan('student').price).toBe(1499);
    expect(counsellingPlan('parent').price).toBe(1499);
    expect(counsellingPlan('joint').price).toBe(2999);
  });

  it('opens counselling for free during early access', async () => {
    await renderInvitation('joint');
    const link = screen.getByRole('link', { name: 'Start My Personal Career Counselling' });
    expect(link.getAttribute('href')).toBe('/counselling');
  });

  it('keeps the free results accessible', async () => {
    const onViewResults = vi.fn();
    await renderInvitation('student', onViewResults);
    fireEvent.click(screen.getByRole('button', { name: 'View My Free Assessment Results' }));
    expect(onViewResults).toHaveBeenCalledOnce();
  });
});
