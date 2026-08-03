import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, buildQueryString } from '@/lib/api';
import { useAuth } from '@/features/auth/useAuth';
import type { Company, Paginated } from '@/types/api';

export interface CompaniesListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
}

export interface CompanyInput {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
}

export type UpdateCompanyInput = Partial<CompanyInput>;

export const companiesApi = {
  list: (params: CompaniesListParams) =>
    api.get<Paginated<Company>>(
      `/companies${buildQueryString({
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        sort: params.sort,
      })}`,
    ),
  get: (id: string) => api.get<Company>(`/companies/${id}`),
  create: (input: CompanyInput) => api.post<Company>('/companies', input),
  update: (id: string, input: UpdateCompanyInput) => api.patch<Company>(`/companies/${id}`, input),
  remove: (id: string) => api.delete<void>(`/companies/${id}`),
};

export const companiesQueryKeys = {
  list: (params: CompaniesListParams) => ['companies', 'list', params] as const,
  detail: (id: string) => ['companies', 'detail', id] as const,
};

/** Full (unfiltered, large-pageSize) company list — used for filter dropdowns and pickers. */
export function useCompaniesAll() {
  const { user } = useAuth();
  return useQuery({
    queryKey: companiesQueryKeys.list({ page: 1, pageSize: 100, sort: 'name:asc' }),
    queryFn: () => companiesApi.list({ page: 1, pageSize: 100, sort: 'name:asc' }),
    enabled: Boolean(user),
    staleTime: 30_000,
  });
}

/** Paginated, searchable company list — backs the Companies directory page. */
export function useCompanies(params: CompaniesListParams) {
  return useQuery({
    queryKey: companiesQueryKeys.list(params),
    queryFn: () => companiesApi.list(params),
    placeholderData: (previous) => previous,
  });
}

export function useCompany(id: string | undefined) {
  return useQuery({
    queryKey: companiesQueryKeys.detail(id ?? ''),
    queryFn: () => companiesApi.get(id ?? ''),
    enabled: Boolean(id),
  });
}

function invalidateCompanyQueries(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['companies'] }),
    queryClient.invalidateQueries({ queryKey: ['drugs'] }),
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] }),
  ]);
}

export function useCreateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CompanyInput) => companiesApi.create(input),
    onSuccess: () => invalidateCompanyQueries(queryClient),
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCompanyInput }) => companiesApi.update(id, input),
    onSuccess: () => invalidateCompanyQueries(queryClient),
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => companiesApi.remove(id),
    onSuccess: () => invalidateCompanyQueries(queryClient),
  });
}
