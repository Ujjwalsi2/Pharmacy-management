import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/features/auth/useAuth';
import type { UnreadCount } from '@/types/api';

export const messagesApi = {
  unreadCount: () => api.get<UnreadCount>('/messages/unread-count'),
};

/** Polls the unread message count for the topbar bell badge. Only runs while authenticated. */
export function useUnreadMessageCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['messages', 'unread-count'],
    queryFn: messagesApi.unreadCount,
    enabled: Boolean(user),
    refetchInterval: 30_000,
  });
}
