import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, createTestCompany, createTestUser } from './helpers.js';
import { prisma } from '../src/prisma.js';
import bcrypt from 'bcryptjs';

let adminTokenCache: string | null = null;

async function adminToken() {
  if (adminTokenCache) return adminTokenCache;
  const hashed = await bcrypt.hash('Password1', 4);
  await prisma.user.upsert({
    where: { email: 'drugs-admin@test.dev' },
    update: {},
    create: { name: 'Drugs Admin', email: 'drugs-admin@test.dev', password: hashed, role: 'ADMIN' }
  });
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'drugs-admin@test.dev', password: 'Password1' });
  adminTokenCache = res.body.accessToken as string;
  return adminTokenCache;
}

describe('Drugs', () => {
  it('creates a drug and computes IN_STOCK status', async () => {
    const token = await adminToken();
    const company = await createTestCompany('DrugCo A');

    const res = await request(app)
      .post('/api/drugs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Testolol',
        barcode: 'BC-0001',
        type: 'TABLET',
        costPrice: 5,
        sellingPrice: 10,
        companyId: company.id,
        productionDate: '2025-01-01',
        expirationDate: '2030-01-01',
        quantity: 100,
        reorderLevel: 10
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('IN_STOCK');
    expect(res.body.company.name).toBe('DrugCo A');
  });

  it('rejects a duplicate barcode with 409', async () => {
    const token = await adminToken();
    const company = await createTestCompany('DrugCo B');
    const payload = {
      name: 'Dupolol',
      barcode: 'BC-DUPE',
      type: 'TABLET',
      costPrice: 5,
      sellingPrice: 10,
      companyId: company.id,
      productionDate: '2025-01-01',
      expirationDate: '2030-01-01'
    };

    const first = await request(app).post('/api/drugs').set('Authorization', `Bearer ${token}`).send(payload);
    expect(first.status).toBe(201);

    const second = await request(app).post('/api/drugs').set('Authorization', `Bearer ${token}`).send(payload);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('CONFLICT');
  });

  it('computes EXPIRED status when expirationDate is in the past', async () => {
    const token = await adminToken();
    const company = await createTestCompany('DrugCo C');
    const res = await request(app)
      .post('/api/drugs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Expiredol',
        barcode: 'BC-EXPIRED',
        type: 'TABLET',
        costPrice: 5,
        sellingPrice: 10,
        companyId: company.id,
        productionDate: '2020-01-01',
        expirationDate: '2021-01-01',
        quantity: 5
      });
    expect(res.body.status).toBe('EXPIRED');
  });

  it('computes OUT_OF_STOCK status when quantity is 0', async () => {
    const token = await adminToken();
    const company = await createTestCompany('DrugCo D');
    const res = await request(app)
      .post('/api/drugs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Emptyol',
        barcode: 'BC-EMPTY',
        type: 'TABLET',
        costPrice: 5,
        sellingPrice: 10,
        companyId: company.id,
        productionDate: '2025-01-01',
        expirationDate: '2030-01-01',
        quantity: 0
      });
    expect(res.body.status).toBe('OUT_OF_STOCK');
  });

  it('lists drugs filtered by status', async () => {
    const token = await adminToken();
    const company = await createTestCompany('DrugCo E');
    await request(app)
      .post('/api/drugs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Filterol',
        barcode: 'BC-FILTER',
        type: 'TABLET',
        costPrice: 5,
        sellingPrice: 10,
        companyId: company.id,
        productionDate: '2025-01-01',
        expirationDate: '2030-01-01',
        quantity: 0
      });

    const res = await request(app)
      .get('/api/drugs')
      .query({ status: 'OUT_OF_STOCK', companyId: company.id })
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.every((d: { status: string }) => d.status === 'OUT_OF_STOCK')).toBe(true);
  });

  it('returns alerts grouped by lowStock/expiringSoon/expired', async () => {
    const token = await adminToken();
    const res = await request(app).get('/api/drugs/alerts').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('lowStock');
    expect(res.body).toHaveProperty('expiringSoon');
    expect(res.body).toHaveProperty('expired');
  });

  it('forbids a pharmacist from creating a drug', async () => {
    await createTestUser({ email: 'drugs-pharma@test.dev', password: 'Password1', role: 'PHARMACIST' });
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'drugs-pharma@test.dev', password: 'Password1' });
    const company = await createTestCompany('DrugCo F');

    const res = await request(app)
      .post('/api/drugs')
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
      .send({
        name: 'Forbidol',
        barcode: 'BC-FORBID',
        type: 'TABLET',
        costPrice: 5,
        sellingPrice: 10,
        companyId: company.id,
        productionDate: '2025-01-01',
        expirationDate: '2030-01-01'
      });
    expect(res.status).toBe(403);
  });
});
