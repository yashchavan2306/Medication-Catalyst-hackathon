import type { Request, Response, NextFunction } from 'express';
import { verifyMemberToken } from '../utils/jwt.js';

/**
 * Middleware: Attaches member identity to req.member from the Bearer token.
 * Rejects requests with 401 if token is missing or invalid.
 */
export function attachMember(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication token is required',
      },
    });
    return;
  }

  const token = authHeader.substring(7).trim();
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
