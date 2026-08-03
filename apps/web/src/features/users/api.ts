import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, buildQueryString } from '@/lib/api';
import type { Paginated, Role, User } from '@/types/api';

export interface UsersListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: Role | '';
  active?: 'true' | 'false' | '';
  sort?: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: Role;
  phone?: string;
  address?: string;
  dob?: string;
  salary?: number;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
  role?: Role;
  phone?: string;
  address?: string;
  dob?: string;
  salary?: number;
  active?: boolean;
}

export const usersApi = {
  list: (params: UsersListParams) =>
    api.get<Paginated<User>>(
      `/users${buildQueryString({
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        role: params.role || undefined,
        active: params.active || undefined,
        sort: params.sort,
      })}`,
    ),
  get: (id: string) => api.get<User>(`/users/${id}`),
  create: (input: CreateUserInput) => api.post<User>('/users', input),
  update: (id: string, input: UpdateUserInput) => api.patch<User>(`/users/${id}`, input),
  deactivate: (id: string) => api.delete<User>(`/users/${id}`),
};

export const usersQueryKeys = {
  list: (params: UsersListParams) => ['users', 'list', params] as const,
  detail: (id: string) => ['users', 'detail', id] as const,
};

export function useUsers(params: UsersListParams) {
  return useQuery({
    queryKey: usersQueryKeys.list(params),
    queryFn: () => usersApi.list(params),
    placeholderData: (previous) => previous,
  });
}

/** Fetches the full (unfiltered) active/inactive user set for the header summary stats. */
export function useUsersSummary() {
  return useQuery({
    queryKey: ['users', 'summary'],
    queryFn: () => usersApi.list({ page: 1, pageSize: 100 }),
    staleTime: 15_000,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => usersApi.create(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserInput }) => usersApi.update(id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
    },
  });
}

export function useSetUserActive() {
  const queryClient = useQueryClient();
  return useMutation({
    // Deactivating goes through DELETE /users/:id (soft delete; enforces the
    // "cannot deactivate your own account" 409). Reactivating goes through
    // PATCH /users/:id with active: true, since DELETE only ever sets it false.
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      active ? usersApi.update(id, { active: true }) : usersApi.deactivate(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
    },
  });
}
