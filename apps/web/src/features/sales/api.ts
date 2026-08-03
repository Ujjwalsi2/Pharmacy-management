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
  paymentMode?: PaymentMode | '';
  /** Lets the whole object be passed straight to `buildQueryString`. */
  [key: string]: string | number | undefined;
}

export const salesApi = {
  list: (params: SalesListParams) =>
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

/** Lists sales via `GET /sales`, which filters and paginates server-side. */
export function useSalesList(params: SalesListParams) {
  return useQuery({
    queryKey: ['sales', 'list', params],
    queryFn: () => salesApi.list(params),
    placeholderData: (previous) => previous,
  });
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
