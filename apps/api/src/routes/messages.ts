import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as messageService from '../services/messageService.js';

export const messagesRouter = Router();

messagesRouter.use(requireAuth);

const listQuerySchema = z.object({
  page: z.string().optional(),
  pageSize: z.string().optional(),
  box: z.enum(['inbox', 'sent']).optional()
});

messagesRouter.get('/unread-count', async (req, res, next) => {
  try {
    res.json(await messageService.unreadCount(req.user!.id));
  } catch (err) {
    next(err);
  }
});

messagesRouter.get('/', validate({ query: listQuerySchema }), async (req, res, next) => {
  try {
    res.json(await messageService.listMessages(req.user!.id, req.query as any));
  } catch (err) {
    next(err);
  }
});

const sendSchema = z.object({
  toUserId: z.string().min(1),
  body: z.string().min(1).max(2000)
});

messagesRouter.post('/', validate({ body: sendSchema }), async (req, res, next) => {
  try {
    const { toUserId, body } = req.body as z.infer<typeof sendSchema>;
    const message = await messageService.sendMessage(req.user!.id, toUserId, body);
    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
});

const idParamSchema = z.object({ id: z.string().min(1) });

messagesRouter.patch('/:id/read', validate({ params: idParamSchema }), async (req, res, next) => {
  try {
    res.json(await messageService.markMessageRead(req.user!.id, (req.params.id as string)));
  } catch (err) {
    next(err);
  }
});
