import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { counsellingAccess, counsellingPlan } from '@/lib/counselling-config';

function creds() {
  const id = process.env['RAZORPAY_KEY_ID'];
  const secret = process.env['RAZORPAY_KEY_SECRET'];
  if (!id || !secret) throw new Error('Online payment is not configured yet.');
  return { id, secret, auth: 'Basic ' + btoa(`${id}:${secret}`) };
}

async function rzp<T>(path: string, auth: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`https://api.razorpay.com/v1${path}`, { ...init, headers: { Authorization: auth, 'Content-Type': 'application/json', ...(init?.headers ?? {}) } });
  if (!res.ok) { console.error('Razorpay error', res.status, await res.text()); throw new Error('Payment service is unavailable. Please try again.'); }
  return res.json() as Promise<T>;
}

async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const createCounsellingOrder = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ mode: z.string().max(20) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: access } = await context.supabase.from('counselling_access').select('verified_paid_at').eq('user_id', context.userId).maybeSingle();
    if (counsellingAccess(access?.verified_paid_at ?? null).kind === 'paid') throw new Error('You already have an active 28-day session.');
    const { id, auth } = creds();
    const plan = counsellingPlan(data.mode);
    const order = await rzp<{ id: string; amount: number; currency: string }>('/orders', auth, {
      method: 'POST',
      body: JSON.stringify({ amount: plan.discountPrice * 100, currency: 'INR', receipt: `ck_${Date.now()}`, notes: { user_id: context.userId, plan: plan.label } }),
    });
    return { keyId: id, orderId: order.id, amount: order.amount, currency: order.currency, label: plan.label };
  });

export const verifyCounsellingPayment = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ orderId: z.string().max(64), paymentId: z.string().max(64), signature: z.string().max(128) }).parse(d))
  .handler(async ({ data, context }) => {
    const { secret, auth } = creds();
    if ((await hmacHex(secret, `${data.orderId}|${data.paymentId}`)) !== data.signature) throw new Error('Payment could not be verified.');
    const order = await rzp<{ amount: number; notes: Record<string, string> }>(`/orders/${data.orderId}`, auth);
    if (order.notes?.['user_id'] !== context.userId) throw new Error('This payment belongs to another account.');
    let payment = await rzp<{ status: string; order_id: string; amount: number; created_at: number }>(`/payments/${data.paymentId}`, auth);
    if (payment.order_id !== data.orderId || payment.amount !== order.amount) throw new Error('Payment details do not match.');
    if (payment.status === 'authorized') payment = await rzp(`/payments/${data.paymentId}/capture`, auth, { method: 'POST', body: JSON.stringify({ amount: payment.amount, currency: 'INR' }) });
    if (payment.status !== 'captured') throw new Error('Payment is not complete yet.');
    // Use Razorpay's own payment time so replaying an old payment cannot extend access.
    const paidAt = new Date(payment.created_at * 1000).toISOString();
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: existing } = await supabaseAdmin.from('counselling_access').select('verified_paid_at').eq('user_id', context.userId).maybeSingle();
    if (!existing?.verified_paid_at || Date.parse(existing.verified_paid_at) < Date.parse(paidAt)) {
      const { error } = await supabaseAdmin.from('counselling_access').upsert({ user_id: context.userId, verified_paid_at: paidAt, payment_reference: data.paymentId });
      if (error) throw new Error('Payment received but access could not be saved. Please contact support.');
    }
    return { ok: true };
  });
