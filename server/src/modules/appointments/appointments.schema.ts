import { z } from 'zod';

export const createAppointmentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  doctorName: z.string().min(1, 'Doctor name is required').max(100),
  location: z.string().min(1, 'Location is required').max(150),
  dateTime: z.string().datetime({ message: 'Must be a valid ISO-8601 date-time string' }),
  notes: z.string().max(500).optional(),
  questions: z.any().optional(),
});

export const updateAppointmentSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  doctorName: z.string().min(1).max(100).optional(),
  location: z.string().min(1).max(150).optional(),
  dateTime: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
  questions: z.any().optional(),
  status: z.enum(['UPCOMING', 'COMPLETED', 'CANCELLED']).optional(),
});

export const appointmentIdParamSchema = z.object({
  id: z.string().min(1, 'Appointment ID is required'),
});

export const listAppointmentsQuerySchema = z.object({
  status: z.enum(['UPCOMING', 'COMPLETED', 'CANCELLED', 'ALL']).default('UPCOMING'),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
