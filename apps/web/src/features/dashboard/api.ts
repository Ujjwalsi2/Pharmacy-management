import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DashboardSummary } from '@/types/api';

export const dashboardApi = {
  summary: () => api.get<DashboardSummary>('/dashboard/summary'),
};

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: dashboardApi.summary,
    staleTime: 15_000,
  });
}
