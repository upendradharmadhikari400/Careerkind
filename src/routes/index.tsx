import { createFileRoute } from "@tanstack/react-router";
import { CareerApp } from '@/components/CareerApp';

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: 'CareerKind — Your career exploration workspace' },
    { name: 'description', content: 'Private, adaptive AI career exploration for students and parents. Discover strengths, interests and a thoughtful next step.' },
    { property: 'og:title', content: 'CareerKind — Your career exploration workspace' },
    { property: 'og:description', content: 'Explore student and parent perspectives with adaptive assessments and saved basic career profiles.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: CareerApp,
});
