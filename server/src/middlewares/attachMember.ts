import type { Request, Response, NextFunction } from 'express';
import { verifyMemberToken } from '../utils/jwt.js';

/**
 * Middleware: Attaches member identity to req.member from HttpOnly cookie or Bearer token.
 * Rejects requests with 401 if token is missing or invalid.
 */
export function attachMember(req: Request, res: Response, next: NextFunction): void {
  let token: string | undefined;

  // 1. Check HttpOnly cookie
  if (req.cookies && (req.cookies.token || req.cookies.carecircle_token)) {
    token = req.cookies.token || req.cookies.carecircle_token;
  }

  // 2. Fall back to Authorization: Bearer header
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.substring(7).trim();
  }

  if (!token) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication token is required',
      },
    });
    return;
  }

  try {
    const member = verifyMemberToken(token);
    req.member = member;
    next();
  } catch {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired authentication token',
      },
    });
  }
}
