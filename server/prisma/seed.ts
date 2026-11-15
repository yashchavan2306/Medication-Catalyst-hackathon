import { prisma } from '../src/config/db.js';
import { hashPasscode } from '../src/utils/password.js';

async function seed() {
  console.log('Seeding CareCircle demo data...');

  const circleCode = 'CARE-ROSE';
  const elderPasscode = 'ELDER123';
  const caretakerPasscode = 'CARE456';
  const familyPasscode = 'FAM789';

  const [elderHash, caretakerHash, familyHash] = await Promise.all([
    hashPasscode(elderPasscode),
    hashPasscode(caretakerPasscode),
    hashPasscode(familyPasscode),
  ]);

  // Remove existing demo circle if present
  const existing = await prisma.careCircle.findUnique({
    where: { code: circleCode },
  });
  if (existing) {
    await prisma.careCircle.delete({
      where: { id: existing.id },
    });
    console.log('Cleaned up previous demo circle.');
  }

  // Create Care Circle
  const circle = await prisma.careCircle.create({
    data: {
      code: circleCode,
      name: "Grandma Rose's Care Circle",
      elderName: 'Rose Dawson',
      elderEmail: 'rose.dawson@carecircle.local',
      elderPasscodeHash: elderHash,
      caretakerPasscodeHash: caretakerHash,
      familyPasscodeHash: familyHash,
      emergencyContactName: 'Jack Dawson (Grandson)',
      emergencyContactPhone: '(555) 234-5678',
      notes: 'Penicillin allergy. Diabetic diet. Fall risk (uses walking cane). Preferred hospital: St. Jude Memorial.',
      members: {
        create: [
          {
            role: 'elder',
            displayName: 'Rose Dawson',
            passcodeHash: elderHash,
          },
          {
            role: 'caretaker',
            displayName: 'Nurse Sarah Jenkins',
            passcodeHash: caretakerHash,
          },
          {
            role: 'family',
            displayName: 'Jack Dawson',
            passcodeHash: familyHash,
          },
        ],
      },
      circleMembers: {
        create: [
          { role: 'elder', displayName: 'Rose Dawson' },
          { role: 'caretaker', displayName: 'Nurse Sarah Jenkins' },
          { role: 'family', displayName: 'Jack Dawson' },
        ],
      },
    },
  });

  console.log(`Created Circle: ${circle.name} (${circle.code})`);

  // Create Medications
  const lisinopril = await prisma.medication.create({
    data: {
      circleId: circle.id,
      name: 'Lisinopril',
      dosage: '10mg',
      frequency: 'DAILY',
      times: JSON.stringify(['08:00']),
      timesOfDay: JSON.stringify(['08:00']),
      instructions: 'Take in the morning with a full glass of water. Keep track of morning blood pressure.',
      purpose: 'Blood Pressure Control',
      pillCount: 28,
      remainingQuantity: 28,
      refillThreshold: 5,
      status: 'ACTIVE',
      isActive: true,
      createdByName: 'Nurse Sarah Jenkins',
      createdByRole: 'caretaker',
    },
  });

  const metformin = await prisma.medication.create({
    data: {
      circleId: circle.id,
      name: 'Metformin',
      dosage: '500mg',
      frequency: 'TWICE_DAILY',
      times: JSON.stringify(['08:00', '19:00']),
      timesOfDay: JSON.stringify(['08:00', '19:00']),
      instructions: 'Take with food to minimize stomach discomfort. Do not crush tablets.',
      purpose: 'Type 2 Diabetes Blood Sugar Regulation',
      pillCount: 4,
      remainingQuantity: 4,
      refillThreshold: 7, // Low supply! Triggers refill reminder
      status: 'ACTIVE',
      isActive: true,
      createdByName: 'Nurse Sarah Jenkins',
      createdByRole: 'caretaker',
    },
  });

  const atorvastatin = await prisma.medication.create({
    data: {
      circleId: circle.id,
      name: 'Atorvastatin',
      dosage: '20mg',
      frequency: 'DAILY',
      times: JSON.stringify(['20:00']),
      timesOfDay: JSON.stringify(['20:00']),
      instructions: 'Take once daily in the evening at bedtime.',
      purpose: 'Cholesterol & Cardiovascular Health',
      pillCount: 45,
      remainingQuantity: 45,
      refillThreshold: 10,
      status: 'ACTIVE',
      isActive: true,
      createdByName: 'Nurse Sarah Jenkins',
      createdByRole: 'caretaker',
    },
  });

  const vitaminD = await prisma.medication.create({
    data: {
      circleId: circle.id,
      name: 'Vitamin D3',
      dosage: '1000 IU',
      frequency: 'DAILY',
      times: JSON.stringify(['12:00']),
      timesOfDay: JSON.stringify(['12:00']),
      instructions: 'Take with midday lunch.',
      purpose: 'Bone Density & Immune Support',
      pillCount: 60,
      remainingQuantity: 60,
      refillThreshold: 10,
      status: 'ACTIVE',
      isActive: true,
      createdByName: 'Rose Dawson',
      createdByRole: 'elder',
    },
  });

  console.log('Seeded 4 Medications: Lisinopril, Metformin, Atorvastatin, Vitamin D3');

  // Pending Change Request (for hackathon judges to immediately test elder approval workflow)
  await prisma.medicationChangeRequest.create({
    data: {
      circleId: circle.id,
      medicationId: lisinopril.id,
      changeType: 'UPDATE',
      status: 'PENDING',
      currentData: JSON.stringify({
        name: lisinopril.name,
        dosage: lisinopril.dosage,
        instructions: lisinopril.instructions,
      }),
      proposedData: JSON.stringify({
        dosage: '20mg',
        instructions: 'Take 20mg once daily in morning with full glass of water. Dosage adjusted following recent cardiology review.',
      }),
      requestedByRole: 'caretaker',
      requestedByName: 'Nurse Sarah Jenkins',
      reason: 'Dr. Chen recommended increasing to 20mg daily after home systolic readings averaged 145 last week.',
    },
  });

  console.log('Seeded pending change request for Lisinopril dosage increase.');

  // Helper date formatter
  const formatDate = (d: Date) => d.toISOString().split('T')[0]!;
  const today = new Date();
  const todayStr = formatDate(today);

  // Past 6 days adherence history
  const adherenceEntries = [];
  for (let i = 6; i >= 1; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = formatDate(d);

    adherenceEntries.push(
      {
        circleId: circle.id,
        medicationId: lisinopril.id,
        scheduledDate: dateStr,
        scheduledTime: '08:00',
        status: 'TAKEN',
        takenAt: new Date(`${dateStr}T08:15:00Z`),
        recordedByName: 'Rose Dawson',
        recordedByRole: 'elder',
      },
      {
        circleId: circle.id,
        medicationId: metformin.id,
        scheduledDate: dateStr,
        scheduledTime: '08:00',
        status: 'TAKEN',
        takenAt: new Date(`${dateStr}T08:16:00Z`),
        recordedByName: 'Rose Dawson',
        recordedByRole: 'elder',
      },
      {
        circleId: circle.id,
        medicationId: vitaminD.id,
        scheduledDate: dateStr,
        scheduledTime: '12:00',
        status: i === 3 ? 'SKIPPED' : 'TAKEN',
        takenAt: i === 3 ? null : new Date(`${dateStr}T12:30:00Z`),
        recordedByName: 'Rose Dawson',
        recordedByRole: 'elder',
        notes: i === 3 ? 'Lunch away with family, skipped midday supplement' : undefined,
      },
      {
        circleId: circle.id,
        medicationId: metformin.id,
        scheduledDate: dateStr,
        scheduledTime: '19:00',
        status: 'TAKEN',
        takenAt: new Date(`${dateStr}T19:20:00Z`),
        recordedByName: 'Rose Dawson',
        recordedByRole: 'elder',
      },
      {
        circleId: circle.id,
        medicationId: atorvastatin.id,
        scheduledDate: dateStr,
        scheduledTime: '20:00',
        status: 'TAKEN',
        takenAt: new Date(`${dateStr}T20:10:00Z`),
        recordedByName: 'Rose Dawson',
        recordedByRole: 'elder',
      }
    );
  }

  // Today's doses
  adherenceEntries.push(
    {
      circleId: circle.id,
      medicationId: lisinopril.id,
      scheduledDate: todayStr,
      scheduledTime: '08:00',
      status: 'TAKEN',
      takenAt: new Date(`${todayStr}T08:05:00Z`),
      recordedByName: 'Rose Dawson',
      recordedByRole: 'elder',
    },
    {
      circleId: circle.id,
      medicationId: metformin.id,
      scheduledDate: todayStr,
      scheduledTime: '08:00',
      status: 'TAKEN',
      takenAt: new Date(`${todayStr}T08:06:00Z`),
      recordedByName: 'Rose Dawson',
      recordedByRole: 'elder',
    },
    {
      circleId: circle.id,
      medicationId: vitaminD.id,
      scheduledDate: todayStr,
      scheduledTime: '12:00',
      status: 'PENDING',
      takenAt: null,
      recordedByName: null,
      recordedByRole: null,
    },
    {
      circleId: circle.id,
      medicationId: metformin.id,
      scheduledDate: todayStr,
      scheduledTime: '19:00',
      status: 'PENDING',
      takenAt: null,
      recordedByName: null,
      recordedByRole: null,
    },
    {
      circleId: circle.id,
      medicationId: atorvastatin.id,
      scheduledDate: todayStr,
      scheduledTime: '20:00',
      status: 'PENDING',
      takenAt: null,
      recordedByName: null,
      recordedByRole: null,
    }
  );

  for (const entry of adherenceEntries) {
    await prisma.adherenceLog.create({ data: entry });
  }
  console.log(`Seeded ${adherenceEntries.length} adherence logs over 7 days.`);

  // Scheduled Appointments
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  tomorrow.setHours(10, 30, 0, 0);

  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 5);
  nextWeek.setHours(14, 0, 0, 0);

  await prisma.appointment.createMany({
    data: [
      {
        circleId: circle.id,
        title: 'Cardiology Follow-up with Dr. Chen',
        doctorName: 'Dr. Alexander Chen, MD',
        location: 'St. Jude Medical Pavilion, Suite 402',
        dateTime: tomorrow,
        notes: 'Bring home blood pressure log from the last 14 days and list of questions.',
        status: 'UPCOMING',
        createdByRole: 'caretaker',
        createdByName: 'Nurse Sarah Jenkins',
      },
      {
        circleId: circle.id,
        title: 'Endocrinology Routine Review',
        doctorName: 'Dr. Emily Taylor, MD',
        location: 'Metro Health Pavilion, Clinic B',
        dateTime: nextWeek,
        notes: 'Fasting lab work required 2 hours prior to visit at central laboratory.',
        status: 'UPCOMING',
        createdByRole: 'caretaker',
        createdByName: 'Nurse Sarah Jenkins',
      },
    ],
  });
  console.log('Seeded 2 Upcoming Appointments.');

  // Vital Logs (past 4 days)
  const vitalsData = [
    {
      daysAgo: 3,
      sys: 138,
      dia: 84,
      sugar: 118,
      hr: 72,
      mood: 'GOOD',
      notes: 'Morning reading before breakfast. Felt well rested.',
    },
    {
      daysAgo: 2,
      sys: 142,
      dia: 86,
      sugar: 124,
      hr: 74,
      mood: 'OKAY',
      notes: 'Mild headache in the afternoon; blood pressure slightly elevated.',
    },
    {
      daysAgo: 1,
      sys: 136,
      dia: 82,
      sugar: 114,
      hr: 70,
      mood: 'GREAT',
      notes: 'Took a 20-minute walk around the garden.',
    },
    {
      daysAgo: 0,
      sys: 130,
      dia: 80,
      sugar: 108,
      hr: 68,
      mood: 'GREAT',
      notes: 'Feeling energized today after healthy breakfast.',
    },
  ];

  for (const v of vitalsData) {
    const vDate = new Date();
    vDate.setDate(today.getDate() - v.daysAgo);
    vDate.setHours(8, 30, 0, 0);

    await prisma.vitalLog.create({
      data: {
        circleId: circle.id,
        recordedAt: vDate,
        bloodPressureSystolic: v.sys,
        bloodPressureDiastolic: v.dia,
        bloodSugar: v.sugar,
        heartRate: v.hr,
        mood: v.mood,
        notes: v.notes,
        recordedByRole: 'elder',
        recordedByName: 'Rose Dawson',
      },
    });
  }
  console.log('Seeded 4 Vital health records.');

  // Notification Logs
  await prisma.notificationLog.createMany({
    data: [
      {
        circleId: circle.id,
        type: 'LOW_REFILL',
        title: 'Low Refill Alert: Metformin',
        message: 'Metformin has only 4 tablets remaining (threshold is 7). Please contact pharmacy for a refill.',
        isRead: false,
        emailSent: true,
      },
      {
        circleId: circle.id,
        type: 'PENDING_APPROVAL',
        title: 'Medication Change Awaiting Approval',
        message: 'Nurse Sarah requested dosage update for Lisinopril (10mg -> 20mg). Needs Rose Dawson approval.',
        isRead: false,
        emailSent: true,
      },
      {
        circleId: circle.id,
        type: 'APPOINTMENT',
        title: 'Upcoming Appointment Tomorrow',
        message: 'Cardiology Follow-up with Dr. Alexander Chen tomorrow at 10:30 AM.',
        isRead: true,
        emailSent: true,
      },
    ],
  });
  console.log('Seeded 3 Notifications.');

  // Activity Log audit trail
  await prisma.activityLog.createMany({
    data: [
      {
        circleId: circle.id,
        action: 'CIRCLE_CREATED',
        description: 'Care Circle created for Rose Dawson',
        actorRole: 'elder',
        actorName: 'Rose Dawson',
      },
      {
        circleId: circle.id,
        action: 'MEDICATION_CREATED',
        description: 'Nurse Sarah Jenkins added Metformin 500mg',
        actorRole: 'caretaker',
        actorName: 'Nurse Sarah Jenkins',
      },
      {
        circleId: circle.id,
        action: 'CHANGE_REQUEST_CREATED',
        description: 'Nurse Sarah Jenkins requested update for Lisinopril dosage to 20mg',
        actorRole: 'caretaker',
        actorName: 'Nurse Sarah Jenkins',
      },
      {
        circleId: circle.id,
        action: 'DOSE_TAKEN',
        description: 'Rose Dawson took Lisinopril 10mg scheduled for 08:00',
        actorRole: 'elder',
        actorName: 'Rose Dawson',
      },
      {
        circleId: circle.id,
        action: 'DOSE_TAKEN',
        description: 'Rose Dawson took Metformin 500mg scheduled for 08:00',
        actorRole: 'elder',
        actorName: 'Rose Dawson',
      },
    ],
  });
  console.log('Seeded Activity audit trail.');

  console.log('\n=============================================');
  console.log('CareCircle Demo Data Seeded Successfully!');
  console.log('=============================================');
  console.log(`Circle Code:        ${circleCode}`);
  console.log(`Elder Passcode:     ${elderPasscode} (Role: elder - Rose Dawson)`);
  console.log(`Caretaker Passcode: ${caretakerPasscode} (Role: caretaker - Nurse Sarah)`);
  console.log(`Family Passcode:    ${familyPasscode} (Role: family - Jack Dawson)`);
  console.log('=============================================\n');
}

seed()
  .catch((e) => {
    console.error('Failed to seed database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
