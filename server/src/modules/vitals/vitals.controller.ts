import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/db.js';
import { AppError } from '../../middlewares/errorHandler.js';
import type { LogVitalInput } from './vitals.schema.js';

/**
 * Controller: List recent vital entries for the circle.
 */
export async function getVitals(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const member = req.member;
    if (!member) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const limit = typeof req.query.limit === 'number' ? req.query.limit : 20;

    const vitals = await prisma.vitalLog.findMany({
      where: { circleId: member.circleId },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });

    res.json(vitals);
  } catch (err) {
    next(err);
  }
}

/**
 * Controller: Record vitals (elder or caretaker).
 */
export async function createVital(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const member = req.member;
    if (!member) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const input: LogVitalInput = req.body;

    const vital = await prisma.vitalLog.create({
      data: {
        circleId: member.circleId,
        bloodPressureSystolic: input.bloodPressureSystolic,
        bloodPressureDiastolic: input.bloodPressureDiastolic,
        bloodSugar: input.bloodSugar,
        heartRate: input.heartRate,
        mood: input.mood,
        notes: input.notes,
        recordedByRole: member.role,
        recordedByName: member.displayName,
      },
    });

    res.status(201).json(vital);
  } catch (err) {
    next(err);
  }
}
