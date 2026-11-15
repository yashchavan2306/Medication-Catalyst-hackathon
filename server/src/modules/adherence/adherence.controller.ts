import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/db.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { getCurrentDateString } from '../../utils/date.js';
import { recordActivity } from '../../utils/activity.js';
import { sendNotificationWithDedupe } from '../../services/emailService.js';
import type { LogDoseInput } from './adherence.schema.js';

interface DailyDoseItem {
  id?: string;
  medicationId: string;
  medicationName: string;
  dosage: string;
  instructions: string | null;
  scheduledDate: string;
  scheduledTime: string;
  status: 'PENDING' | 'TAKEN' | 'SKIPPED' | 'MISSED';
  logId?: string;
  takenAt?: Date | null;
  recordedByName?: string | null;
  recordedByRole?: string | null;
  notes?: string | null;
  remainingQuantity: number;
  pillCount?: number;
}

/**
 * Controller: Get daily schedule and dose statuses for a specific date (defaults to today).
 * Fetches all medications and logs in two single queries (no N+1).
 */
export async function getDailySchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const member = req.member;
    if (!member) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const targetDate = (req.query.date as string) || getCurrentDateString();

    // 1. Fetch all active medications for the circle
    const medications = await prisma.medication.findMany({
      where: { circleId: member.circleId, isActive: true },
      orderBy: { name: 'asc' },
    });

    // 2. Fetch all logs for this circle and date
    const logs = await prisma.adherenceLog.findMany({
      where: { circleId: member.circleId, scheduledDate: targetDate },
    });

    // Map logs by "medicationId_time" key for O(1) lookup
    const logMap = new Map<string, (typeof logs)[number]>();
    for (const log of logs) {
      logMap.set(`${log.medicationId}_${log.scheduledTime}`, log);
    }

    const schedule: DailyDoseItem[] = [];

    for (const med of medications) {
      const times: string[] = JSON.parse(med.timesOfDay || med.times || '[]');
      for (const time of times) {
        const key = `${med.id}_${time}`;
        const existingLog = logMap.get(key);

        if (existingLog) {
          schedule.push({
            id: existingLog.id,
            medicationId: med.id,
            medicationName: med.name,
            dosage: med.dosage,
            instructions: med.instructions,
            scheduledDate: targetDate,
            scheduledTime: time,
            status: existingLog.status as 'PENDING' | 'TAKEN' | 'SKIPPED' | 'MISSED',
            logId: existingLog.id,
            takenAt: existingLog.takenAt,
            recordedByName: existingLog.recordedByName,
            recordedByRole: existingLog.recordedByRole,
            notes: existingLog.notes,
            remainingQuantity: med.remainingQuantity,
            pillCount: med.pillCount,
          });
        } else {
          schedule.push({
            medicationId: med.id,
            medicationName: med.name,
            dosage: med.dosage,
            instructions: med.instructions,
            scheduledDate: targetDate,
            scheduledTime: time,
            status: 'PENDING',
            remainingQuantity: med.remainingQuantity,
            pillCount: med.pillCount,
          });
        }
      }
    }

    // Sort by scheduled time
    schedule.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

    const totalScheduled = schedule.length;
    const takenCount = schedule.filter((s) => s.status === 'TAKEN').length;
    const skippedCount = schedule.filter((s) => s.status === 'SKIPPED').length;
    const missedCount = schedule.filter((s) => s.status === 'MISSED').length;
    const pendingCount = schedule.filter((s) => s.status === 'PENDING').length;

    res.json({
      date: targetDate,
      summary: {
        totalScheduled,
        takenCount,
        skippedCount,
        missedCount,
        pendingCount,
        adherencePercentage: totalScheduled > 0 ? Math.round((takenCount / totalScheduled) * 100) : 100,
      },
      schedule,
      doses: schedule,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Controller: Record dose status (TAKEN, SKIPPED, MISSED).
 * Handled by elder or caretaker.
 */
export async function logDose(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const member = req.member;
    if (!member) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const { medicationId, scheduledDate, scheduledTime, status, notes }: LogDoseInput = req.body;

    // Verify medication belongs to member's circle
    const medication = await prisma.medication.findFirst({
      where: { id: medicationId, circleId: member.circleId },
      include: { circle: true },
    });

    if (!medication) {
      throw new AppError('Medication not found in this circle', 404, 'NOT_FOUND');
    }

    const result = await prisma.$transaction(async (tx) => {
      // Check existing log to calculate inventory diff
      const existingLog = await tx.adherenceLog.findUnique({
        where: {
          medicationId_scheduledDate_scheduledTime: {
            medicationId,
            scheduledDate,
            scheduledTime,
          },
        },
      });

      const wasTaken = existingLog?.status === 'TAKEN';
      const isNowTaken = status === 'TAKEN';

      // Update remaining quantity if transitioning to or from TAKEN
      let updatedQuantity = medication.remainingQuantity;
      if (!wasTaken && isNowTaken && updatedQuantity > 0) {
        updatedQuantity = Math.max(0, updatedQuantity - 1);
        await tx.medication.update({
          where: { id: medication.id },
          data: {
            remainingQuantity: updatedQuantity,
            pillCount: updatedQuantity,
          },
        });
      } else if (wasTaken && !isNowTaken) {
        // Revert decrement
        updatedQuantity = updatedQuantity + 1;
        await tx.medication.update({
          where: { id: medication.id },
          data: {
            remainingQuantity: updatedQuantity,
            pillCount: updatedQuantity,
          },
        });
      }

      // Upsert adherence log
      const log = await tx.adherenceLog.upsert({
        where: {
          medicationId_scheduledDate_scheduledTime: {
            medicationId,
            scheduledDate,
            scheduledTime,
          },
        },
        create: {
          circleId: member.circleId,
          medicationId,
          scheduledDate,
          scheduledTime,
          status,
          takenAt: isNowTaken ? new Date() : null,
          recordedByRole: member.role,
          recordedByName: member.displayName,
          notes,
        },
        update: {
          status,
          takenAt: isNowTaken ? new Date() : null,
          recordedByRole: member.role,
          recordedByName: member.displayName,
          notes,
        },
      });

      // Upsert DoseLog as well
      await tx.doseLog.upsert({
        where: {
          medicationId_scheduledDate_scheduledTime: {
            medicationId,
            scheduledDate,
            scheduledTime,
          },
        },
        create: {
          circleId: member.circleId,
          medicationId,
          memberId: member.memberId,
          scheduledDate,
          scheduledTime,
          status,
          takenAt: isNowTaken ? new Date() : null,
          recordedByRole: member.role,
          recordedByName: member.displayName,
          notes,
        },
        update: {
          status,
          takenAt: isNowTaken ? new Date() : null,
          recordedByRole: member.role,
          recordedByName: member.displayName,
          notes,
        },
      });

      return { log, remainingQuantity: updatedQuantity };
    });

    // Low refill notification with dedupe
    if (result.remainingQuantity <= medication.refillThreshold) {
      const dedupeKey = `low-refill:${medication.id}:${result.remainingQuantity}`;
      await sendNotificationWithDedupe({
        circleId: member.circleId,
        type: 'LOW_REFILL',
        title: `Low Refill Alert: ${medication.name}`,
        message: `Medication "${medication.name}" has only ${result.remainingQuantity} dose(s) remaining (threshold: ${medication.refillThreshold}). Please request a refill.`,
        dedupeKey,
        emailTo: medication.circle.elderEmail || 'caretaker@carecircle.local',
        emailSubject: `[CareCircle] Low Refill Alert: ${medication.name}`,
        emailHtml: `<p>${medication.name} has only ${result.remainingQuantity} pills remaining.</p>`,
      });
    }

    await recordActivity({
      circleId: member.circleId,
      action: `DOSE_${status}`,
      description: `${member.displayName} marked ${medication.name} (${scheduledTime}) as ${status}`,
      actorRole: member.role,
      actorName: member.displayName,
      targetType: 'DoseLog',
      targetId: result.log.id,
    });

    res.json({
      message: `Dose marked as ${status}`,
      log: result.log,
      dose: result.log,
      remainingQuantity: result.remainingQuantity,
      pillCount: result.remainingQuantity,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Controller: Get adherence statistics using groupBy (no N+1).
 */
export async function getAdherenceStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const member = req.member;
    if (!member) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const days = req.query.days ? parseInt(req.query.days as string, 10) : 7;
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);
    const sinceDateStr = getCurrentDateString(sinceDate);

    // Group logs by status in a single query
    const statusCounts = await prisma.adherenceLog.groupBy({
      by: ['status'],
      where: {
        circleId: member.circleId,
        scheduledDate: { gte: sinceDateStr },
      },
      _count: { id: true },
    });

    let taken = 0;
    let skipped = 0;
    let missed = 0;
    let total = 0;

    for (const item of statusCounts) {
      total += item._count.id;
      if (item.status === 'TAKEN') taken = item._count.id;
      if (item.status === 'SKIPPED') skipped = item._count.id;
      if (item.status === 'MISSED') missed = item._count.id;
    }

    const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 100;

    res.json({
      periodDays: days,
      summary: {
        taken,
        skipped,
        missed,
        totalLogged: total,
        total,
        adherenceRate,
      },
    });
  } catch (err) {
    next(err);
  }
}
