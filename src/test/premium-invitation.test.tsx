import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PremiumInvitation } from '@/components/PremiumInvitation';
import { counsellingPlan } from '@/lib/counselling-config';

afterEach(cleanup);

describe('Premium counselling invitation', () => {
  it('preserves solo and joint prices', () => {
    expect(counsellingPlan('student').price).toBe(1499);
    expect(counsellingPlan('parent').price).toBe(1499);
    expect(counsellingPlan('joint').price).toBe(2999);
  });

  it('discloses AI identity and unavailable checkout without unlocking chat', () => {
    render(<PremiumInvitation mode="joint" onViewResults={() => undefined} />);
    expect(screen.getByText('AI-powered Career Counsellor')).toBeTruthy();
    expect(screen.getByText('₹2,999')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Start My Personal Career Counselling' }));
    expect(screen.getByRole('status').textContent).toContain('you have not been charged');
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('keeps the free results accessible', () => {
    const onViewResults = vi.fn();
    render(<PremiumInvitation mode="student" onViewResults={onViewResults} />);
    fireEvent.click(screen.getByRole('button', { name: 'View My Free Assessment Results' }));
    expect(onViewResults).toHaveBeenCalledOnce();
  });
});