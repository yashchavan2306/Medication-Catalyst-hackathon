import { Router } from 'express';
import { attachMember } from '../../middlewares/attachMember.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  appointmentIdParamSchema,
  listAppointmentsQuerySchema,
} from './appointments.schema.js';
import {
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from './appointments.controller.js';

export const appointmentsRouter = Router();

appointmentsRouter.use(attachMember);

// List appointments (all circle members)
appointmentsRouter.get('/', validate({ query: listAppointmentsQuerySchema }), getAppointments);

// Create appointment (elder or caretaker)
appointmentsRouter.post(
  '/',
  requireRole('elder', 'caretaker'),
  validate({ body: createAppointmentSchema }),
  createAppointment
);

// Update appointment (supports PUT as requested and PATCH)
appointmentsRouter.put(
  '/:id',
  requireRole('elder', 'caretaker'),
  validate({ params: appointmentIdParamSchema, body: updateAppointmentSchema }),
  updateAppointment
);
appointmentsRouter.patch(
  '/:id',
  requireRole('elder', 'caretaker'),
  validate({ params: appointmentIdParamSchema, body: updateAppointmentSchema }),
  updateAppointment
);

// Delete appointment (elder or caretaker)
appointmentsRouter.delete(
  '/:id',
  requireRole('elder', 'caretaker'),
  validate({ params: appointmentIdParamSchema }),
  deleteAppointment
);
