import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { AuthMember } from '../types/auth.js';

const JWT_EXPIRES_IN = '7d';

/**
 * Sign a JWT token carrying member circle identity.
 */
export function signMemberToken(payload: AuthMember): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify a JWT token and decode the member identity.
 */
export function verifyMemberToken(token: string): AuthMember {
  const decoded = jwt.verify(token, env.JWT_SECRET) as AuthMember;
  return {
    circleId: decoded.circleId,
    memberId: decoded.memberId,
    role: decoded.role,
    displayName: decoded.displayName,
  };
}
