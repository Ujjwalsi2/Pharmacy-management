import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, Inbox, Mail, MailOpen, PenSquare, Send } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SearchInput } from '@/components/ui/SearchInput';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { cn } from '@/lib/cn';
import { formatDateTime, formatRelative } from '@/lib/format';
import type { Message } from '@/types/api';
import { ComposeMessageModal } from '@/features/messages/ComposeMessageModal';
import { useMarkMessageRead, useMessages } from '@/features/messages/api';
import type { MessageBox } from '@/features/messages/api';

function ListSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton key={index} className="h-16 w-full" />
      ))}
    </div>
  );
}

function matchesSearch(message: Message, query: string): boolean {
  if (!query) return true;
  const haystack = `${message.fromUser.name} ${message.toUser.name} ${message.body}`.toLowerCase();
  return haystack.includes(query.toLowerCase());
}

export default function MessagesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const box: MessageBox = searchParams.get('box') === 'sent' ? 'sent' : 'inbox';

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showDetailOnMobile, setShowDetailOnMobile] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useMessages(box);
  const markRead = useMarkMessageRead();

  const composeToParam = searchParams.get('to');
  const shouldAutoCompose = searchParams.get('compose') === '1';

  useEffect(() => {
    if (shouldAutoCompose) {
      setComposeOpen(true);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('compose');
          return next;
        },
        { replace: true },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldAutoCompose]);

  const messages = useMemo(() => {
    const rows = data?.data ?? [];
    return rows.filter((message) => matchesSearch(message, search));
  }, [data, search]);

  const selected = messages.find((message) => message.id === selectedId) ?? null;

  function setBox(nextBox: MessageBox) {
    setSelectedId(null);
    setShowDetailOnMobile(false);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (nextBox === 'inbox') next.delete('box');
        else next.set('box', nextBox);
        return next;
      },
      { replace: true },
    );
  }

  function selectMessage(message: Message) {
    setSelectedId(message.id);
    setShowDetailOnMobile(true);
    if (box === 'inbox' && !message.readAt) {
      markRead.mutate(message.id);
    }
  }

  const hasFilters = search.trim().length > 0;

  return (
    <>
      <PageHeader
        title="Messages"
        description="Internal notes between staff and admins."
        actions={
          <Button onClick={() => setComposeOpen(true)} leftIcon={<PenSquare className="h-4 w-4" aria-hidden="true" />}>
            Compose
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] lg:divide-x lg:divide-border">
          <div className={cn('flex flex-col border-b border-border lg:border-b-0', showDetailOnMobile && 'hidden lg:flex')}>
            <div className="flex flex-col gap-3 border-b border-border p-4">
              <Tabs defaultValue={box} value={box} onValueChange={(value) => setBox(value as MessageBox)}>
                <TabsList>
                  <TabsTrigger value="inbox">Inbox</TabsTrigger>
                  <TabsTrigger value="sent">Sent</TabsTrigger>
                </TabsList>
              </Tabs>
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search messages…"
                aria-label="Search messages"
              />
            </div>

            <div className="max-h-[60vh] overflow-y-auto lg:max-h-[calc(100vh-20rem)]">
              {isLoading ? (
                <ListSkeleton />
              ) : isError ? (
                <ErrorState onRetry={() => void refetch()} description="We could not load your messages." />
              ) : messages.length === 0 ? (
                <EmptyState
                  icon={box === 'inbox' ? <Inbox className="h-6 w-6" aria-hidden="true" /> : <Send className="h-6 w-6" aria-hidden="true" />}
                  title={
                    hasFilters
                      ? 'No messages match your search'
                      : box === 'inbox'
                        ? 'Your inbox is empty'
                        : 'You have not sent any messages'
                  }
                  description={
                    hasFilters
                      ? 'Try a different search term.'
                      : box === 'inbox'
                        ? 'Messages from your teammates will show up here.'
                        : 'Compose a message to a teammate to get started.'
                  }
                />
              ) : (
                <ul>
                  {messages.map((message) => {
                    const isUnread = box === 'inbox' && !message.readAt;
                    const counterparty = box === 'inbox' ? message.fromUser : message.toUser;
                    return (
                      <li key={message.id}>
                        <button
                          type="button"
                          onClick={() => selectMessage(message)}
                          aria-current={selected?.id === message.id}
                          className={cn(
                            'flex w-full flex-col gap-1 border-b border-border px-4 py-3 text-left transition-colors duration-150 ease-out hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
                            selected?.id === message.id && 'bg-surface-muted',
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className={cn('flex items-center gap-2 text-sm', isUnread ? 'font-semibold text-fg' : 'font-medium text-fg')}>
                              {isUnread && (
                                <span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                              )}
                              {counterparty.name}
                            </span>
                            <span className="shrink-0 text-xs text-fg-muted">{formatRelative(message.createdAt)}</span>
                          </div>
                          <p className={cn('line-clamp-1 text-sm', isUnread ? 'text-fg' : 'text-fg-muted')}>{message.body}</p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className={cn('flex min-h-[50vh] flex-col lg:min-h-[calc(100vh-20rem)]', !showDetailOnMobile && 'hidden lg:flex')}>
            {selected ? (
              <div className="flex h-full flex-col">
                <div className="flex items-center gap-3 border-b border-border p-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Back to message list"
                    className="lg:hidden"
                    onClick={() => setShowDetailOnMobile(false)}
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-fg">
                      {box === 'inbox' ? `From ${selected.fromUser.name}` : `To ${selected.toUser.name}`}
                    </p>
                    <p className="text-xs text-fg-muted">
                      {formatDateTime(selected.createdAt)} · {formatRelative(selected.createdAt)}
                    </p>
                  </div>
                  {box === 'inbox' && (
                    <Badge variant={selected.readAt ? 'neutral' : 'info'} className="gap-1">
                      {selected.readAt ? (
                        <>
                          <MailOpen className="h-3 w-3" aria-hidden="true" /> Read
                        </>
                      ) : (
                        <>
                          <Mail className="h-3 w-3" aria-hidden="true" /> Unread
                        </>
                      )}
                    </Badge>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-5">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-fg">{selected.body}</p>
                </div>
                {box === 'inbox' && selected.readAt && (
                  <p className="border-t border-border px-5 py-3 text-xs text-fg-muted">
                    Read {formatRelative(selected.readAt)}
                  </p>
                )}
              </div>
            ) : (
              <EmptyState
                icon={<Mail className="h-6 w-6" aria-hidden="true" />}
                title="No message selected"
                description="Choose a message from the list to read it here."
                className="m-auto"
              />
            )}
          </div>
        </div>
      </Card>

      <ComposeMessageModal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        defaultRecipientId={composeToParam ?? undefined}
        onSent={() => setBox('sent')}
      />
    </>
  );
}
