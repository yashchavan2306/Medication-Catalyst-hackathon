import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/db.js';

const app = createApp();

describe('Auth & Circle Lifecycle API', () => {
  let circleCode = '';
  let elderToken = '';
  let caretakerToken = '';
  let familyToken = '';

  it('creates a new Care Circle with elder as owner', async () => {
    const res = await request(app)
      .post('/api/auth/create-circle')
      .send({
        name: "Eleanor's Circle",
        elderName: 'Eleanor Vance',
        elderPasscode: 'elder123',
        caretakerPasscode: 'care123',
        familyPasscode: 'fam123',
        emergencyContactName: 'Dr. Robert Vance',
        emergencyContactPhone: '+1-555-0199',
      });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.member.role).toBe('elder');
    expect(res.body.member.displayName).toBe('Eleanor Vance');
    expect(res.body.circle.code).toMatch(/^CARE-\d+$/);

    circleCode = res.body.circle.code;
    elderToken = res.body.token;
  });

  it('validates input schemas using Zod and rejects malformed requests', async () => {
    const res = await request(app)
      .post('/api/auth/create-circle')
      .send({
        name: 'A', // too short
        elderName: '',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });

  it('logs in as caretaker using circle code and caretaker passcode', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        circleCode,
        passcode: 'care123',
        displayName: 'Nurse Maria',
      });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.member.role).toBe('caretaker');
    expect(res.body.member.displayName).toBe('Nurse Maria');
    caretakerToken = res.body.token;
  });

  it('logs in as family using circle code and family passcode', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        circleCode,
        passcode: 'fam123',
        displayName: 'Son David',
      });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.member.role).toBe('family');
    expect(res.body.member.displayName).toBe('Son David');
    familyToken = res.body.token;
  });

  it('rejects login with invalid passcode', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        circleCode,
        passcode: 'wrongpassword',
      });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('verifies identity via /api/auth/me strictly through attachMember', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${elderToken}`);

    expect(res.status).toBe(200);
    expect(res.body.member.role).toBe('elder');
    expect(res.body.member.displayName).toBe('Eleanor Vance');
    expect(res.body.circle.name).toBe("Eleanor's Circle");
  });

  it('denies /api/auth/me when token is absent or invalid', async () => {
    const noToken = await request(app).get('/api/auth/me');
    expect(noToken.status).toBe(401);

    const badToken = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token-string');
    expect(badToken.status).toBe(401);
  });
});
