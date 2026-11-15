import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/db.js';

const app = createApp();

describe('Medications & Approval Workflow API', () => {
  let elderToken = '';
  let caretakerToken = '';
  let familyToken = '';
  let elderMedId = '';
  let caretakerRequestId = '';

  beforeAll(async () => {
    // Setup test circle
    const createRes = await request(app)
      .post('/api/auth/create-circle')
      .send({
        name: "Arthur's Circle",
        elderName: 'Arthur Dent',
        elderPasscode: 'arthur123',
        caretakerPasscode: 'ford123',
        familyPasscode: 'trillian123',
      });

    elderToken = createRes.body.token;
    const code = createRes.body.circle.code;

    const careRes = await request(app)
      .post('/api/auth/login')
      .send({ circleCode: code, passcode: 'ford123', displayName: 'Ford Caretaker' });
    caretakerToken = careRes.body.token;

    const famRes = await request(app)
      .post('/api/auth/login')
      .send({ circleCode: code, passcode: 'trillian123', displayName: 'Trillian Family' });
    familyToken = famRes.body.token;
  });

  it('allows Elder to add medication directly with immediate effect', async () => {
    const res = await request(app)
      .post('/api/medications')
      .set('Authorization', `Bearer ${elderToken}`)
      .send({
        name: 'Metformin',
        dosage: '500mg',
        frequency: 'Twice daily with meals',
        timesOfDay: ['08:00', '19:00'],
        purpose: 'Type 2 Diabetes',
        remainingQuantity: 60,
        refillThreshold: 10,
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('CREATED');
    expect(res.body.medication.name).toBe('Metformin');
    expect(res.body.medication.timesOfDay).toEqual(['08:00', '19:00']);
    elderMedId = res.body.medication.id;
  });

  it('requires Caretaker medication additions to go through Elder approval', async () => {
    const res = await request(app)
      .post('/api/medications')
      .set('Authorization', `Bearer ${caretakerToken}`)
      .send({
        name: 'Amlodipine',
        dosage: '5mg',
        frequency: 'Once daily in the morning',
        timesOfDay: ['08:00'],
        purpose: 'Hypertension',
        remainingQuantity: 30,
        refillThreshold: 5,
        reason: 'Recommended by cardiologist Dr. Adams',
      });

    expect(res.status).toBe(202);
    expect(res.body.status).toBe('PENDING_APPROVAL');
    expect(res.body.changeRequest).toBeDefined();
    expect(res.body.changeRequest.changeType).toBe('CREATE');
    caretakerRequestId = res.body.changeRequest.id;

    // Verify Amlodipine is NOT yet in active medications list
    const medList = await request(app)
      .get('/api/medications')
      .set('Authorization', `Bearer ${elderToken}`);
    const activeNames = medList.body.map((m: { name: string }) => m.name);
    expect(activeNames).not.toContain('Amlodipine');
  });

  it('denies Family members from adding medications (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/medications')
      .set('Authorization', `Bearer ${familyToken}`)
      .send({
        name: 'Vitamin D',
        dosage: '1000 IU',
        frequency: 'Daily',
        timesOfDay: ['10:00'],
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('allows Elder to review and approve the pending change request', async () => {
    const approveRes = await request(app)
      .post(`/api/approvals/${caretakerRequestId}/approve`)
      .set('Authorization', `Bearer ${elderToken}`)
      .send({ reviewNotes: 'Approved after checking with doctor' });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.status).toBe('APPROVED');

    // Amlodipine should now be present in active medications!
    const medList = await request(app)
      .get('/api/medications')
      .set('Authorization', `Bearer ${caretakerToken}`);
    const activeNames = medList.body.map((m: { name: string }) => m.name);
    expect(activeNames).toContain('Amlodipine');
  });

  it('requires Caretaker edits to go through Elder approval, which Elder can reject', async () => {
    const editRes = await request(app)
      .patch(`/api/medications/${elderMedId}`)
      .set('Authorization', `Bearer ${caretakerToken}`)
      .send({
        dosage: '1000mg',
        reason: 'Higher dose requested',
      });

    expect(editRes.status).toBe(202);
    const updateRequestId = editRes.body.changeRequest.id;

    // Elder rejects the request
    const rejectRes = await request(app)
      .post(`/api/approvals/${updateRequestId}/reject`)
      .set('Authorization', `Bearer ${elderToken}`)
      .send({ reviewNotes: 'Too high dosage for now' });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.status).toBe('REJECTED');

    // Medication should still retain original dosage (500mg)
    const checkMed = await request(app)
      .get(`/api/medications/${elderMedId}`)
      .set('Authorization', `Bearer ${elderToken}`);
    expect(checkMed.body.dosage).toBe('500mg');
  });

  it('allows Caretaker to submit deletion request which deactivates med upon Elder approval', async () => {
    const delReq = await request(app)
      .delete(`/api/medications/${elderMedId}`)
      .set('Authorization', `Bearer ${caretakerToken}`);

    expect(delReq.status).toBe(202);
    const delRequestId = delReq.body.changeRequest.id;

    // Elder approves deletion
    const approveDel = await request(app)
      .post(`/api/approvals/${delRequestId}/approve`)
      .set('Authorization', `Bearer ${elderToken}`);

    expect(approveDel.status).toBe(200);

    // Active med list should not include deactivated medication
    const activeList = await request(app)
      .get('/api/medications')
      .set('Authorization', `Bearer ${elderToken}`);
    const ids = activeList.body.map((m: { id: string }) => m.id);
    expect(ids).not.toContain(elderMedId);
  });
});
