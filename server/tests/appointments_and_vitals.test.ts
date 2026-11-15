import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { checkOverdueDoses, checkUpcomingAppointments } from '../src/services/cronService.js';

const app = createApp();

describe('Appointments & Health Vitals API', () => {
  let elderToken = '';
  let caretakerToken = '';
  let familyToken = '';
  let appointmentId = '';

  beforeAll(async () => {
    const createRes = await request(app)
      .post('/api/auth/create-circle')
      .send({
        name: "Walter's Circle",
        elderName: 'Walter Bishop',
        elderPasscode: 'walter123',
        caretakerPasscode: 'astrid123',
        familyPasscode: 'peter123',
      });

    elderToken = createRes.body.token;
    const code = createRes.body.circle.code;

    const careRes = await request(app)
      .post('/api/auth/login')
      .send({ circleCode: code, passcode: 'astrid123', displayName: 'Astrid Farnsworth' });
    caretakerToken = careRes.body.token;

    const famRes = await request(app)
      .post('/api/auth/login')
      .send({ circleCode: code, passcode: 'peter123', displayName: 'Peter Bishop' });
    familyToken = famRes.body.token;
  });

  it('allows Caretaker to add appointments directly', async () => {
    const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${caretakerToken}`)
      .send({
        title: 'Neurology Consultation',
        doctorName: 'Dr. William Bell',
        location: 'Massive Dynamic Medical Center, Room 404',
        dateTime: futureDate,
        notes: 'Bring previous MRI results',
      });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Neurology Consultation');
    expect(res.body.doctorName).toBe('Dr. William Bell');
    appointmentId = res.body.id;
  });

  it('allows Family members to read appointments', async () => {
    const res = await request(app)
      .get('/api/appointments')
      .set('Authorization', `Bearer ${familyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].title).toBe('Neurology Consultation');
  });

  it('denies Family members from modifying appointments', async () => {
    const res = await request(app)
      .patch(`/api/appointments/${appointmentId}`)
      .set('Authorization', `Bearer ${familyToken}`)
      .send({ notes: 'Unauthorized edit' });

    expect(res.status).toBe(403);
  });

  it('allows Elder to record daily vitals', async () => {
    const res = await request(app)
      .post('/api/vitals')
      .set('Authorization', `Bearer ${elderToken}`)
      .send({
        bloodPressureSystolic: 120,
        bloodPressureDiastolic: 80,
        bloodSugar: 95.5,
        heartRate: 72,
        mood: 'GREAT',
        notes: 'Feeling energized today',
      });

    expect(res.status).toBe(201);
    expect(res.body.bloodPressureSystolic).toBe(120);
    expect(res.body.mood).toBe('GREAT');
  });

  it('executes cron check routines cleanly', async () => {
    const overdueCount = await checkOverdueDoses();
    const apptCount = await checkUpcomingAppointments();

    expect(typeof overdueCount).toBe('number');
    expect(typeof apptCount).toBe('number');
  });
});
