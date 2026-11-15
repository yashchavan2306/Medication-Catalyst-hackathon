import { z } from 'zod';

const timeFormatRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const createMedicationSchema = z.object({
  name: z.string().min(1, 'Medication name is required').max(100),
  dosage: z.string().min(1, 'Dosage is required').max(50),
  frequency: z.string().min(1, 'Frequency is required').max(100),
  timesOfDay: z
    .array(z.string().regex(timeFormatRegex, 'Time must be in 24h format HH:mm'))
    .min(1, 'At least one scheduled time of day is required'),
  instructions: z.string().max(255).optional(),
  purpose: z.string().max(100).optional(),
  remainingQuantity: z.number().int().min(0).default(30),
  refillThreshold: z.number().int().min(0).default(5),
  reason: z.string().max(255).optional(), // Optional note from caretaker for approval request
});

export const updateMedicationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  dosage: z.string().min(1).max(50).optional(),
  frequency: z.string().min(1).max(100).optional(),
  timesOfDay: z
    .array(z.string().regex(timeFormatRegex, 'Time must be in 24h format HH:mm'))
    .min(1)
    .optional(),
  instructions: z.string().max(255).optional(),
  purpose: z.string().max(100).optional(),
  remainingQuantity: z.number().int().min(0).optional(),
  refillThreshold: z.number().int().min(0).optional(),
  reason: z.string().max(255).optional(), // Note from caretaker
});

export const medicationIdParamSchema = z.object({
  id: z.string().min(1, 'Medication ID is required'),
});

export const listMedicationsQuerySchema = z.object({
  includeInactive: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => val === 'true'),
});

export type CreateMedicationInput = z.infer<typeof createMedicationSchema>;
export type UpdateMedicationInput = z.infer<typeof updateMedicationSchema>;
