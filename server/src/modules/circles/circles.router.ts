import { Router } from 'express';
import { attachMember } from '../../middlewares/attachMember.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import { updateCircleSchema, updatePasscodesSchema } from './circles.schema.js';
import {
  getCircleDetails,
  updateCircle,
  updateCirclePasscodes,
} from './circles.controller.js';

export const circlesRouter = Router();

circlesRouter.use(attachMember);

// Available to all circle members (elder, caretaker, family)
circlesRouter.get('/', getCircleDetails);

// Elder only actions
circlesRouter.patch(
  '/',
  requireRole('elder'),
  validate({ body: updateCircleSchema }),
  updateCircle
);

circlesRouter.post(
  '/passcodes',
  requireRole('elder'),
  validate({ body: updatePasscodesSchema }),
  updateCirclePasscodes
);
