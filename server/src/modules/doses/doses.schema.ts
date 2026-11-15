import { z } from 'zod';

export const doseIdParamSchema = z.object({
  id: z.string().min(1, 'Dose ID is required'),
});

export const skipDoseSchema = z.object({
  reason: z.string().max(255).optional(),
});

export const snoozeDoseSchema = z.object({
  minutes: z.number().int().min(5).max(360).default(30),
});

export type SkipDoseInput = z.infer<typeof skipDoseSchema>;
export type SnoozeDoseInput = z.infer<typeof snoozeDoseSchema>;
