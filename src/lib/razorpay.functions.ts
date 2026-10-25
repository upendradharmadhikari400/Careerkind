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
  .inputValidator((d: unknown) => z.object({ mode: z.string().max(20), coupon: z.string().trim().max(64).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: access } = await context.supabase.from('counselling_access').select('verified_paid_at').eq('user_id', context.userId).maybeSingle();
    if (counsellingAccess(access?.verified_paid_at ?? null).kind === 'paid') throw new Error('You already have an active 28-day session.');
    const { id, auth } = creds();
    const plan = counsellingPlan(data.mode);
    let amount = plan.discountPrice * 100;
    let reservation: { id: string; order_id: string | null; amount: number; mode: string } | null = null;
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    if (data.coupon) {
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data.coupon.toUpperCase()));
      const hash = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
      const { data: reserved, error } = await supabaseAdmin.rpc('reserve_counselling_coupon', { p_hash: hash, p_user: context.userId, p_base_amount: amount, p_mode: data.mode });
      if (error) throw new Error(error.message);
      reservation = z.object({ id: z.string(), order_id: z.string().nullable(), amount: z.number().int().positive(), mode: z.string() }).parse(reserved);
      amount = reservation.amount;
      if (reservation.order_id) return { keyId: id, orderId: reservation.order_id, amount, currency: 'INR', label: counsellingPlan(reservation.mode).label };
    }
    const order = await rzp<{ id: string; amount: number; currency: string }>('/orders', auth, {
      method: 'POST',
      body: JSON.stringify({ amount, currency: 'INR', receipt: reservation?.id ?? `ck_${Date.now()}`, notes: { user_id: context.userId, plan: plan.label, ...(reservation ? { coupon_reservation: reservation.id } : {}) } }),
    });
    if (reservation) {
      const { data: bound, error } = await supabaseAdmin.from('counselling_coupon_orders').update({ order_id: order.id }).eq('id', reservation.id).is('order_id', null).select('id').maybeSingle();
      if (error || !bound) throw new Error('Checkout is already being prepared. Please try again to reopen it.');
    }
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
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const reservationId = order.notes?.['coupon_reservation'];
    if (reservationId) {
      const { data: reserved, error } = await supabaseAdmin.from('counselling_coupon_orders').select('amount,order_id,user_id,payment_id').eq('id', reservationId).single();
      if (error || !reserved || reserved.order_id !== data.orderId || reserved.user_id !== context.userId || reserved.amount !== order.amount || (reserved.payment_id && reserved.payment_id !== data.paymentId)) throw new Error('Coupon payment details do not match.');
    } else if (order.amount !== counsellingPlan('student').discountPrice * 100) throw new Error('Payment amount does not match the counselling price.');
    let payment = await rzp<{ status: string; order_id: string; amount: number; created_at: number }>(`/payments/${data.paymentId}`, auth);
    if (payment.order_id !== data.orderId || payment.amount !== order.amount) throw new Error('Payment details do not match.');
    if (payment.status === 'authorized') payment = await rzp(`/payments/${data.paymentId}/capture`, auth, { method: 'POST', body: JSON.stringify({ amount: payment.amount, currency: 'INR' }) });
    if (payment.status !== 'captured') throw new Error('Payment is not complete yet.');
    // Use Razorpay's own payment time so replaying an old payment cannot extend access.
    const paidAt = new Date(payment.created_at * 1000).toISOString();
    if (reservationId) {
      const { error } = await supabaseAdmin.from('counselling_coupon_orders').update({ payment_id: data.paymentId }).eq('id', reservationId);
      if (error) throw new Error('Payment received but coupon confirmation could not be saved. Please contact support.');
    }
    const { data: existing } = await supabaseAdmin.from('counselling_access').select('verified_paid_at').eq('user_id', context.userId).maybeSingle();
    if (!existing?.verified_paid_at || Date.parse(existing.verified_paid_at) < Date.parse(paidAt)) {
      const { error } = await supabaseAdmin.from('counselling_access').upsert({ user_id: context.userId, verified_paid_at: paidAt, payment_reference: data.paymentId });
      if (error) throw new Error('Payment received but access could not be saved. Please contact support.');
    }
    return { ok: true };
  });
