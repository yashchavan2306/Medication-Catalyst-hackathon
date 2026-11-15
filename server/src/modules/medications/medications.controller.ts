import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/db.js';
import { recordActivity } from '../../utils/activity.js';
import { sendNotificationWithDedupe } from '../../services/emailService.js';
import { AppError } from '../../middlewares/errorHandler.js';
import type { CreateMedicationInput, UpdateMedicationInput } from './medications.schema.js';

/**
 * Controller: List all medications for the member's care circle.
 * Identity read strictly from req.member.
 */
export async function getMedications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const member = req.member;
    if (!member) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const includeInactive = req.query.includeInactive === 'true' || (req.query.includeInactive as unknown) === true;

    const medications = await prisma.medication.findMany({
      where: {
        circleId: member.circleId,
        ...(includeInactive ? {} : { isActive: true, status: 'ACTIVE' }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        changeRequests: {
          where: { status: 'PENDING' },
          select: { id: true, changeType: true, requestedByName: true, createdAt: true },
        },
      },
    });

    const parsedMedications = medications.map((med) => ({
      ...med,
      timesOfDay: JSON.parse(med.timesOfDay || med.times || '[]') as string[],
      times: JSON.parse(med.times || med.timesOfDay || '[]') as string[],
      hasPendingChange: med.changeRequests.length > 0 || Boolean(med.pendingChange),
      pendingChange: med.changeRequests[0] || (med.pendingChange ? JSON.parse(med.pendingChange) : null),
    }));

    res.json(parsedMedications);
  } catch (err) {
    next(err);
  }
}

/**
 * Controller: Get single medication by ID.
 */
