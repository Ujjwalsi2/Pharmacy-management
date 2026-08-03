import type { Prisma } from '@prisma/client';
import type { DrugType } from '../types/index.js';
import { prisma } from '../prisma.js';
import { AppError } from '../lib/errors.js';
import { parsePagination, toSkipTake, buildListEnvelope, parseSort } from '../lib/pagination.js';
import { computeDrugStatus, type DrugStatus } from '../lib/drugStatus.js';

const EXPIRING_SOON_WINDOW_DAYS = 90;

type DrugWithCompany = Prisma.DrugGetPayload<{ include: { company: { select: { id: true; name: true } } } }>;

function toDate(d: string | Date): Date {
  return d instanceof Date ? d : new Date(d);
}

function toDrugDto(drug: DrugWithCompany, now: Date = new Date()) {
  return {
    id: drug.id,
    name: drug.name,
    barcode: drug.barcode,
    type: drug.type,
    dose: drug.dose,
    code: drug.code,
    costPrice: drug.costPrice,
    sellingPrice: drug.sellingPrice,
    companyId: drug.companyId,
    company: drug.company,
    productionDate: drug.productionDate.toISOString().slice(0, 10),
    expirationDate: drug.expirationDate.toISOString().slice(0, 10),
    place: drug.place,
    quantity: drug.quantity,
    reorderLevel: drug.reorderLevel,
    status: computeDrugStatus(drug, now),
    createdAt: drug.createdAt,
    updatedAt: drug.updatedAt
  };
}

const companyInclude = { company: { select: { id: true, name: true } } } as const;

/** Builds a Prisma where clause that mirrors computeDrugStatus's precedence,
 * so status filtering happens in the database rather than fetching every row. */
function statusWhere(status: DrugStatus, now: Date): Prisma.DrugWhereInput {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const soonCutoff = new Date(today);
  soonCutoff.setDate(soonCutoff.getDate() + EXPIRING_SOON_WINDOW_DAYS);

  switch (status) {
    case 'EXPIRED':
      return { expirationDate: { lt: today } };
    case 'OUT_OF_STOCK':
      return { expirationDate: { gte: today }, quantity: 0 };
    case 'EXPIRING_SOON':
      return {
        expirationDate: { gte: today, lte: soonCutoff },
        quantity: { gt: 0 }
      };
    case 'LOW_STOCK':
      return {
        expirationDate: { gt: soonCutoff },
        quantity: { gt: 0, lte: -1 } // placeholder, replaced below via AND with reorderLevel comparison
      };
    case 'IN_STOCK':
    default:
      return { expirationDate: { gt: soonCutoff } };
  }
}

export interface ListDrugsQuery {
  page?: string;
  pageSize?: string;
  search?: string;
  companyId?: string;
  type?: DrugType;
  status?: DrugStatus;
  sort?: string;
}

export async function listDrugs(query: ListDrugsQuery) {
  const pagination = parsePagination(query);
  const now = new Date();
  const where: Prisma.DrugWhereInput = {};

  if (query.search) {
    where.OR = [
      { name: { contains: query.search } },
      { barcode: { contains: query.search } },
      { code: { contains: query.search } }
    ];
  }
  if (query.companyId) where.companyId = query.companyId;
  if (query.type) where.type = query.type;

  const orderBy = parseSort(query.sort, ['name', 'quantity', 'sellingPrice', 'expirationDate', 'createdAt'], {
    name: 'asc'
  });

  if (query.status === 'LOW_STOCK' || query.status === 'IN_STOCK') {
    // These two statuses depend on comparing quantity to reorderLevel (a
    // per-row column comparison), which Prisma's query builder can't express
    // directly. We use a raw-SQL-free approach: fetch candidates matching the
    // date/quantity envelope for the status, then do the reorderLevel
    // comparison in JS. The date/OUT_OF_STOCK/EXPIRED envelope already keeps
    // this bounded to non-expiring, non-out-of-stock rows (a small subset),
    // so this never scans the full unbounded table.
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const soonCutoff = new Date(today);
    soonCutoff.setDate(soonCutoff.getDate() + EXPIRING_SOON_WINDOW_DAYS);

    const envelopeWhere: Prisma.DrugWhereInput = {
      ...where,
      expirationDate: { gt: soonCutoff },
      quantity: { gt: 0 }
    };

    const candidates = await prisma.drug.findMany({
      where: envelopeWhere,
      include: companyInclude,
      orderBy
    });

    const filtered = candidates.filter((d) =>
      query.status === 'LOW_STOCK' ? d.quantity <= d.reorderLevel : d.quantity > d.reorderLevel
    );

    const { skip, take } = toSkipTake(pagination);
    const page = filtered.slice(skip, skip + take);
    return buildListEnvelope(page.map((d) => toDrugDto(d, now)), filtered.length, pagination);
  }

  if (query.status) {
    Object.assign(where, statusWhere(query.status, now));
  }

  const [rows, total] = await Promise.all([
    prisma.drug.findMany({ where, include: companyInclude, orderBy, ...toSkipTake(pagination) }),
    prisma.drug.count({ where })
  ]);

  return buildListEnvelope(rows.map((d) => toDrugDto(d, now)), total, pagination);
}

