import { prisma } from '../src/config/db.js';
import { hashPasscode } from '../src/utils/password.js';
import { getCurrentDateString } from '../src/utils/date.js';

async function seed() {
  console.log('\n======================================================');
  console.log('   🌱 SEEDING CARECIRCLE DEMO ENVIRONMENT');
  console.log('======================================================\n');

  // Clear existing demo circle if present to allow idempotent re-runs
  const demoCode = 'CARE-1001';
  const existingCircle = await prisma.careCircle.findUnique({
    where: { code: demoCode },
  });

  if (existingCircle) {
    console.log(`Cleaning up existing demo circle ${demoCode}...`);
    await prisma.careCircle.delete({ where: { id: existingCircle.id } });
  }

  // 1. Passcodes and hashing
  const demoPasscodes = {
    elder: 'elder123',
    caretaker: 'care123',
    family: 'fam123',
  };

  const [elderHash, caretakerHash, familyHash] = await Promise.all([
    hashPasscode(demoPasscodes.elder),
    hashPasscode(demoPasscodes.caretaker),
    hashPasscode(demoPasscodes.family),
  ]);

  // 2. Create CareCircle and Members
  const circle = await prisma.careCircle.create({
    data: {
      code: demoCode,
      name: "Eleanor Vance's Circle",
      elderName: 'Eleanor Vance',
      elderEmail: 'eleanor.vance@carecircle.local',
      elderPasscodeHash: elderHash,
      caretakerPasscodeHash: caretakerHash,
      familyPasscodeHash: familyHash,
      emergencyContactName: 'Dr. Robert Vance',
      emergencyContactPhone: '+1 (555) 019-2831',
      notes: 'Penicillin allergy. Prefers morning appointments.',
      members: {
        create: [
          {
            role: 'elder',
            displayName: 'Eleanor Vance',
            passcodeHash: elderHash,
          },
          {
            role: 'caretaker',
            displayName: 'Nurse Maria Santos',
            passcodeHash: caretakerHash,
          },
          {
            role: 'family',
            displayName: 'David Vance (Son)',
            passcodeHash: familyHash,
          },
        ],
      },
      circleMembers: {
        create: [
          {
            role: 'elder',
            displayName: 'Eleanor Vance',
          },
          {
            role: 'caretaker',
            displayName: 'Nurse Maria Santos',
          },
          {
            role: 'family',
            displayName: 'David Vance (Son)',
          },
        ],
      },
    },
    include: {
      members: true,
    },
  });

  console.log(`✓ Created Demo Circle: "${circle.name}" [Code: ${circle.code}]`);

  // 3. Create 5 Medications
  const medsData = [
    {
      name: 'Lisinopril',
      dosage: '10mg',
      frequency: 'Once daily morning with water',
      timesOfDay: ['08:00'],
      instructions: 'Take 1 tablet every morning with a full glass of water.',
      purpose: 'Hypertension (Blood Pressure)',
      pillCount: 28,
      refillThreshold: 5,
    },
    {
      name: 'Metformin',
      dosage: '500mg',
      frequency: 'Twice daily with meals',
      timesOfDay: ['08:00', '20:00'],
      instructions: 'Take with breakfast and dinner to minimize stomach upset.',
      purpose: 'Type 2 Diabetes',
      pillCount: 46,
      refillThreshold: 10,
    },
    {
      name: 'Atorvastatin',
      dosage: '20mg',
      frequency: 'Once daily at bedtime',
      timesOfDay: ['21:00'],
      instructions: 'Take at night before bed.',
      purpose: 'Cholesterol & Heart Protection',
      pillCount: 4, // Below threshold -> triggers refill warning
      refillThreshold: 5,
    },
    {
      name: 'Levothyroxine',
      dosage: '50mcg',
      frequency: 'Once daily 30m before breakfast',
      timesOfDay: ['07:00'],
      instructions: 'Take immediately upon waking on an empty stomach.',
      purpose: 'Hypothyroidism',
      pillCount: 26,
      refillThreshold: 5,
    },
    {
      name: 'Omeprazole',
      dosage: '20mg',
      frequency: 'Once daily before morning meal',
      timesOfDay: ['08:00'],
      instructions: 'Swallow whole with water.',
      purpose: 'Acid Reflux / GERD',
      pillCount: 20,
      refillThreshold: 5,
    },
  ];

  const createdMeds = [];
  for (const m of medsData) {
    const timesJson = JSON.stringify(m.timesOfDay);
    const med = await prisma.medication.create({
      data: {
        circleId: circle.id,
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        status: 'ACTIVE',
        times: timesJson,
        timesOfDay: timesJson,
        instructions: m.instructions,
        purpose: m.purpose,
        pillCount: m.pillCount,
        remainingQuantity: m.pillCount,
        refillThreshold: m.refillThreshold,
        isActive: true,
        createdByRole: 'elder',
        createdByName: 'Eleanor Vance',
      },
    });
    createdMeds.push(med);
    console.log(`  - Med: ${med.name} (${med.dosage}) - ${med.remainingQuantity} pills left`);
  }

  // 4. Create 14 days of dose history
  console.log('\nGenerating 14 days of historical DoseLogs & AdherenceLogs...');
  const now = new Date();
  let historyLogsCount = 0;

  for (let d = 14; d >= 1; d--) {
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() - d);
    const dateStr = getCurrentDateString(targetDate);

    for (const med of createdMeds) {
      const times: string[] = JSON.parse(med.timesOfDay);
      for (const time of times) {
        // Deterministic realistic adherence pattern
        // Mostly TAKEN, occasional SKIPPED or MISSED
        const rand = (d * 17 + med.name.length * 7 + time.charCodeAt(1)) % 100;
        let status = 'TAKEN';
        let notes: string | null = null;
        let takenAt: Date | null = null;

        if (rand < 82) {
          status = 'TAKEN';
          const [h, min] = time.split(':').map(Number);
          const tDate = new Date(targetDate);
          tDate.setHours(h, min + 5, 0, 0);
          takenAt = tDate;
        } else if (rand < 92) {
          status = 'SKIPPED';
          notes = 'Mild nausea reported before scheduled dose';
        } else {
          status = 'MISSED';
          notes = 'Dose not taken within time window';
        }

        await Promise.all([
          prisma.doseLog.create({
            data: {
              circleId: circle.id,
              medicationId: med.id,
              scheduledDate: dateStr,
              scheduledTime: time,
              status,
              takenAt,
              recordedByRole: status === 'TAKEN' ? 'elder' : 'caretaker',
              recordedByName: status === 'TAKEN' ? 'Eleanor Vance' : 'Nurse Maria Santos',
              notes,
            },
          }),
          prisma.adherenceLog.create({
            data: {
              circleId: circle.id,
              medicationId: med.id,
              scheduledDate: dateStr,
              scheduledTime: time,
              status,
              takenAt,
              recordedByRole: status === 'TAKEN' ? 'elder' : 'caretaker',
              recordedByName: status === 'TAKEN' ? 'Eleanor Vance' : 'Nurse Maria Santos',
              notes,
            },
          }),
        ]);
        historyLogsCount++;
      }
    }
  }

  // Doses for Today
  const todayStr = getCurrentDateString(now);
  for (const med of createdMeds) {
    const times: string[] = JSON.parse(med.timesOfDay);
    for (const time of times) {
      // 07:00 dose already taken, others pending
      const isMorningTaken = time === '07:00';
      await Promise.all([
        prisma.doseLog.create({
          data: {
            circleId: circle.id,
            medicationId: med.id,
            scheduledDate: todayStr,
            scheduledTime: time,
            status: isMorningTaken ? 'TAKEN' : 'PENDING',
            takenAt: isMorningTaken ? new Date() : null,
            recordedByRole: isMorningTaken ? 'elder' : 'system',
            recordedByName: isMorningTaken ? 'Eleanor Vance' : 'Scheduled',
          },
        }),
        prisma.adherenceLog.create({
          data: {
            circleId: circle.id,
            medicationId: med.id,
            scheduledDate: todayStr,
            scheduledTime: time,
            status: isMorningTaken ? 'TAKEN' : 'PENDING',
            takenAt: isMorningTaken ? new Date() : null,
            recordedByRole: isMorningTaken ? 'elder' : 'system',
            recordedByName: isMorningTaken ? 'Eleanor Vance' : 'Scheduled',
          },
        }),
      ]);
      historyLogsCount++;
    }
  }
  console.log(`✓ Generated ${historyLogsCount} historical and scheduled dose records`);

  // 5. Create 4 Appointments with questions Json
  console.log('\nCreating 4 appointments...');
  const apptsData = [
    {
      title: 'Cardiology Review & Echo Exam',
      doctorName: 'Dr. William Bell',
      location: 'St. Jude Heart Center, Suite 300',
      dateTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days future
      notes: 'Bring BP log from the past 2 weeks.',
      questions: [
        'Review Lisinopril dosage based on recent morning readings',
        'Inquire about mild evening ankle swelling',
        'Confirm if echocardiogram results from last month are available',
      ],
      status: 'UPCOMING',
    },
    {
      title: 'Diabetic Retinopathy Screening',
      doctorName: 'Dr. Clara Oswald',
      location: 'Metropolitan Eye Clinic, Room 102',
      dateTime: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000), // 8 days future
      notes: 'Eyes will be dilated; arranged transport with David.',
      questions: [
        'Annual diabetic retinal scan checkup',
        'Discuss occasional dryness in right eye',
      ],
      status: 'UPCOMING',
    },
    {
      title: 'Routine Blood Work (Fasting Panel)',
      doctorName: 'Dr. John Watson',
      location: 'Quest Diagnostics West Center',
      dateTime: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000), // 15 days future
      notes: 'Fasting required for 10 hours prior to appointment.',
      questions: [
        'Fasting Blood Glucose and HbA1c',
        'Comprehensive Lipid Profile (Statin efficacy check)',
        'Kidney & Liver Panel (GFR, Creatinine, AST/ALT)',
      ],
      status: 'UPCOMING',
    },
    {
      title: 'Comprehensive Geriatric Annual Assessment',
      doctorName: 'Dr. John Watson',
      location: 'Baker Street Medical Practice',
      dateTime: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000), // 25 days past
      notes: 'Annual physical completed. Eleanor is alert and well.',
      questions: [
        'Cognitive screening (MMSE score: 29/30)',
        'Mobility & fall risk assessment (Low risk)',
      ],
      status: 'COMPLETED',
    },
  ];

  for (const a of apptsData) {
    const appt = await prisma.appointment.create({
      data: {
        circleId: circle.id,
        title: a.title,
        doctorName: a.doctorName,
        location: a.location,
        dateTime: a.dateTime,
        notes: a.notes,
        questions: JSON.stringify(a.questions),
        status: a.status,
        createdByRole: 'caretaker',
        createdByName: 'Nurse Maria Santos',
      },
    });
    console.log(`  - Appt: [${appt.status}] ${appt.title} with ${appt.doctorName}`);
  }

  // 6. Create Low Refill Notification with Dedupe
  await prisma.notificationLog.create({
    data: {
      circleId: circle.id,
      type: 'LOW_REFILL',
      title: 'Low Refill Alert: Atorvastatin',
      message: 'Atorvastatin (20mg) has only 4 pills remaining (threshold: 5).',
      dedupeKey: `refill-warning:${createdMeds[2].id}:4`,
      isRead: false,
      emailSent: true,
    },
  });

  // 7. Audit log for seed creation
  await prisma.auditLog.create({
    data: {
      circleId: circle.id,
      action: 'ENVIRONMENT_SEEDED',
      actorRole: 'system',
      actorName: 'Seed Script',
      details: 'Populated demo care circle with 5 meds, 14 days history, and 4 appointments',
    },
  });

  console.log('\n======================================================');
  console.log('   🎉 DEMO CARE CIRCLE CREATED SUCCESSFULLY!');
  console.log('======================================================');
  console.log(` Circle Code : ${circle.code}`);
  console.log(` Elder Name  : ${circle.elderName}`);
  console.log('------------------------------------------------------');
  console.log(' KNOWN DEMO PASSCODES:');
  console.log(`   🔑 Elder Passcode     : ${demoPasscodes.elder}`);
  console.log(`   🔑 Caretaker Passcode : ${demoPasscodes.caretaker}`);
  console.log(`   🔑 Family Passcode    : ${demoPasscodes.family}`);
  console.log('------------------------------------------------------');
  console.log(' Medications : 5 (Lisinopril, Metformin, Atorvastatin, Levothyroxine, Omeprazole)');
  console.log(' Dose History: 14 days of realistic logs');
  console.log(' Appointments: 4 (3 upcoming, 1 completed with questions JSON)');
  console.log('======================================================\n');
}

seed()
  .catch((e) => {
    console.error('Seed script error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
