import { api } from '@/lib/api';
import type { User } from '@/types/api';

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export const authApi = {
  login: (input: LoginInput) => api.post<LoginResponse>('/auth/login', input, { skipAuthRetry: true }),
  refresh: () => api.post<LoginResponse>('/auth/refresh', undefined, { skipAuthRetry: true }),
  logout: () => api.post<void>('/auth/logout'),
  me: () => api.get<User>('/auth/me'),
  changePassword: (input: ChangePasswordInput) => api.patch<void>('/auth/password', input),
};
