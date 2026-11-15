import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/db.js';
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
        ...(includeInactive ? {} : { isActive: true }),
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
      timesOfDay: JSON.parse(med.timesOfDay) as string[],
      hasPendingChange: med.changeRequests.length > 0,
      pendingChange: med.changeRequests[0] || null,
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
      timesOfDay: JSON.parse(medication.timesOfDay) as string[],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Controller: Create medication.
 * - Elder: direct creation.
 * - Caretaker: creates a pending change request for elder approval.
 */
export async function createMedication(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const member = req.member;
    if (!member) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const input: CreateMedicationInput = req.body;
    const timesOfDayJson = JSON.stringify(input.timesOfDay);

    if (member.role === 'elder') {
      const medication = await prisma.medication.create({
        data: {
          circleId: member.circleId,
          name: input.name,
          dosage: input.dosage,
          frequency: input.frequency,
          timesOfDay: timesOfDayJson,
          instructions: input.instructions,
          purpose: input.purpose,
          remainingQuantity: input.remainingQuantity,
          refillThreshold: input.refillThreshold,
          isActive: true,
          createdByRole: member.role,
          createdByName: member.displayName,
        },
      });

      res.status(201).json({
        status: 'CREATED',
        message: 'Medication added successfully',
        medication: {
          ...medication,
          timesOfDay: input.timesOfDay,
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
      instructions: input.instructions,
      purpose: input.purpose,
      remainingQuantity: input.remainingQuantity,
      refillThreshold: input.refillThreshold,
    });

    const changeRequest = await prisma.medicationChangeRequest.create({
      data: {
        circleId: member.circleId,
        changeType: 'CREATE',
        status: 'PENDING',
        proposedData,
        requestedByRole: member.role,
        requestedByName: member.displayName,
        reason: input.reason || 'New medication suggested by caretaker',
      },
    });

    // Notify circle of pending approval
    await prisma.notificationLog.create({
      data: {
        circleId: member.circleId,
        type: 'PENDING_APPROVAL',
        title: 'New Medication Awaiting Approval',
        message: `${member.displayName} requested to add medication "${input.name}". Elder approval required.`,
      },
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
 * Controller: Update medication.
 * - Elder: direct update.
 * - Caretaker: creates a pending change request for elder approval.
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

      const updated = await prisma.medication.update({
        where: { id: existing.id },
        data: {
          ...(input.name ? { name: input.name } : {}),
          ...(input.dosage ? { dosage: input.dosage } : {}),
          ...(input.frequency ? { frequency: input.frequency } : {}),
          ...(input.timesOfDay ? { timesOfDay: timesOfDayJson } : {}),
          ...(input.instructions !== undefined ? { instructions: input.instructions } : {}),
          ...(input.purpose !== undefined ? { purpose: input.purpose } : {}),
          ...(input.remainingQuantity !== undefined ? { remainingQuantity: input.remainingQuantity } : {}),
          ...(input.refillThreshold !== undefined ? { refillThreshold: input.refillThreshold } : {}),
        },
      });

      res.json({
        status: 'UPDATED',
        message: 'Medication updated successfully',
        medication: {
          ...updated,
          timesOfDay: JSON.parse(updated.timesOfDay) as string[],
        },
      });
      return;
    }

    // Caretaker flow: requires elder approval
    const currentData = JSON.stringify({
      name: existing.name,
      dosage: existing.dosage,
      frequency: existing.frequency,
      timesOfDay: JSON.parse(existing.timesOfDay),
      instructions: existing.instructions,
      purpose: existing.purpose,
      remainingQuantity: existing.remainingQuantity,
      refillThreshold: existing.refillThreshold,
    });

    const proposedData = JSON.stringify({
      name: input.name ?? existing.name,
      dosage: input.dosage ?? existing.dosage,
      frequency: input.frequency ?? existing.frequency,
      timesOfDay: input.timesOfDay ?? JSON.parse(existing.timesOfDay),
      instructions: input.instructions !== undefined ? input.instructions : existing.instructions,
      purpose: input.purpose !== undefined ? input.purpose : existing.purpose,
      remainingQuantity: input.remainingQuantity !== undefined ? input.remainingQuantity : existing.remainingQuantity,
      refillThreshold: input.refillThreshold !== undefined ? input.refillThreshold : existing.refillThreshold,
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

    await prisma.notificationLog.create({
      data: {
        circleId: member.circleId,
        type: 'PENDING_APPROVAL',
        title: 'Medication Update Awaiting Approval',
        message: `${member.displayName} requested changes to "${existing.name}". Elder approval required.`,
      },
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
 * - Elder: direct deactivation.
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
        data: { isActive: false },
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
        proposedData: JSON.stringify({ isActive: false }),
        currentData,
        requestedByRole: member.role,
        requestedByName: member.displayName,
        reason: 'Medication deactivation requested by caretaker',
      },
    });

    await prisma.notificationLog.create({
      data: {
        circleId: member.circleId,
        type: 'PENDING_APPROVAL',
        title: 'Medication Deletion Awaiting Approval',
        message: `${member.displayName} requested to remove "${existing.name}". Elder approval required.`,
      },
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
