import { Link } from '@tanstack/react-router';
import { Mail } from 'lucide-react';

export const SUPPORT_EMAIL = 'Help.Contactus23@gmail.com';

export function SiteFooter() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-7 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-muted-foreground">© {new Date().getFullYear()} CareerKind · From self-discovery to your career roadmap.</p>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-semibold">
          <Link to="/school-partners" className="text-primary underline-offset-4 hover:underline">School partners</Link>
          <Link to="/privacy-policy" className="text-primary underline-offset-4 hover:underline">Privacy policy</Link>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="flex flex-col items-start gap-1 text-primary underline-offset-4 hover:underline"><span className="inline-flex items-center gap-1.5"><Mail className="size-4" />Contact us</span><span className="text-xs font-medium text-muted-foreground">{SUPPORT_EMAIL}</span></a>
        </nav>
      </div>
    </footer>
  );
}
