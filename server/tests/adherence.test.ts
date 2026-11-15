import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { getCurrentDateString } from '../src/utils/date.js';

const app = createApp();

describe('Medication Adherence & Schedule API', () => {
  let elderToken = '';
  let caretakerToken = '';
  let familyToken = '';
  let medId = '';
  const today = getCurrentDateString();

  beforeAll(async () => {
    const createRes = await request(app)
      .post('/api/auth/create-circle')
      .send({
        name: "Clara's Circle",
        elderName: 'Clara Oswald',
        elderPasscode: 'clara123',
        caretakerPasscode: 'danny123',
        familyPasscode: 'famclara123',
      });

    elderToken = createRes.body.token;
    const code = createRes.body.circle.code;

    const careRes = await request(app)
      .post('/api/auth/login')
      .send({ circleCode: code, passcode: 'danny123', displayName: 'Danny Care' });
    caretakerToken = careRes.body.token;

    const famRes = await request(app)
      .post('/api/auth/login')
      .send({ circleCode: code, passcode: 'famclara123', displayName: 'Family Member' });
    familyToken = famRes.body.token;

    // Create a medication with 2 remaining doses and threshold of 2
    const medRes = await request(app)
      .post('/api/medications')
      .set('Authorization', `Bearer ${elderToken}`)
      .send({
        name: 'Levothyroxine',
        dosage: '75mcg',
        frequency: 'Daily morning',
        timesOfDay: ['07:00', '19:00'],
        remainingQuantity: 2,
        refillThreshold: 2,
      });

    medId = medRes.body.medication.id;
  });

  it('generates the daily schedule for today with pending doses', async () => {
    const res = await request(app)
      .get(`/api/adherence/today?date=${today}`)
      .set('Authorization', `Bearer ${familyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.date).toBe(today);
    expect(res.body.schedule.length).toBe(2);
    expect(res.body.schedule[0].scheduledTime).toBe('07:00');
    expect(res.body.schedule[0].status).toBe('PENDING');
  });

  it('allows elder or caretaker to record a dose as TAKEN', async () => {
    const res = await request(app)
      .post('/api/adherence/log')
      .set('Authorization', `Bearer ${caretakerToken}`)
      .send({
        medicationId: medId,
        scheduledDate: today,
        scheduledTime: '07:00',
        status: 'TAKEN',
        notes: 'Taken with water before breakfast',
      });

    expect(res.status).toBe(200);
    expect(res.body.log.status).toBe('TAKEN');
    expect(res.body.remainingQuantity).toBe(1); // decremented from 2 to 1
  });

  it('triggers a low refill notification when inventory drops below threshold', async () => {
    const notifs = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${elderToken}`);

    expect(notifs.status).toBe(200);
    const refillAlert = notifs.body.notifications.find(
      (n: { type: string }) => n.type === 'LOW_REFILL'
    );
    expect(refillAlert).toBeDefined();
    expect(refillAlert.title).toContain('Levothyroxine');
  });

  it('denies family member from logging or altering dose status', async () => {
    const res = await request(app)
      .post('/api/adherence/log')
      .set('Authorization', `Bearer ${familyToken}`)
      .send({
        medicationId: medId,
        scheduledDate: today,
        scheduledTime: '19:00',
        status: 'TAKEN',
      });

    expect(res.status).toBe(403);
  });

  it('computes grouped adherence metrics correctly', async () => {
    const res = await request(app)
      .get('/api/adherence/stats?days=7')
      .set('Authorization', `Bearer ${elderToken}`);

    expect(res.status).toBe(200);
    expect(res.body.summary.taken).toBeGreaterThanOrEqual(1);
    expect(res.body.summary.adherenceRate).toBeGreaterThanOrEqual(0);
  });
});
