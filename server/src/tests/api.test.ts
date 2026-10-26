import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { seedDatabase } from '../seed.js';

describe('RoomMate Split End-to-End API Tests', () => {
  let app: any;

  beforeAll(async () => {
    process.env.MONGODB_URI = 'memory';
    process.env.NODE_ENV = 'test';
    await connectDB();
    await seedDatabase();
    app = createApp();
  }, 30000);

  afterAll(async () => {
    await disconnectDB();
  });

  it('GET /api/health returns 200 and healthy status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.app).toContain('RoomMate Split');
  });

  it('POST /api/auth/login fails with invalid PIN', async () => {
    const res = await request(app).post('/api/auth/login').send({
      username: 'ashish',
      pin: '9999',
    });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/login succeeds with correct PIN 1111', async () => {
    const res = await request(app).post('/api/auth/login').send({
      username: 'ashish',
      pin: '1111',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.username).toBe('ashish');
    expect(res.body.flat.name).toBe('Alpha C-42');
  });

  it('GET /api/balances/dashboard returns dashboard data with auth token', async () => {
    // Login
    const loginRes = await request(app).post('/api/auth/login').send({
      username: 'ashish',
      pin: '1111',
    });
    const token = loginRes.body.token;

    const res = await request(app)
      .get('/api/balances/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.summaryCards).toBeDefined();
    expect(res.body.memberBalances.length).toBe(4);
    expect(res.body.chartData.length).toBeGreaterThan(0);
  });

  it('POST /api/expenses creates an expense only with verified PIN', async () => {
    // Login as Ashish
    const loginRes = await request(app).post('/api/auth/login').send({
      username: 'ashish',
      pin: '1111',
    });
    const token = loginRes.body.token;
    const ashishMemId = loginRes.body.membership.id;

    // Get members
    const membersRes = await request(app)
      .get('/api/members')
      .set('Authorization', `Bearer ${token}`);
    const allMemberIds = membersRes.body.members.map((m: any) => m.membershipId);

    // Attempt with incorrect PIN
    const failRes = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Cooking Gas Cylinder',
        category: 'Other',
        amountINR: 950,
        payerMembershipId: ashishMemId,
        eligibleMemberIds: allMemberIds,
        pin: '0000', // Wrong PIN
      });
    expect(failRes.status).toBe(401);

    // Attempt with correct PIN
    const successRes = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Cooking Gas Cylinder',
        category: 'Other',
        amountINR: 950,
        payerMembershipId: ashishMemId,
        eligibleMemberIds: allMemberIds,
        pin: '1111', // Correct PIN
      });
    expect(successRes.status).toBe(201);
    expect(successRes.body.success).toBe(true);
    expect(successRes.body.expense.title).toBe('Cooking Gas Cylinder');
  });
});
