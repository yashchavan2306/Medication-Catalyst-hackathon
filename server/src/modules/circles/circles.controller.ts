import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/db.js';
import { env } from '../../config/env.js';
import { hashPasscode } from '../../utils/password.js';
import { generateCircleCode, generatePasscode } from '../../utils/codeGenerator.js';
import { signMemberToken } from '../../utils/jwt.js';
import { recordActivity } from '../../utils/activity.js';
import { sendEmail } from '../../services/emailService.js';
import { AppError } from '../../middlewares/errorHandler.js';
import type { Role } from '../../types/auth.js';
import type { CreateCircleRequestInput, UpdateCircleInput, UpdatePasscodesInput } from './circles.schema.js';

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

/**
 * Controller: Create a new Care Circle.
 * POST /api/circles {elderName, elderEmail}
 * Returns: { circleCode, passcodes: { elder, caretaker, family } } (shown once)
 */
export async function createCircle(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input: CreateCircleRequestInput = req.body;

    // Generate unique circle code
    let code = generateCircleCode();
    let collision = await prisma.careCircle.findUnique({ where: { code } });
    while (collision) {
      code = generateCircleCode();
      collision = await prisma.careCircle.findUnique({ where: { code } });
    }

    // Use provided passcodes or generate them
    const elderPasscode = input.elderPasscode || generatePasscode();
    const caretakerPasscode = input.caretakerPasscode || generatePasscode();
    const familyPasscode = input.familyPasscode || generatePasscode();

    const [elderHash, caretakerHash, familyHash] = await Promise.all([
      hashPasscode(elderPasscode),
      hashPasscode(caretakerPasscode),
      hashPasscode(familyPasscode),
    ]);

    const circleName = input.name || `${input.elderName}'s Care Circle`;
    const elderEmail = input.elderEmail || `${code.toLowerCase()}@carecircle.local`;

    const circle = await prisma.careCircle.create({
      data: {
        code,
        name: circleName,
        elderName: input.elderName,
        elderEmail,
        elderPasscodeHash: elderHash,
        caretakerPasscodeHash: caretakerHash,
        familyPasscodeHash: familyHash,
        emergencyContactName: input.emergencyContactName,
        emergencyContactPhone: input.emergencyContactPhone,
        notes: input.notes,
        members: {
          create: [
            {
              role: 'elder',
              displayName: input.elderName,
              passcodeHash: elderHash,
            },
            {
              role: 'caretaker',
              displayName: 'Caretaker',
              passcodeHash: caretakerHash,
            },
            {
              role: 'family',
              displayName: 'Family',
              passcodeHash: familyHash,
            },
          ],
        },
        circleMembers: {
          create: [
            {
              role: 'elder',
              displayName: input.elderName,
            },
            {
              role: 'caretaker',
              displayName: 'Caretaker',
            },
            {
              role: 'family',
              displayName: 'Family',
            },
          ],
        },
      },
      include: {
        members: true,
      },
    });

    const elderMember = circle.members.find((m) => m.role === 'elder');

    const memberPayload = {
      circleId: circle.id,
      memberId: elderMember?.id,
      role: 'elder' as Role,
      displayName: input.elderName,
    };

    const token = signMemberToken(memberPayload);

    // Set HttpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });

    await recordActivity({
      circleId: circle.id,
      action: 'CIRCLE_CREATED',
      description: `Care Circle created for ${input.elderName}`,
      actorRole: 'elder',
      actorName: input.elderName,
      targetType: 'CareCircle',
      targetId: circle.id,
    });

    // Notify elder by email if valid email
    if (elderEmail && !elderEmail.endsWith('.local')) {
      await sendEmail({
        to: elderEmail,
        subject: `Welcome to CareCircle: Access for ${circle.name}`,
        html: `
          <h2>Welcome to CareCircle</h2>
          <p>Your care circle code is <strong>${code}</strong>.</p>
          <p><strong>Your Elder Passcode:</strong> ${elderPasscode}</p>
          <p><strong>Caretaker Passcode:</strong> ${caretakerPasscode}</p>
          <p><strong>Family Passcode:</strong> ${familyPasscode}</p>
        `,
      });
    }

    res.status(201).json({
      circleCode: circle.code,
      passcodes: {
        elder: elderPasscode,
        caretaker: caretakerPasscode,
        family: familyPasscode,
      },
      token,
      member: memberPayload,
      circle: {
        id: circle.id,
        code: circle.code,
        name: circle.name,
        elderName: circle.elderName,
        elderEmail: circle.elderEmail,
        emergencyContactName: circle.emergencyContactName,
        emergencyContactPhone: circle.emergencyContactPhone,
        notes: circle.notes,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Controller: Get details of the active circle.
 * Identity from req.member.
 */
export async function getCircleDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const member = req.member;
    if (!member) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const circle = await prisma.careCircle.findUnique({
      where: { id: member.circleId },
      include: {
        _count: {
          select: {
            medications: { where: { isActive: true } },
            appointments: { where: { status: 'UPCOMING' } },
            changeRequests: { where: { status: 'PENDING' } },
          },
        },
      },
    });

    if (!circle) {
      throw new AppError('Care Circle not found', 404, 'NOT_FOUND');
    }

    res.json({
      id: circle.id,
      code: circle.code,
      name: circle.name,
      elderName: circle.elderName,
      elderEmail: circle.elderEmail,
      emergencyContactName: circle.emergencyContactName,
      emergencyContactPhone: circle.emergencyContactPhone,
      notes: circle.notes,
      createdAt: circle.createdAt,
      stats: {
        activeMedicationsCount: circle._count.medications,
        upcomingAppointmentsCount: circle._count.appointments,
        pendingApprovalsCount: circle._count.changeRequests,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Controller: Update circle settings (elder only).
 */
export async function updateCircle(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const member = req.member;
    if (!member) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const input: UpdateCircleInput = req.body;

    const updated = await prisma.careCircle.update({
      where: { id: member.circleId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.elderName !== undefined && { elderName: input.elderName }),
        ...(input.elderEmail !== undefined && { elderEmail: input.elderEmail }),
        ...(input.emergencyContactName !== undefined && { emergencyContactName: input.emergencyContactName }),
        ...(input.emergencyContactPhone !== undefined && { emergencyContactPhone: input.emergencyContactPhone }),
        ...(input.notes !== undefined && { notes: input.notes }),
      },
    });

    await recordActivity({
      circleId: member.circleId,
      action: 'CIRCLE_UPDATED',
      description: `${member.displayName} updated care circle settings`,
      actorRole: member.role,
      actorName: member.displayName,
      targetType: 'CareCircle',
      targetId: updated.id,
    });

    res.json({
      id: updated.id,
      code: updated.code,
      name: updated.name,
      elderName: updated.elderName,
      elderEmail: updated.elderEmail,
      emergencyContactName: updated.emergencyContactName,
      emergencyContactPhone: updated.emergencyContactPhone,
      notes: updated.notes,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Controller: Rotate passcodes for elder, caretaker, or family (elder only).
 */
export async function updateCirclePasscodes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const member = req.member;
    if (!member) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const input: UpdatePasscodesInput = req.body;
    const dataToUpdate: Record<string, string> = {};

    if (input.elderPasscode) {
      const hash = await hashPasscode(input.elderPasscode);
      dataToUpdate.elderPasscodeHash = hash;
      await prisma.member.updateMany({
        where: { circleId: member.circleId, role: 'elder' },
        data: { passcodeHash: hash },
      });
    }
    if (input.caretakerPasscode) {
      const hash = await hashPasscode(input.caretakerPasscode);
      dataToUpdate.caretakerPasscodeHash = hash;
      await prisma.member.updateMany({
        where: { circleId: member.circleId, role: 'caretaker' },
        data: { passcodeHash: hash },
      });
    }
    if (input.familyPasscode) {
      const hash = await hashPasscode(input.familyPasscode);
      dataToUpdate.familyPasscodeHash = hash;
      await prisma.member.updateMany({
        where: { circleId: member.circleId, role: 'family' },
        data: { passcodeHash: hash },
      });
    }

    if (Object.keys(dataToUpdate).length === 0) {
      res.json({ message: 'No passcode changes provided' });
      return;
    }

    await prisma.careCircle.update({
      where: { id: member.circleId },
      data: dataToUpdate,
    });

    await recordActivity({
      circleId: member.circleId,
      action: 'PASSCODES_UPDATED',
      description: `${member.displayName} updated circle access passcodes`,
      actorRole: member.role,
      actorName: member.displayName,
      targetType: 'CareCircle',
      targetId: member.circleId,
    });

    res.json({ message: 'Passcodes updated successfully' });
  } catch (err) {
    next(err);
  }
}
