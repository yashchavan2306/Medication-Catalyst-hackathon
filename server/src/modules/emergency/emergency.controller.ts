import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/db.js';
import { AppError } from '../../middlewares/errorHandler.js';

/**
 * Controller: Get emergency profile and medical essentials.
 * GET /api/emergency
 */
export async function getEmergencyInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const member = req.member;
    if (!member) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const circle = await prisma.careCircle.findUnique({
      where: { id: member.circleId },
      select: {
        id: true,
        code: true,
        name: true,
        elderName: true,
        elderEmail: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        notes: true,
      },
    });

    if (!circle) {
      throw new AppError('Care Circle not found', 404, 'NOT_FOUND');
    }

    const [activeMedications, nextAppointment] = await Promise.all([
      prisma.medication.findMany({
        where: { circleId: member.circleId, isActive: true },
        select: {
          id: true,
          name: true,
          dosage: true,
          frequency: true,
          instructions: true,
          purpose: true,
        },
      }),
      prisma.appointment.findFirst({
        where: {
          circleId: member.circleId,
          status: 'UPCOMING',
          dateTime: { gte: new Date() },
        },
        orderBy: { dateTime: 'asc' },
      }),
    ]);

    res.json({
      elderName: circle.elderName,
      elderEmail: circle.elderEmail,
      circleCode: circle.code,
      emergencyContactName: circle.emergencyContactName,
      emergencyContactPhone: circle.emergencyContactPhone,
      medicalNotes: circle.notes,
      activeMedications,
      nextAppointment,
    });
  } catch (err) {
    next(err);
  }
}
