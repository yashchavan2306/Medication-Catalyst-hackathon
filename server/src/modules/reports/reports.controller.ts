import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/db.js';
import { getCurrentDateString } from '../../utils/date.js';
import { AppError } from '../../middlewares/errorHandler.js';

/**
 * Controller: Comprehensive adherence report over past N days.
 * GET /api/reports/adherence
 */
export async function getAdherenceReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const member = req.member;
    if (!member) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const days = req.query.days ? parseInt(req.query.days as string, 10) : 7;
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);
    const sinceDateStr = getCurrentDateString(sinceDate);

    // 1. Overall status counts
    const statusCounts = await prisma.adherenceLog.groupBy({
      by: ['status'],
      where: {
        circleId: member.circleId,
        scheduledDate: { gte: sinceDateStr },
      },
      _count: { id: true },
    });

    let taken = 0;
    let skipped = 0;
    let missed = 0;
    let snoozed = 0;
    let total = 0;

    for (const item of statusCounts) {
      total += item._count.id;
      if (item.status === 'TAKEN') taken = item._count.id;
      if (item.status === 'SKIPPED') skipped = item._count.id;
      if (item.status === 'MISSED') missed = item._count.id;
      if (item.status === 'SNOOZED') snoozed = item._count.id;
    }

    const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 100;

    // 2. Daily breakdown
    const dailyLogs = await prisma.adherenceLog.groupBy({
      by: ['scheduledDate', 'status'],
      where: {
        circleId: member.circleId,
        scheduledDate: { gte: sinceDateStr },
      },
      _count: { id: true },
    });

    const dayMap = new Map<string, { date: string; taken: number; skipped: number; missed: number; total: number }>();

    for (const row of dailyLogs) {
      let entry = dayMap.get(row.scheduledDate);
      if (!entry) {
        entry = { date: row.scheduledDate, taken: 0, skipped: 0, missed: 0, total: 0 };
        dayMap.set(row.scheduledDate, entry);
      }
      entry.total += row._count.id;
      if (row.status === 'TAKEN') entry.taken += row._count.id;
      if (row.status === 'SKIPPED') entry.skipped += row._count.id;
      if (row.status === 'MISSED') entry.missed += row._count.id;
    }

    const dailyBreakdown = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // 3. Per-medication breakdown
    const medLogs = await prisma.adherenceLog.groupBy({
      by: ['medicationId', 'status'],
      where: {
        circleId: member.circleId,
        scheduledDate: { gte: sinceDateStr },
      },
      _count: { id: true },
    });

    const activeMeds = await prisma.medication.findMany({
      where: { circleId: member.circleId },
      select: { id: true, name: true, dosage: true },
    });

    const medNameMap = new Map<string, { name: string; dosage: string }>();
    for (const m of activeMeds) {
      medNameMap.set(m.id, { name: m.name, dosage: m.dosage });
    }

    const medStatMap = new Map<string, { medicationId: string; medicationName: string; dosage: string; taken: number; total: number }>();

    for (const row of medLogs) {
      let entry = medStatMap.get(row.medicationId);
      if (!entry) {
        const medInfo = medNameMap.get(row.medicationId);
        entry = {
          medicationId: row.medicationId,
          medicationName: medInfo?.name || 'Unknown',
          dosage: medInfo?.dosage || '',
          taken: 0,
          total: 0,
        };
        medStatMap.set(row.medicationId, entry);
      }
      entry.total += row._count.id;
      if (row.status === 'TAKEN') entry.taken += row._count.id;
    }

    const medicationBreakdown = Array.from(medStatMap.values()).map((m) => ({
      ...m,
      adherenceRate: m.total > 0 ? Math.round((m.taken / m.total) * 100) : 100,
    }));

    res.json({
      periodDays: days,
      sinceDate: sinceDateStr,
      summary: {
        total,
        taken,
        skipped,
        missed,
        snoozed,
        adherenceRate,
      },
      dailyBreakdown,
      medicationBreakdown,
    });
  } catch (err) {
    next(err);
  }
}
