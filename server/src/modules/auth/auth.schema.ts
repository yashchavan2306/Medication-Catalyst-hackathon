import { z } from 'zod';

export const createCircleSchema = z.object({
  name: z.string().min(2, 'Circle name must be at least 2 characters').max(100),
  elderName: z.string().min(2, 'Elder name must be at least 2 characters').max(100),
  elderPasscode: z.string().min(4, 'Elder passcode must be at least 4 characters').max(30),
  caretakerPasscode: z.string().min(4, 'Caretaker passcode must be at least 4 characters').max(30),
  familyPasscode: z.string().min(4, 'Family passcode must be at least 4 characters').max(30),
  emergencyContactName: z.string().max(100).optional(),
  emergencyContactPhone: z.string().max(30).optional(),
  notes: z.string().max(500).optional(),
});

export const loginSchema = z.object({
  circleCode: z.string().min(3, 'Circle code is required').transform((v) => v.trim().toUpperCase()),
  passcode: z.string().min(1, 'Passcode is required'),
  displayName: z.string().min(1).max(50).optional(),
});

export type CreateCircleInput = z.infer<typeof createCircleSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
