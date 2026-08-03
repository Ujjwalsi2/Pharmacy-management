import { useQuery } from '@tanstack/react-query';
import { api, buildQueryString } from '@/lib/api';
import type { InventoryValueReport, SalesReport, TopDrugsReport } from '@/types/api';

export type GroupBy = 'day' | 'month';

export interface DateRange {
  from?: string;
  to?: string;
}

export const reportsApi = {
  sales: (range: DateRange, groupBy: GroupBy) =>
    api.get<SalesReport>(`/reports/sales${buildQueryString({ ...range, groupBy })}`),
  topDrugs: (range: DateRange, limit: number) =>
    api.get<TopDrugsReport>(`/reports/top-drugs${buildQueryString({ ...range, limit })}`),
  inventoryValue: () => api.get<InventoryValueReport>('/reports/inventory-value'),
};

export function useSalesReport(range: DateRange, groupBy: GroupBy) {
  return useQuery({
    queryKey: ['reports', 'sales', range, groupBy],
    queryFn: () => reportsApi.sales(range, groupBy),
  });
}

export function useTopDrugsReport(range: DateRange, limit: number) {
  return useQuery({
    queryKey: ['reports', 'top-drugs', range, limit],
    queryFn: () => reportsApi.topDrugs(range, limit),
  });
}

export function useInventoryValueReport() {
  return useQuery({
    queryKey: ['reports', 'inventory-value'],
    queryFn: reportsApi.inventoryValue,
    staleTime: 30_000,
  });
}
