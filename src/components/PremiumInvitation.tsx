import { useState } from 'react';
import { ArrowRight, BookOpen, Compass, GraduationCap, Globe2, Wallet, Route, ShieldCheck, MessageCircle, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { COUNSELLOR_NAME, counsellingPlan, counsellingPrice } from '@/lib/counselling-config';

const benefits = [
  { icon: GraduationCap, title: 'Courses that fit you', detail: 'Personalized career paths, eligibility and alternatives.' },
  { icon: Globe2, title: 'India & abroad', detail: 'College shortlists, entrance exams and admission requirements.' },
  { icon: Wallet, title: 'A realistic financial plan', detail: 'Tuition, living costs, scholarships and financial aid.' },
  { icon: Route, title: 'Your next steps', detail: 'Exam preparation, career opportunities and a practical roadmap.' },
];

export function PremiumInvitation({ mode, onViewResults }: { mode: string; onViewResults: () => void }) {
  const [showAvailability, setShowAvailability] = useState(false);
  const plan = counsellingPlan(mode);

  return <section aria-labelledby="premium-title" className="border-b bg-secondary/40">
    <div className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
      <Badge variant="secondary"><MessageCircle />Personal career counselling</Badge>
      <h1 id="premium-title" className="mt-5 max-w-3xl text-3xl font-extrabold leading-tight sm:text-4xl">Your Assessment Is Complete. Let’s Plan Your Future!</h1>
      <div className="mt-7 flex items-start gap-4">
        <div className="grid size-12 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground"><Compass className="size-6" /></div>
        <div><h2 className="text-xl font-extrabold">{COUNSELLOR_NAME}</h2><p className="mt-1 text-sm font-semibold text-primary">AI-powered virtual career counsellor · not a human</p></div>
      </div>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-ink-soft">Turn your assessment insights into a thoughtful education and career plan with a supportive AI mentor, built around your interests, subjects and family priorities.</p>
      <div className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2">{benefits.map(({ icon: Icon, title, detail }) => <div key={title} className="flex gap-3"><Icon className="mt-1 size-5 shrink-0 text-primary" /><div><h3 className="text-sm font-bold">{title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{detail}</p></div></div>)}</div>
      <div className="mt-9 flex flex-col gap-5 border-t pt-6 sm:flex-row sm:items-start sm:justify-between">
        <div><p className="text-sm font-semibold">{plan.label}</p><p className="mt-1 text-3xl font-extrabold">{counsellingPrice(mode)}</p><p className="mt-2 max-w-sm text-xs leading-5 text-muted-foreground">One ongoing private conversation, with saved guidance and reports. Access unlocks only after verified payment.</p></div>
        <div className="flex w-full flex-col gap-3 sm:max-w-sm">
          <Button size="lg" className="h-auto min-h-11 whitespace-normal px-4 py-3 text-center" onClick={() => setShowAvailability(true)}>Start My Personal Career Counselling<ArrowRight /></Button>
          <Button variant="outline" className="h-auto min-h-10 whitespace-normal px-4 py-2" onClick={onViewResults}><BookOpen />View My Free Assessment Results</Button>
          <p className="text-xs leading-5 text-muted-foreground">Coming soon — secure checkout is not available yet. No payment will be taken.</p>
        </div>
      </div>
      {showAvailability && <div role="status" className="mt-6 flex gap-3 border border-border bg-card p-4"><LockKeyhole className="mt-0.5 size-5 shrink-0 text-primary" /><div><h3 className="text-sm font-bold">Premium counselling is not open yet</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Razorpay checkout is being prepared. Your free assessment remains available, and you have not been charged. Paid AI chat stays locked until secure checkout and payment verification are ready.</p><Button variant="link" className="mt-2 h-auto whitespace-normal px-0" onClick={onViewResults}>Continue to my free results<ArrowRight /></Button></div></div>}
      <div className="mt-7 flex items-start gap-2 text-xs leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0" /><p>AI guidance supports your decisions; it does not guarantee admissions, scholarships, placements or salaries. Current education facts will require official sources; unavailable information must be flagged. Session access terms will be confirmed before checkout opens.</p></div>
    </div>
  </section>;
}