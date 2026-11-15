import { z } from 'zod';

export const logVitalSchema = z.object({
  bloodPressureSystolic: z.number().int().min(50).max(300).optional(),
  bloodPressureDiastolic: z.number().int().min(30).max(200).optional(),
  bloodSugar: z.number().min(20).max(1000).optional(),
  heartRate: z.number().int().min(30).max(250).optional(),
  mood: z.enum(['GREAT', 'GOOD', 'OKAY', 'TIRED', 'UNWELL']).optional(),
  notes: z.string().max(255).optional(),
});

export const listVitalsQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20)),
});

export type LogVitalInput = z.infer<typeof logVitalSchema>;
