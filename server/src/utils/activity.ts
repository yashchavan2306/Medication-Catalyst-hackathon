import { prisma } from '../config/db.js';

export interface ActivityPayload {
  circleId: string;
  action: string;
  description: string;
  actorRole: string;
  actorName: string;
  targetType?: string;
  targetId?: string;
  memberId?: string;
  details?: unknown;
}

/**
 * Appends an audit entry to the Circle's AuditLog and ActivityLog.
 */
export async function recordActivity(payload: ActivityPayload): Promise<void> {
  try {
    const detailsStr = payload.details
      ? typeof payload.details === 'string'
        ? payload.details
        : JSON.stringify(payload.details)
      : payload.description;

    await Promise.all([
      prisma.activityLog.create({
        data: {
          circleId: payload.circleId,
          action: payload.action,
          description: payload.description,
          actorRole: payload.actorRole,
          actorName: payload.actorName,
        },
      }),
      prisma.auditLog.create({
        data: {
          circleId: payload.circleId,
          memberId: payload.memberId,
          action: payload.action,
          targetType: payload.targetType,
          targetId: payload.targetId,
          details: detailsStr,
          actorRole: payload.actorRole,
          actorName: payload.actorName,
        },
      }),
    ]);
  } catch (err) {
    console.warn('[AuditLog] Failed to record audit activity:', err);
  }
}
