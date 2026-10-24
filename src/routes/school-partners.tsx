import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, School, Mail } from 'lucide-react';
import { Brand } from '@/components/Brand';
import { SiteFooter, SUPPORT_EMAIL } from '@/components/SiteFooter';
import { Button } from '@/components/ui/button';
import community from '@/assets/school-community.jpg';

export const Route = createFileRoute('/school-partners')({
  head: () => ({ meta: [
    { title: 'School partners — Career Kind' },
    { name: 'description', content: 'Schools and families supporting thoughtful student career exploration with Career Kind.' },
    { property: 'og:title', content: 'School partners — Career Kind' },
    { property: 'og:description', content: 'Our school community for student career exploration.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' },
  ] }), component: SchoolPartners,
});

function SchoolPartners() {
  return <main className="site-canvas flex min-h-screen flex-col"><header className="brand-header flex min-h-20 flex-wrap items-center justify-between gap-3 border-b bg-card px-5 py-3"><Brand /><Button asChild variant="outline" size="sm"><Link to="/"><ArrowLeft />My workspace</Link></Button></header>
    <section className="community-banner relative isolate overflow-hidden"><img src={community} width={1920} height={1088} alt="Students, parents and a teacher exploring education together" className="absolute inset-0 -z-20 h-full w-full object-cover" /><div className="photo-shade absolute inset-0 -z-10" /><div className="mx-auto max-w-6xl px-5 py-16"><p className="text-sm font-semibold text-primary-foreground">Our education community</p><h1 className="mt-3 text-4xl font-extrabold text-primary-foreground sm:text-5xl">School partners</h1><p className="mt-4 max-w-lg text-base leading-7 text-primary-foreground">Students, families and schools. A shared commitment to thoughtful futures.</p></div></section>
    <section className="mx-auto w-full max-w-6xl flex-1 px-5 py-12"><h2 className="text-2xl font-extrabold">Our partner schools</h2><div className="mt-8 border-y py-10"><School className="size-9 text-primary" /><p className="mt-4 text-lg font-semibold">Partner school announcements coming soon</p><p className="mt-2 text-sm text-muted-foreground">Confirmed school profiles will be shared here.</p></div><div className="mt-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><div><h2 className="text-xl font-extrabold">Connect your school with Career Kind</h2><p className="mt-2 text-sm text-muted-foreground">Get in touch about joining our school community.</p></div><Button asChild><a href={`mailto:${SUPPORT_EMAIL}?subject=School%20partnership%20enquiry`}><Mail />Contact us</a></Button></div></section><SiteFooter /></main>;
}