import { Router } from 'express';
import { attachMember } from '../../middlewares/attachMember.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import {
  createMedicationSchema,
  updateMedicationSchema,
  medicationIdParamSchema,
  listMedicationsQuerySchema,
} from './medications.schema.js';
import {
  getMedications,
  getMedicationById,
  createMedication,
  updateMedication,
  deleteMedication,
} from './medications.controller.js';

export const medicationsRouter = Router();

medicationsRouter.use(attachMember);

// List all medications (all circle members)
medicationsRouter.get('/', validate({ query: listMedicationsQuerySchema }), getMedications);

// Get single medication (all circle members)
medicationsRouter.get('/:id', validate({ params: medicationIdParamSchema }), getMedicationById);

// Create medication (elder directly adds, caretaker creates approval request)
medicationsRouter.post(
  '/',
  requireRole('elder', 'caretaker'),
  validate({ body: createMedicationSchema }),
  createMedication
);

// Update medication (supports PUT as requested and PATCH)
medicationsRouter.put(
  '/:id',
  requireRole('elder', 'caretaker'),
  validate({ params: medicationIdParamSchema, body: updateMedicationSchema }),
  updateMedication
);
medicationsRouter.patch(
  '/:id',
  requireRole('elder', 'caretaker'),
  validate({ params: medicationIdParamSchema, body: updateMedicationSchema }),
  updateMedication
);

// Delete/deactivate medication
medicationsRouter.delete(
  '/:id',
  requireRole('elder', 'caretaker'),
  validate({ params: medicationIdParamSchema }),
  deleteMedication
);
