import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, buildQueryString } from '@/lib/api';
import type { CreatePurchaseInput, Paginated, Purchase } from '@/types/api';

export interface PurchasesListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  companyId?: string;
  from?: string;
  to?: string;
  sort?: string;
}

export const purchasesApi = {
  list: (params: PurchasesListParams) =>
    api.get<Paginated<Purchase>>(
      `/purchases${buildQueryString({
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        companyId: params.companyId || undefined,
        from: params.from || undefined,
        to: params.to || undefined,
        sort: params.sort,
      })}`,
    ),
  get: (id: string) => api.get<Purchase>(`/purchases/${id}`),
  create: (input: CreatePurchaseInput) => api.post<Purchase>('/purchases', input),
};

export const purchasesQueryKeys = {
  list: (params: PurchasesListParams) => ['purchases', 'list', params] as const,
  detail: (id: string) => ['purchases', 'detail', id] as const,
};

/** Paginated, filterable purchase order list — backs the Purchases page. */
export function usePurchases(params: PurchasesListParams) {
  return useQuery({
    queryKey: purchasesQueryKeys.list(params),
    queryFn: () => purchasesApi.list(params),
    placeholderData: (previous) => previous,
  });
}

/** A single purchase order by id — backs the Purchase detail page. */
export function usePurchase(id: string | undefined) {
  return useQuery({
    queryKey: purchasesQueryKeys.detail(id ?? ''),
    queryFn: () => purchasesApi.get(id ?? ''),
    enabled: Boolean(id),
  });
}

/** Records a stock-in purchase; increments the referenced drugs' quantities server-side. */
export function useCreatePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePurchaseInput) => purchasesApi.create(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['purchases'] }),
        queryClient.invalidateQueries({ queryKey: ['drugs'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] }),
      ]);
    },
  });
}
