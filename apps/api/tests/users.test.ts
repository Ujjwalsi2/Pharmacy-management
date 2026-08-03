import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, createTestUser } from './helpers.js';

async function loginAs(email: string, password: string) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.accessToken as string;
}

describe('Users', () => {
  it('soft-deletes a user (sets active=false, does not remove row)', async () => {
    await createTestUser({ email: 'users-admin@test.dev', password: 'Password1', role: 'ADMIN' });
    const token = await loginAs('users-admin@test.dev', 'Password1');
    const target = await createTestUser({ email: 'users-target@test.dev', password: 'Password1' });

    const res = await request(app).delete(`/api/users/${target.id}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.active).toBe(false);

    const getRes = await request(app).get(`/api/users/${target.id}`).set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.active).toBe(false);
  });

  it('returns 409 when an admin tries to delete their own account', async () => {
    const admin = await createTestUser({ email: 'users-self@test.dev', password: 'Password1', role: 'ADMIN' });
    const token = await loginAs('users-self@test.dev', 'Password1');

    const res = await request(app).delete(`/api/users/${admin.id}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('returns the reduced shape for pharmacist callers on GET /users', async () => {
    await createTestUser({ email: 'users-pharma@test.dev', password: 'Password1', role: 'PHARMACIST' });
    const token = await loginAs('users-pharma@test.dev', 'Password1');

    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    const first = res.body.data[0];
    expect(Object.keys(first).sort()).toEqual(['email', 'id', 'name', 'role'].sort());
  });
});
