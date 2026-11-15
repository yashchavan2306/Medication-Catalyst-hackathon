import cron from 'node-cron';
import { prisma } from '../config/db.js';
import { getCurrentDateString } from '../utils/date.js';
import { sendNotificationWithDedupe } from './emailService.js';
import { recordActivity } from '../utils/activity.js';

/**
 * Scan for doses scheduled for today where time has passed:
 * - After 30 minutes: mark MISSED and email the caretaker.
 * - After 60 minutes: email the family.
 * Uses NotificationLog dedupeKey so alerts are never sent twice.
 */
export async function checkOverdueDoses(referenceNow = new Date()): Promise<number> {
  const today = getCurrentDateString(referenceNow);

  // Fetch pending doses from DoseLog
  const pendingDoses = await prisma.doseLog.findMany({
    where: {
      scheduledDate: today,
      status: 'PENDING',
    },
    include: {
      medication: true,
      circle: true,
    },
  });

  let processedCount = 0;

  for (const dose of pendingDoses) {
    const [hoursStr, minutesStr] = dose.scheduledTime.split(':');
    const hours = parseInt(hoursStr ?? '0', 10);
    const minutes = parseInt(minutesStr ?? '0', 10);
    const scheduledDateTime = new Date(referenceNow);
    scheduledDateTime.setHours(hours, minutes, 0, 0);

    const diffMinutes = Math.floor(
      (referenceNow.getTime() - scheduledDateTime.getTime()) / (1000 * 60)
    );

    // 30 min past scheduled time: mark MISSED and notify caretaker
    if (diffMinutes >= 30) {
      // Mark dose as MISSED in DoseLog and AdherenceLog
      await Promise.all([
        prisma.doseLog.update({
          where: { id: dose.id },
          data: { status: 'MISSED' },
        }),
        prisma.adherenceLog
          .updateMany({
            where: {
              medicationId: dose.medicationId,
              scheduledDate: dose.scheduledDate,
              scheduledTime: dose.scheduledTime,
            },
            data: { status: 'MISSED' },
          })
          .catch(() => null),
      ]);

      await recordActivity({
        circleId: dose.circleId,
        action: 'DOSE_MISSED',
        description: `Scheduled dose of ${dose.medication.name} at ${dose.scheduledTime} was marked MISSED (>30m)`,
        actorRole: 'system',
        actorName: 'System Cron',
        targetType: 'DoseLog',
        targetId: dose.id,
      });

      // Email caretaker
      const caretakerDedupeKey = `missed-dose:${dose.id}:caretaker:30m`;
      const caretakerEmail = dose.circle.elderEmail || 'caretaker@carecircle.local';

      await sendNotificationWithDedupe({
        circleId: dose.circleId,
        type: 'MISSED_DOSE',
        title: `Missed Dose Alert: ${dose.medication.name}`,
        message: `${dose.circle.elderName} missed their scheduled ${dose.medication.name} (${dose.medication.dosage}) at ${dose.scheduledTime}.`,
        dedupeKey: caretakerDedupeKey,
        emailTo: caretakerEmail,
        emailSubject: `[CareCircle Alert] Missed Dose: ${dose.medication.name} at ${dose.scheduledTime}`,
        emailHtml: `
          <h3>Missed Medication Alert</h3>
          <p><strong>Elder:</strong> ${dose.circle.elderName}</p>
          <p><strong>Medication:</strong> ${dose.medication.name} (${dose.medication.dosage})</p>
          <p><strong>Scheduled Time:</strong> ${dose.scheduledTime}</p>
          <p>The dose was not recorded within 30 minutes of scheduled time.</p>
        `,
      });

      processedCount++;
    }

    // 60 min past scheduled time: escalate and email family
    if (diffMinutes >= 60) {
      const familyDedupeKey = `missed-dose:${dose.id}:family:60m`;
      const familyEmail = dose.circle.elderEmail || 'family@carecircle.local';

      await sendNotificationWithDedupe({
        circleId: dose.circleId,
        type: 'MISSED_DOSE',
        title: `Overdue Dose Escalation: ${dose.medication.name}`,
        message: `${dose.circle.elderName}'s dose of ${dose.medication.name} is now over 60 minutes overdue.`,
        dedupeKey: familyDedupeKey,
        emailTo: familyEmail,
        emailSubject: `[CareCircle Urgent] Unconfirmed Dose for ${dose.circle.elderName}: ${dose.medication.name}`,
        emailHtml: `
          <h3>Urgent Dose Escalation</h3>
          <p><strong>Elder:</strong> ${dose.circle.elderName}</p>
          <p><strong>Medication:</strong> ${dose.medication.name} (${dose.medication.dosage})</p>
          <p><strong>Scheduled Time:</strong> ${dose.scheduledTime}</p>
          <p>The scheduled dose has not been marked as taken after 60 minutes. Please check in with ${dose.circle.elderName}.</p>
        `,
      });
    }
  }

  return processedCount;
}

/**
 * Scan for upcoming appointments and send reminders at 24h and 2h before the appointment.
 * Uses dedupeKey to ensure each reminder is sent exactly once.
 */
