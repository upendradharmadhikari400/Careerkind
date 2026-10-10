export const COUNSELLOR_NAME = 'Dr. Saurabh Shah Sir';

export const COUNSELLING_PLANS = {
  student: { label: 'Student solo', price: 1499 },
  parent: { label: 'Parent solo', price: 1499 },
  joint: { label: 'Parent + student', price: 2999 },
} as const;

export function counsellingPlan(mode: string) {
  if (mode === 'parent' || mode === 'joint') return COUNSELLING_PLANS[mode];
  return COUNSELLING_PLANS.student;
}

export function counsellingPrice(mode: string) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(counsellingPlan(mode).price);
}