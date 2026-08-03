import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, buildQueryString } from '@/lib/api';
import { useAuth } from '@/features/auth/useAuth';
import type { Drug, DrugAlerts, DrugStatus, DrugType, Paginated } from '@/types/api';

export interface DrugsListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  companyId?: string;
  type?: DrugType | '';
  status?: DrugStatus | '';
  sort?: string;
}

export interface DrugInput {
  name: string;
  barcode: string;
  type: DrugType;
  dose?: string;
  code?: string;
  costPrice: number;
  sellingPrice: number;
  companyId: string;
  productionDate: string;
  expirationDate: string;
  place?: string;
  quantity?: number;
  reorderLevel?: number;
}

export type UpdateDrugInput = Partial<DrugInput>;

export const drugsApi = {
  search: (search: string) =>
    api.get<Paginated<Drug>>(`/drugs${buildQueryString({ search, pageSize: 8 })}`),
  list: (params: DrugsListParams) =>
    api.get<Paginated<Drug>>(
      `/drugs${buildQueryString({
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        companyId: params.companyId || undefined,
        type: params.type || undefined,
        status: params.status || undefined,
        sort: params.sort,
      })}`,
    ),
  get: (id: string) => api.get<Drug>(`/drugs/${id}`),
  alerts: () => api.get<DrugAlerts>('/drugs/alerts'),
  create: (input: DrugInput) => api.post<Drug>('/drugs', input),
  update: (id: string, input: UpdateDrugInput) => api.patch<Drug>(`/drugs/${id}`, input),
  remove: (id: string) => api.delete<void>(`/drugs/${id}`),
};

export const drugsQueryKeys = {
  list: (params: DrugsListParams) => ['drugs', 'list', params] as const,
  detail: (id: string) => ['drugs', 'detail', id] as const,
  alerts: () => ['drugs', 'alerts'] as const,
};

/** Debounced-by-caller drug search, used by the command palette (⌘K) and POS scan lookups. */
export function useDrugSearch(search: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['drugs', 'search', search],
    queryFn: () => drugsApi.search(search),
    enabled: Boolean(user) && search.trim().length > 0,
    staleTime: 15_000,
  });
}

/** Paginated, filterable drug catalog list — backs the Inventory table. */
export function useDrugs(params: DrugsListParams) {
  return useQuery({
    queryKey: drugsQueryKeys.list(params),
    queryFn: () => drugsApi.list(params),
    placeholderData: (previous) => previous,
  });
}

/** A single drug by id — backs the drug detail page. */
export function useDrug(id: string | undefined) {
  return useQuery({
    queryKey: drugsQueryKeys.detail(id ?? ''),
    queryFn: () => drugsApi.get(id ?? ''),
    enabled: Boolean(id),
  });
}

/** Low-stock / expiring-soon / expired alert buckets, driving the Inventory summary strip. */
export function useDrugAlerts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: drugsQueryKeys.alerts(),
    queryFn: drugsApi.alerts,
    enabled: Boolean(user),
    staleTime: 15_000,
  });
}

function invalidateDrugQueries(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['drugs'] }),
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] }),
  ]);
}

export function useCreateDrug() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DrugInput) => drugsApi.create(input),
    onSuccess: () => invalidateDrugQueries(queryClient),
  });
}

export function useUpdateDrug() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateDrugInput }) => drugsApi.update(id, input),
    onSuccess: () => invalidateDrugQueries(queryClient),
  });
}

export function useDeleteDrug() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => drugsApi.remove(id),
    onSuccess: () => invalidateDrugQueries(queryClient),
  });
}
