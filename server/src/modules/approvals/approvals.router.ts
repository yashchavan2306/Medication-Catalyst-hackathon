import { Router } from 'express';
import { attachMember } from '../../middlewares/attachMember.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import {
  requestIdParamSchema,
  reviewRequestSchema,
  listApprovalsQuerySchema,
} from './approvals.schema.js';
import { getApprovals, approveRequest, rejectRequest } from './approvals.controller.js';

export const approvalsRouter = Router();

approvalsRouter.use(attachMember);

// List change requests (all circle members)
approvalsRouter.get('/', validate({ query: listApprovalsQuerySchema }), getApprovals);

// Elder approves
approvalsRouter.post(
  '/:id/approve',
  requireRole('elder'),
  validate({ params: requestIdParamSchema, body: reviewRequestSchema }),
  approveRequest
);

// Elder rejects
approvalsRouter.post(
  '/:id/reject',
  requireRole('elder'),
  validate({ params: requestIdParamSchema, body: reviewRequestSchema }),
  rejectRequest
);
