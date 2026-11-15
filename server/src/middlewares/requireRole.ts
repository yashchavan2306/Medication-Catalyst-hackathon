import type { Request, Response, NextFunction } from 'express';
import type { Role } from '../types/auth.js';

/**
 * Middleware: Enforces permissions based on member role.
 * Only roles specified in the parameters are permitted to access the route.
 */
export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.member) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    if (!allowedRoles.includes(req.member.role)) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Requires one of: ${allowedRoles.join(', ')}`,
        },
      });
      return;
    }

    next();
  };
}
