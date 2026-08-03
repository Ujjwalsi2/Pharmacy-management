import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, buildQueryString } from '@/lib/api';
import type { CreateSaleInput, Drug, Paginated, PaymentMode, Sale } from '@/types/api';

export interface SalesListParams {
  page: number;
  pageSize: number;
  search?: string;
  sort?: string;
  userId?: string;
  from?: string;
  to?: string;
  /**
   * Not supported server-side by `GET /sales` (see docs/API_CONTRACT.md) —
   * filtered client-side in `useSalesList` below by over-fetching a page.
   */
  paymentMode?: PaymentMode | '';
}

export const salesApi = {
  list: (params: Omit<SalesListParams, 'paymentMode'>) =>
    api.get<Paginated<Sale>>(`/sales${buildQueryString(params)}`),
  get: (id: string) => api.get<Sale>(`/sales/${id}`),
  create: (input: CreateSaleInput) => api.post<Sale>('/sales', input),
};

/** POS barcode scan lookup — `GET /drugs/barcode/:barcode`. */
export function useBarcodeLookup() {
  return useMutation({
    mutationFn: (barcode: string) => api.get<Drug>(`/drugs/barcode/${encodeURIComponent(barcode)}`),
  });
}

const MAX_PAGE_SIZE = 100;

/**
 * Lists sales. The API contract has no `paymentMode` filter, so when one is
 * set we over-fetch up to `MAX_PAGE_SIZE` rows (server-sorted) and paginate
 * client-side over the filtered subset. This is a best-effort workaround
 * scoped to this file — see the report for the cross-scope API change that
 * would make this exact for datasets larger than `MAX_PAGE_SIZE`.
 */
export function useSalesList(params: SalesListParams) {
  const { paymentMode, ...rest } = params;
  const hasPaymentModeFilter = Boolean(paymentMode);

  const serverParams = hasPaymentModeFilter
    ? { ...rest, page: 1, pageSize: MAX_PAGE_SIZE }
    : rest;

  const query = useQuery({
    queryKey: ['sales', 'list', serverParams],
    queryFn: () => salesApi.list(serverParams),
    placeholderData: (previous) => previous,
  });

  if (!hasPaymentModeFilter || !query.data) {
    return query;
  }

  const filtered = query.data.data.filter((sale) => sale.paymentMode === paymentMode);
  const start = (params.page - 1) * params.pageSize;
  const page = filtered.slice(start, start + params.pageSize);

  return {
    ...query,
    data: { data: page, page: params.page, pageSize: params.pageSize, total: filtered.length },
  };
}

export function useSale(id: string | undefined) {
  return useQuery({
    queryKey: ['sales', 'detail', id],
    queryFn: () => salesApi.get(id ?? ''),
    enabled: Boolean(id),
  });
}

/** Creates a sale and invalidates every query whose numbers it can change. */
export function useCreateSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSaleInput) => salesApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sales'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['drugs'] });
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });
}
