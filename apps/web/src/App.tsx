import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { queryClient } from '@/lib/queryClient';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { router } from './router';

/**
 * Provider order: Theme > Query > Router. Toast and Auth are mounted inside
 * the router tree (see `RootProviders`) because `AuthProvider` needs
 * `useNavigate`, which only works inside router context.
 */
export function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
