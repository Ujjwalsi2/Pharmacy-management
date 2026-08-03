import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as purchaseService from '../services/purchaseService.js';

export const purchasesRouter = Router();

purchasesRouter.use(requireAuth);

const listQuerySchema = z.object({
  page: z.string().optional(),
  pageSize: z.string().optional(),
  search: z.string().optional(),
  companyId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  sort: z.string().optional()
});

purchasesRouter.get('/', validate({ query: listQuerySchema }), async (req, res, next) => {
  try {
    res.json(await purchaseService.listPurchases(req.query as any));
  } catch (err) {
    next(err);
  }
});

const purchaseSchema = z.object({
  companyId: z.string().min(1),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        drugId: z.string().min(1),
        quantity: z.number().int().positive(),
        unitCost: z.number().nonnegative()
      })
    )
    .min(1)
});

purchasesRouter.post('/', requireRole('ADMIN'), validate({ body: purchaseSchema }), async (req, res, next) => {
  try {
    const purchase = await purchaseService.createPurchase(req.user!.id, req.body);
    res.status(201).json(purchase);
  } catch (err) {
    next(err);
  }
});

const idParamSchema = z.object({ id: z.string().min(1) });

purchasesRouter.get('/:id', validate({ params: idParamSchema }), async (req, res, next) => {
  try {
    res.json(await purchaseService.getPurchase((req.params.id as string)));
  } catch (err) {
    next(err);
  }
});
