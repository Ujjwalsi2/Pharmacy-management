import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as saleService from '../services/saleService.js';

export const salesRouter = Router();

salesRouter.use(requireAuth);

const listQuerySchema = z.object({
  page: z.string().optional(),
  pageSize: z.string().optional(),
  search: z.string().optional(),
  userId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  sort: z.string().optional()
});

salesRouter.get('/', validate({ query: listQuerySchema }), async (req, res, next) => {
  try {
    res.json(await saleService.listSales(req.query as any, req.user!));
  } catch (err) {
    next(err);
  }
});

const saleSchema = z.object({
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  paymentMode: z.enum(['CASH', 'CARD', 'UPI']),
  discount: z.number().nonnegative().optional(),
  taxRate: z.number().nonnegative().optional(),
  items: z
    .array(
      z.object({
        drugId: z.string().min(1),
        quantity: z.number().int().positive()
      })
    )
    .min(1)
});

salesRouter.post('/', validate({ body: saleSchema }), async (req, res, next) => {
  try {
    const sale = await saleService.createSale(req.user!.id, req.body);
    res.status(201).json(sale);
  } catch (err) {
    next(err);
  }
});

const idParamSchema = z.object({ id: z.string().min(1) });

salesRouter.get('/:id', validate({ params: idParamSchema }), async (req, res, next) => {
  try {
    res.json(await saleService.getSale((req.params.id as string), req.user!));
  } catch (err) {
    next(err);
  }
});