export async function getMedicationById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const member = req.member;
    if (!member) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;
    const medication = await prisma.medication.findFirst({
      where: {
        id,
        circleId: member.circleId,
      },
      include: {
        changeRequests: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!medication) {
      throw new AppError('Medication not found', 404, 'NOT_FOUND');
    }

    res.json({
      ...medication,
      timesOfDay: JSON.parse(medication.timesOfDay || medication.times || '[]') as string[],
      times: JSON.parse(medication.times || medication.timesOfDay || '[]') as string[],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Controller: Create medication.
 * - Elder: direct creation with immediate effect (status: ACTIVE).
 * - Caretaker: creates a pending change request for elder approval (status: PENDING_APPROVAL).
 */
export async function createMedication(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const member = req.member;
    if (!member) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const input: CreateMedicationInput = req.body;
    const timesOfDayJson = JSON.stringify(input.timesOfDay);
    const quantity = input.remainingQuantity ?? 30;
    const threshold = input.refillThreshold ?? 5;

    if (member.role === 'elder') {
      const medication = await prisma.medication.create({
        data: {
          circleId: member.circleId,
          name: input.name,
          dosage: input.dosage,
          frequency: input.frequency,
          status: 'ACTIVE',
          times: timesOfDayJson,
          timesOfDay: timesOfDayJson,
          instructions: input.instructions,
          purpose: input.purpose,
          pillCount: quantity,
          remainingQuantity: quantity,
          refillThreshold: threshold,
          isActive: true,
          createdByRole: member.role,
          createdByName: member.displayName,
        },
      });

      await recordActivity({
        circleId: member.circleId,
        action: 'MEDICATION_CREATED',
        description: `${member.displayName} added medication "${input.name}" (${input.dosage})`,
        actorRole: member.role,
        actorName: member.displayName,
        targetType: 'Medication',
        targetId: medication.id,
      });

      res.status(201).json({
        status: 'CREATED',
        message: 'Medication added successfully',
        medication: {
          ...medication,
          timesOfDay: input.timesOfDay,
          times: input.timesOfDay,
        },
      });
      return;
    }

    // Caretaker flow: requires elder approval
    const proposedData = JSON.stringify({
      name: input.name,
      dosage: input.dosage,
      frequency: input.frequency,
      timesOfDay: input.timesOfDay,
      times: input.timesOfDay,
      instructions: input.instructions,
      purpose: input.purpose,
      pillCount: quantity,
      remainingQuantity: quantity,
      refillThreshold: threshold,
    });

    const pendingMed = await prisma.medication.create({
      data: {
        circleId: member.circleId,
        name: input.name,
        dosage: input.dosage,
        frequency: input.frequency,
        status: 'PENDING_APPROVAL',
        times: timesOfDayJson,
        timesOfDay: timesOfDayJson,
        instructions: input.instructions,
        purpose: input.purpose,
        pillCount: quantity,
        remainingQuantity: quantity,
        refillThreshold: threshold,
        isActive: false,
        pendingChange: proposedData,
        createdByRole: member.role,
        createdByName: member.displayName,
      },
    });

    const changeRequest = await prisma.medicationChangeRequest.create({
      data: {
        circleId: member.circleId,
        medicationId: pendingMed.id,
        changeType: 'CREATE',
        status: 'PENDING',
        proposedData,
        requestedByRole: member.role,
        requestedByName: member.displayName,
        reason: input.reason || 'New medication suggested by caretaker',
      },
    });

    await sendNotificationWithDedupe({
      circleId: member.circleId,
      type: 'PENDING_APPROVAL',
      title: 'New Medication Awaiting Approval',
      message: `${member.displayName} suggested adding "${input.name}" (${input.dosage}). Elder approval required.`,
      dedupeKey: `pending-approval-create:${changeRequest.id}`,
    });

    await recordActivity({
      circleId: member.circleId,
      action: 'MEDICATION_CHANGE_REQUESTED',
      description: `${member.displayName} proposed new medication "${input.name}"`,
      actorRole: member.role,
      actorName: member.displayName,
      targetType: 'MedicationChangeRequest',
      targetId: changeRequest.id,
    });

    res.status(202).json({
      status: 'PENDING_APPROVAL',
      message: 'Medication proposed and awaiting Elder approval',
      changeRequest,
      medication: pendingMed,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Controller: Update medication.
 * - Elder: direct update with immediate effect.
 * - Caretaker: creates a pending UPDATE change request for elder approval.
 */
export async function updateMedication(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const member = req.member;
    if (!member) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;
    const input: UpdateMedicationInput = req.body;

    const existing = await prisma.medication.findFirst({
      where: { id, circleId: member.circleId },
    });

    if (!existing) {
      throw new AppError('Medication not found', 404, 'NOT_FOUND');
    }

    if (member.role === 'elder') {
      const timesOfDayJson = input.timesOfDay
        ? JSON.stringify(input.timesOfDay)
        : existing.timesOfDay;

      const qty = input.remainingQuantity !== undefined ? input.remainingQuantity : existing.remainingQuantity;

      const updated = await prisma.medication.update({
        where: { id: existing.id },
        data: {
          ...(input.name ? { name: input.name } : {}),
          ...(input.dosage ? { dosage: input.dosage } : {}),
          ...(input.frequency ? { frequency: input.frequency } : {}),
          ...(input.timesOfDay ? { timesOfDay: timesOfDayJson, times: timesOfDayJson } : {}),
          ...(input.instructions !== undefined ? { instructions: input.instructions } : {}),
          ...(input.purpose !== undefined ? { purpose: input.purpose } : {}),
          ...(input.remainingQuantity !== undefined ? { remainingQuantity: qty, pillCount: qty } : {}),
          ...(input.refillThreshold !== undefined ? { refillThreshold: input.refillThreshold } : {}),
          pendingChange: null,
        },
      });

      await recordActivity({
        circleId: member.circleId,
        action: 'MEDICATION_UPDATED',
        description: `${member.displayName} updated medication "${existing.name}"`,
        actorRole: member.role,
        actorName: member.displayName,
        targetType: 'Medication',
        targetId: updated.id,
      });

      res.json({
        status: 'UPDATED',
        message: 'Medication updated successfully',
        medication: {
          ...updated,
          timesOfDay: JSON.parse(updated.timesOfDay || updated.times || '[]') as string[],
          times: JSON.parse(updated.times || updated.timesOfDay || '[]') as string[],
        },
      });
      return;
    }

    // Caretaker flow: requires elder approval
    const currentData = JSON.stringify({
      name: existing.name,
      dosage: existing.dosage,
      frequency: existing.frequency,
      timesOfDay: JSON.parse(existing.timesOfDay || existing.times || '[]'),
      instructions: existing.instructions,
      purpose: existing.purpose,
      remainingQuantity: existing.remainingQuantity,
      refillThreshold: existing.refillThreshold,
    });

    const proposedData = JSON.stringify({
      name: input.name ?? existing.name,
      dosage: input.dosage ?? existing.dosage,
      frequency: input.frequency ?? existing.frequency,
      timesOfDay: input.timesOfDay ?? JSON.parse(existing.timesOfDay || existing.times || '[]'),
      instructions: input.instructions !== undefined ? input.instructions : existing.instructions,
      purpose: input.purpose !== undefined ? input.purpose : existing.purpose,
      remainingQuantity: input.remainingQuantity !== undefined ? input.remainingQuantity : existing.remainingQuantity,
      pillCount: input.remainingQuantity !== undefined ? input.remainingQuantity : existing.pillCount,
      refillThreshold: input.refillThreshold !== undefined ? input.refillThreshold : existing.refillThreshold,
    });

    await prisma.medication.update({
      where: { id: existing.id },
      data: { pendingChange: proposedData },
    });

    const changeRequest = await prisma.medicationChangeRequest.create({
      data: {
        circleId: member.circleId,
        medicationId: existing.id,
        changeType: 'UPDATE',
        status: 'PENDING',
        proposedData,
        currentData,
        requestedByRole: member.role,
        requestedByName: member.displayName,
        reason: input.reason || 'Medication update suggested by caretaker',
      },
    });

    await sendNotificationWithDedupe({
      circleId: member.circleId,
      type: 'PENDING_APPROVAL',
      title: 'Medication Update Awaiting Approval',
      message: `${member.displayName} requested changes to "${existing.name}". Elder approval required.`,
      dedupeKey: `pending-approval-update:${changeRequest.id}`,
    });

    await recordActivity({
      circleId: member.circleId,
      action: 'MEDICATION_CHANGE_REQUESTED',
      description: `${member.displayName} requested update to "${existing.name}"`,
      actorRole: member.role,
      actorName: member.displayName,
      targetType: 'MedicationChangeRequest',
      targetId: changeRequest.id,
    });

    res.status(202).json({
      status: 'PENDING_APPROVAL',
      message: 'Medication change submitted for elder approval',
      changeRequest,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Controller: Delete medication.
 * - Elder: direct deactivation (status: STOPPED, isActive: false).
 * - Caretaker: creates a pending DELETE change request for elder approval.
 */
export async function deleteMedication(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const member = req.member;
    if (!member) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;

    const existing = await prisma.medication.findFirst({
      where: { id, circleId: member.circleId },
    });

    if (!existing) {
      throw new AppError('Medication not found', 404, 'NOT_FOUND');
    }

    if (member.role === 'elder') {
      await prisma.medication.update({
        where: { id: existing.id },
        data: { isActive: false, status: 'STOPPED' },
      });

      await recordActivity({
        circleId: member.circleId,
        action: 'MEDICATION_DEACTIVATED',
        description: `${member.displayName} deactivated medication "${existing.name}"`,
        actorRole: member.role,
        actorName: member.displayName,
        targetType: 'Medication',
        targetId: existing.id,
      });

      res.json({
        status: 'DEACTIVATED',
        message: `Medication "${existing.name}" deactivated`,
      });
      return;
    }

    // Caretaker flow
    const currentData = JSON.stringify({
      name: existing.name,
      dosage: existing.dosage,
      frequency: existing.frequency,
    });

    const changeRequest = await prisma.medicationChangeRequest.create({
      data: {
        circleId: member.circleId,
        medicationId: existing.id,
        changeType: 'DELETE',
        status: 'PENDING',
        proposedData: JSON.stringify({ isActive: false, status: 'STOPPED' }),
        currentData,
        requestedByRole: member.role,
        requestedByName: member.displayName,
        reason: 'Medication deactivation requested by caretaker',
      },
    });

    await sendNotificationWithDedupe({
      circleId: member.circleId,
      type: 'PENDING_APPROVAL',
      title: 'Medication Deletion Awaiting Approval',
      message: `${member.displayName} requested to remove "${existing.name}". Elder approval required.`,
      dedupeKey: `pending-approval-delete:${changeRequest.id}`,
    });

    await recordActivity({
      circleId: member.circleId,
      action: 'MEDICATION_CHANGE_REQUESTED',
      description: `${member.displayName} requested deactivation of "${existing.name}"`,
      actorRole: member.role,
      actorName: member.displayName,
      targetType: 'MedicationChangeRequest',
      targetId: changeRequest.id,
    });

    res.status(202).json({
      status: 'PENDING_APPROVAL',
      message: 'Deactivation request submitted for elder approval',
      changeRequest,
    });
  } catch (err) {
    next(err);
  }
}
