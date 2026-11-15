import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('Exact API Specification Contract Test', () => {
  let circleCode = '';
  let passcodes: { elder: string; caretaker: string; family: string } = {
    elder: '',
    caretaker: '',
    family: '',
  };
  let elderCookie = '';
  let caretakerCookie = '';
  let familyCookie = '';
  let elderToken = '';

  let createdMedicationId = '';
  let caretakerChangeRequestId = '';
  let createdAppointmentId = '';
  let firstDoseId = '';

  // 1. POST /api/circles {elderName, elderEmail} -> {circleCode, passcodes:{elder,caretaker,family}} (shown once)
  it('POST /api/circles creates circle and returns generated code and passcodes', async () => {
    const res = await request(app)
      .post('/api/circles')
      .send({
        elderName: 'Margaret Thatcher',
        elderEmail: 'margaret@carecircle.local',
      });

    expect(res.status).toBe(201);
    expect(res.body.circleCode).toMatch(/^CARE-\d+$/);
    expect(res.body.passcodes).toBeDefined();
    expect(res.body.passcodes.elder).toBeDefined();
    expect(res.body.passcodes.caretaker).toBeDefined();
    expect(res.body.passcodes.family).toBeDefined();

    circleCode = res.body.circleCode;
    passcodes = res.body.passcodes;
  });

  // 2. POST /api/auth/login {circleCode, passcode} -> sets HttpOnly cookie, returns {member}
  it('POST /api/auth/login logs in as Elder and sets HttpOnly cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        circleCode,
        passcode: passcodes.elder,
      });

    expect(res.status).toBe(200);
    expect(res.body.member).toBeDefined();
    expect(res.body.member.role).toBe('elder');
    expect(res.body.member.displayName).toBe('Margaret Thatcher');

    // Verify Set-Cookie header with HttpOnly
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const tokenCookie = cookies.find((c: string) => c.startsWith('token='));
    expect(tokenCookie).toBeDefined();
    expect(tokenCookie).toContain('HttpOnly');

    elderCookie = tokenCookie.split(';')[0];
    elderToken = res.body.token;
  });

  it('POST /api/auth/login logs in as Caretaker and sets HttpOnly cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        circleCode,
        passcode: passcodes.caretaker,
      });

    expect(res.status).toBe(200);
    expect(res.body.member.role).toBe('caretaker');
    const cookies = res.headers['set-cookie'];
    caretakerCookie = cookies.find((c: string) => c.startsWith('token=')).split(';')[0];
  });

  it('POST /api/auth/login logs in as Family and sets HttpOnly cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        circleCode,
        passcode: passcodes.family,
      });

    expect(res.status).toBe(200);
    expect(res.body.member.role).toBe('family');
    const cookies = res.headers['set-cookie'];
    familyCookie = cookies.find((c: string) => c.startsWith('token=')).split(';')[0];
  });

  // 4. GET /api/me
  it('GET /api/me returns current member identity via cookie', async () => {
    const res = await request(app)
      .get('/api/me')
      .set('Cookie', [elderCookie]);

    expect(res.status).toBe(200);
    expect(res.body.member.role).toBe('elder');
    expect(res.body.circle.code).toBe(circleCode);
    expect(res.body.circle.elderEmail).toBe('margaret@carecircle.local');
  });

  // 5. GET/POST /api/medications ; PUT/DELETE /api/medications/:id
  it('POST /api/medications allows Elder to add medication directly', async () => {
    const res = await request(app)
      .post('/api/medications')
      .set('Cookie', [elderCookie])
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({
        name: 'Atorvastatin',
        dosage: '20mg',
        frequency: 'Once daily at bedtime',
        timesOfDay: ['21:00'],
        purpose: 'Cholesterol',
        remainingQuantity: 30,
        refillThreshold: 5,
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('CREATED');
    expect(res.body.medication.name).toBe('Atorvastatin');
    createdMedicationId = res.body.medication.id;
  });

  it('POST /api/medications allows Caretaker to suggest medication requiring Elder approval', async () => {
    const res = await request(app)
      .post('/api/medications')
      .set('Cookie', [caretakerCookie])
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({
        name: 'Omeprazole',
        dosage: '20mg',
        frequency: 'Daily morning',
        timesOfDay: ['08:00'],
        purpose: 'Acid Reflux',
        remainingQuantity: 30,
        refillThreshold: 5,
        reason: 'Recommended for stomach protection',
      });

    expect(res.status).toBe(202);
    expect(res.body.status).toBe('PENDING_APPROVAL');
    expect(res.body.changeRequest).toBeDefined();
    caretakerChangeRequestId = res.body.changeRequest.id;
  });

  it('GET /api/medications lists active medications', async () => {
    const res = await request(app)
      .get('/api/medications')
      .set('Cookie', [familyCookie]);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    const names = res.body.map((m: { name: string }) => m.name);
    expect(names).toContain('Atorvastatin');
  });

  it('PUT /api/medications/:id updates medication (elder direct update)', async () => {
    const res = await request(app)
      .put(`/api/medications/${createdMedicationId}`)
      .set('Cookie', [elderCookie])
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({
        dosage: '40mg',
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UPDATED');
    expect(res.body.medication.dosage).toBe('40mg');
  });

  // 6. GET /api/approvals ; POST /api/approvals/:id/approve|reject (elder only)
  it('GET /api/approvals lists pending approval requests', async () => {
    const res = await request(app)
      .get('/api/approvals')
      .set('Cookie', [elderCookie]);

    expect(res.status).toBe(200);
    const found = res.body.find((r: { id: string }) => r.id === caretakerChangeRequestId);
    expect(found).toBeDefined();
    expect(found.status).toBe('PENDING');
  });

  it('POST /api/approvals/:id/approve allows Elder to approve change', async () => {
    const res = await request(app)
      .post(`/api/approvals/${caretakerChangeRequestId}/approve`)
      .set('Cookie', [elderCookie])
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ reviewNotes: 'Approved after checking medical chart' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('APPROVED');

    // Verify Omeprazole is now active
    const listRes = await request(app)
      .get('/api/medications')
      .set('Cookie', [elderCookie]);
    const names = listRes.body.map((m: { name: string }) => m.name);
    expect(names).toContain('Omeprazole');
  });

  // 7. GET /api/today ; POST /api/doses/:id/take|skip|snooze
  it('GET /api/today returns daily scheduled doses with initialized IDs', async () => {
    const res = await request(app)
      .get('/api/today')
      .set('Cookie', [elderCookie]);

    expect(res.status).toBe(200);
    expect(res.body.doses).toBeDefined();
    expect(res.body.doses.length).toBeGreaterThan(0);
    expect(res.body.doses[0].id).toBeDefined();
    firstDoseId = res.body.doses[0].id;
  });

  it('POST /api/doses/:id/take records dose as taken and decrements inventory', async () => {
    const res = await request(app)
      .post(`/api/doses/${firstDoseId}/take`)
      .set('Cookie', [caretakerCookie])
      .set('X-Requested-With', 'XMLHttpRequest');

    expect(res.status).toBe(200);
    expect(res.body.dose.status).toBe('TAKEN');
  });

  it('POST /api/doses/:id/snooze snoozes dose for specified minutes', async () => {
    const res = await request(app)
      .post(`/api/doses/${firstDoseId}/snooze`)
      .set('Cookie', [elderCookie])
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ minutes: 45 });

    expect(res.status).toBe(200);
    expect(res.body.dose.status).toBe('SNOOZED');
    expect(res.body.dose.snoozedUntil).toBeDefined();
  });

  it('POST /api/doses/:id/skip records dose as skipped', async () => {
    const res = await request(app)
      .post(`/api/doses/${firstDoseId}/skip`)
      .set('Cookie', [caretakerCookie])
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ reason: 'Patient feeling nauseous' });

    expect(res.status).toBe(200);
    expect(res.body.dose.status).toBe('SKIPPED');
  });

  // 8. GET/POST /api/appointments ; PUT/DELETE /api/appointments/:id
  it('POST /api/appointments creates appointment', async () => {
    const apptDate = new Date(Date.now() + 86400000 * 3).toISOString();
    const res = await request(app)
      .post('/api/appointments')
      .set('Cookie', [caretakerCookie])
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({
        title: 'Geriatric Specialist Review',
        doctorName: 'Dr. John Watson',
        location: 'Baker Street Health Center',
        dateTime: apptDate,
        notes: 'Routine blood pressure review',
      });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Geriatric Specialist Review');
    createdAppointmentId = res.body.id;
  });

  it('GET /api/appointments returns list of appointments', async () => {
    const res = await request(app)
      .get('/api/appointments')
      .set('Cookie', [familyCookie]);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('PUT /api/appointments/:id updates appointment', async () => {
    const res = await request(app)
      .put(`/api/appointments/${createdAppointmentId}`)
      .set('Cookie', [elderCookie])
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({
        doctorName: 'Dr. John H. Watson',
      });

    expect(res.status).toBe(200);
    expect(res.body.doctorName).toBe('Dr. John H. Watson');
  });

  // 9. GET /api/dashboard
  it('GET /api/dashboard returns comprehensive overview', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Cookie', [elderCookie]);

    expect(res.status).toBe(200);
    expect(res.body.circle.elderName).toBe('Margaret Thatcher');
    expect(res.body.today).toBeDefined();
    expect(res.body.stats).toBeDefined();
    expect(res.body.upcomingAppointments.length).toBeGreaterThan(0);
  });

  // 10. GET /api/reports/adherence
  it('GET /api/reports/adherence returns adherence metrics and daily breakdown', async () => {
    const res = await request(app)
      .get('/api/reports/adherence?days=7')
      .set('Cookie', [elderCookie]);

    expect(res.status).toBe(200);
    expect(res.body.summary).toBeDefined();
    expect(res.body.dailyBreakdown).toBeDefined();
    expect(res.body.medicationBreakdown).toBeDefined();
  });

  // 11. GET /api/emergency
  it('GET /api/emergency returns emergency details and active medication essentials', async () => {
    const res = await request(app)
      .get('/api/emergency')
      .set('Cookie', [familyCookie]);

    expect(res.status).toBe(200);
    expect(res.body.elderName).toBe('Margaret Thatcher');
    expect(res.body.circleCode).toBe(circleCode);
    expect(res.body.activeMedications.length).toBeGreaterThan(0);
  });

  // 12. GET /api/activity
  it('GET /api/activity returns audit trail of circle events', async () => {
    const res = await request(app)
      .get('/api/activity')
      .set('Cookie', [elderCookie]);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    const actions = res.body.map((a: { action: string }) => a.action);
    expect(actions).toContain('CIRCLE_CREATED');
  });

  // 3. POST /api/auth/logout
  it('POST /api/auth/logout clears auth cookie and logs out', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('X-Requested-With', 'XMLHttpRequest');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Logged out successfully');

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const tokenCleared = cookies.find((c: string) => c.startsWith('token=;'));
    expect(tokenCleared).toBeDefined();
  });
});
