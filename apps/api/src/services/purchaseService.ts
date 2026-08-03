import type { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';
import { AppError } from '../lib/errors.js';
import { round2 } from '../lib/money.js';
import { parsePagination, toSkipTake, buildListEnvelope, parseSort } from '../lib/pagination.js';
import { nextSequence } from './sequenceService.js';

const purchaseInclude = {
  company: { select: { id: true, name: true } },
  user: { select: { id: true, name: true } },
  items: { include: { drug: { select: { id: true, name: true, barcode: true } } } }
} as const;

type PurchaseWithRelations = Prisma.PurchaseGetPayload<{ include: typeof purchaseInclude }>;

function toPurchaseDto(purchase: PurchaseWithRelations) {
  return {
    id: purchase.id,
    reference: purchase.reference,
    companyId: purchase.companyId,
    company: purchase.company,
    userId: purchase.userId,
    user: purchase.user,
    notes: purchase.notes,
    total: purchase.total,
    items: purchase.items.map((item) => ({
      id: item.id,
      drugId: item.drugId,
      drug: item.drug,
      quantity: item.quantity,
      unitCost: item.unitCost,
      amount: item.amount
    })),
    createdAt: purchase.createdAt
  };
}

export interface ListPurchasesQuery {
  page?: string;
  pageSize?: string;
  search?: string;
  companyId?: string;
  from?: string;
  to?: string;
  sort?: string;
}

export async function listPurchases(query: ListPurchasesQuery) {
  const pagination = parsePagination(query);
  const where: Prisma.PurchaseWhereInput = {};

  if (query.search) {
    where.OR = [
      { reference: { contains: query.search } },
      { company: { name: { contains: query.search } } }
    ];
  }
  if (query.companyId) where.companyId = query.companyId;
  if (query.from || query.to) {
    where.createdAt = {};
    if (query.from) where.createdAt.gte = new Date(query.from);
    if (query.to) where.createdAt.lte = new Date(query.to);
  }

  const orderBy = parseSort(query.sort, ['createdAt', 'total'], { createdAt: 'desc' });

  const [rows, total] = await Promise.all([
    prisma.purchase.findMany({ where, include: purchaseInclude, orderBy, ...toSkipTake(pagination) }),
    prisma.purchase.count({ where })
  ]);

  return buildListEnvelope(rows.map(toPurchaseDto), total, pagination);
}

export async function getPurchase(id: string) {
  const purchase = await prisma.purchase.findUnique({ where: { id }, include: purchaseInclude });
  if (!purchase) throw AppError.notFound('Purchase not found');
  return toPurchaseDto(purchase);
}

export interface CreatePurchaseInput {
  companyId: string;
  notes?: string;
  items: Array<{ drugId: string; quantity: number; unitCost: number }>;
}

export async function createPurchase(userId: string, input: CreatePurchaseInput) {
  if (input.items.length === 0) {
    throw AppError.validation('Purchase must have at least one item');
  }

  const purchase = await prisma.$transaction(async (tx) => {
    const company = await tx.company.findUnique({ where: { id: input.companyId } });
    if (!company) throw AppError.validation('Unknown companyId');

    let total = 0;
    const itemsData: Array<{ drugId: string; quantity: number; unitCost: number; amount: number }> = [];

    for (const item of input.items) {
      const drug = await tx.drug.findUnique({ where: { id: item.drugId } });
      if (!drug) throw AppError.validation(`Unknown drugId: ${item.drugId}`);
      if (item.quantity <= 0) throw AppError.validation('Item quantity must be positive');

      const amount = round2(item.quantity * item.unitCost);
      total = round2(total + amount);
      itemsData.push({ drugId: item.drugId, quantity: item.quantity, unitCost: item.unitCost, amount });

      await tx.drug.update({
        where: { id: item.drugId },
        data: { quantity: { increment: item.quantity } }
      });
    }

    const year = new Date().getFullYear();
    const reference = await nextSequence(tx, 'purchase', 'PO', year);

    const created = await tx.purchase.create({
      data: {
        reference,
        companyId: input.companyId,
        userId,
        notes: input.notes,
        total,
        items: { create: itemsData }
      },
      include: purchaseInclude
    });

    return created;
  });

  return toPurchaseDto(purchase);
}
