import { Outlet } from 'react-router-dom';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { AuthProvider } from '@/features/auth/AuthProvider';

/**
 * Wraps the whole route tree. Lives inside the router (as the root route's
 * element) rather than outside `RouterProvider` because `AuthProvider` calls
 * `useNavigate`, which requires router context.
 */
export function RootProviders() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    </ToastProvider>
  );
}
