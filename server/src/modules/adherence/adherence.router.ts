import { Router } from 'express';
import { attachMember } from '../../middlewares/attachMember.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import {
  logDoseSchema,
  adherenceDateQuerySchema,
  adherenceStatsQuerySchema,
} from './adherence.schema.js';
import {
  getDailySchedule,
  logDose,
  getAdherenceStats,
} from './adherence.controller.js';

export const adherenceRouter = Router();

adherenceRouter.use(attachMember);

// Daily schedule view (all circle members)
adherenceRouter.get('/today', validate({ query: adherenceDateQuerySchema }), getDailySchedule);

// Record dose (elder or caretaker)
adherenceRouter.post(
  '/log',
  requireRole('elder', 'caretaker'),
  validate({ body: logDoseSchema }),
  logDose
);

// Adherence metrics (all circle members)
adherenceRouter.get('/stats', validate({ query: adherenceStatsQuerySchema }), getAdherenceStats);
