import { Router } from 'express';
import { attachMember } from '../../middlewares/attachMember.js';
import { validate } from '../../middlewares/validate.js';
import {
  notificationIdParamSchema,
  listNotificationsQuerySchema,
} from './notifications.schema.js';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from './notifications.controller.js';

export const notificationsRouter = Router();

notificationsRouter.use(attachMember);

// List notifications (all members)
notificationsRouter.get('/', validate({ query: listNotificationsQuerySchema }), getNotifications);

// Mark notification as read (all members)
notificationsRouter.patch('/:id/read', validate({ params: notificationIdParamSchema }), markAsRead);

// Mark all as read (all members)
notificationsRouter.post('/mark-all-read', markAllAsRead);
