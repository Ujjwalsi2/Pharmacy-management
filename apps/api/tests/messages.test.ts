import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, createTestUser } from './helpers.js';

async function loginAs(email: string, password: string) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.accessToken as string;
}

describe('Messages', () => {
  it('sends a message, lists it in the recipient inbox, and marks it read', async () => {
    const sender = await createTestUser({ email: 'msg-sender@test.dev', password: 'Password1' });
    const senderToken = await loginAs('msg-sender@test.dev', 'Password1');
    const recipient = await createTestUser({ email: 'msg-recipient@test.dev', password: 'Password1' });
    const recipientToken = await loginAs('msg-recipient@test.dev', 'Password1');

    const sendRes = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${senderToken}`)
      .send({ toUserId: recipient.id, body: 'Hello there' });
    expect(sendRes.status).toBe(201);
    expect(sendRes.body.fromUser.id).toBe(sender.id);
    expect(sendRes.body.toUser.id).toBe(recipient.id);

    const inboxRes = await request(app)
      .get('/api/messages')
      .query({ box: 'inbox' })
      .set('Authorization', `Bearer ${recipientToken}`);
    expect(inboxRes.status).toBe(200);
    expect(inboxRes.body.data.some((m: { id: string }) => m.id === sendRes.body.id)).toBe(true);

    const unreadBefore = await request(app)
      .get('/api/messages/unread-count')
      .set('Authorization', `Bearer ${recipientToken}`);
    expect(unreadBefore.body.count).toBeGreaterThanOrEqual(1);

    const markRes = await request(app)
      .patch(`/api/messages/${sendRes.body.id}/read`)
      .set('Authorization', `Bearer ${recipientToken}`);
    expect(markRes.status).toBe(200);
    expect(markRes.body.readAt).not.toBeNull();
  });

  it('lists sent messages under box=sent', async () => {
    await createTestUser({ email: 'msg-sender2@test.dev', password: 'Password1' });
    const senderToken = await loginAs('msg-sender2@test.dev', 'Password1');
    const recipient = await createTestUser({ email: 'msg-recipient2@test.dev', password: 'Password1' });

    await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${senderToken}`)
      .send({ toUserId: recipient.id, body: 'Sent box test' });

    const sentRes = await request(app)
      .get('/api/messages')
      .query({ box: 'sent' })
      .set('Authorization', `Bearer ${senderToken}`);
    expect(sentRes.status).toBe(200);
    expect(sentRes.body.data.some((m: { body: string }) => m.body === 'Sent box test')).toBe(true);
  });
});