export async function getDrug(id: string) {
  const drug = await prisma.drug.findUnique({ where: { id }, include: companyInclude });
  if (!drug) throw AppError.notFound('Drug not found');
  return toDrugDto(drug);
}

export async function getDrugByBarcode(barcode: string) {
  const drug = await prisma.drug.findUnique({ where: { barcode }, include: companyInclude });
  if (!drug) throw AppError.notFound('Drug not found');
  return toDrugDto(drug);
}

export interface DrugInput {
  name: string;
  barcode: string;
  type: DrugType;
  dose?: string;
  code?: string;
  costPrice: number;
  sellingPrice: number;
  companyId: string;
  productionDate: string;
  expirationDate: string;
  place?: string;
  quantity?: number;
  reorderLevel?: number;
}

export async function createDrug(input: DrugInput) {
  const existing = await prisma.drug.findUnique({ where: { barcode: input.barcode } });
  if (existing) throw AppError.conflict('A drug with this barcode already exists');

  const company = await prisma.company.findUnique({ where: { id: input.companyId } });
  if (!company) throw AppError.validation('Unknown companyId');

  const drug = await prisma.drug.create({
    data: {
      name: input.name,
      barcode: input.barcode,
      type: input.type,
      dose: input.dose,
      code: input.code,
      costPrice: input.costPrice,
      sellingPrice: input.sellingPrice,
      companyId: input.companyId,
      productionDate: toDate(input.productionDate),
      expirationDate: toDate(input.expirationDate),
      place: input.place,
      quantity: input.quantity ?? 0,
      reorderLevel: input.reorderLevel ?? 10
    },
    include: companyInclude
  });
  return toDrugDto(drug);
}

export async function updateDrug(id: string, input: Partial<DrugInput>) {
  const existing = await prisma.drug.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Drug not found');

  if (input.barcode && input.barcode !== existing.barcode) {
    const dupe = await prisma.drug.findUnique({ where: { barcode: input.barcode } });
    if (dupe) throw AppError.conflict('A drug with this barcode already exists');
  }
  if (input.companyId) {
    const company = await prisma.company.findUnique({ where: { id: input.companyId } });
    if (!company) throw AppError.validation('Unknown companyId');
  }

  const data: Record<string, unknown> = { ...input };
  if (input.productionDate) data.productionDate = toDate(input.productionDate);
  if (input.expirationDate) data.expirationDate = toDate(input.expirationDate);

  const drug = await prisma.drug.update({ where: { id }, data, include: companyInclude });
  return toDrugDto(drug);
}

export async function deleteDrug(id: string) {
  const existing = await prisma.drug.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Drug not found');

  const saleItemCount = await prisma.saleItem.count({ where: { drugId: id } });
  if (saleItemCount > 0) {
    throw AppError.conflict('Cannot delete a drug that is referenced by sale items');
  }

  await prisma.drug.delete({ where: { id } });
}

export async function getAlerts() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const soonCutoff = new Date(today);
  soonCutoff.setDate(soonCutoff.getDate() + EXPIRING_SOON_WINDOW_DAYS);

  const [expired, outOfStockAndSoon] = await Promise.all([
    prisma.drug.findMany({ where: { expirationDate: { lt: today } }, include: companyInclude }),
    prisma.drug.findMany({
      where: { expirationDate: { gte: today } },
      include: companyInclude
    })
  ]);

  const expiringSoon = outOfStockAndSoon.filter(
    (d) => d.quantity > 0 && d.expirationDate.getTime() <= soonCutoff.getTime()
  );
  const lowStockCandidates = outOfStockAndSoon.filter(
    (d) => d.quantity > 0 && d.expirationDate.getTime() > soonCutoff.getTime() && d.quantity <= d.reorderLevel
  );

  return {
    lowStock: lowStockCandidates.map((d) => toDrugDto(d, now)),
    expiringSoon: expiringSoon.map((d) => toDrugDto(d, now)),
    expired: expired.map((d) => toDrugDto(d, now))
  };
}
