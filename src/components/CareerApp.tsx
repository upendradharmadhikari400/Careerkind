import { Link } from '@tanstack/react-router';
import { useEffect, useState, type FormEvent } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { X, ArrowRight, BrainCircuit, Check, Compass, LogOut, Sparkles, Users, UserRound, Clock3, ShieldCheck, ChevronLeft } from 'lucide-react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { advanceAssessment } from '@/lib/assessment.functions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import communityImage from '@/assets/school-community.jpg';
import { SubjectPicker } from '@/components/SubjectPicker';
import { mergeSubjects } from '@/lib/profile-subjects';
import type { Database } from '@/integrations/supabase/types';
import { SUBJECTS, STATES, STATE_CITIES, CLASS_OPTIONS } from '@/lib/india-data';
import { PremiumInvitation } from '@/components/PremiumInvitation';
import { Brand } from '@/components/Brand';
import { SiteFooter } from '@/components/SiteFooter';

type Profile = Database['public']['Tables']['student_profiles']['Row'];
type Assessment = Database['public']['Tables']['assessments']['Row'];
type Mode = 'student' | 'parent' | 'joint';
type Report = { snapshot?: string; interests?: string[]; strengths?: string[]; streams?: string[]; careers?: string[]; nextSteps?: string[]; alignment?: string };
type AuthView = 'signin' | 'signup' | 'forgot';

const MODES: Array<{ mode: Mode; title: string; note: string; icon: typeof UserRound; tone: string }> = [
  { mode: 'student', title: 'Student solo', note: 'Explore strengths, interests and work preferences.', icon: UserRound, tone: 'bg-sky text-sky-foreground' },
  { mode: 'parent', title: 'Parent solo', note: 'Reflect on the student’s potential, context and constraints.', icon: Users, tone: 'bg-amber text-amber-foreground' },
  { mode: 'joint', title: 'Parent + student', note: 'Surface agreement and bridge different preferences fairly.', icon: BrainCircuit, tone: 'bg-moss text-moss-foreground' },
];

type Q = { question: string; options: string[] };
const firstQuestion = (mode: Mode, name: string): Q => {
  if (mode === 'parent') return { question: `When ${name} has free time, what do they most often choose to do?`, options: ['Build, fix or experiment with things', 'Read, write or explore ideas', 'Draw, design, play music or create', 'Spend time with friends or help others', 'Play sports or stay physically active', 'Organise, plan or manage something'] };
  return { question: `${mode === 'joint' ? name + ', w' : 'W'}hen you have free time, which activity feels most natural to you?`, options: ['Building, fixing or experimenting with things', 'Reading, writing or exploring ideas', 'Drawing, designing, music or creating', 'Spending time with friends or helping others', 'Sports or physical activity', 'Organising, planning or leading something'] };
};
export const QUESTION_TOTAL = (mode: string) => (mode === 'joint' ? 12 : 10);

