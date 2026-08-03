import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDebounce } from './useDebounce';

export type SortDirection = 'asc' | 'desc';

export interface ListQueryState {
  page: number;
  pageSize: number;
  search: string;
  sort: string | null;
  sortField: string | null;
  sortDirection: SortDirection | null;
}

export interface ListQueryParams {
  page: number;
  pageSize: number;
  search: string | undefined;
  sort: string | undefined;
}

export interface UseListQueryResult {
  /** Raw state synced to the URL (search is NOT debounced here). */
  state: ListQueryState;
  /** Debounced (300ms) search + the rest of state — pass straight into a query key/params. */
  params: ListQueryParams;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setSearch: (search: string) => void;
  /** Toggles sort direction on repeated clicks of the same field; resets page to 1. */
  toggleSort: (field: string) => void;
  reset: () => void;
}

export interface UseListQueryOptions {
  defaultPageSize?: number;
  defaultSort?: string;
  debounceMs?: number;
}

/**
 * Manages page/pageSize/search/sort state synced to URL search params
 * (`page`, `pageSize`, `q`, `sort`). Feature pages should build their
 * `GET /resource` query params from `params` and pass `state`/setters to
 * `SearchInput`, `Pagination`, and `Table`'s sortable headers.
 */
export function useListQuery(options: UseListQueryOptions = {}): UseListQueryResult {
  const { defaultPageSize = 20, defaultSort, debounceMs = 300 } = options;
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Number(searchParams.get('page') ?? '1') || 1;
  const pageSize = Number(searchParams.get('pageSize') ?? String(defaultPageSize)) || defaultPageSize;
  const search = searchParams.get('q') ?? '';
  const sort = searchParams.get('sort') ?? defaultSort ?? null;

  const debouncedSearch = useDebounce(search, debounceMs);

  const [sortField, sortDirection] = useMemo((): [string | null, SortDirection | null] => {
    if (!sort) return [null, null];
    const [field, dir] = sort.split(':');
    return [field ?? null, dir === 'asc' || dir === 'desc' ? dir : 'asc'];
  }, [sort]);

  const update = useCallback(
    (patch: Record<string, string | number | null>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(patch)) {
            if (value === null || value === '') {
              next.delete(key);
            } else {
              next.set(key, String(value));
            }
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setPage = useCallback((next: number) => update({ page: next > 1 ? next : null }), [update]);

  const setPageSize = useCallback(
    (next: number) => update({ pageSize: next !== defaultPageSize ? next : null, page: null }),
    [update, defaultPageSize],
  );

  const setSearch = useCallback((next: string) => update({ q: next || null, page: null }), [update]);

  const toggleSort = useCallback(
    (field: string) => {
      const [currentField, currentDir] = sort ? sort.split(':') : [null, null];
      let nextSort: string | null;
      if (currentField !== field) {
        nextSort = `${field}:asc`;
      } else if (currentDir === 'asc') {
        nextSort = `${field}:desc`;
      } else {
        nextSort = defaultSort ?? null;
      }
      update({ sort: nextSort, page: null });
    },
    [sort, update, defaultSort],
  );

  const reset = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  return {
    state: { page, pageSize, search, sort, sortField, sortDirection },
    params: {
      page,
      pageSize,
      search: debouncedSearch || undefined,
      sort: sort ?? undefined,
    },
    setPage,
    setPageSize,
    setSearch,
    toggleSort,
    reset,
  };
}
