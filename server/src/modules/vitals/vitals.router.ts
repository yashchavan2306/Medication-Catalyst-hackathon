import { Router } from 'express';
import { attachMember } from '../../middlewares/attachMember.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import { logVitalSchema, listVitalsQuerySchema } from './vitals.schema.js';
import { getVitals, createVital } from './vitals.controller.js';

export const vitalsRouter = Router();

vitalsRouter.use(attachMember);

// List vitals (all circle members)
vitalsRouter.get('/', validate({ query: listVitalsQuerySchema }), getVitals);

// Log vitals (elder or caretaker)
vitalsRouter.post(
  '/',
  requireRole('elder', 'caretaker'),
  validate({ body: logVitalSchema }),
  createVital
);
