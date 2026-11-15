import { z } from 'zod';

export const updateCircleSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  elderName: z.string().min(2).max(100).optional(),
  emergencyContactName: z.string().max(100).optional(),
  emergencyContactPhone: z.string().max(30).optional(),
  notes: z.string().max(500).optional(),
});

export const updatePasscodesSchema = z.object({
  elderPasscode: z.string().min(4).max(30).optional(),
  caretakerPasscode: z.string().min(4).max(30).optional(),
  familyPasscode: z.string().min(4).max(30).optional(),
});

export type UpdateCircleInput = z.infer<typeof updateCircleSchema>;
export type UpdatePasscodesInput = z.infer<typeof updatePasscodesSchema>;
