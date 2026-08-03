import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as reportService from '../services/reportService.js';

export const reportsRouter = Router();

reportsRouter.use(requireAuth);

const salesReportQuery = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  groupBy: z.enum(['day', 'month']).optional()
});

reportsRouter.get('/sales', validate({ query: salesReportQuery }), async (req, res, next) => {
  try {
    const { from, to, groupBy } = req.query as z.infer<typeof salesReportQuery>;
    res.json(await reportService.getSalesReport({ from, to }, groupBy ?? 'day'));
  } catch (err) {
    next(err);
  }
});

const topDrugsQuery = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.string().optional()
});

reportsRouter.get('/top-drugs', validate({ query: topDrugsQuery }), async (req, res, next) => {
  try {
    const { from, to, limit } = req.query as z.infer<typeof topDrugsQuery>;
    const parsedLimit = Math.min(50, Math.max(1, Number.parseInt(limit ?? '5', 10) || 5));
    res.json(await reportService.getTopDrugsReport({ from, to }, parsedLimit));
  } catch (err) {
    next(err);
  }
});

reportsRouter.get('/inventory-value', async (_req, res, next) => {
  try {
    res.json(await reportService.getInventoryValueReport());
  } catch (err) {
    next(err);
  }
});
