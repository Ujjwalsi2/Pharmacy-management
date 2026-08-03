import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, createTestUser } from './helpers.js';

describe('Validation error shape', () => {
  it('returns a VALIDATION_ERROR envelope for a malformed login body', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(res.body.error.details)).toBe(true);
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });

  it('returns VALIDATION_ERROR when creating a drug with missing required fields', async () => {
    await createTestUser({ email: 'validation-admin@test.dev', password: 'Password1', role: 'ADMIN' });
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'validation-admin@test.dev', password: 'Password1' });

    const res = await request(app)
      .post('/api/drugs')
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
      .send({ name: 'Incomplete' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
