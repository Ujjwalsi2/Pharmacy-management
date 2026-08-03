import { useQuery } from '@tanstack/react-query';
import { api, buildQueryString } from '@/lib/api';
import { useAuth } from '@/features/auth/useAuth';
import type { Drug, Paginated } from '@/types/api';

export const drugsApi = {
  search: (search: string) =>
    api.get<Paginated<Drug>>(`/drugs${buildQueryString({ search, pageSize: 8 })}`),
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
