import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useNavigate } from '@tanstack/react-router';
import { CreditCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  const pay = async () => {
    setBusy(true); setError('');
    try {
      await loadCheckout();
      const order = await createOrder({ data: { mode } });
      const rzp = new window.Razorpay!({
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
    <Button size="lg" className="h-auto min-h-11 whitespace-normal px-4 py-3" disabled={busy} onClick={pay}>{busy ? <Loader2 className="animate-spin" /> : <CreditCard />}{label}</Button>
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
  </div>;
}