export function CareerApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [active, setActive] = useState<Assessment | null>(null);
  const [question, setQuestion] = useState<Q>({ question: '', options: [] });
  const [reflection, setReflection] = useState('');
  const [report, setReport] = useState<Report | null>(null);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setLoading(false);
      }
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) {
        setProfile(null);
        setAssessments([]);
        setActive(null);
        setReport(null);
      }
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    void loadWorkspace(session.user);
  }, [session?.user]);

  async function loadWorkspace(user: User) {
    setLoading(true);
    const [profileResult, assessmentResult] = await Promise.all([
      supabase.from('student_profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('assessments').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);
    setProfile(profileResult.data);
    setAssessments(assessmentResult.data ?? []);
    setLoading(false);
  }

  if (loading) return <LoadingScreen />;
  if (!session) return <AuthScreen />;
  if (!profile) return <ProfileScreen user={session.user} onSaved={setProfile} />;
  if (report) return <ReportScreen profile={profile} report={report} mode={active?.mode ?? 'student'} onDone={() => { setReport(null); setActive(null); void loadWorkspace(session.user); }} />;
  if (showProfile) return <ProfileView profile={profile} onBack={() => setShowProfile(false)} onUpdated={setProfile} />;
  if (active) return <AssessmentScreen assessment={active} profile={profile} initialQuestion={question} initialReflection={reflection} onQuestion={setQuestion} onReflection={setReflection} onReport={setReport} onExit={() => { setActive(null); setQuestion({ question: '', options: [] }); setReflection(''); void loadWorkspace(session.user); }} />;
  return <Dashboard profile={profile} assessments={assessments} onProfile={() => setShowProfile(true)} onStart={async (mode) => {
    const { data, error } = await supabase.from('assessments').insert({ user_id: session.user.id, mode, status: 'in_progress', answers: [] }).select().single();
    if (!error && data) {
      setActive(data);
      setQuestion(firstQuestion(mode, profile.student_name));
      setReflection('');
    }
  }} onOpen={(assessment) => {
    const result = assessment.result as Report | null;
    if (assessment.status === 'complete' && result) { setActive(assessment); setReport(result); }
    else {
      setActive(assessment);
      const saved = assessment.result as { question?: string; options?: string[]; reflection?: string } | null;
      setQuestion(saved?.question && saved.options?.length ? { question: saved.question, options: saved.options } : firstQuestion(assessment.mode as Mode, profile.student_name));
      setReflection(saved?.reflection ?? '');
    }
  }} onSignOut={() => void supabase.auth.signOut()} />;
}


function LoadingScreen() {
  return <main className="grid min-h-screen place-items-center bg-background"><div className="text-center"><Compass className="mx-auto size-8 animate-pulse text-primary"/><p className="mt-3 text-sm text-muted-foreground">Preparing your workspace…</p></div></main>;
}

function AuthScreen() {
  const [view, setView] = useState<AuthView>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    if (view === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
      setMessage(error?.message ?? "If an account exists for this email, we've sent a reset link. Please check your inbox and spam folder.");
    } else if (view === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password });
      setMessage(error?.message ?? (data.session ? 'Account created.' : 'Check your email to confirm your account, then sign in.'));
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
    }
    setBusy(false);
  }

  return <main className="site-canvas flex min-h-screen flex-col">
    <header className="brand-header flex min-h-20 flex-wrap items-center justify-between gap-4 border-b bg-card px-5 py-3"><Brand/><Button asChild variant="ghost" size="sm"><Link to="/school-partners">School partners<ArrowRight /></Link></Button></header>
    <section className="community-banner relative isolate overflow-hidden">
      <img src={communityImage} width={1920} height={1088} alt="Students, parents and a teacher planning education together" className="absolute inset-0 -z-20 h-full w-full object-cover" />
      <div className="photo-shade absolute inset-0 -z-10" />
      <div className="mx-auto max-w-6xl px-5 py-12 sm:py-14"><Badge className="mb-4 border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground">Students · Parents · Schools</Badge><h1 className="text-4xl font-extrabold leading-tight text-primary-foreground sm:text-5xl">Career Kind</h1><p className="mt-4 max-w-lg text-base leading-7 text-primary-foreground">From self-discovery to a career roadmap.<br />Thoughtful futures, shaped together.</p></div>
    </section>
    <section className="mx-auto w-full max-w-6xl flex-1 px-5 pb-10">
      <div className="mx-auto w-full max-w-md py-8">
        <p className="text-xs font-bold uppercase text-primary">Private by design</p>
        <h2 className="mt-3 text-3xl font-extrabold">{view === 'forgot' ? 'Reset your password' : view === 'signin' ? 'Welcome back' : 'Create your family account'}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{view === 'forgot' ? 'Enter your email and we’ll send a secure link to set a new password.' : 'One account supports one student profile and keeps every assessment in one place.'}</p>
        {view === 'forgot' ? (
          <button type="button" onClick={() => { setView('signin'); setMessage(''); }} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"><ChevronLeft className="size-4" />Back to sign in</button>
        ) : (
          <div className="mt-7 grid grid-cols-2 border-b"><button type="button" onClick={() => {setView('signin'); setMessage('');}} className={`border-b-2 px-3 py-3 text-sm font-semibold ${view === 'signin' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>Sign in</button><button type="button" onClick={() => {setView('signup'); setMessage('');}} className={`border-b-2 px-3 py-3 text-sm font-semibold ${view === 'signup' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>Create account</button></div>
        )}
        <form onSubmit={submit} className="mt-7 space-y-5">
          <Field label="Email address"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com" /></Field>
          {view !== 'forgot' && <Field label="Password"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required autoComplete={view === 'signin' ? 'current-password' : 'new-password'} placeholder="At least 8 characters" /></Field>}
          {view === 'signin' && <div className="text-right"><button type="button" onClick={() => { setView('forgot'); setMessage(''); }} className="text-xs font-semibold text-primary hover:underline">Forgot password?</button></div>}
          {message && <p role="status" className="rounded-md bg-muted px-3 py-2 text-sm text-ink-soft">{message}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? 'Please wait…' : view === 'forgot' ? 'Send reset link' : view === 'signin' ? 'Sign in' : 'Create account'}<ArrowRight/></Button>
        </form>
        <div className="mt-7 flex gap-3 border-t pt-6 text-xs leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary"/><p>Career guidance is decision support, not a guarantee. A parent or guardian should supervise younger students.</p></div>
      </div>
    </section>
    <SiteFooter />
  </main>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

const selectClass = 'flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50';

function ProfileScreen({ user, onSaved }: { user: User; onSaved: (profile: Profile) => void }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [form, setForm] = useState({ student_name: '', parent_name: '', phone: '', category: '', school: '', area: '', city: '', state: '', board: '', principal_name: '', consent_confirmed: false });
  const [subjects, setSubjects] = useState<string[]>([]);
  const [otherSubjects, setOtherSubjects] = useState('');
  const update = (key: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!mergeSubjects(subjects, otherSubjects)) { setError('Please select at least one subject.'); return; }
    setBusy(true); setError('');
    const { data, error: saveError } = await supabase.from('student_profiles').insert({ ...form, principal_name: form.principal_name.trim(), subjects: mergeSubjects(subjects, otherSubjects), user_id: user.id }).select().single();
    if (saveError) setError(saveError.message); else if (data) onSaved(data);
    setBusy(false);
  }
  return <main className="site-canvas flex min-h-screen flex-col"><header className="mx-auto flex h-20 max-w-5xl items-center justify-between px-5"><Brand/><Button variant="ghost" onClick={() => void supabase.auth.signOut()}><LogOut/>Sign out</Button></header><section className="mx-auto max-w-3xl flex-1 px-5 pb-16 pt-8"><div className="flex items-start gap-4"><div className="grid size-12 shrink-0 place-items-center rounded-md bg-moss text-moss-foreground"><UserRound/></div><div><p className="text-xs font-bold uppercase text-primary">Step 1 of 1</p><h1 className="mt-2 text-3xl font-extrabold">Tell us about the student</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">This creates the single student profile linked to this account. The AI uses it only to make questions more relevant.</p></div></div>
  <form onSubmit={submit} className="mt-10 grid gap-5 border-t pt-8 sm:grid-cols-2">
    <Field label="Student name"><Input required value={form.student_name} onChange={(e)=>update('student_name',e.target.value)}/></Field><Field label="Parent or guardian name"><Input required value={form.parent_name} onChange={(e)=>update('parent_name',e.target.value)}/></Field>
    <Field label="Phone number"><Input required type="tel" value={form.phone} onChange={(e)=>update('phone',e.target.value)} placeholder="For future account recovery"/></Field><Field label="Current class or year"><select required className={selectClass} value={form.category} onChange={(e)=>update('category',e.target.value)}><option value="">Select class…</option>{CLASS_OPTIONS.map((c)=><option key={c} value={c}>{c}</option>)}</select></Field>
    <Field label="School"><Input required value={form.school} onChange={(e)=>update('school',e.target.value)}/></Field><Field label="Board"><Input required value={form.board} onChange={(e)=>update('board',e.target.value)} placeholder="e.g. CBSE, ICSE, State Board"/></Field>
    <div className="sm:col-span-2"><SubjectPicker selected={subjects} other={otherSubjects} onSelected={setSubjects} onOther={setOtherSubjects} /></div>
    <Field label="Principal name (optional)"><Input value={form.principal_name} onChange={(e)=>update('principal_name',e.target.value)}/></Field>
    <Field label="School area"><Input required value={form.area} onChange={(e)=>update('area',e.target.value)} placeholder="Locality where the school is"/></Field>
    <Field label="State"><select required className={selectClass} value={form.state} onChange={(e)=>setForm((c)=>({...c,state:e.target.value,city:''}))}><option value="">Select state…</option>{STATES.map((s)=><option key={s} value={s}>{s}</option>)}</select></Field>
    <Field label="City"><select required disabled={!form.state} className={selectClass} value={form.city} onChange={(e)=>update('city',e.target.value)}><option value="">{form.state ? 'Select city…' : 'Select a state first'}</option>{(STATE_CITIES[form.state] ?? []).map((c)=><option key={c} value={c}>{c}</option>)}<option value="Other">Other</option></select></Field>
    <label className="flex items-start gap-3 rounded-md bg-muted p-4 sm:col-span-2"><input type="checkbox" checked={form.consent_confirmed} onChange={(e)=>update('consent_confirmed',e.target.checked)} required className="mt-1 size-4 accent-primary"/><span className="text-sm leading-6">I am the student (if old enough to consent) or the parent/guardian, and I consent to using these details for career guidance.</span></label>
    {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}<Button className="sm:col-span-2 sm:justify-self-end" size="lg" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Continue to assessments'}<ArrowRight/></Button>
  </form></section><SiteFooter /></main>;
}

function Dashboard({ profile, assessments, onProfile, onStart, onOpen, onSignOut }: { profile: Profile; onProfile: () => void; assessments: Assessment[]; onStart: (mode: Mode) => void; onOpen: (item: Assessment) => void; onSignOut: () => void }) {
  const completed = assessments.filter((item) => item.status === 'complete').length;
  return <main className="site-canvas flex min-h-screen flex-col"><header className="border-b bg-card"><div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5"><Brand/><div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={onProfile}><UserRound/>My profile</Button><Button size="icon" variant="ghost" onClick={onSignOut} title="Sign out"><LogOut/></Button></div></div></header>
  <section className="border-b bg-card"><div className="mx-auto max-w-6xl px-5 py-10 sm:py-14"><p className="text-xs font-bold uppercase text-primary">Career exploration workspace</p><div className="mt-3 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><h1 className="text-3xl font-extrabold sm:text-4xl">Good to see you, {profile.student_name}.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Choose whose perspective to explore. Every conversation adapts to your answers and saves a high-level career profile.</p></div><div className="flex gap-7 border-l pl-5"><Stat value={String(assessments.length)} label="Assessments"/><Stat value={String(completed)} label="Profiles ready"/></div></div></div></section>
  <section className="mx-auto max-w-6xl flex-1 px-5 py-10"><div className="flex items-end justify-between"><div><p className="text-xs font-bold uppercase text-muted-foreground">Start a conversation</p><h2 className="mt-2 text-2xl font-extrabold">Choose a counselling mode</h2></div><Badge variant="secondary"><Sparkles/>Free basic profile</Badge></div>
  <div className="mt-6 grid gap-4 lg:grid-cols-3">{MODES.map(({mode,title,note,icon:Icon,tone})=><button key={mode} onClick={()=>onStart(mode)} className="group flex min-h-56 flex-col border bg-card p-6 text-left transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md"><div className={`grid size-11 place-items-center rounded-md ${tone}`}><Icon/></div><h3 className="mt-6 text-xl font-extrabold">{title}</h3><p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{note}</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary">Begin assessment <ArrowRight className="size-4 transition group-hover:translate-x-1"/></span></button>)}</div>
  <div className="mt-12 flex items-center justify-between border-b pb-4"><h2 className="text-xl font-extrabold">Assessment history</h2><span className="text-xs text-muted-foreground">Saved privately</span></div>
  {assessments.length === 0 ? <div className="py-14 text-center"><Clock3 className="mx-auto size-7 text-muted-foreground"/><p className="mt-3 text-sm text-muted-foreground">Your completed and in-progress assessments will appear here.</p></div> : <div className="divide-y">{assessments.map((item)=>{ const mode=MODES.find(m=>m.mode===item.mode); const Icon=mode?.icon ?? Compass; return <button key={item.id} onClick={()=>onOpen(item)} className="flex w-full items-center gap-4 py-5 text-left transition hover:bg-muted/50"><div className="grid size-10 place-items-center rounded-md bg-muted"><Icon className="size-5"/></div><div className="min-w-0 flex-1"><p className="font-semibold">{mode?.title ?? item.mode}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</p></div><Badge variant={item.status==='complete'?'secondary':'outline'}>{item.status==='complete'?'Profile ready':'In progress'}</Badge><ArrowRight className="size-4 text-muted-foreground"/></button>})}</div>}
  </section><SiteFooter /></main>;
}

function Stat({value,label}:{value:string;label:string}) { return <div><div className="text-2xl font-extrabold">{value}</div><div className="mt-1 text-xs text-muted-foreground">{label}</div></div> }

function AssessmentScreen({ assessment, profile, initialQuestion, initialReflection, onQuestion, onReflection, onReport, onExit }: { assessment: Assessment; profile: Profile; initialQuestion: Q; initialReflection: string; onQuestion: (q:Q)=>void; onReflection:(s:string)=>void; onReport:(r:Report)=>void; onExit:()=>void }) {
  const advance = useServerFn(advanceAssessment); const [answer,setAnswer]=useState(''); const [busy,setBusy]=useState(false); const [error,setError]=useState('');
  const [count, setCount] = useState(Array.isArray(assessment.answers) ? assessment.answers.length : 0); const total=QUESTION_TOTAL(assessment.mode); const nextRole=assessment.mode==='joint'?(count%2===0?'Student':'Parent'):assessment.mode==='parent'?'Parent':'Student';
  async function submit(event:FormEvent){event.preventDefault(); if(!answer.trim())return; setBusy(true);setError('');try{const response=await advance({data:{assessmentId:assessment.id,question:initialQuestion.question,answer}});setAnswer('');setCount(current=>current+1);if(response.complete&&response.result)onReport(response.result);else{onQuestion({question:response.question,options:response.options});onReflection(response.reflection);}}catch(err){setError(err instanceof Error?err.message:'Your answer was saved, but the next question could not be prepared.');}finally{setBusy(false)}}
  return <main className="min-h-screen bg-background"><header className="border-b bg-card"><div className="mx-auto flex h-20 max-w-4xl items-center justify-between px-5"><Brand/><Button variant="ghost" onClick={onExit}><ChevronLeft/>Save & exit</Button></div></header><section className="mx-auto grid max-w-4xl gap-10 px-5 py-10 lg:grid-cols-[1fr_220px]"><div><div className="flex items-center justify-between"><Badge variant="secondary">{MODES.find(m=>m.mode===assessment.mode)?.title}</Badge><span className="text-xs text-muted-foreground">Question {Math.min(count+1,total)} of {total}</span></div><Progress className="mt-4" value={(count/total)*100}/>{initialReflection&&<div className="mt-8 border-l-2 border-primary bg-secondary/60 px-4 py-3 text-sm leading-6 text-secondary-foreground">{initialReflection}</div>}<p className="mt-10 text-base font-extrabold uppercase tracking-wide text-primary sm:text-lg">For the {nextRole.toLowerCase()}</p><h1 className="mt-3 text-2xl font-extrabold leading-snug sm:text-3xl">{initialQuestion.question}</h1><form onSubmit={submit} className="mt-7"><p className="text-xs text-muted-foreground">Choose the option that best matches how you honestly feel — there are no right or wrong answers.</p><div role="radiogroup" className="mt-4 grid gap-2.5">{initialQuestion.options.map((opt,i)=>{const on=answer===opt;return <button type="button" role="radio" aria-checked={on} key={opt} onClick={()=>setAnswer(opt)} className={`flex items-center gap-3 rounded-md border p-4 text-left text-sm transition ${on?'border-primary bg-secondary text-secondary-foreground':'bg-card hover:border-primary/60'}`}><span className={`grid size-6 shrink-0 place-items-center rounded-full border text-xs font-bold ${on?'border-primary bg-primary text-primary-foreground':'text-muted-foreground'}`}>{String.fromCharCode(65+i)}</span>{opt}</button>})}</div><div className="mt-5 flex justify-end"><Button size="lg" type="submit" disabled={busy||!answer}>{busy?'Preparing next question…':'Continue'}{!busy&&<ArrowRight/>}</Button></div>{error&&<p className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}</form></div><aside className="border-t pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0"><ShieldCheck className="size-5 text-primary"/><h2 className="mt-3 text-sm font-bold">A safe exploration</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">The AI explores patterns, not labels. It will not choose a career for {profile.student_name} or promise an outcome.</p><div className="mt-6 border-t pt-5"><p className="text-xs font-semibold">You can pause anytime.</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Every submitted answer is saved to this account.</p></div></aside></section></main>;
}

function ReportScreen({profile,report,mode,onDone}:{profile:Profile;report:Report;mode:string;onDone:()=>void}) {
 const groups=[['Interest signals',report.interests],['Strength signals',report.strengths],['Broad streams to explore',report.streams],['Career areas to investigate',report.careers]] as const;
 return <main className="site-canvas flex min-h-screen flex-col"><header className="border-b bg-card"><div className="mx-auto flex h-20 max-w-5xl items-center justify-between px-5"><Brand/><Button variant="outline" onClick={onDone}>Back to workspace</Button></div></header><PremiumInvitation mode={mode} onViewResults={() => document.getElementById("free-results")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })} /><section id="free-results" className="mx-auto max-w-5xl flex-1 scroll-mt-6 px-5 py-10"><Badge className="bg-moss text-moss-foreground"><Check/>Basic career profile ready</Badge><h2 className="mt-5 max-w-3xl text-3xl font-extrabold sm:text-4xl">A starting point for {profile.student_name}’s exploration</h2><p className="mt-4 max-w-3xl text-base leading-7 text-ink-soft">{report.snapshot}</p><div className="mt-10 grid gap-px overflow-hidden border bg-border sm:grid-cols-2">{groups.map(([title,items])=><div key={title} className="bg-card p-6"><h2 className="text-sm font-bold uppercase text-muted-foreground">{title}</h2><ul className="mt-4 space-y-3">{items?.map(item=><li key={item} className="flex gap-3 text-sm leading-6"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary"/>{item}</li>)}</ul></div>)}</div>{report.alignment&&<div className="mt-6 border-l-2 border-primary bg-secondary p-5"><h2 className="text-sm font-bold">Preference alignment</h2><p className="mt-2 text-sm leading-6">{report.alignment}</p></div>}<div className="mt-10 flex flex-col gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between"><p className="max-w-2xl text-xs leading-5 text-muted-foreground">This profile reflects assessment responses and AI analysed interpretation. It supports family decisions; it does not guarantee suitability, admission or career outcomes.</p><Button asChild size="lg" className="h-auto min-h-11 whitespace-normal"><Link to="/counselling">Start My Personal Career Counselling<ArrowRight/></Link></Button></div></section><SiteFooter /></main>
}

function ProfileView({ profile, onBack, onUpdated }: { profile: Profile; onBack: () => void; onUpdated: (p: Profile) => void }) {
  const [category, setCategory] = useState(CLASS_OPTIONS.includes(profile.category) ? profile.category : '');
  const initialSubjects = (profile.subjects || '').split(',').map(s => s.trim()).filter(Boolean);
  const [subjects, setSubjects] = useState(initialSubjects.filter(s => SUBJECTS.includes(s)));
  const [otherSubjects, setOtherSubjects] = useState(initialSubjects.filter(s => !SUBJECTS.includes(s)).join(', '));
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  async function saveClass() {
    if (!category || !mergeSubjects(subjects, otherSubjects)) { setMsg('Select a class and at least one subject.'); return; } setBusy(true); setMsg('');
    const { data, error } = await supabase.from('student_profiles').update({ category, subjects: mergeSubjects(subjects, otherSubjects) }).eq('id', profile.id).select().single();
    if (error) setMsg(error.message); else if (data) { onUpdated(data); setMsg('Class and subjects updated.'); }
    setBusy(false);
  }
  const rows: Array<[string, string]> = [
    ['Student name', profile.student_name], ['Parent or guardian name', profile.parent_name], ['Phone number', profile.phone],
    ['School', profile.school], ['Board', profile.board], ['Subjects', profile.subjects || '—'],
    ['Principal name', profile.principal_name || '—'], ['School area', profile.area], ['City', profile.city], ['State', profile.state],
    ['Profile created', new Date(profile.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })],
  ];
  return <main className="site-canvas flex min-h-screen flex-col"><header className="border-b bg-card"><div className="mx-auto flex h-20 max-w-5xl items-center justify-between px-5"><Brand/><Button variant="outline" onClick={onBack}><ChevronLeft/>Back to workspace</Button></div></header>
  <section className="mx-auto w-full max-w-3xl flex-1 px-5 py-10"><div className="flex items-start gap-4"><div className="grid size-12 shrink-0 place-items-center rounded-md bg-moss text-moss-foreground"><UserRound/></div><div><p className="text-xs font-bold uppercase text-primary">My profile</p><h1 className="mt-2 text-3xl font-extrabold">{profile.student_name}</h1><p className="mt-2 text-sm text-muted-foreground">The student profile linked to this account.</p></div></div>
  <div className="mt-8 space-y-6 border-y py-6"><div><Label htmlFor="class-select">Current class or year</Label><select id="class-select" className={`${selectClass} mt-2`} value={category} onChange={e=>setCategory(e.target.value)}><option value="">{CLASS_OPTIONS.includes(profile.category) ? 'Select class…' : `Currently: ${profile.category} — select new class…`}</option>{CLASS_OPTIONS.map(c=><option key={c}>{c}</option>)}</select></div><SubjectPicker selected={subjects} other={otherSubjects} onSelected={setSubjects} onOther={setOtherSubjects} /><Button onClick={saveClass} disabled={busy || !category}>{busy ? 'Saving…' : 'Save class and subjects'}</Button>{msg && <p role="status" className="text-sm text-muted-foreground">{msg}</p>}</div>
  <dl className="mt-6 divide-y border-y">{rows.map(([k,v])=><div key={k} className="grid gap-1 py-4 sm:grid-cols-[200px_1fr]"><dt className="text-sm font-semibold text-muted-foreground">{k}</dt><dd className="text-sm font-medium">{v}</dd></div>)}</dl>
  </section><SiteFooter /></main>;
}
