import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), userFrom: vi.fn(), fetch: vi.fn() }));
vi.mock('@tanstack/react-start', () => ({ createServerFn: () => ({ middleware() { return this; }, inputValidator() { return this; }, handler(fn: unknown) { return fn; } }) }));
vi.mock('@/integrations/supabase/auth-middleware', () => ({ requireSupabaseAuth: {} }));
vi.mock('@/integrations/supabase/client.server', () => ({ supabaseAdmin: { rpc: mocks.rpc, from: mocks.from } }));
import { createCounsellingOrder } from '@/lib/razorpay.functions';

const createOrder = createCounsellingOrder as unknown as (input: { data: { mode: string; coupon?: string }; context: { userId: string; supabase: { from: typeof mocks.userFrom } } }) => Promise<{ amount: number }>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('RAZORPAY_KEY_ID', 'test-key'); vi.stubEnv('RAZORPAY_KEY_SECRET', 'test-secret');
  mocks.userFrom.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) });
  vi.stubGlobal('fetch', mocks.fetch);
});

describe('Private coupon checkout', () => {
  it('uses the server-reserved 99% discount on ₹1499, charging ₹14.99', async () => {
    mocks.rpc.mockResolvedValue({ data: { id: 'reservation', order_id: null, amount: 1499, mode: 'student' }, error: null });
    mocks.from.mockReturnValue({ update: () => ({ eq: () => ({ is: () => ({ select: () => ({ maybeSingle: async () => ({ data: { id: 'reservation' }, error: null }) }) }) }) }) });
    mocks.fetch.mockResolvedValue({ ok: true, json: async () => ({ id: 'order', amount: 1499, currency: 'INR' }) });
    const order = await createOrder({ data: { mode: 'student', coupon: 'private-test' }, context: { userId: 'owner', supabase: { from: mocks.userFrom } } });
    expect(order.amount).toBe(1499);
    expect(mocks.rpc).toHaveBeenCalledWith('reserve_counselling_coupon', expect.objectContaining({ p_user: 'owner', p_base_amount: 149900 }));
    const sentRequest = mocks.fetch.mock.calls[0]?.[1];
    if (!sentRequest) throw new Error('No Razorpay request was sent');
    expect(JSON.parse(sentRequest.body).amount).toBe(1499);
  });
  it('cannot open an eleventh checkout once ten places are reserved', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'All coupon places have been used or reserved.' } });
    await expect(createOrder({ data: { mode: 'student', coupon: 'private-test' }, context: { userId: 'owner', supabase: { from: mocks.userFrom } } })).rejects.toThrow('All coupon places');
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});