import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/db.js';
import { env } from '../../config/env.js';
import { comparePasscode } from '../../utils/password.js';
import { signMemberToken } from '../../utils/jwt.js';
import { recordActivity } from '../../utils/activity.js';
import { AppError } from '../../middlewares/errorHandler.js';
import type { Role } from '../../types/auth.js';
import type { LoginInput } from './auth.schema.js';

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Controller: Authenticates a member by circle code and role passcode.
 * Enforces 5-failure lockout, sets HttpOnly SameSite=Lax cookie, returns { member, token }.
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { circleCode, passcode, displayName }: LoginInput = req.body;

    const circle = await prisma.careCircle.findUnique({
      where: { code: circleCode },
      include: {
        members: true,
      },
    });

    if (!circle) {
      throw new AppError('Invalid circle code or passcode', 401, 'INVALID_CREDENTIALS');
    }

    const now = new Date();

    // Check circle-wide lockout
    if (circle.lockedUntil && circle.lockedUntil > now) {
      throw new AppError(
        'Account is locked due to 5 consecutive failed attempts. Please try again later.',
        429,
        'ACCOUNT_LOCKED'
      );
    }

    let matchedRole: Role | null = null;
    let matchedMemberId: string | undefined;

    // Check members table first
    if (circle.members && circle.members.length > 0) {
      for (const member of circle.members) {
        if (member.lockedUntil && member.lockedUntil > now) {
          throw new AppError(
            'Account is locked due to 5 consecutive failed attempts. Please try again later.',
            429,
            'ACCOUNT_LOCKED'
          );
        }
        if (member.passcodeHash && (await comparePasscode(passcode, member.passcodeHash))) {
          matchedRole = member.role as Role;
          matchedMemberId = member.id;
          break;
        }
      }
    }

    // Fall back to circle passcode hashes if not matched yet
    if (!matchedRole) {
      if (circle.elderPasscodeHash && (await comparePasscode(passcode, circle.elderPasscodeHash))) {
        matchedRole = 'elder';
      } else if (
        circle.caretakerPasscodeHash &&
        (await comparePasscode(passcode, circle.caretakerPasscodeHash))
      ) {
        matchedRole = 'caretaker';
      } else if (
        circle.familyPasscodeHash &&
        (await comparePasscode(passcode, circle.familyPasscodeHash))
      ) {
        matchedRole = 'family';
      }
    }

    // Passcode failed: increment failure count and enforce lockout
    if (!matchedRole) {
      const newFailures = (circle.failedLoginAttempts || 0) + 1;
      const isLockout = newFailures >= LOCKOUT_THRESHOLD;
      const lockedUntil = isLockout ? new Date(now.getTime() + LOCKOUT_DURATION_MS) : null;

      await Promise.all([
        prisma.careCircle.update({
          where: { id: circle.id },
          data: {
            failedLoginAttempts: newFailures,
            lockedUntil,
          },
        }),
        prisma.member.updateMany({
          where: { circleId: circle.id },
          data: {
            failedAttempts: newFailures,
            lockedUntil,
          },
        }),
      ]);

      if (isLockout) {
        await recordActivity({
          circleId: circle.id,
          action: 'LOGIN_LOCKOUT',
          description: `Care Circle locked out after 5 consecutive failed login attempts`,
          actorRole: 'unknown',
          actorName: 'Unknown',
        });

        throw new AppError(
          'Account is locked due to 5 consecutive failed attempts. Please try again later.',
          429,
          'ACCOUNT_LOCKED'
        );
      }

      await recordActivity({
        circleId: circle.id,
        action: 'LOGIN_FAILED',
        description: `Failed login attempt (attempt ${newFailures}/5)`,
        actorRole: 'unknown',
        actorName: 'Unknown',
      });

      throw new AppError('Invalid circle code or passcode', 401, 'INVALID_CREDENTIALS');
    }

    // Login successful: reset failure counts and lockout
    await Promise.all([
      prisma.careCircle.update({
        where: { id: circle.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      }),
      prisma.member.updateMany({
        where: { circleId: circle.id },
        data: {
          failedAttempts: 0,
          lockedUntil: null,
        },
      }),
    ]);

    const resolvedName =
      displayName?.trim() ||
      (matchedRole === 'elder'
        ? circle.elderName
        : matchedRole === 'caretaker'
          ? 'Caretaker'
          : 'Family Member');

    const memberPayload = {
      circleId: circle.id,
      memberId: matchedMemberId,
      role: matchedRole,
      displayName: resolvedName,
    };

    const token = signMemberToken(memberPayload);

    // Set HttpOnly SameSite=Lax cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });

    await recordActivity({
      circleId: circle.id,
      action: 'MEMBER_LOGIN',
      description: `${resolvedName} signed in as ${matchedRole}`,
      actorRole: matchedRole,
      actorName: resolvedName,
    });

    res.json({
      member: {
        circleId: circle.id,
        role: matchedRole,
        displayName: resolvedName,
        circleCode: circle.code,
        elderName: circle.elderName,
      },
      token,
      circle: {
        id: circle.id,
        code: circle.code,
        name: circle.name,
        elderName: circle.elderName,
        elderEmail: circle.elderEmail,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Controller: Clears HttpOnly authentication cookie.
 */
export function logout(_req: Request, res: Response): void {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
  });
  res.clearCookie('carecircle_token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
  });
  res.json({ message: 'Logged out successfully' });
}

/**
 * Controller: Returns authenticated member profile and circle details.
 * Identity read strictly from req.member via attachMember.
 */
export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const member = req.member;
    if (!member) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

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
        createdAt: true,
      },
    });

    if (!circle) {
      throw new AppError('Care Circle not found', 404, 'NOT_FOUND');
    }

    res.json({
      member,
      circle,
    });
  } catch (err) {
    next(err);
  }
}
