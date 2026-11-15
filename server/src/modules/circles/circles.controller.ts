import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/db.js';
import { hashPasscode } from '../../utils/password.js';
import { AppError } from '../../middlewares/errorHandler.js';
import type { UpdateCircleInput, UpdatePasscodesInput } from './circles.schema.js';

/**
 * Controller: Get details of the active circle.
 * Identity from req.member.
 */
export async function getCircleDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const member = req.member;
    if (!member) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const circle = await prisma.careCircle.findUnique({
      where: { id: member.circleId },
      include: {
        _count: {
          select: {
            medications: { where: { isActive: true } },
            appointments: { where: { status: 'UPCOMING' } },
            changeRequests: { where: { status: 'PENDING' } },
          },
        },
      },
    });

    if (!circle) {
      throw new AppError('Care Circle not found', 404, 'NOT_FOUND');
    }

    res.json({
      id: circle.id,
      code: circle.code,
      name: circle.name,
      elderName: circle.elderName,
      emergencyContactName: circle.emergencyContactName,
      emergencyContactPhone: circle.emergencyContactPhone,
      notes: circle.notes,
      createdAt: circle.createdAt,
      stats: {
        activeMedicationsCount: circle._count.medications,
        upcomingAppointmentsCount: circle._count.appointments,
        pendingApprovalsCount: circle._count.changeRequests,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Controller: Update circle basic information (Elder only).
 */
export async function updateCircle(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const member = req.member;
    if (!member) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const input: UpdateCircleInput = req.body;

    const updated = await prisma.careCircle.update({
      where: { id: member.circleId },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.elderName ? { elderName: input.elderName } : {}),
        ...(input.emergencyContactName !== undefined ? { emergencyContactName: input.emergencyContactName } : {}),
        ...(input.emergencyContactPhone !== undefined ? { emergencyContactPhone: input.emergencyContactPhone } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
      select: {
        id: true,
        code: true,
        name: true,
        elderName: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        notes: true,
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

/**
 * Controller: Update circle passcodes (Elder only).
 */
export async function updateCirclePasscodes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const member = req.member;
    if (!member) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const input: UpdatePasscodesInput = req.body;
    const dataToUpdate: Record<string, string> = {};

    if (input.elderPasscode) {
      dataToUpdate.elderPasscodeHash = await hashPasscode(input.elderPasscode);
    }
    if (input.caretakerPasscode) {
      dataToUpdate.caretakerPasscodeHash = await hashPasscode(input.caretakerPasscode);
    }
    if (input.familyPasscode) {
      dataToUpdate.familyPasscodeHash = await hashPasscode(input.familyPasscode);
    }

    if (Object.keys(dataToUpdate).length === 0) {
      res.json({ message: 'No passcode changes provided' });
      return;
    }

    await prisma.careCircle.update({
      where: { id: member.circleId },
      data: dataToUpdate,
    });

    res.json({ message: 'Passcodes updated successfully' });
  } catch (err) {
    next(err);
  }
}
