import type { Request, Response, NextFunction } from 'express';

/**
 * CSRF Protection Middleware:
 * Protects state-changing endpoints (POST, PUT, PATCH, DELETE) against CSRF.
 * When session cookies (e.g. token) are used, the X-Requested-With header is strictly required.
 * Pure Bearer-token requests (no cookies) are exempt from CSRF as browsers do not attach them ambiently.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Safe HTTP methods do not change server state
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Exempt unauthenticated public endpoints like circle creation and login
  const isPublicAuthRoute = req.path === '/api/circles' || req.path === '/api/auth/login' || req.path === '/api/auth/create-circle';
  if (isPublicAuthRoute && !req.cookies?.token) {
    return next();
  }

  // If request has cookie authentication, require X-Requested-With
  const hasCookieAuth = Boolean(req.cookies && (req.cookies.token || req.cookies.carecircle_token));
  const xRequestedWith = req.headers['x-requested-with'];

  if (hasCookieAuth && !xRequestedWith) {
    res.status(403).json({
      error: {
        code: 'CSRF_FORBIDDEN',
        message: 'CSRF validation failed: X-Requested-With header is required for cookie-authenticated requests',
      },
    });
    return;
  }

  next();
}
