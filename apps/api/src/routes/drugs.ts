import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as drugService from '../services/drugService.js';

export const drugsRouter = Router();

drugsRouter.use(requireAuth);

const drugTypeEnum = z.enum(['TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'OINTMENT', 'DROPS', 'INHALER', 'OTHER']);
const statusEnum = z.enum(['EXPIRED', 'OUT_OF_STOCK', 'EXPIRING_SOON', 'LOW_STOCK', 'IN_STOCK']);

const listQuerySchema = z.object({
  page: z.string().optional(),
  pageSize: z.string().optional(),
  search: z.string().optional(),
  companyId: z.string().optional(),
  type: drugTypeEnum.optional(),
  status: statusEnum.optional(),
  sort: z.string().optional()
});

// Registered before "/:id" so "alerts" and "barcode/:barcode" are not
// swallowed by the generic id route.
drugsRouter.get('/alerts', async (_req, res, next) => {
  try {
    res.json(await drugService.getAlerts());
  } catch (err) {
    next(err);
  }
});

drugsRouter.get('/barcode/:barcode', async (req, res, next) => {
  try {
    res.json(await drugService.getDrugByBarcode((req.params.barcode as string)));
  } catch (err) {
    next(err);
  }
});

drugsRouter.get('/', validate({ query: listQuerySchema }), async (req, res, next) => {
  try {
    const query = req.query as z.infer<typeof listQuerySchema>;
    res.json(await drugService.listDrugs(query));
  } catch (err) {
    next(err);
  }
});

const drugSchema = z.object({
  name: z.string().min(1),
  barcode: z.string().min(1),
  type: drugTypeEnum,
  dose: z.string().optional(),
  code: z.string().optional(),
  costPrice: z.number().nonnegative(),
  sellingPrice: z.number().nonnegative(),
  companyId: z.string().min(1),
  productionDate: z.string().min(1),
  expirationDate: z.string().min(1),
  place: z.string().optional(),
  quantity: z.number().int().nonnegative().optional(),
  reorderLevel: z.number().int().nonnegative().optional()
});

drugsRouter.post('/', requireRole('ADMIN'), validate({ body: drugSchema }), async (req, res, next) => {
  try {
    res.status(201).json(await drugService.createDrug(req.body));
  } catch (err) {
    next(err);
  }
});

const idParamSchema = z.object({ id: z.string().min(1) });

drugsRouter.get('/:id', validate({ params: idParamSchema }), async (req, res, next) => {
  try {
    res.json(await drugService.getDrug((req.params.id as string)));
  } catch (err) {
    next(err);
  }
});

const updateSchema = drugSchema.partial();

drugsRouter.patch(
  '/:id',
  requireRole('ADMIN'),
  validate({ params: idParamSchema, body: updateSchema }),
  async (req, res, next) => {
    try {
      res.json(await drugService.updateDrug((req.params.id as string), req.body));
    } catch (err) {
      next(err);
    }
  }
);

drugsRouter.delete(
  '/:id',
  requireRole('ADMIN'),
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      await drugService.deleteDrug((req.params.id as string));
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
);
