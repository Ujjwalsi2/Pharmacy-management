import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as companyService from '../services/companyService.js';

export const companiesRouter = Router();

companiesRouter.use(requireAuth);

const listQuerySchema = z.object({
  page: z.string().optional(),
  pageSize: z.string().optional(),
  search: z.string().optional(),
  sort: z.string().optional()
});

companiesRouter.get('/', validate({ query: listQuerySchema }), async (req, res, next) => {
  try {
    const query = req.query as z.infer<typeof listQuerySchema>;
    res.json(await companyService.listCompanies(query));
  } catch (err) {
    next(err);
  }
});

const companySchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional()
});

companiesRouter.post('/', requireRole('ADMIN'), validate({ body: companySchema }), async (req, res, next) => {
  try {
    res.status(201).json(await companyService.createCompany(req.body));
  } catch (err) {
    next(err);
  }
});

const idParamSchema = z.object({ id: z.string().min(1) });

companiesRouter.get('/:id', validate({ params: idParamSchema }), async (req, res, next) => {
  try {
    res.json(await companyService.getCompany((req.params.id as string)));
  } catch (err) {
    next(err);
  }
});

const updateSchema = companySchema.partial();

companiesRouter.patch(
  '/:id',
  requireRole('ADMIN'),
  validate({ params: idParamSchema, body: updateSchema }),
  async (req, res, next) => {
    try {
      res.json(await companyService.updateCompany((req.params.id as string), req.body));
    } catch (err) {
      next(err);
    }
  }
);

companiesRouter.delete(
  '/:id',
  requireRole('ADMIN'),
  validate({ params: idParamSchema }),
  async (req, res, next) => {
    try {
      await companyService.deleteCompany((req.params.id as string));
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
);
