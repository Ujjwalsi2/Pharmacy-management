import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, createTestUser, createTestCompany, createTestDrug } from './helpers.js';

async function loginAs(email: string, password: string) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.accessToken as string;
}

describe('Sales', () => {
  it('completes a happy-path sale, decrements stock, and computes tax correctly', async () => {
    await createTestUser({ email: 'sales-admin@test.dev', password: 'Password1', role: 'ADMIN' });
    const token = await loginAs('sales-admin@test.dev', 'Password1');
    const company = await createTestCompany('SalesCo A');
    const drug = await createTestDrug({
      name: 'SaleDrug',
      barcode: 'SALE-0001',
      companyId: company.id,
      quantity: 50,
      sellingPrice: 40
    });

    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({
        paymentMode: 'CASH',
        discount: 10,
        taxRate: 5,
        items: [{ drugId: drug.id, quantity: 6 }]
      });

    expect(res.status).toBe(201);
    expect(res.body.subtotal).toBe(240);
    expect(res.body.discount).toBe(10);
    // tax = round((240-10)*5/100) = 11.5
    expect(res.body.tax).toBe(11.5);
    expect(res.body.total).toBe(241.5);
    expect(res.body.invoiceNo).toMatch(/^INV-\d{4}-\d{4}$/);

    const drugRes = await request(app).get(`/api/drugs/${drug.id}`).set('Authorization', `Bearer ${token}`);
    expect(drugRes.body.quantity).toBe(44);
  });

  it('rejects a sale with insufficient stock', async () => {
    await createTestUser({ email: 'sales-admin2@test.dev', password: 'Password1', role: 'ADMIN' });
    const token = await loginAs('sales-admin2@test.dev', 'Password1');
    const company = await createTestCompany('SalesCo B');
    const drug = await createTestDrug({ name: 'LowStockDrug', barcode: 'SALE-0002', companyId: company.id, quantity: 2 });

    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({ paymentMode: 'CASH', items: [{ drugId: drug.id, quantity: 10 }] });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');

    // Stock must remain unchanged after the failed transaction.
    const drugRes = await request(app).get(`/api/drugs/${drug.id}`).set('Authorization', `Bearer ${token}`);
    expect(drugRes.body.quantity).toBe(2);
  });

  it('rejects a sale of an expired drug', async () => {
    await createTestUser({ email: 'sales-admin3@test.dev', password: 'Password1', role: 'ADMIN' });
    const token = await loginAs('sales-admin3@test.dev', 'Password1');
    const company = await createTestCompany('SalesCo C');
    const drug = await createTestDrug({
      name: 'ExpiredSaleDrug',
      barcode: 'SALE-0003',
      companyId: company.id,
      quantity: 20,
      expirationOffsetDays: -10
    });

    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({ paymentMode: 'CASH', items: [{ drugId: drug.id, quantity: 1 }] });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('scopes GET /sales to the caller for pharmacists', async () => {
    await createTestUser({ email: 'sales-admin4@test.dev', password: 'Password1', role: 'ADMIN' });
    const adminToken = await loginAs('sales-admin4@test.dev', 'Password1');
    await createTestUser({ email: 'sales-pharma@test.dev', password: 'Password1', role: 'PHARMACIST' });
    const pharmaToken = await loginAs('sales-pharma@test.dev', 'Password1');

    const company = await createTestCompany('SalesCo D');
    const drug = await createTestDrug({ name: 'ScopeDrug', barcode: 'SALE-0004', companyId: company.id, quantity: 50 });

    await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ paymentMode: 'CASH', items: [{ drugId: drug.id, quantity: 1 }] });

    await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${pharmaToken}`)
      .send({ paymentMode: 'CASH', items: [{ drugId: drug.id, quantity: 1 }] });

    const pharmaList = await request(app).get('/api/sales').set('Authorization', `Bearer ${pharmaToken}`);
    expect(pharmaList.status).toBe(200);
    expect(pharmaList.body.data.length).toBeGreaterThanOrEqual(1);
    expect(
      pharmaList.body.data.every((s: { user: { name: string } }) => true)
    ).toBe(true);

    // Fetch the pharmacist's own user id to confirm scoping precisely.
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${pharmaToken}`);
    expect(pharmaList.body.data.every((s: { userId: string }) => s.userId === me.body.id)).toBe(true);
  });

  it('ignores client-sent totals and recomputes from server-side drug prices', async () => {
    await createTestUser({ email: 'sales-admin5@test.dev', password: 'Password1', role: 'ADMIN' });
    const token = await loginAs('sales-admin5@test.dev', 'Password1');
    const company = await createTestCompany('SalesCo E');
    const drug = await createTestDrug({ name: 'TrustDrug', barcode: 'SALE-0005', companyId: company.id, quantity: 50, sellingPrice: 20 });

    const res = await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({
        paymentMode: 'CASH',
        items: [{ drugId: drug.id, quantity: 2 }],
        // Client attempts to lie about pricing - server must ignore this.
        subtotal: 999999,
        total: 999999
      });

    expect(res.status).toBe(201);
    expect(res.body.subtotal).toBe(40);
    expect(res.body.total).toBe(40);
  });

  it('produces non-zero data in the dashboard revenue trend for a recent sale', async () => {
    await createTestUser({ email: 'sales-admin6@test.dev', password: 'Password1', role: 'ADMIN' });
    const token = await loginAs('sales-admin6@test.dev', 'Password1');
    const company = await createTestCompany('SalesCo F');
    const drug = await createTestDrug({ name: 'TrendDrug', barcode: 'SALE-0006', companyId: company.id, quantity: 50, sellingPrice: 15 });

    await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({ paymentMode: 'CASH', items: [{ drugId: drug.id, quantity: 2 }] });

    const dashboardRes = await request(app).get('/api/dashboard/summary').set('Authorization', `Bearer ${token}`);
    expect(dashboardRes.status).toBe(200);
    const todayEntry = dashboardRes.body.revenueTrend[dashboardRes.body.revenueTrend.length - 1];
    // The sale just created should count toward today's trend bucket.
    expect(todayEntry.orders).toBeGreaterThanOrEqual(1);
    expect(todayEntry.revenue).toBeGreaterThanOrEqual(30);
  });
  it('filters the sales list by paymentMode server-side', async () => {
    await createTestUser({ email: 'sales-pm@test.dev', password: 'Password1', role: 'ADMIN' });
    const token = await loginAs('sales-pm@test.dev', 'Password1');
    const company = await createTestCompany('SalesCo PM');
    const drug = await createTestDrug({
      name: 'PayModeDrug',
      barcode: 'SALE-PM-01',
      companyId: company.id,
      quantity: 100,
      sellingPrice: 10
    });

    const modes = ['CASH', 'CARD', 'CARD', 'UPI'] as const;
    for (const paymentMode of modes) {
      const created = await request(app)
        .post('/api/sales')
        .set('Authorization', `Bearer ${token}`)
        .send({ paymentMode, items: [{ drugId: drug.id, quantity: 1 }] });
      expect(created.status).toBe(201);
    }

    const cardRes = await request(app)
      .get('/api/sales?paymentMode=CARD&pageSize=100')
      .set('Authorization', `Bearer ${token}`);

    expect(cardRes.status).toBe(200);
    expect(cardRes.body.data.length).toBeGreaterThanOrEqual(2);
    // Every returned row must match the filter...
    for (const sale of cardRes.body.data) {
      expect(sale.paymentMode).toBe('CARD');
    }
    // ...and `total` must reflect the FILTERED count, not every sale.
    expect(cardRes.body.total).toBe(cardRes.body.data.length);

    const allRes = await request(app)
      .get('/api/sales?pageSize=100')
      .set('Authorization', `Bearer ${token}`);
    expect(allRes.body.total).toBeGreaterThan(cardRes.body.total);

    const upiRes = await request(app)
      .get('/api/sales?paymentMode=UPI&pageSize=100')
      .set('Authorization', `Bearer ${token}`);
    expect(upiRes.body.data.every((sale: { paymentMode: string }) => sale.paymentMode === 'UPI')).toBe(true);

    const badRes = await request(app)
      .get('/api/sales?paymentMode=BITCOIN')
      .set('Authorization', `Bearer ${token}`);
    expect(badRes.status).toBe(400);
    expect(badRes.body.error.code).toBe('VALIDATION_ERROR');
  });
});
