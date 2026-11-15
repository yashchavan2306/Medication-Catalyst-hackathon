import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/db.js';
import { hashPasscode, comparePasscode } from '../../utils/password.js';
import { signMemberToken } from '../../utils/jwt.js';
import { generateCircleCode } from '../../utils/codeGenerator.js';
import { AppError } from '../../middlewares/errorHandler.js';
import type { Role } from '../../types/auth.js';
import type { CreateCircleInput, LoginInput } from './auth.schema.js';

/**
 * Controller: Handles circle creation and authentication.
 */
export async function createCircle(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input: CreateCircleInput = req.body;

    // Generate unique circle code
    let code = generateCircleCode();
    let collision = await prisma.careCircle.findUnique({ where: { code } });
    while (collision) {
      code = generateCircleCode();
      collision = await prisma.careCircle.findUnique({ where: { code } });
    }

    const [elderHash, caretakerHash, familyHash] = await Promise.all([
      hashPasscode(input.elderPasscode),
      hashPasscode(input.caretakerPasscode),
      hashPasscode(input.familyPasscode),
    ]);

    const circle = await prisma.careCircle.create({
      data: {
        code,
        name: input.name,
        elderName: input.elderName,
        elderPasscodeHash: elderHash,
        caretakerPasscodeHash: caretakerHash,
        familyPasscodeHash: familyHash,
        emergencyContactName: input.emergencyContactName,
        emergencyContactPhone: input.emergencyContactPhone,
        notes: input.notes,
        members: {
          create: {
            role: 'elder',
            displayName: input.elderName,
          },
        },
      },
    });

    const memberPayload = {
      circleId: circle.id,
      role: 'elder' as Role,
      displayName: input.elderName,
    };

    const token = signMemberToken(memberPayload);

    res.status(201).json({
      token,
      member: memberPayload,
      circle: {
        id: circle.id,
        code: circle.code,
        name: circle.name,
        elderName: circle.elderName,
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
 * Controller: Authenticates a member by circle code and role passcode.
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { circleCode, passcode, displayName }: LoginInput = req.body;

    const circle = await prisma.careCircle.findUnique({
      where: { code: circleCode },
    });

    if (!circle) {
      throw new AppError('Invalid circle code or passcode', 401, 'INVALID_CREDENTIALS');
    }

    // Verify which role matches the provided passcode
    let matchedRole: Role | null = null;

    if (await comparePasscode(passcode, circle.elderPasscodeHash)) {
      matchedRole = 'elder';
    } else if (await comparePasscode(passcode, circle.caretakerPasscodeHash)) {
      matchedRole = 'caretaker';
    } else if (await comparePasscode(passcode, circle.familyPasscodeHash)) {
      matchedRole = 'family';
    }

    if (!matchedRole) {
      throw new AppError('Invalid circle code or passcode', 401, 'INVALID_CREDENTIALS');
    }

    const resolvedName =
      displayName?.trim() ||
      (matchedRole === 'elder'
        ? circle.elderName
        : matchedRole === 'caretaker'
          ? 'Caretaker'
          : 'Family Member');

    const memberPayload = {
      circleId: circle.id,
      role: matchedRole,
      displayName: resolvedName,
    };

    const token = signMemberToken(memberPayload);

    res.json({
      token,
      member: memberPayload,
      circle: {
        id: circle.id,
        code: circle.code,
        name: circle.name,
        elderName: circle.elderName,
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
 * Controller: Returns authenticated member profile and circle info.
 * Identity read strictly from req.member via attachMember.
 */
export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.member) {
      throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const circle = await prisma.careCircle.findUnique({
      where: { id: req.member.circleId },
      select: {
        id: true,
        code: true,
        name: true,
        elderName: true,
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
      member: req.member,
      circle,
    });
  } catch (err) {
    next(err);
  }
}
