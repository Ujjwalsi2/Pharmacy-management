import type { Prisma } from '@prisma/client';
import type { PaymentMode, Role } from '../types/index.js';
import { prisma } from '../prisma.js';
import { AppError } from '../lib/errors.js';
import { round2 } from '../lib/money.js';
import { parsePagination, toSkipTake, buildListEnvelope, parseSort } from '../lib/pagination.js';
import { nextSequence } from './sequenceService.js';

const saleInclude = {
  user: { select: { id: true, name: true } },
  items: true
} as const;

type SaleWithRelations = Prisma.SaleGetPayload<{ include: typeof saleInclude }>;

function toSaleDto(sale: SaleWithRelations) {
  return {
    id: sale.id,
    invoiceNo: sale.invoiceNo,
    userId: sale.userId,
    user: sale.user,
    customerName: sale.customerName,
    customerPhone: sale.customerPhone,
    paymentMode: sale.paymentMode,
    subtotal: sale.subtotal,
    discount: sale.discount,
    taxRate: sale.taxRate,
    tax: sale.tax,
    total: sale.total,
    items: sale.items.map((item) => ({
      id: item.id,
      drugId: item.drugId,
      name: item.name,
      barcode: item.barcode,
      dose: item.dose,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.amount
    })),
    createdAt: sale.createdAt
  };
}

export interface ListSalesQuery {
  page?: string;
  pageSize?: string;
  search?: string;
  userId?: string;
  from?: string;
  to?: string;
  sort?: string;
  paymentMode?: PaymentMode;
}

export async function listSales(query: ListSalesQuery, caller: { id: string; role: Role }) {
  const pagination = parsePagination(query);
  const where: Prisma.SaleWhereInput = {};

  if (query.search) {
    where.OR = [
      { invoiceNo: { contains: query.search } },
      { customerName: { contains: query.search } }
    ];
  }
  if (query.userId) where.userId = query.userId;
  if (query.paymentMode) where.paymentMode = query.paymentMode;
  if (query.from || query.to) {
    where.createdAt = {};
    if (query.from) where.createdAt.gte = new Date(query.from);
    if (query.to) where.createdAt.lte = new Date(query.to);
  }

  if (caller.role === 'PHARMACIST') {
    where.userId = caller.id;
  }

  const orderBy = parseSort(query.sort, ['createdAt', 'total'], { createdAt: 'desc' });

  const [rows, total] = await Promise.all([
    prisma.sale.findMany({ where, include: saleInclude, orderBy, ...toSkipTake(pagination) }),
    prisma.sale.count({ where })
  ]);

  return buildListEnvelope(rows.map(toSaleDto), total, pagination);
}

export async function getSale(id: string, caller: { id: string; role: Role }) {
  const sale = await prisma.sale.findUnique({ where: { id }, include: saleInclude });
  if (!sale) throw AppError.notFound('Sale not found');
  if (caller.role === 'PHARMACIST' && sale.userId !== caller.id) {
    throw AppError.forbidden('You may only view your own sales');
  }
  return toSaleDto(sale);
}

export interface CreateSaleInput {
  customerName?: string;
  customerPhone?: string;
  paymentMode: PaymentMode;
  discount?: number;
  taxRate?: number;
  items: Array<{ drugId: string; quantity: number }>;
}

export async function createSale(userId: string, input: CreateSaleInput) {
  if (input.items.length === 0) {
    throw AppError.validation('Sale must have at least one item');
  }

  const discount = input.discount ?? 0;
  const taxRate = input.taxRate ?? 0;

  const sale = await prisma.$transaction(async (tx) => {
    const now = new Date();
    let subtotal = 0;
    const itemsData: Array<{
      drugId: string;
      name: string;
      barcode: string;
      dose: string | null;
      quantity: number;
      unitPrice: number;
      amount: number;
    }> = [];

    for (const item of input.items) {
      if (item.quantity <= 0) throw AppError.validation('Item quantity must be positive');

      const drug = await tx.drug.findUnique({ where: { id: item.drugId } });
      if (!drug) throw AppError.validation(`Unknown drugId: ${item.drugId}`);

      if (drug.expirationDate.getTime() < now.getTime()) {
        throw AppError.validation(`Drug "${drug.name}" is expired and cannot be sold`);
      }

      if (drug.quantity < item.quantity) {
        throw AppError.insufficientStock(
          `Insufficient stock for "${drug.name}": requested ${item.quantity}, available ${drug.quantity}`,
          { drugId: drug.id, requested: item.quantity, available: drug.quantity }
        );
      }

      const amount = round2(item.quantity * drug.sellingPrice);
      subtotal = round2(subtotal + amount);
      itemsData.push({
        drugId: drug.id,
        name: drug.name,
        barcode: drug.barcode,
        dose: drug.dose,
        quantity: item.quantity,
        unitPrice: drug.sellingPrice,
        amount
      });

      await tx.drug.update({
        where: { id: drug.id },
        data: { quantity: { decrement: item.quantity } }
      });
    }

    // Guard against a discount larger than the subtotal, which would otherwise
    // persist a negative total (and negative tax) and corrupt revenue reporting.
    if (discount > subtotal) {
      throw AppError.validation(
        `Discount (${discount}) cannot exceed the subtotal (${subtotal})`,
        { subtotal, discount }
      );
    }

    const tax = round2((subtotal - discount) * (taxRate / 100));
    const total = round2(subtotal - discount + tax);

    const year = now.getFullYear();
    const invoiceNo = await nextSequence(tx, 'sale', 'INV', year);

    const created = await tx.sale.create({
      data: {
        invoiceNo,
        userId,
        customerName: input.customerName?.trim() || 'Walk-in',
        customerPhone: input.customerPhone ?? '',
        paymentMode: input.paymentMode,
        subtotal,
        discount,
        taxRate,
        tax,
        total,
        items: { create: itemsData }
      },
      include: saleInclude
    });

    return created;
  });

  return toSaleDto(sale);
}
