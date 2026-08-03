import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Compass className="h-8 w-8" aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-fg-muted">404</p>
        <h1 className="mt-1 text-2xl font-semibold text-fg">This page went missing</h1>
        <p className="mt-2 max-w-sm text-sm text-fg-muted">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved. Let&apos;s get you back
          on track.
        </p>
      </div>
      <Link
        to="/"
        className="inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] bg-primary px-4 text-sm font-medium text-primary-fg transition-opacity duration-150 ease-out hover:opacity-90"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