export async function checkUpcomingAppointments(referenceNow = new Date()): Promise<number> {
  const upcoming = await prisma.appointment.findMany({
    where: {
      status: 'UPCOMING',
      dateTime: {
        gte: referenceNow,
      },
    },
    include: {
      circle: true,
    },
  });

  let notifiedCount = 0;

  for (const appt of upcoming) {
    const diffMs = appt.dateTime.getTime() - referenceNow.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    const recipientEmail = appt.circle.elderEmail || 'member@carecircle.local';

    // 24-hour reminder (window: between 0 and 24 hours)
    if (diffHours <= 24 && diffHours > 2) {
      const dedupeKey = `appt-reminder:${appt.id}:24h`;
      const sent = await sendNotificationWithDedupe({
        circleId: appt.circleId,
        type: 'APPOINTMENT',
        title: `Appointment Tomorrow: ${appt.title}`,
        message: `Reminder: ${appt.title} with ${appt.doctorName} at ${appt.location} is scheduled for tomorrow at ${appt.dateTime.toLocaleTimeString()}.`,
        dedupeKey,
        emailTo: recipientEmail,
        emailSubject: `[Reminder - 24h] Upcoming Appointment: ${appt.title}`,
        emailHtml: `
          <h3>Upcoming Appointment in 24 Hours</h3>
          <p><strong>Title:</strong> ${appt.title}</p>
          <p><strong>Doctor:</strong> ${appt.doctorName}</p>
          <p><strong>Location:</strong> ${appt.location}</p>
          <p><strong>Date & Time:</strong> ${appt.dateTime.toLocaleString()}</p>
          ${appt.notes ? `<p><strong>Notes:</strong> ${appt.notes}</p>` : ''}
        `,
      });
      if (sent) notifiedCount++;
    }

    // 2-hour reminder (window: between 0 and 2 hours)
    if (diffHours <= 2 && diffHours > 0) {
      const dedupeKey = `appt-reminder:${appt.id}:2h`;
      const sent = await sendNotificationWithDedupe({
        circleId: appt.circleId,
        type: 'APPOINTMENT',
        title: `Appointment in 2 Hours: ${appt.title}`,
        message: `Reminder: ${appt.title} with ${appt.doctorName} at ${appt.location} starts in 2 hours (${appt.dateTime.toLocaleTimeString()}).`,
        dedupeKey,
        emailTo: recipientEmail,
        emailSubject: `[Reminder - 2h] Appointment Soon: ${appt.title}`,
        emailHtml: `
          <h3>Appointment Starting Soon (2h)</h3>
          <p><strong>Title:</strong> ${appt.title}</p>
          <p><strong>Doctor:</strong> ${appt.doctorName}</p>
          <p><strong>Location:</strong> ${appt.location}</p>
          <p><strong>Date & Time:</strong> ${appt.dateTime.toLocaleString()}</p>
        `,
      });
      if (sent) notifiedCount++;
    }
  }

  return notifiedCount;
}

/**
 * Scan for active medications where pillCount is at or below refillThreshold.
 * Deduplicated per medication pill count so warning only alerts once per count state.
 */
export async function checkRefillWarnings(): Promise<number> {
  const activeMeds = await prisma.medication.findMany({
    where: {
      status: 'ACTIVE',
      isActive: true,
    },
    include: {
      circle: true,
    },
  });

  let warnedCount = 0;

  for (const med of activeMeds) {
    const currentCount = med.pillCount !== undefined ? med.pillCount : med.remainingQuantity;
    if (currentCount <= med.refillThreshold) {
      const dedupeKey = `refill-warning:${med.id}:${currentCount}`;
      const recipientEmail = med.circle.elderEmail || 'caretaker@carecircle.local';

      const sent = await sendNotificationWithDedupe({
        circleId: med.circleId,
        type: 'LOW_REFILL',
        title: `Low Refill Alert: ${med.name}`,
        message: `${med.name} is running low! Only ${currentCount} pills remaining (refill threshold: ${med.refillThreshold}).`,
        dedupeKey,
        emailTo: recipientEmail,
        emailSubject: `[CareCircle Refill Warning] ${med.name} is Low (${currentCount} left)`,
        emailHtml: `
          <h3>Medication Refill Warning</h3>
          <p><strong>Medication:</strong> ${med.name} (${med.dosage})</p>
          <p><strong>Current Pill Count:</strong> ${currentCount}</p>
          <p><strong>Refill Threshold:</strong> ${med.refillThreshold}</p>
          <p>Please order a refill soon to avoid missed doses.</p>
        `,
      });
      if (sent) warnedCount++;
    }
  }

  return warnedCount;
}

/**
 * Run all scheduled checks once. Useful for manual runs and testing.
 */
export async function runCronRoutine(now = new Date()) {
  const [overdue, appts, refills] = await Promise.all([
    checkOverdueDoses(now),
    checkUpcomingAppointments(now),
    checkRefillWarnings(),
  ]);
  return { overdue, appts, refills };
}

/**
 * Initialize background cron jobs running every minute ('* * * * *').
 */
export function initCronJobs(): cron.ScheduledTask[] {
  // node-cron job running every minute
  const task = cron.schedule('* * * * *', async () => {
    try {
      await runCronRoutine();
    } catch (err) {
      console.error('[Cron] Routine execution error:', err);
    }
  });

  return [task];
}
