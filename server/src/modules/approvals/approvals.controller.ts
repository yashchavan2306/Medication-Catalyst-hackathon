import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/db.js';
import { recordActivity } from '../../utils/activity.js';
import { AppError } from '../../middlewares/errorHandler.js';
import type { ReviewRequestInput } from './approvals.schema.js';

/**
 * Controller: List change requests for the care circle.
 */
export async function getApprovals(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const member = req.member;
    if (!member) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const statusParam = (req.query.status as string) || 'PENDING';
    const whereClause: { circleId: string; status?: string } = { circleId: member.circleId };

    if (statusParam !== 'ALL') {
      whereClause.status = statusParam;
    }

    const requests = await prisma.medicationChangeRequest.findMany({
      where: whereClause,
      include: {
        medication: {
          select: { id: true, name: true, dosage: true, frequency: true, isActive: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const parsed = requests.map((item) => ({
      ...item,
      proposedData: JSON.parse(item.proposedData),
      currentData: item.currentData ? JSON.parse(item.currentData) : null,
    }));

    res.json(parsed);
  } catch (err) {
    next(err);
  }
}

/**
 * Controller: Elder approves a medication change request.
 * Applies changes directly to Medication model in a transaction.
 */
export async function approveRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const member = req.member;
    if (!member) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;
    const { reviewNotes }: ReviewRequestInput = req.body || {};

    const request = await prisma.medicationChangeRequest.findFirst({
      where: { id, circleId: member.circleId },
    });

    if (!request) {
      throw new AppError('Change request not found', 404, 'NOT_FOUND');
    }

    if (request.status !== 'PENDING') {
      throw new AppError(`Request already ${request.status.toLowerCase()}`, 400, 'ALREADY_RESOLVED');
    }

    const proposed = JSON.parse(request.proposedData) as {
      name?: string;
      dosage?: string;
      frequency?: string;
      timesOfDay?: string[];
      instructions?: string;
      purpose?: string;
      remainingQuantity?: number;
      refillThreshold?: number;
      isActive?: boolean;
    };

    const result = await prisma.$transaction(async (tx) => {
      let targetMedicationId = request.medicationId;

      if (request.changeType === 'CREATE') {
        const createdMed = await tx.medication.create({
          data: {
            circleId: member.circleId,
            name: proposed.name!,
            dosage: proposed.dosage!,
            frequency: proposed.frequency!,
            timesOfDay: JSON.stringify(proposed.timesOfDay || ['08:00']),
            instructions: proposed.instructions,
            purpose: proposed.purpose,
            remainingQuantity: proposed.remainingQuantity ?? 30,
            refillThreshold: proposed.refillThreshold ?? 5,
            isActive: true,
            createdByRole: request.requestedByRole,
            createdByName: request.requestedByName,
          },
        });
        targetMedicationId = createdMed.id;
      } else if (request.changeType === 'UPDATE' && request.medicationId) {
        await tx.medication.update({
          where: { id: request.medicationId },
          data: {
            ...(proposed.name ? { name: proposed.name } : {}),
            ...(proposed.dosage ? { dosage: proposed.dosage } : {}),
            ...(proposed.frequency ? { frequency: proposed.frequency } : {}),
            ...(proposed.timesOfDay ? { timesOfDay: JSON.stringify(proposed.timesOfDay) } : {}),
            ...(proposed.instructions !== undefined ? { instructions: proposed.instructions } : {}),
            ...(proposed.purpose !== undefined ? { purpose: proposed.purpose } : {}),
            ...(proposed.remainingQuantity !== undefined ? { remainingQuantity: proposed.remainingQuantity } : {}),
            ...(proposed.refillThreshold !== undefined ? { refillThreshold: proposed.refillThreshold } : {}),
          },
        });
      } else if (request.changeType === 'DELETE' && request.medicationId) {
        await tx.medication.update({
          where: { id: request.medicationId },
          data: { isActive: false },
        });
      }

      const updatedRequest = await tx.medicationChangeRequest.update({
        where: { id: request.id },
        data: {
          status: 'APPROVED',
          reviewedByRole: member.role,
          reviewedByName: member.displayName,
          reviewNotes: reviewNotes || 'Approved by elder',
          reviewedAt: new Date(),
          medicationId: targetMedicationId,
        },
      });

      await tx.notificationLog.create({
        data: {
          circleId: member.circleId,
          type: 'PENDING_APPROVAL',
          title: 'Medication Change Approved',
          message: `${member.displayName} (Elder) approved the ${request.changeType.toLowerCase()} change request.`,
        },
      });

      return updatedRequest;
    });

    await recordActivity({
      circleId: member.circleId,
      action: 'CHANGE_APPROVED',
      description: `${member.displayName} approved ${request.changeType.toLowerCase()} for medication`,
      actorRole: member.role,
      actorName: member.displayName,
    });

    res.json({
      status: 'APPROVED',
      message: 'Change request approved and applied successfully',
      request: result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Controller: Elder rejects a medication change request.
 */
export async function rejectRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const member = req.member;
    if (!member) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;
    const { reviewNotes }: ReviewRequestInput = req.body || {};

    const request = await prisma.medicationChangeRequest.findFirst({
      where: { id, circleId: member.circleId },
    });

    if (!request) {
      throw new AppError('Change request not found', 404, 'NOT_FOUND');
    }

    if (request.status !== 'PENDING') {
      throw new AppError(`Request already ${request.status.toLowerCase()}`, 400, 'ALREADY_RESOLVED');
    }

    const updated = await prisma.medicationChangeRequest.update({
      where: { id: request.id },
      data: {
        status: 'REJECTED',
        reviewedByRole: member.role,
        reviewedByName: member.displayName,
        reviewNotes: reviewNotes || 'Declined by elder',
        reviewedAt: new Date(),
      },
    });

    await prisma.notificationLog.create({
      data: {
        circleId: member.circleId,
        type: 'PENDING_APPROVAL',
        title: 'Medication Change Rejected',
        message: `${member.displayName} (Elder) declined the ${request.changeType.toLowerCase()} change request.`,
      },
    });

    await recordActivity({
      circleId: member.circleId,
      action: 'CHANGE_REJECTED',
      description: `${member.displayName} declined ${request.changeType.toLowerCase()} change request`,
      actorRole: member.role,
      actorName: member.displayName,
    });

    res.json({
      status: 'REJECTED',
      message: 'Change request rejected',
      request: updated,
    });
  } catch (err) {
    next(err);
  }
}
