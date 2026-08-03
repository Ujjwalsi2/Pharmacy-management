import { prisma } from '../prisma.js';
import { AppError } from '../lib/errors.js';
import { parsePagination, toSkipTake, buildListEnvelope } from '../lib/pagination.js';

const messageInclude = {
  fromUser: { select: { id: true, name: true } },
  toUser: { select: { id: true, name: true } }
} as const;

function toMessageDto(message: {
  id: string;
  fromUser: { id: string; name: string };
  toUser: { id: string; name: string };
  body: string;
  readAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: message.id,
    fromUser: message.fromUser,
    toUser: message.toUser,
    body: message.body,
    readAt: message.readAt,
    createdAt: message.createdAt
  };
}

export interface ListMessagesQuery {
  page?: string;
  pageSize?: string;
  box?: 'inbox' | 'sent';
}

export async function listMessages(userId: string, query: ListMessagesQuery) {
  const pagination = parsePagination(query);
  const box = query.box === 'sent' ? 'sent' : 'inbox';
  const where = box === 'sent' ? { fromUserId: userId } : { toUserId: userId };

  const [rows, total] = await Promise.all([
    prisma.message.findMany({
      where,
      include: messageInclude,
      orderBy: { createdAt: 'desc' },
      ...toSkipTake(pagination)
    }),
    prisma.message.count({ where })
  ]);

  return buildListEnvelope(rows.map(toMessageDto), total, pagination);
}

export async function sendMessage(fromUserId: string, toUserId: string, body: string) {
  const recipient = await prisma.user.findUnique({ where: { id: toUserId } });
  if (!recipient) throw AppError.validation('Unknown toUserId');

  const message = await prisma.message.create({
    data: { fromUserId, toUserId, body },
    include: messageInclude
  });
  return toMessageDto(message);
}

export async function markMessageRead(userId: string, id: string) {
  const message = await prisma.message.findUnique({ where: { id } });
  if (!message) throw AppError.notFound('Message not found');
  if (message.toUserId !== userId) {
    throw AppError.forbidden('You may only mark your own received messages as read');
  }
  const updated = await prisma.message.update({
    where: { id },
    data: { readAt: message.readAt ?? new Date() },
    include: messageInclude
  });
  return toMessageDto(updated);
}

export async function unreadCount(userId: string) {
  const count = await prisma.message.count({ where: { toUserId: userId, readAt: null } });
  return { count };
}
