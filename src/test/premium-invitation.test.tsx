import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router';
vi.mock('@tanstack/react-start', () => ({ useServerFn: (f: unknown) => f }));
vi.mock('@/lib/razorpay.functions', () => ({ createCounsellingOrder: vi.fn(), verifyCounsellingPayment: vi.fn() }));
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
    for (const m of ['student', 'parent', 'joint']) {
      expect(counsellingPlan(m).price).toBe(2499);
      expect(counsellingPlan(m).discountPrice).toBe(1499);
    }
  });

  it('offers Razorpay payment at the discounted price', async () => {
    await renderInvitation('joint');
    expect(screen.getByRole('button', { name: /Pay ₹1,499/ })).toBeTruthy();
  });

  it('keeps the free results accessible', async () => {
    const onViewResults = vi.fn();
    await renderInvitation('student', onViewResults);
    fireEvent.click(screen.getByRole('button', { name: 'View My Free Assessment Results' }));
    expect(onViewResults).toHaveBeenCalledOnce();
  });
});
