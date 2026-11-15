import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/db.js';
import { AppError } from '../../middlewares/errorHandler.js';

/**
 * Controller: Get notifications for the circle.
 */
export async function getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const member = req.member;
    if (!member) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const unreadOnly = req.query.unreadOnly === 'true' || (req.query.unreadOnly as unknown) === true;

    const notifications = await prisma.notificationLog.findMany({
      where: {
        circleId: member.circleId,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notificationLog.count({
      where: { circleId: member.circleId, isRead: false },
    });

    res.json({
      unreadCount,
      notifications,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Controller: Mark single notification as read.
 */
export async function markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const member = req.member;
    if (!member) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const { id } = req.params;

    const notification = await prisma.notificationLog.findFirst({
      where: { id, circleId: member.circleId },
    });

    if (!notification) {
      throw new AppError('Notification not found', 404, 'NOT_FOUND');
    }

    const updated = await prisma.notificationLog.update({
      where: { id: notification.id },
      data: { isRead: true },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

/**
 * Controller: Mark all circle notifications as read.
 */
export async function markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const member = req.member;
    if (!member) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    await prisma.notificationLog.updateMany({
      where: { circleId: member.circleId, isRead: false },
      data: { isRead: true },
    });

    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
}
