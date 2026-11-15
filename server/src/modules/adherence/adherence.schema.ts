import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const logDoseSchema = z.object({
  medicationId: z.string().min(1, 'Medication ID is required'),
  scheduledDate: z.string().regex(dateRegex, 'Date must be in YYYY-MM-DD format'),
  scheduledTime: z.string().regex(timeRegex, 'Time must be in HH:mm format'),
  status: z.enum(['TAKEN', 'SKIPPED', 'MISSED']),
  notes: z.string().max(255).optional(),
});

export const adherenceDateQuerySchema = z.object({
  date: z.string().regex(dateRegex, 'Date must be in YYYY-MM-DD format').optional(),
});

export const adherenceStatsQuerySchema = z.object({
  days: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 7)),
});

export type LogDoseInput = z.infer<typeof logDoseSchema>;
