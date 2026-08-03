import { Outlet } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { Role } from '@/types/api';
import { useAuth } from './useAuth';

export interface RequireRoleProps {
  roles: Role[];
}

/** Route guard: renders a 403 state when the current user's role is not in `roles`. */
export function RequireRole({ roles }: RequireRoleProps) {
  const { user } = useAuth();

  if (!user || !roles.includes(user.role)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 text-danger">
          <ShieldAlert className="h-7 w-7" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-fg">You don&apos;t have access to this page</h1>
          <p className="mt-1.5 max-w-sm text-sm text-fg-muted">
            This section is restricted to administrators. Contact an admin if you believe this is a mistake.
          </p>
        </div>
        <Button variant="secondary" onClick={() => window.history.back()}>
          Go back
        </Button>
      </div>
    );
  }

  return <Outlet />;
}
