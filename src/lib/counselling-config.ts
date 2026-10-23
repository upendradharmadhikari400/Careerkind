export const COUNSELLOR_NAME = 'Dr. Saurabh Shah Sir';
export const PAID_SESSION_VALIDITY_DAYS = 28;
export const COUNSELLING_ACCESS_POLICY = 'Paid sessions allow new questions for 28 days from confirmed payment. Your old questions, answers and saved reports remain available for your lifetime.';

export function counsellingAccess(verifiedPaidAt: string | null, now = Date.now()) {
  if (verifiedPaidAt === null) return { canAsk: true, expiresAt: null, kind: 'earlyAccess' as const };
  const paidAt = Date.parse(verifiedPaidAt);
  const expiry = paidAt + PAID_SESSION_VALIDITY_DAYS * 24 * 60 * 60 * 1000;
  const valid = Number.isFinite(expiry) && now >= paidAt && now < expiry;
  return { canAsk: valid, expiresAt: Number.isFinite(expiry) ? new Date(expiry).toISOString() : null, kind: valid ? 'paid' as const : 'expired' as const };
}

export const COUNSELLING_PLANS = {
  student: { label: 'Student solo', price: 2499, discountPrice: 1499 },
  parent: { label: 'Parent solo', price: 2499, discountPrice: 1499 },
  joint: { label: 'Parent + student', price: 2499, discountPrice: 1499 },
} as const;

export function counsellingPlan(mode: string) {
  if (mode === 'parent' || mode === 'joint') return COUNSELLING_PLANS[mode];
  return COUNSELLING_PLANS.student;
}

export function counsellingPrice(mode: string) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(counsellingPlan(mode).price);
}
export function counsellingDiscountPrice(mode: string) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(counsellingPlan(mode).discountPrice);
}
