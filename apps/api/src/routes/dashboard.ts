import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getDashboardSummary } from '../services/dashboardService.js';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get('/summary', async (_req, res, next) => {
  try {
    res.json(await getDashboardSummary());
  } catch (err) {
    next(err);
  }
});
