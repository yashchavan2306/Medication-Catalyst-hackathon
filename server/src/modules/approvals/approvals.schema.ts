import { z } from 'zod';

export const requestIdParamSchema = z.object({
  id: z.string().min(1, 'Request ID is required'),
});

export const reviewRequestSchema = z.object({
  reviewNotes: z.string().max(255).optional(),
});

export const listApprovalsQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'ALL']).default('PENDING'),
});

export type ReviewRequestInput = z.infer<typeof reviewRequestSchema>;
