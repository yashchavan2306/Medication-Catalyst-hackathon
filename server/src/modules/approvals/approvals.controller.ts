import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/db.js';
import { recordActivity } from '../../utils/activity.js';
import { sendNotificationWithDedupe } from '../../services/emailService.js';
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
          select: { id: true, name: true, dosage: true, frequency: true, isActive: true, status: true },
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
      times?: string[];
      instructions?: string;
      purpose?: string;
      remainingQuantity?: number;
      pillCount?: number;
      refillThreshold?: number;
      isActive?: boolean;
    };

    const result = await prisma.$transaction(async (tx) => {
      let targetMedicationId = request.medicationId;

      const timesArr = proposed.timesOfDay || proposed.times || ['08:00'];
      const timesJson = JSON.stringify(timesArr);
      const qty = proposed.pillCount ?? proposed.remainingQuantity ?? 30;
      const threshold = proposed.refillThreshold ?? 5;

      if (request.changeType === 'CREATE') {
        if (request.medicationId) {
          // If medication was already created as PENDING_APPROVAL
          const updatedMed = await tx.medication.update({
            where: { id: request.medicationId },
            data: {
              status: 'ACTIVE',
              isActive: true,
              pendingChange: null,
              name: proposed.name,
              dosage: proposed.dosage,
              frequency: proposed.frequency,
              timesOfDay: timesJson,
              times: timesJson,
              instructions: proposed.instructions,
              purpose: proposed.purpose,
              remainingQuantity: qty,
              pillCount: qty,
              refillThreshold: threshold,
            },
          });
          targetMedicationId = updatedMed.id;
        } else {
          const createdMed = await tx.medication.create({
            data: {
              circleId: member.circleId,
              name: proposed.name!,
              dosage: proposed.dosage!,
              frequency: proposed.frequency!,
              status: 'ACTIVE',
              timesOfDay: timesJson,
              times: timesJson,
              instructions: proposed.instructions,
              purpose: proposed.purpose,
              remainingQuantity: qty,
              pillCount: qty,
              refillThreshold: threshold,
              isActive: true,
              createdByRole: request.requestedByRole,
              createdByName: request.requestedByName,
            },
          });
          targetMedicationId = createdMed.id;
        }
      } else if (request.changeType === 'UPDATE' && request.medicationId) {
        await tx.medication.update({
          where: { id: request.medicationId },
          data: {
            status: 'ACTIVE',
            isActive: true,
            pendingChange: null,
            ...(proposed.name ? { name: proposed.name } : {}),
            ...(proposed.dosage ? { dosage: proposed.dosage } : {}),
            ...(proposed.frequency ? { frequency: proposed.frequency } : {}),
            ...(proposed.timesOfDay || proposed.times
              ? { timesOfDay: timesJson, times: timesJson }
              : {}),
            ...(proposed.instructions !== undefined ? { instructions: proposed.instructions } : {}),
            ...(proposed.purpose !== undefined ? { purpose: proposed.purpose } : {}),
            ...(proposed.remainingQuantity !== undefined || proposed.pillCount !== undefined
              ? { remainingQuantity: qty, pillCount: qty }
              : {}),
            ...(proposed.refillThreshold !== undefined ? { refillThreshold: proposed.refillThreshold } : {}),
          },
        });
      } else if (request.changeType === 'DELETE' && request.medicationId) {
        await tx.medication.update({
          where: { id: request.medicationId },
          data: { isActive: false, status: 'STOPPED', pendingChange: null },
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

      return updatedRequest;
    });

    await sendNotificationWithDedupe({
      circleId: member.circleId,
      type: 'PENDING_APPROVAL',
      title: 'Medication Change Approved',
      message: `${member.displayName} (Elder) approved the ${request.changeType.toLowerCase()} change request.`,
      dedupeKey: `approval-action:${request.id}:approved`,
    });

    await recordActivity({
      circleId: member.circleId,
      action: 'CHANGE_APPROVED',
      description: `${member.displayName} approved ${request.changeType.toLowerCase()} for medication`,
      actorRole: member.role,
      actorName: member.displayName,
      targetType: 'MedicationChangeRequest',
      targetId: result.id,
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

    const updated = await prisma.$transaction(async (tx) => {
      // If was create, mark as STOPPED or delete
      if (request.changeType === 'CREATE' && request.medicationId) {
        await tx.medication.update({
          where: { id: request.medicationId },
          data: { status: 'STOPPED', isActive: false, pendingChange: null },
        });
      } else if (request.changeType === 'UPDATE' && request.medicationId) {
        await tx.medication.update({
          where: { id: request.medicationId },
          data: { pendingChange: null },
        });
      }

      return tx.medicationChangeRequest.update({
        where: { id: request.id },
        data: {
          status: 'REJECTED',
          reviewedByRole: member.role,
          reviewedByName: member.displayName,
          reviewNotes: reviewNotes || 'Declined by elder',
          reviewedAt: new Date(),
        },
      });
    });

    await sendNotificationWithDedupe({
      circleId: member.circleId,
      type: 'PENDING_APPROVAL',
      title: 'Medication Change Rejected',
      message: `${member.displayName} (Elder) declined the ${request.changeType.toLowerCase()} change request.`,
      dedupeKey: `approval-action:${request.id}:rejected`,
    });

    await recordActivity({
      circleId: member.circleId,
      action: 'CHANGE_REJECTED',
      description: `${member.displayName} declined ${request.changeType.toLowerCase()} change request`,
      actorRole: member.role,
      actorName: member.displayName,
      targetType: 'MedicationChangeRequest',
      targetId: updated.id,
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
