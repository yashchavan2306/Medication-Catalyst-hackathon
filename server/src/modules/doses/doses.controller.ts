import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/db.js';
import { getCurrentDateString } from '../../utils/date.js';
import { recordActivity } from '../../utils/activity.js';
import { sendNotificationWithDedupe } from '../../services/emailService.js';
import { AppError } from '../../middlewares/errorHandler.js';
import type { SkipDoseInput, SnoozeDoseInput } from './doses.schema.js';

/**
 * Controller: Get today's doses and schedule.
 * GET /api/today
 * Ensures each scheduled dose for today is initialized in DoseLog & AdherenceLog with a unique ID.
 */
export async function getTodayDoses(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const member = req.member;
    if (!member) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const today = getCurrentDateString();

    // 1. Fetch active medications for the circle
    const medications = await prisma.medication.findMany({
      where: { circleId: member.circleId, isActive: true },
      orderBy: { name: 'asc' },
    });

    // 2. Fetch existing logs for today in one query (no N+1)
    const existingLogs = await prisma.adherenceLog.findMany({
      where: { circleId: member.circleId, scheduledDate: today },
    });

    const logMap = new Map<string, (typeof existingLogs)[number]>();
    for (const log of existingLogs) {
      logMap.set(`${log.medicationId}_${log.scheduledTime}`, log);
    }

    // 3. For any missing scheduled slot today, create it with status PENDING
    const dosesToCreate: Array<{
      circleId: string;
      medicationId: string;
      scheduledDate: string;
      scheduledTime: string;
      status: string;
      recordedByRole: string;
      recordedByName: string;
    }> = [];

    for (const med of medications) {
      const times: string[] = JSON.parse(med.timesOfDay || med.times || '[]');
      for (const time of times) {
        const key = `${med.id}_${time}`;
        if (!logMap.has(key)) {
          dosesToCreate.push({
            circleId: member.circleId,
            medicationId: med.id,
            scheduledDate: today,
            scheduledTime: time,
            status: 'PENDING',
            recordedByRole: 'system',
            recordedByName: 'Scheduled',
          });
        }
      }
    }

    if (dosesToCreate.length > 0) {
      await prisma.$transaction([
        ...dosesToCreate.map((dose) =>
          prisma.adherenceLog.upsert({
            where: {
              medicationId_scheduledDate_scheduledTime: {
                medicationId: dose.medicationId,
                scheduledDate: dose.scheduledDate,
                scheduledTime: dose.scheduledTime,
              },
            },
            create: dose,
            update: {},
          })
        ),
        ...dosesToCreate.map((dose) =>
          prisma.doseLog.upsert({
            where: {
              medicationId_scheduledDate_scheduledTime: {
                medicationId: dose.medicationId,
                scheduledDate: dose.scheduledDate,
                scheduledTime: dose.scheduledTime,
              },
            },
            create: {
              circleId: dose.circleId,
              medicationId: dose.medicationId,
              scheduledDate: dose.scheduledDate,
              scheduledTime: dose.scheduledTime,
              status: dose.status,
              recordedByRole: dose.recordedByRole,
              recordedByName: dose.recordedByName,
            },
            update: {},
          })
        ),
      ]);
    }

    // 4. Fetch all doses for today with medication info included
    const todayLogs = await prisma.adherenceLog.findMany({
      where: { circleId: member.circleId, scheduledDate: today },
      include: {
        medication: {
          select: {
            id: true,
            name: true,
            dosage: true,
            frequency: true,
            instructions: true,
            purpose: true,
            remainingQuantity: true,
            pillCount: true,
            refillThreshold: true,
          },
        },
      },
      orderBy: { scheduledTime: 'asc' },
    });

    const totalScheduled = todayLogs.length;
    const takenCount = todayLogs.filter((d) => d.status === 'TAKEN').length;
    const skippedCount = todayLogs.filter((d) => d.status === 'SKIPPED').length;
    const snoozedCount = todayLogs.filter((d) => d.status === 'SNOOZED').length;
    const pendingCount = todayLogs.filter((d) => d.status === 'PENDING').length;
    const missedCount = todayLogs.filter((d) => d.status === 'MISSED').length;

    res.json({
      date: today,
      summary: {
        totalScheduled,
        takenCount,
        skippedCount,
        snoozedCount,
        pendingCount,
        missedCount,
        adherencePercentage: totalScheduled > 0 ? Math.round((takenCount / totalScheduled) * 100) : 100,
      },
      doses: todayLogs,
      schedule: todayLogs,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Controller: Mark dose as TAKEN.
 * POST /api/doses/:id/take
 */
export async function takeDose(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const member = req.member;
    if (!member) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;

    // Search by id in adherenceLog or doseLog
    let dose = await prisma.adherenceLog.findFirst({
      where: { id, circleId: member.circleId },
      include: { medication: { include: { circle: true } } },
    });

    if (!dose) {
      const dLog = await prisma.doseLog.findFirst({
        where: { id, circleId: member.circleId },
        include: { medication: { include: { circle: true } } },
      });
      if (dLog) {
        dose = (await prisma.adherenceLog.findFirst({
          where: {
            medicationId: dLog.medicationId,
            scheduledDate: dLog.scheduledDate,
            scheduledTime: dLog.scheduledTime,
          },
          include: { medication: { include: { circle: true } } },
        })) || null;
      }
    }

    if (!dose) {
      throw new AppError('Dose not found', 404, 'NOT_FOUND');
    }

    const wasTaken = dose.status === 'TAKEN';

    const result = await prisma.$transaction(async (tx) => {
      let remainingQuantity = dose!.medication.remainingQuantity;

      if (!wasTaken && remainingQuantity > 0) {
        remainingQuantity = Math.max(0, remainingQuantity - 1);
        await tx.medication.update({
          where: { id: dose!.medicationId },
          data: {
            remainingQuantity,
            pillCount: remainingQuantity,
          },
        });
      }

      const updatedDose = await tx.adherenceLog.update({
        where: { id: dose!.id },
        data: {
          status: 'TAKEN',
          takenAt: new Date(),
          snoozedUntil: null,
          recordedByRole: member.role,
          recordedByName: member.displayName,
        },
        include: { medication: true },
      });

      await tx.doseLog
        .updateMany({
          where: {
            medicationId: dose!.medicationId,
            scheduledDate: dose!.scheduledDate,
            scheduledTime: dose!.scheduledTime,
          },
          data: {
            status: 'TAKEN',
            takenAt: new Date(),
            recordedByRole: member.role,
            recordedByName: member.displayName,
          },
        })
        .catch(() => null);

      return { updatedDose, remainingQuantity };
    });

    // Low refill notification with dedupe
    if (result.remainingQuantity <= dose.medication.refillThreshold) {
      const dedupeKey = `low-refill:${dose.medicationId}:${result.remainingQuantity}`;
      await sendNotificationWithDedupe({
        circleId: member.circleId,
        type: 'LOW_REFILL',
        title: `Low Refill Alert: ${dose.medication.name}`,
        message: `${dose.medication.name} has only ${result.remainingQuantity} doses remaining (threshold: ${dose.medication.refillThreshold}).`,
        dedupeKey,
        emailTo: dose.medication.circle?.elderEmail || 'caretaker@carecircle.local',
        emailSubject: `[CareCircle] Refill Warning: ${dose.medication.name}`,
        emailHtml: `<p>${dose.medication.name} is running low (${result.remainingQuantity} remaining).</p>`,
      });
    }

    await recordActivity({
      circleId: member.circleId,
      action: 'DOSE_TAKEN',
      description: `${member.displayName} marked ${dose.medication.name} (${dose.scheduledTime}) as TAKEN`,
      actorRole: member.role,
      actorName: member.displayName,
      targetType: 'DoseLog',
      targetId: result.updatedDose.id,
    });

    res.json({
      message: 'Dose marked as taken',
      dose: result.updatedDose,
      log: result.updatedDose,
      remainingQuantity: result.remainingQuantity,
      pillCount: result.remainingQuantity,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Controller: Mark dose as SKIPPED.
 * POST /api/doses/:id/skip
 */
export async function skipDose(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const member = req.member;
    if (!member) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;
    const { reason }: SkipDoseInput = req.body || {};

    const dose = await prisma.adherenceLog.findFirst({
      where: { id, circleId: member.circleId },
      include: { medication: true },
    });

    if (!dose) {
      throw new AppError('Dose not found', 404, 'NOT_FOUND');
    }

    const updated = await prisma.adherenceLog.update({
      where: { id: dose.id },
      data: {
        status: 'SKIPPED',
        snoozedUntil: null,
        notes: reason || 'Skipped by caregiver/elder',
        recordedByRole: member.role,
        recordedByName: member.displayName,
      },
      include: { medication: true },
    });

    await prisma.doseLog
      .updateMany({
        where: {
          medicationId: dose.medicationId,
          scheduledDate: dose.scheduledDate,
          scheduledTime: dose.scheduledTime,
        },
        data: {
          status: 'SKIPPED',
          notes: reason || 'Skipped by caregiver/elder',
          recordedByRole: member.role,
          recordedByName: member.displayName,
        },
      })
      .catch(() => null);

    await recordActivity({
      circleId: member.circleId,
      action: 'DOSE_SKIPPED',
      description: `${member.displayName} skipped ${dose.medication.name} (${dose.scheduledTime})`,
      actorRole: member.role,
      actorName: member.displayName,
      targetType: 'DoseLog',
      targetId: updated.id,
    });

    res.json({
      message: 'Dose marked as skipped',
      dose: updated,
      log: updated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Controller: Snooze dose.
 * POST /api/doses/:id/snooze
 */
export async function snoozeDose(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const member = req.member;
    if (!member) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;
    const { minutes }: SnoozeDoseInput = req.body || { minutes: 30 };

    const dose = await prisma.adherenceLog.findFirst({
      where: { id, circleId: member.circleId },
      include: { medication: true },
    });

    if (!dose) {
      throw new AppError('Dose not found', 404, 'NOT_FOUND');
    }

    const snoozedUntil = new Date(Date.now() + (minutes || 30) * 60 * 1000);

    const updated = await prisma.adherenceLog.update({
      where: { id: dose.id },
      data: {
        status: 'SNOOZED',
        snoozedUntil,
        recordedByRole: member.role,
        recordedByName: member.displayName,
      },
      include: { medication: true },
    });

    await prisma.doseLog
      .updateMany({
        where: {
          medicationId: dose.medicationId,
          scheduledDate: dose.scheduledDate,
          scheduledTime: dose.scheduledTime,
        },
        data: {
          snoozedUntil,
          recordedByRole: member.role,
          recordedByName: member.displayName,
        },
      })
      .catch(() => null);

    await recordActivity({
      circleId: member.circleId,
      action: 'DOSE_SNOOZED',
      description: `${member.displayName} snoozed ${dose.medication.name} for ${minutes || 30} minutes`,
      actorRole: member.role,
      actorName: member.displayName,
      targetType: 'DoseLog',
      targetId: updated.id,
    });

    res.json({
      message: `Dose snoozed for ${minutes || 30} minutes`,
      dose: updated,
      log: updated,
    });
  } catch (err) {
    next(err);
  }
}
