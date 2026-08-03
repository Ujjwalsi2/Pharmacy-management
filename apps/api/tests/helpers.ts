import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import { prisma } from '../src/prisma.js';

export const app = createApp();

export async function createTestUser(overrides: {
  email: string;
  password: string;
  role?: 'ADMIN' | 'PHARMACIST';
  active?: boolean;
  name?: string;
}) {
  const hashed = await bcrypt.hash(overrides.password, 4);
  return prisma.user.create({
    data: {
      name: overrides.name ?? 'Test User',
      email: overrides.email,
      password: hashed,
      role: overrides.role ?? 'PHARMACIST',
      active: overrides.active ?? true
    }
  });
}

export async function createTestCompany(name: string) {
  return prisma.company.create({ data: { name, address: 'Test Address', phone: '1234567890' } });
}

export async function createTestDrug(overrides: {
  name: string;
  barcode: string;
  companyId: string;
  quantity?: number;
  reorderLevel?: number;
  costPrice?: number;
  sellingPrice?: number;
  expirationOffsetDays?: number;
}) {
  const now = new Date();
  const expiry = new Date(now);
  expiry.setDate(expiry.getDate() + (overrides.expirationOffsetDays ?? 365));
  const production = new Date(now);
  production.setDate(production.getDate() - 30);

  return prisma.drug.create({
    data: {
      name: overrides.name,
      barcode: overrides.barcode,
      type: 'TABLET',
      dose: '500mg',
      code: 'T01',
      costPrice: overrides.costPrice ?? 5,
      sellingPrice: overrides.sellingPrice ?? 10,
      companyId: overrides.companyId,
      productionDate: production,
      expirationDate: expiry,
      place: 'A-1',
      quantity: overrides.quantity ?? 100,
      reorderLevel: overrides.reorderLevel ?? 10
    }
  });
}
