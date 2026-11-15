import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/db.js';
import { AppError } from '../../middlewares/errorHandler.js';
import { getCurrentDateString } from '../../utils/date.js';
import type { LogDoseInput } from './adherence.schema.js';

interface DailyDoseItem {
  medicationId: string;
  medicationName: string;
  dosage: string;
  instructions: string | null;
  scheduledDate: string;
  scheduledTime: string;
  status: 'PENDING' | 'TAKEN' | 'SKIPPED' | 'MISSED';
  logId?: string;
  takenAt?: Date | null;
  recordedByName?: string;
  recordedByRole?: string;
  notes?: string | null;
  remainingQuantity: number;
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
      const times: string[] = JSON.parse(med.timesOfDay);
      for (const time of times) {
        const key = `${med.id}_${time}`;
        const existingLog = logMap.get(key);

        if (existingLog) {
          schedule.push({
            medicationId: med.id,
            medicationName: med.name,
            dosage: med.dosage,
            instructions: med.instructions,
            scheduledDate: targetDate,
            scheduledTime: time,
            status: existingLog.status as 'TAKEN' | 'SKIPPED' | 'MISSED',
            logId: existingLog.id,
            takenAt: existingLog.takenAt,
            recordedByName: existingLog.recordedByName,
            recordedByRole: existingLog.recordedByRole,
            notes: existingLog.notes,
            remainingQuantity: med.remainingQuantity,
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
          data: { remainingQuantity: updatedQuantity },
        });

        // If low quantity, trigger low refill notification
        if (updatedQuantity <= medication.refillThreshold) {
          await tx.notificationLog.create({
            data: {
              circleId: member.circleId,
              type: 'LOW_REFILL',
              title: `Low Refill Alert: ${medication.name}`,
              message: `Medication "${medication.name}" has only ${updatedQuantity} dose(s) remaining (threshold: ${medication.refillThreshold}). Please request a refill.`,
            },
          });
        }
      } else if (wasTaken && !isNowTaken) {
        // Revert decrement
        updatedQuantity = updatedQuantity + 1;
        await tx.medication.update({
          where: { id: medication.id },
          data: { remainingQuantity: updatedQuantity },
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

      return { log, remainingQuantity: updatedQuantity };
    });

    res.json({
      message: `Dose marked as ${status}`,
      log: result.log,
      remainingQuantity: result.remainingQuantity,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Controller: Get adherence statistics over the past N days.
 * Efficient aggregation without N+1.
 */
export async function getAdherenceStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const member = req.member;
    if (!member) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const days = typeof req.query.days === 'number' ? req.query.days : 7;
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

    for (const group of statusCounts) {
      if (group.status === 'TAKEN') taken = group._count.id;
      if (group.status === 'SKIPPED') skipped = group._count.id;
      if (group.status === 'MISSED') missed = group._count.id;
    }

    const totalLogged = taken + skipped + missed;
    const adherenceRate = totalLogged > 0 ? Math.round((taken / totalLogged) * 100) : 100;

    // Daily breakdown for visual chart/progress
    const dailyLogs = await prisma.adherenceLog.groupBy({
      by: ['scheduledDate', 'status'],
      where: {
        circleId: member.circleId,
        scheduledDate: { gte: sinceDateStr },
      },
      _count: { id: true },
    });

    res.json({
      periodDays: days,
      sinceDate: sinceDateStr,
      summary: {
        taken,
        skipped,
        missed,
        totalLogged,
        adherenceRate,
      },
      dailyBreakdown: dailyLogs,
    });
  } catch (err) {
    next(err);
  }
}
