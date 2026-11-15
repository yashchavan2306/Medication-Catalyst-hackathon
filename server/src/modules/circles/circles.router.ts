import { Router } from 'express';
import { attachMember } from '../../middlewares/attachMember.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import {
  createCircleRequestSchema,
  updateCircleSchema,
  updatePasscodesSchema,
} from './circles.schema.js';
import {
  createCircle,
  getCircleDetails,
  updateCircle,
  updateCirclePasscodes,
} from './circles.controller.js';

export const circlesRouter = Router();

// Public: Create a Care Circle
// POST /api/circles {elderName, elderEmail} -> {circleCode, passcodes:{elder,caretaker,family}}
circlesRouter.post(
  '/',
  validate({ body: createCircleRequestSchema }),
  createCircle
);

// Protected routes below
circlesRouter.get('/', attachMember, getCircleDetails);

circlesRouter.patch(
  '/',
  attachMember,
  requireRole('elder'),
  validate({ body: updateCircleSchema }),
  updateCircle
);

circlesRouter.post(
  '/passcodes',
  attachMember,
  requireRole('elder'),
  validate({ body: updatePasscodesSchema }),
  updateCirclePasscodes
);
