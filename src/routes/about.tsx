import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Compass, ShieldCheck, Users } from 'lucide-react';
import { Brand } from '@/components/Brand';
import { SiteFooter } from '@/components/SiteFooter';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/about')({
  head: () => ({ meta: [
    { title: 'About us — Career Kind' },
    { name: 'description', content: 'Career Kind helps Indian students, parents and schools move from self-discovery to a thoughtful career roadmap.' },
    { property: 'og:title', content: 'About us — Career Kind' },
    { property: 'og:description', content: 'AI-powered career guidance for students, parents and schools in India.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }), component: About,
});

const values = [
  { icon: Compass, title: 'Self-discovery first', text: 'A free adaptive assessment helps each student understand interests, strengths and working style.' },
  { icon: Users, title: 'Families together', text: 'Student, parent and joint modes help families talk openly and decide together.' },
  { icon: ShieldCheck, title: 'Private and honest', text: 'One private profile per account. Guidance supports decisions — it never guarantees outcomes.' },
];

function About() {
  return <main className="site-canvas flex min-h-screen flex-col">
    <header className="brand-header flex min-h-20 flex-wrap items-center justify-between gap-3 border-b bg-card px-5 py-3"><Brand /><Button asChild variant="outline" size="sm"><Link to="/"><ArrowLeft />My workspace</Link></Button></header>
    <section className="mx-auto w-full max-w-5xl flex-1 px-5 py-14">
      <p className="text-sm font-bold uppercase text-primary">About us</p>
      <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl">Thoughtful futures, shaped together.</h1>
      <p className="mt-5 max-w-2xl text-base leading-7 text-ink-soft">Career Kind is an AI-powered career guidance platform for students, parents and schools in India. We help young people move from self-discovery to a clear, realistic career roadmap — with an AI-powered Career Counsellor that explains its reasoning and cites official sources.</p>
      <div className="mt-12 grid gap-5 sm:grid-cols-3">{values.map(({ icon: Icon, title, text }) => <div key={title} className="rounded-lg border bg-card p-6"><div className="grid size-10 place-items-center rounded-md bg-moss text-moss-foreground"><Icon className="size-5" /></div><h2 className="mt-4 text-lg font-bold">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></div>)}</div>
    </section>
    <SiteFooter />
  </main>;
}
