import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as userService from '../services/userService.js';

export const usersRouter = Router();

usersRouter.use(requireAuth);

const listQuerySchema = z.object({
  page: z.string().optional(),
  pageSize: z.string().optional(),
  search: z.string().optional(),
  role: z.enum(['ADMIN', 'PHARMACIST']).optional(),
  active: z.string().optional(),
  sort: z.string().optional()
});

usersRouter.get('/', validate({ query: listQuerySchema }), async (req, res, next) => {
  try {
    const result = await userService.listUsers(req.query as any, req.user!.role);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'PHARMACIST']),
  phone: z.string().optional(),
  address: z.string().optional(),
  dob: z.string().optional(),
  salary: z.number().optional()
});

usersRouter.post('/', requireRole('ADMIN'), validate({ body: createSchema }), async (req, res, next) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

const idParamSchema = z.object({ id: z.string().min(1) });

usersRouter.get('/:id', validate({ params: idParamSchema }), async (req, res, next) => {
  try {
    const user = await userService.getUser((req.params.id as string));
    res.json(user);
  } catch (err) {
    next(err);
  }
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['ADMIN', 'PHARMACIST']).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  dob: z.string().optional(),
  salary: z.number().optional(),
  active: z.boolean().optional()
});

usersRouter.patch(
  '/:id',
  requireRole('ADMIN'),
  validate({ params: idParamSchema, body: updateSchema }),
  async (req, res, next) => {
    try {
      const user = await userService.updateUser((req.params.id as string), req.body);
      res.json(user);
    } catch (err) {
      next(err);
    }
  }
);

usersRouter.delete(
  '/:id',
  requireRole('ADMIN'),
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      const user = await userService.deleteUser((req.params.id as string), req.user!.id);
      res.json(user);
    } catch (err) {
      next(err);
    }
  }
);
