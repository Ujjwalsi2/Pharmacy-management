import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, createTestUser, createTestCompany, createTestDrug } from './helpers.js';

async function loginAs(email: string, password: string) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.accessToken as string;
}

describe('Purchases', () => {
  it('creates a purchase and increments drug stock atomically', async () => {
    await createTestUser({ email: 'purch-admin@test.dev', password: 'Password1', role: 'ADMIN' });
    const token = await loginAs('purch-admin@test.dev', 'Password1');
    const company = await createTestCompany('PurchCo A');
    const drug = await createTestDrug({ name: 'PurchDrug', barcode: 'PUR-0001', companyId: company.id, quantity: 10, costPrice: 2 });

    const res = await request(app)
      .post('/api/purchases')
      .set('Authorization', `Bearer ${token}`)
      .send({
        companyId: company.id,
        notes: 'Test restock',
        items: [{ drugId: drug.id, quantity: 40, unitCost: 2 }]
      });

    expect(res.status).toBe(201);
    expect(res.body.total).toBe(80);
    expect(res.body.reference).toMatch(/^PO-\d{4}-\d{4}$/);

    const drugRes = await request(app).get(`/api/drugs/${drug.id}`).set('Authorization', `Bearer ${token}`);
    expect(drugRes.body.quantity).toBe(50);
  });

  it('forbids a pharmacist from creating a purchase', async () => {
    await createTestUser({ email: 'purch-pharma@test.dev', password: 'Password1', role: 'PHARMACIST' });
    const token = await loginAs('purch-pharma@test.dev', 'Password1');
    const company = await createTestCompany('PurchCo B');
    const drug = await createTestDrug({ name: 'PurchDrug2', barcode: 'PUR-0002', companyId: company.id });

    const res = await request(app)
      .post('/api/purchases')
      .set('Authorization', `Bearer ${token}`)
      .send({ companyId: company.id, items: [{ drugId: drug.id, quantity: 5, unitCost: 2 }] });

    expect(res.status).toBe(403);
  });
});
