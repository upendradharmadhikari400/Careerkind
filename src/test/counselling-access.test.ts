import { describe, expect, it } from 'vitest';
import { counsellingAccess, PAID_SESSION_VALIDITY_DAYS } from '@/lib/counselling-config';

describe('paid counselling validity', () => {
  const paidAt = '2026-10-22T17:43:00.000Z';
  const expiry = Date.parse('2026-11-19T17:43:00.000Z');
  it('allows new questions for exactly 28 days from verified payment', () => {
    expect(PAID_SESSION_VALIDITY_DAYS).toBe(28);
    expect(counsellingAccess(paidAt, expiry - 1)).toMatchObject({ canAsk: true, expiresAt: '2026-11-19T17:43:00.000Z' });
    expect(counsellingAccess(paidAt, expiry).canAsk).toBe(false);
    expect(counsellingAccess(paidAt, expiry + 1000).canAsk).toBe(false);
  });
  it('blocks new questions until a verified payment exists', () => {
    expect(counsellingAccess(null, expiry)).toMatchObject({ canAsk: false, kind: 'unpaid' });
  });
  it('rejects invalid or future payment timestamps', () => {
    expect(counsellingAccess('invalid', expiry).canAsk).toBe(false);
    expect(counsellingAccess(paidAt, Date.parse(paidAt) - 1).canAsk).toBe(false);
  });
});