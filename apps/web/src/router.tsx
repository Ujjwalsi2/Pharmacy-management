import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { RequireRole } from '@/features/auth/RequireRole';
import LoginPage from '@/features/auth/LoginPage';
import { PageFallback } from '@/components/layout/PageFallback';
import { RootProviders } from './RootProviders';

const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const PosPage = lazy(() => import('@/pages/PosPage'));
const SalesPage = lazy(() => import('@/pages/SalesPage'));
const SaleDetailPage = lazy(() => import('@/pages/SaleDetailPage'));
const InventoryPage = lazy(() => import('@/pages/InventoryPage'));
const DrugDetailPage = lazy(() => import('@/pages/DrugDetailPage'));
const PurchasesPage = lazy(() => import('@/pages/PurchasesPage'));
const PurchaseDetailPage = lazy(() => import('@/pages/PurchaseDetailPage'));
const CompaniesPage = lazy(() => import('@/pages/CompaniesPage'));
const MessagesPage = lazy(() => import('@/pages/MessagesPage'));
const ReportsPage = lazy(() => import('@/pages/ReportsPage'));
const UsersPage = lazy(() => import('@/pages/UsersPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

function withSuspense(element: ReactNode) {
  return <Suspense fallback={<PageFallback />}>{element}</Suspense>;
}

export const router = createBrowserRouter([
  {
    element: <RootProviders />,
    children: [
      { path: '/login', element: <LoginPage /> },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { path: '/', element: withSuspense(<DashboardPage />) },
              { path: '/pos', element: withSuspense(<PosPage />) },
              { path: '/sales', element: withSuspense(<SalesPage />) },
              { path: '/sales/:id', element: withSuspense(<SaleDetailPage />) },
              { path: '/inventory', element: withSuspense(<InventoryPage />) },
              { path: '/inventory/:id', element: withSuspense(<DrugDetailPage />) },
              { path: '/purchases', element: withSuspense(<PurchasesPage />) },
              { path: '/purchases/:id', element: withSuspense(<PurchaseDetailPage />) },
              { path: '/companies', element: withSuspense(<CompaniesPage />) },
              { path: '/messages', element: withSuspense(<MessagesPage />) },
              { path: '/reports', element: withSuspense(<ReportsPage />) },
              {
                element: <RequireRole roles={['ADMIN']} />,
                children: [{ path: '/users', element: withSuspense(<UsersPage />) }],
              },
              { path: '/settings', element: withSuspense(<SettingsPage />) },
              { path: '*', element: withSuspense(<NotFoundPage />) },
            ],
          },
        ],
      },
      { path: '*', element: withSuspense(<NotFoundPage />) },
    ],
  },
]);
