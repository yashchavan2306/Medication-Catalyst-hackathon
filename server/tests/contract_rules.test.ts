import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/db.js';
import { sendNotificationWithDedupe } from '../src/services/emailService.js';
import { checkOverdueDoses, checkUpcomingAppointments, checkRefillWarnings } from '../src/services/cronService.js';

const app = createApp();

describe('Contract Rules & Security Specifications Test', () => {
  let circleCode = '';
  let elderPasscode = 'elderSecure1!';
  let caretakerPasscode = 'careSecure1!';
  let familyPasscode = 'famSecure1!';

  let elderCookie = '';
  let caretakerCookie = '';
  let familyCookie = '';

  let elderToken = '';
  let caretakerToken = '';
  let familyToken = '';

  let medicationId = '';
  let changeRequestId = '';

  beforeAll(async () => {
    // 1. Create a fresh circle for testing rules
    const res = await request(app)
      .post('/api/circles')
      .send({
        name: 'Rule Verification Circle',
        elderName: 'Winston Churchill',
        elderEmail: 'winston@carecircle.local',
        elderPasscode,
        caretakerPasscode,
        familyPasscode,
      });

    expect(res.status).toBe(201);
    circleCode = res.body.circleCode;
  });

  // ==========================================
  // 1. LOGIN: SUCCESS / FAILURE / LOCKOUT (5 failures)
  // ==========================================
  describe('Login: Success, Failure & 5-Failure Lockout', () => {
    it('login success: logs in with valid passcode, sets HttpOnly SameSite=Lax cookie and returns member role', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          circleCode,
          passcode: elderPasscode,
        });

      expect(res.status).toBe(200);
      expect(res.body.member.role).toBe('elder');
      expect(res.body.member.displayName).toBe('Winston Churchill');

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const tokenCookie = cookies.find((c: string) => c.startsWith('token='));
      expect(tokenCookie).toBeDefined();
      expect(tokenCookie).toContain('HttpOnly');
      expect(tokenCookie.toLowerCase()).toContain('samesite=lax');

      elderCookie = tokenCookie.split(';')[0];
      elderToken = res.body.token;

      // Log in caretaker
      const careRes = await request(app)
        .post('/api/auth/login')
        .send({ circleCode, passcode: caretakerPasscode, displayName: 'Nurse Clementine' });
      expect(careRes.status).toBe(200);
      caretakerCookie = careRes.headers['set-cookie'].find((c: string) => c.startsWith('token=')).split(';')[0];
      caretakerToken = careRes.body.token;

      // Log in family
      const famRes = await request(app)
        .post('/api/auth/login')
        .send({ circleCode, passcode: familyPasscode, displayName: 'Randolph Family' });
      expect(famRes.status).toBe(200);
      familyCookie = famRes.headers['set-cookie'].find((c: string) => c.startsWith('token=')).split(';')[0];
      familyToken = famRes.body.token;
    });

    it('login failure: incorrect passcode returns 401 INVALID_CREDENTIALS', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          circleCode,
          passcode: 'wrongPasscode1',
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('login lockout: 5 consecutive failed logins trigger 429 ACCOUNT_LOCKED', async () => {
      // Create a separate circle to test lockout without locking out the main test circle
      const circleRes = await request(app)
        .post('/api/circles')
        .send({
          elderName: 'Lockout Test Subject',
          elderPasscode: 'validPass123',
          caretakerPasscode: 'validCare123',
          familyPasscode: 'validFam123',
        });
      const testCode = circleRes.body.circleCode;

      // Fail 4 times -> should return 401
      for (let i = 1; i <= 4; i++) {
        const failRes = await request(app)
          .post('/api/auth/login')
          .send({ circleCode: testCode, passcode: 'badPasscode' });
        expect(failRes.status).toBe(401);
      }

      // 5th attempt -> triggers lockout, returns 429
      const fifthRes = await request(app)
        .post('/api/auth/login')
        .send({ circleCode: testCode, passcode: 'badPasscode' });
      expect(fifthRes.status).toBe(429);
      expect(fifthRes.body.error.code).toBe('ACCOUNT_LOCKED');

      // Subsequent attempt even with the correct passcode is now blocked due to lockout
      const blockedRes = await request(app)
        .post('/api/auth/login')
        .send({ circleCode: testCode, passcode: 'validPass123' });
      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body.error.code).toBe('ACCOUNT_LOCKED');
    });
  });

  // ==========================================
  // 2. CSRF VIA REQUIRED X-REQUESTED-WITH HEADER
  // ==========================================
  describe('CSRF via required X-Requested-With header', () => {
    it('blocks mutating cookie-authenticated requests without X-Requested-With header (403 CSRF_FORBIDDEN)', async () => {
      const res = await request(app)
        .post('/api/medications')
        .set('Cookie', [elderCookie])
        // deliberately omitting X-Requested-With
        .send({
          name: 'ForbiddenMed',
          dosage: '10mg',
          frequency: 'Daily',
          timesOfDay: ['09:00'],
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CSRF_FORBIDDEN');
    });

    it('allows mutating requests when X-Requested-With header is present', async () => {
      const res = await request(app)
        .post('/api/medications')
        .set('Cookie', [elderCookie])
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({
          name: 'AllowedMed',
          dosage: '10mg',
          frequency: 'Daily',
          timesOfDay: ['09:00'],
          remainingQuantity: 20,
        });

      expect(res.status).toBe(201);
      expect(res.body.medication.name).toBe('AllowedMed');
    });
  });

  // ==========================================
  // 3. ROLE ENFORCEMENT (elder, caretaker, family read-only)
  // ==========================================
  describe('Role Enforcement & Family Read-Only', () => {
    it('denies Family members from adding medications (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/medications')
        .set('Cookie', [familyCookie])
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({
          name: 'Unauthorized Drug',
          dosage: '5mg',
          frequency: 'Daily',
          timesOfDay: ['10:00'],
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('denies Family members from logging or changing dose status (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/adherence/log')
        .set('Authorization', `Bearer ${familyToken}`)
        .send({
          medicationId: 'any-id',
          scheduledDate: '2026-11-15',
          scheduledTime: '08:00',
          status: 'TAKEN',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('denies Family members from creating or updating appointments (403 Forbidden)', async () => {
      const futureDate = new Date(Date.now() + 86400000 * 2).toISOString();
      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${familyToken}`)
        .send({
          title: 'Family Booked Checkup',
          doctorName: 'Dr. House',
          location: 'Princeton Hospital',
          dateTime: futureDate,
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('allows Family members to read medications and appointments (200 OK)', async () => {
      const medRes = await request(app)
        .get('/api/medications')
        .set('Cookie', [familyCookie]);
      expect(medRes.status).toBe(200);

      const apptRes = await request(app)
        .get('/api/appointments')
        .set('Cookie', [familyCookie]);
      expect(apptRes.status).toBe(200);
    });
  });

  // ==========================================
  // 4. APPROVAL FLOW (caretaker -> PENDING_APPROVAL -> elder approves/rejects)
  // ==========================================
  describe('Medication Change Approval Flow', () => {
    it('caretaker addition goes to PENDING_APPROVAL and creates MedicationChangeRequest', async () => {
      const res = await request(app)
        .post('/api/medications')
        .set('Cookie', [caretakerCookie])
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({
          name: 'Warfarin',
          dosage: '5mg',
          frequency: 'Once daily at evening',
          timesOfDay: ['18:00'],
          purpose: 'Blood thinner',
          remainingQuantity: 30,
          refillThreshold: 5,
          reason: 'Advised by hematology',
        });

      expect(res.status).toBe(202);
      expect(res.body.status).toBe('PENDING_APPROVAL');
      expect(res.body.changeRequest).toBeDefined();
      expect(res.body.changeRequest.changeType).toBe('CREATE');
      changeRequestId = res.body.changeRequest.id;

      // Ensure Warfarin is not yet in the active medication list
      const activeRes = await request(app)
        .get('/api/medications')
        .set('Cookie', [elderCookie]);
      const activeNames = activeRes.body.map((m: { name: string }) => m.name);
      expect(activeNames).not.toContain('Warfarin');
    });

    it('denies Caretaker or Family from approving change request (elder only, 403 Forbidden)', async () => {
      const careApprove = await request(app)
        .post(`/api/approvals/${changeRequestId}/approve`)
        .set('Cookie', [caretakerCookie])
        .set('X-Requested-With', 'XMLHttpRequest');
      expect(careApprove.status).toBe(403);

      const famApprove = await request(app)
        .post(`/api/approvals/${changeRequestId}/approve`)
        .set('Cookie', [familyCookie])
        .set('X-Requested-With', 'XMLHttpRequest');
      expect(famApprove.status).toBe(403);
    });

    it('allows Elder to approve the change request, activating the medication', async () => {
      const res = await request(app)
        .post(`/api/approvals/${changeRequestId}/approve`)
        .set('Cookie', [elderCookie])
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({ reviewNotes: 'Approved after checking chart' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('APPROVED');

      // Verify Warfarin is now active
      const activeRes = await request(app)
        .get('/api/medications')
        .set('Cookie', [elderCookie]);
      const activeNames = activeRes.body.map((m: { name: string }) => m.name);
      expect(activeNames).toContain('Warfarin');
    });
  });

  // ==========================================
  // 5. PILL DECREMENT ON TAKING A DOSE
  // ==========================================
  describe('Pill Count Decrement on Dose Taken', () => {
    let testMedId = '';
    let doseId = '';

    beforeAll(async () => {
      // Elder adds medication with starting inventory of 3 pills (refillThreshold: 2)
      const medRes = await request(app)
        .post('/api/medications')
        .set('Cookie', [elderCookie])
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({
          name: 'Hydrochlorothiazide',
          dosage: '25mg',
          frequency: 'Daily morning',
          timesOfDay: ['08:00'],
          remainingQuantity: 3,
          refillThreshold: 2,
        });

      testMedId = medRes.body.medication.id;

      // Fetch today's doses to initialize the dose log
      const todayRes = await request(app)
        .get('/api/today')
        .set('Cookie', [elderCookie]);

      const foundDose = todayRes.body.doses.find((d: { medicationId: string }) => d.medicationId === testMedId);
      doseId = foundDose.id;
    });

    it('taking a dose decrements pillCount and remainingQuantity from 3 to 2', async () => {
      const res = await request(app)
        .post(`/api/doses/${doseId}/take`)
        .set('Cookie', [caretakerCookie])
        .set('X-Requested-With', 'XMLHttpRequest');

      expect(res.status).toBe(200);
      expect(res.body.dose.status).toBe('TAKEN');
      expect(res.body.remainingQuantity).toBe(2);
      expect(res.body.pillCount).toBe(2);

      // Verify in DB directly
      const dbMed = await prisma.medication.findUnique({ where: { id: testMedId } });
      expect(dbMed?.pillCount).toBe(2);
      expect(dbMed?.remainingQuantity).toBe(2);
    });

    it('skipping a dose does NOT decrement pill count', async () => {
      // Skip dose
      const res = await request(app)
        .post(`/api/doses/${doseId}/skip`)
        .set('Cookie', [caretakerCookie])
        .set('X-Requested-With', 'XMLHttpRequest')
        .send({ reason: 'Patient skipped' });

      expect(res.status).toBe(200);
      expect(res.body.dose.status).toBe('SKIPPED');

      // Verify pill count remained 2
      const dbMed = await prisma.medication.findUnique({ where: { id: testMedId } });
      expect(dbMed?.pillCount).toBe(2);
    });
  });

  // ==========================================
  // 6. NOTIFICATIONLOG DEDUPE
  // ==========================================
  describe('NotificationLog Deduplication', () => {
    it('enforces dedupeKey unique constraint and prevents duplicate notifications and emails', async () => {
      const dedupeKey = `test-dedupe-key-${Date.now()}`;

      // First send: should succeed and return true
      const firstResult = await sendNotificationWithDedupe({
        circleId: (await prisma.careCircle.findFirst({ where: { code: circleCode } }))!.id,
        type: 'MISSED_DOSE',
        title: 'Unique Alert',
        message: 'This alert should only be logged once.',
        dedupeKey,
        emailTo: 'test@carecircle.local',
        emailSubject: 'Unique Alert Test',
        emailHtml: '<p>Test Alert</p>',
      });
      expect(firstResult).toBe(true);

      // Second send with the exact same dedupeKey: should return false (deduped)
      const secondResult = await sendNotificationWithDedupe({
        circleId: (await prisma.careCircle.findFirst({ where: { code: circleCode } }))!.id,
        type: 'MISSED_DOSE',
        title: 'Duplicate Alert Attempt',
        message: 'This should be suppressed by dedupeKey.',
        dedupeKey,
        emailTo: 'test@carecircle.local',
        emailSubject: 'Duplicate Alert Test',
        emailHtml: '<p>Test Alert</p>',
      });
      expect(secondResult).toBe(false);

      // Verify database contains only 1 row for this dedupeKey
      const count = await prisma.notificationLog.count({
        where: { dedupeKey },
      });
      expect(count).toBe(1);
    });
  });
});
