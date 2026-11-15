import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/db.js';
import { recordActivity } from '../../utils/activity.js';
import { sendNotificationWithDedupe } from '../../services/emailService.js';
import { AppError } from '../../middlewares/errorHandler.js';
import type { CreateAppointmentInput, UpdateAppointmentInput } from './appointments.schema.js';

/**
 * Controller: List appointments for the circle.
 */
export async function getAppointments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const member = req.member;
    if (!member) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const statusParam = (req.query.status as string) || 'UPCOMING';
    const whereClause: { circleId: string; status?: string } = { circleId: member.circleId };

    if (statusParam !== 'ALL') {
      whereClause.status = statusParam;
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      orderBy: { dateTime: 'asc' },
    });

    const parsed = appointments.map((appt) => ({
      ...appt,
      questions: appt.questions ? JSON.parse(appt.questions) : null,
    }));

    res.json(parsed);
  } catch (err) {
    next(err);
  }
}

/**
 * Controller: Create appointment (elder or caretaker).
 */
export async function createAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const member = req.member;
    if (!member) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const input: CreateAppointmentInput = req.body;
    const questionsJson = input.questions
      ? typeof input.questions === 'string'
        ? input.questions
        : JSON.stringify(input.questions)
      : null;

    const appointment = await prisma.appointment.create({
      data: {
        circleId: member.circleId,
        title: input.title,
        doctorName: input.doctorName,
        location: input.location,
        dateTime: new Date(input.dateTime),
        notes: input.notes,
        questions: questionsJson,
        createdByRole: member.role,
        createdByName: member.displayName,
      },
    });

    await sendNotificationWithDedupe({
      circleId: member.circleId,
      type: 'APPOINTMENT',
      title: `New Appointment: ${input.title}`,
      message: `${input.title} with ${input.doctorName} on ${new Date(input.dateTime).toLocaleDateString()}. Added by ${member.displayName}.`,
      dedupeKey: `appt-created:${appointment.id}`,
    });

    await recordActivity({
      circleId: member.circleId,
      action: 'APPOINTMENT_CREATED',
      description: `${member.displayName} scheduled "${input.title}" with ${input.doctorName}`,
      actorRole: member.role,
      actorName: member.displayName,
      targetType: 'Appointment',
      targetId: appointment.id,
    });

    res.status(201).json({
      ...appointment,
      questions: appointment.questions ? JSON.parse(appointment.questions) : null,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Controller: Update appointment (elder or caretaker).
 */
export async function updateAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const member = req.member;
    if (!member) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;
    const input: UpdateAppointmentInput = req.body;

    const existing = await prisma.appointment.findFirst({
      where: { id, circleId: member.circleId },
    });

    if (!existing) {
      throw new AppError('Appointment not found', 404, 'NOT_FOUND');
    }

    const questionsJson = input.questions !== undefined
      ? typeof input.questions === 'string'
        ? input.questions
        : JSON.stringify(input.questions)
      : existing.questions;

    const updated = await prisma.appointment.update({
      where: { id: existing.id },
      data: {
        ...(input.title ? { title: input.title } : {}),
        ...(input.doctorName ? { doctorName: input.doctorName } : {}),
        ...(input.location ? { location: input.location } : {}),
        ...(input.dateTime ? { dateTime: new Date(input.dateTime) } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.questions !== undefined ? { questions: questionsJson } : {}),
        ...(input.status ? { status: input.status } : {}),
      },
    });

    await recordActivity({
      circleId: member.circleId,
      action: 'APPOINTMENT_UPDATED',
      description: `${member.displayName} updated appointment "${existing.title}"`,
      actorRole: member.role,
      actorName: member.displayName,
      targetType: 'Appointment',
      targetId: updated.id,
    });

    res.json({
      ...updated,
      questions: updated.questions ? JSON.parse(updated.questions) : null,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Controller: Delete appointment (elder or caretaker).
 */
export async function deleteAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const member = req.member;
    if (!member) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;

    const existing = await prisma.appointment.findFirst({
      where: { id, circleId: member.circleId },
    });

    if (!existing) {
      throw new AppError('Appointment not found', 404, 'NOT_FOUND');
    }

    await prisma.appointment.delete({
      where: { id: existing.id },
    });

    await recordActivity({
      circleId: member.circleId,
      action: 'APPOINTMENT_DELETED',
      description: `${member.displayName} deleted appointment "${existing.title}"`,
      actorRole: member.role,
      actorName: member.displayName,
      targetType: 'Appointment',
      targetId: existing.id,
    });

    res.json({ message: 'Appointment deleted successfully' });
  } catch (err) {
    next(err);
  }
}
