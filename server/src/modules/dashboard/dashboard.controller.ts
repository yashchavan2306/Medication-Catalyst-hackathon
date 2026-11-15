import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/db.js';
import { getCurrentDateString } from '../../utils/date.js';
import { AppError } from '../../middlewares/errorHandler.js';

/**
 * Controller: Get comprehensive circle dashboard overview.
 * GET /api/dashboard
 */
export async function getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const member = req.member;
    if (!member) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const today = getCurrentDateString();
    const now = new Date();

    // 1. Fetch circle details
    const circle = await prisma.careCircle.findUnique({
      where: { id: member.circleId },
      select: {
        id: true,
        code: true,
        name: true,
        elderName: true,
        elderEmail: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        notes: true,
      },
    });

    if (!circle) {
      throw new AppError('Care Circle not found', 404, 'NOT_FOUND');
    }

    // 2. Fetch active medications with pending approvals and low refill count
    const [medications, pendingApprovalsCount, upcomingAppointments, recentActivity, todayLogs] =
      await Promise.all([
        prisma.medication.findMany({
          where: { circleId: member.circleId, isActive: true },
          orderBy: { name: 'asc' },
        }),
        prisma.medicationChangeRequest.count({
          where: { circleId: member.circleId, status: 'PENDING' },
        }),
        prisma.appointment.findMany({
          where: {
            circleId: member.circleId,
            status: 'UPCOMING',
            dateTime: { gte: now },
          },
          orderBy: { dateTime: 'asc' },
          take: 3,
        }),
        prisma.activityLog.findMany({
          where: { circleId: member.circleId },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        prisma.adherenceLog.findMany({
          where: { circleId: member.circleId, scheduledDate: today },
          include: {
            medication: {
              select: {
                name: true,
                dosage: true,
                instructions: true,
              },
            },
          },
          orderBy: { scheduledTime: 'asc' },
        }),
      ]);

    const lowRefillMeds = medications
      .filter((m) => m.remainingQuantity <= m.refillThreshold)
      .map((m) => ({
        id: m.id,
        name: m.name,
        dosage: m.dosage,
        remainingQuantity: m.remainingQuantity,
        refillThreshold: m.refillThreshold,
      }));

    const totalScheduled = todayLogs.length;
    const takenCount = todayLogs.filter((d) => d.status === 'TAKEN').length;
    const pendingCount = todayLogs.filter((d) => d.status === 'PENDING').length;
    const skippedCount = todayLogs.filter((d) => d.status === 'SKIPPED').length;
    const snoozedCount = todayLogs.filter((d) => d.status === 'SNOOZED').length;
    const missedCount = todayLogs.filter((d) => d.status === 'MISSED').length;

    // Past 7 days adherence stats (grouped query, no N+1)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = getCurrentDateString(sevenDaysAgo);

    const weekCounts = await prisma.adherenceLog.groupBy({
      by: ['status'],
      where: {
        circleId: member.circleId,
        scheduledDate: { gte: sevenDaysAgoStr },
      },
      _count: { id: true },
    });

    let weekTaken = 0;
    let weekTotal = 0;
    for (const g of weekCounts) {
      weekTotal += g._count.id;
      if (g.status === 'TAKEN') weekTaken = g._count.id;
    }

    const weeklyAdherenceRate = weekTotal > 0 ? Math.round((weekTaken / weekTotal) * 100) : 100;

    res.json({
      member,
      circle,
      today: {
        date: today,
        summary: {
          totalScheduled,
          takenCount,
          pendingCount,
          skippedCount,
          snoozedCount,
          missedCount,
          adherencePercentage: totalScheduled > 0 ? Math.round((takenCount / totalScheduled) * 100) : 100,
        },
        doses: todayLogs,
      },
      stats: {
        weeklyAdherenceRate,
        totalActiveMedications: medications.length,
        pendingApprovalsCount,
        lowRefillCount: lowRefillMeds.length,
      },
      lowRefillMeds,
      upcomingAppointments,
      recentActivity,
    });
  } catch (err) {
    next(err);
  }
}
