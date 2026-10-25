import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useNavigate } from '@tanstack/react-router';
import { CreditCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createCounsellingOrder, verifyCounsellingPayment } from '@/lib/razorpay.functions';

type RzpResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
declare global { interface Window { Razorpay?: new (o: Record<string, unknown>) => { open: () => void; on: (e: string, cb: () => void) => void } } }

function loadCheckout() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load Razorpay checkout.'));
    document.body.appendChild(s);
  });
}

export function RazorpayButton({ mode, label, onPaid }: { mode: string; label: string; onPaid?: () => void }) {
  const createOrder = useServerFn(createCounsellingOrder);
  const verify = useServerFn(verifyCounsellingPayment);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [coupon, setCoupon] = useState('');
  const [prepared, setPrepared] = useState<Awaited<ReturnType<typeof createCounsellingOrder>> | null>(null);

  const applyCoupon = async () => {
    setBusy(true); setError(''); setPrepared(null);
    try { setPrepared(await createOrder({ data: { mode, coupon: coupon.trim() } })); }
    catch (e) { setError(e instanceof Error ? e.message : 'Coupon could not be applied.'); }
    finally { setBusy(false); }
  };

  const pay = async () => {
    setBusy(true); setError('');
    try {
      await loadCheckout();
      const order = prepared ?? await createOrder({ data: { mode, coupon: coupon.trim() || undefined } });
      const Checkout = window.Razorpay;
      if (!Checkout) throw new Error('Could not load payment checkout. Please try again.');
      const rzp = new Checkout({
        key: order.keyId, order_id: order.orderId, amount: order.amount, currency: order.currency,
        name: 'Career Kind', description: `Personal career counselling · ${order.label}`,
        handler: async (r: RzpResponse) => {
          try {
            await verify({ data: { orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature } });
            if (onPaid) onPaid(); else void navigate({ to: '/counselling' });
          } catch (e) { setError(e instanceof Error ? e.message : 'Payment could not be verified.'); }
          setBusy(false);
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      rzp.on('payment.failed', () => { setError('Payment failed. No access was granted; please try again.'); setBusy(false); });
      rzp.open();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not start payment.'); setBusy(false); }
  };

  return <div className="flex flex-col gap-2">
    <div className="flex gap-2"><Input aria-label="Coupon code" placeholder="Coupon code (optional)" value={coupon} disabled={busy} maxLength={64} onChange={e => { setCoupon(e.target.value); setPrepared(null); setError(''); }} /><Button variant="outline" onClick={applyCoupon} disabled={busy || !coupon.trim()}>Apply</Button></div>
    {prepared && <p role="status" className="text-sm font-semibold text-primary">Coupon applied. Total: ₹{(prepared.amount / 100).toFixed(2)}</p>}
    <Button size="lg" className="h-auto min-h-11 whitespace-normal px-4 py-3" disabled={busy} onClick={pay}>{busy ? <Loader2 className="animate-spin" /> : <CreditCard />}{prepared ? `Pay ₹${(prepared.amount / 100).toFixed(2)} & start counselling` : label}</Button>
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
  </div>;
}
