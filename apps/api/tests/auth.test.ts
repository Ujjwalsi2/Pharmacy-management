import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, createTestUser } from './helpers.js';

describe('Auth', () => {
  it('logs in successfully with correct credentials', async () => {
    await createTestUser({ email: 'auth-ok@test.dev', password: 'Password1', role: 'ADMIN' });
    const res = await request(app).post('/api/auth/login').send({ email: 'auth-ok@test.dev', password: 'Password1' });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTypeOf('string');
    expect(res.body.user.email).toBe('auth-ok@test.dev');
    expect(res.body.user.password).toBeUndefined();
    const cookies = res.headers['set-cookie'];
    expect(cookies.some((c: string) => c.startsWith('mt_refresh='))).toBe(true);
  });

  it('rejects a bad password', async () => {
    await createTestUser({ email: 'auth-bad@test.dev', password: 'Password1' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'auth-bad@test.dev', password: 'WrongPassword' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects login for an inactive user', async () => {
    await createTestUser({ email: 'auth-inactive@test.dev', password: 'Password1', active: false });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'auth-inactive@test.dev', password: 'Password1' });
    expect(res.status).toBe(401);
  });

  it('refreshes an access token using the cookie', async () => {
    await createTestUser({ email: 'auth-refresh@test.dev', password: 'Password1' });
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'auth-refresh@test.dev', password: 'Password1' });
    const cookie = loginRes.headers['set-cookie'][0];

    const refreshRes = await request(app).post('/api/auth/refresh').set('Cookie', cookie);
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.accessToken).toBeTypeOf('string');
  });

  it('rejects refresh without a cookie', async () => {
    const res = await request(app).post('/api/auth/refresh');
    expect(res.status).toBe(401);
  });

  it('returns the current user on /auth/me', async () => {
    await createTestUser({ email: 'auth-me@test.dev', password: 'Password1' });
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'auth-me@test.dev', password: 'Password1' });

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.email).toBe('auth-me@test.dev');
  });

  it('rejects unauthenticated requests to protected routes', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('forbids a non-admin from creating a user', async () => {
    await createTestUser({ email: 'auth-pharma@test.dev', password: 'Password1', role: 'PHARMACIST' });
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'auth-pharma@test.dev', password: 'Password1' });

    const createRes = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
      .send({ name: 'New', email: 'new@test.dev', password: 'Password1', role: 'PHARMACIST' });
    expect(createRes.status).toBe(403);
    expect(createRes.body.error.code).toBe('FORBIDDEN');
  });
});
