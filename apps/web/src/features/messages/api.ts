import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, buildQueryString } from '@/lib/api';
import { useAuth } from '@/features/auth/useAuth';
import type { Message, Paginated, UnreadCount, User, UserSummary } from '@/types/api';

export type MessageBox = 'inbox' | 'sent';

export interface SendMessageInput {
  toUserId: string;
  body: string;
}

export const messagesApi = {
  unreadCount: () => api.get<UnreadCount>('/messages/unread-count'),
  list: (box: MessageBox) =>
    api.get<Paginated<Message>>(`/messages${buildQueryString({ box, pageSize: 100 })}`),
  send: (input: SendMessageInput) => api.post<Message>('/messages', input),
  markRead: (id: string) => api.patch<Message>(`/messages/${id}/read`),
  /**
   * Recipient picker source. `GET /users` returns the reduced
   * `{ id, name, email, role }` shape to PHARMACIST callers and the full
   * `User` shape to ADMIN callers — both are structurally `UserSummary`.
   */
  recipients: () => api.get<Paginated<User | UserSummary>>(`/users${buildQueryString({ pageSize: 100 })}`),
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

/** Lists the current user's inbox or sent messages. */
export function useMessages(box: MessageBox) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['messages', 'list', box],
    queryFn: () => messagesApi.list(box),
    enabled: Boolean(user),
  });
}

/** Users available as message recipients, excluding the current user. */
export function useMessageRecipients() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['messages', 'recipients'],
    queryFn: messagesApi.recipients,
    enabled: Boolean(user),
    select: (data) => data.data.filter((candidate) => candidate.id !== user?.id),
    staleTime: 30_000,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SendMessageInput) => messagesApi.send(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['messages', 'list'] });
      await queryClient.invalidateQueries({ queryKey: ['messages', 'unread-count'] });
    },
  });
}

export function useMarkMessageRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => messagesApi.markRead(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['messages', 'list'] });
      await queryClient.invalidateQueries({ queryKey: ['messages', 'unread-count'] });
    },
  });
}
