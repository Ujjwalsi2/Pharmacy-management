import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, createTestUser } from './helpers.js';

describe('Dashboard', () => {
  it('returns the summary shape with all expected keys', async () => {
    await createTestUser({ email: 'dash-admin@test.dev', password: 'Password1', role: 'ADMIN' });
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'dash-admin@test.dev', password: 'Password1' });

    const res = await request(app)
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`);

    expect(res.status).toBe(200);
    for (const key of [
      'revenueToday',
      'revenueMonth',
      'ordersToday',
      'ordersMonth',
      'drugCount',
      'companyCount',
      'userCount',
      'inventoryValue',
      'alerts',
      'revenueTrend',
      'topDrugs',
      'recentSales'
    ]) {
      expect(res.body).toHaveProperty(key);
    }
    expect(res.body.revenueTrend).toHaveLength(30);
    expect(res.body.alerts).toHaveProperty('lowStock');
    expect(res.body.alerts).toHaveProperty('expiringSoon');
    expect(res.body.alerts).toHaveProperty('expired');
  });
});
