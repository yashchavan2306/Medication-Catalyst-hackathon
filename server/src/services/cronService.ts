import cron from 'node-cron';
import { prisma } from '../config/db.js';
import { getCurrentDateString, formatTimeString } from '../utils/date.js';

/**
 * Scan for medications scheduled for today where time has passed and no log exists.
 * Creates MISSED notification for the circle.
 */
export async function checkOverdueDoses(): Promise<number> {
  const today = getCurrentDateString();
  const currentTime = formatTimeString();

  // Fetch active medications
  const medications = await prisma.medication.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      circleId: true,
      timesOfDay: true,
    },
  });

  if (medications.length === 0) return 0;

  // Fetch all logs recorded today
  const logs = await prisma.adherenceLog.findMany({
    where: { scheduledDate: today },
    select: { medicationId: true, scheduledTime: true },
  });

  const loggedKeys = new Set(logs.map((l) => `${l.medicationId}_${l.scheduledTime}`));
  let flaggedCount = 0;

  for (const med of medications) {
    const times: string[] = JSON.parse(med.timesOfDay);
    for (const time of times) {
      // If time has passed today by at least some buffer and no dose logged
      if (time < currentTime && !loggedKeys.has(`${med.id}_${time}`)) {
        // Check if notification already logged today to prevent duplicate spam
        const existingAlert = await prisma.notificationLog.findFirst({
          where: {
            circleId: med.circleId,
            type: 'MISSED_DOSE',
            message: { contains: `${med.name} at ${time}` },
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        });

        if (!existingAlert) {
          await prisma.notificationLog.create({
            data: {
              circleId: med.circleId,
              type: 'MISSED_DOSE',
              title: `Possible Missed Dose: ${med.name}`,
              message: `Scheduled dose of ${med.name} at ${time} on ${today} was not marked taken.`,
            },
          });
          flaggedCount++;
        }
      }
    }
  }

  return flaggedCount;
}

/**
 * Scan for upcoming appointments within the next 24 hours.
 */
export async function checkUpcomingAppointments(): Promise<number> {
  const now = new Date();
  const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const upcoming = await prisma.appointment.findMany({
    where: {
      status: 'UPCOMING',
      dateTime: {
        gte: now,
        lte: next24h,
      },
    },
  });

  let notifiedCount = 0;
  for (const appt of upcoming) {
    const existing = await prisma.notificationLog.findFirst({
      where: {
        circleId: appt.circleId,
        type: 'APPOINTMENT',
        message: { contains: appt.title },
        createdAt: {
          gte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        },
      },
    });

    if (!existing) {
      await prisma.notificationLog.create({
        data: {
          circleId: appt.circleId,
          type: 'APPOINTMENT',
          title: `Upcoming Appointment: ${appt.title}`,
          message: `Reminder: ${appt.title} with ${appt.doctorName} at ${appt.location} is scheduled for ${appt.dateTime.toLocaleTimeString()}.`,
        },
      });
      notifiedCount++;
    }
  }

  return notifiedCount;
}

/**
 * Initialize background cron jobs.
 */
export function initCronJobs(): cron.ScheduledTask[] {
  // Run checks every 15 minutes
  const task = cron.schedule('*/15 * * * *', async () => {
    try {
      await checkOverdueDoses();
      await checkUpcomingAppointments();
    } catch (err) {
      console.error('[Cron] Job execution failed:', err);
    }
  });

  return [task];
}
