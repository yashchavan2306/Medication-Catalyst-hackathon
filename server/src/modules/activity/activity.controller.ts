import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/db.js';
import { AppError } from '../../middlewares/errorHandler.js';

/**
 * Controller: Get circle audit trail / activity log.
 * GET /api/activity
 */
export async function getActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const member = req.member;
    if (!member) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

    const activities = await prisma.activityLog.findMany({
      where: { circleId: member.circleId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    });

    res.json(activities);
  } catch (err) {
    next(err);
  }
}
