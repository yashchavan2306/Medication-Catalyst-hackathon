import { Router } from 'express';
import { attachMember } from '../../middlewares/attachMember.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import {
  doseIdParamSchema,
  skipDoseSchema,
  snoozeDoseSchema,
} from './doses.schema.js';
import {
  takeDose,
  skipDose,
  snoozeDose,
} from './doses.controller.js';

export const dosesRouter = Router();

dosesRouter.use(attachMember);

// Take dose (elder or caretaker)
dosesRouter.post(
  '/:id/take',
  requireRole('elder', 'caretaker'),
  validate({ params: doseIdParamSchema }),
  takeDose
);

// Skip dose (elder or caretaker)
dosesRouter.post(
  '/:id/skip',
  requireRole('elder', 'caretaker'),
  validate({ params: doseIdParamSchema, body: skipDoseSchema }),
  skipDose
);

// Snooze dose (elder or caretaker)
dosesRouter.post(
  '/:id/snooze',
  requireRole('elder', 'caretaker'),
  validate({ params: doseIdParamSchema, body: snoozeDoseSchema }),
  snoozeDose
);
