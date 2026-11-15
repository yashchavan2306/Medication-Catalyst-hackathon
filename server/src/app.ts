import express, { type Application, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { attachMember } from './middlewares/attachMember.js';
import { csrfProtection } from './middlewares/csrfProtection.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { authRouter } from './modules/auth/auth.router.js';
import { getMe } from './modules/auth/auth.controller.js';
import { circlesRouter } from './modules/circles/circles.router.js';
import { medicationsRouter } from './modules/medications/medications.router.js';
import { approvalsRouter } from './modules/approvals/approvals.router.js';
import { adherenceRouter } from './modules/adherence/adherence.router.js';
import { getTodayDoses } from './modules/doses/doses.controller.js';
import { dosesRouter } from './modules/doses/doses.router.js';
import { appointmentsRouter } from './modules/appointments/appointments.router.js';
import { vitalsRouter } from './modules/vitals/vitals.router.js';
import { notificationsRouter } from './modules/notifications/notifications.router.js';
import { getDashboard } from './modules/dashboard/dashboard.controller.js';
import { getAdherenceReport } from './modules/reports/reports.controller.js';
import { getEmergencyInfo } from './modules/emergency/emergency.controller.js';
import { getActivity } from './modules/activity/activity.controller.js';

export function createApp(): Application {
  const app = express();

  // Security headers via helmet
  app.use(helmet());

  // CORS configured to client origin with credentials allowed
  app.use(
    cors({
      origin: [env.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
    })
  );

  app.use(express.json());
  app.use(cookieParser());

  // CSRF protection via required X-Requested-With header
  app.use(csrfProtection);

  // Rate limiter for authentication endpoints
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: process.env.NODE_ENV === 'test' ? 1000 : 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests from this IP, please try again later.',
      },
    },
  });
  app.use('/api/auth/login', loginLimiter);

  // Health check endpoints
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // 1. Circles: POST /api/circles {elderName, elderEmail} -> {circleCode, passcodes:{elder,caretaker,family}}
  app.use('/api/circles', circlesRouter);

  // 2. Auth: POST /api/auth/login {circleCode, passcode} -> sets HttpOnly cookie, returns {member}
  //          POST /api/auth/logout
  app.use('/api/auth', authRouter);

  // 3. Current Member Profile: GET /api/me
  app.get('/api/me', attachMember, getMe);

  // 4. Medications: GET/POST /api/medications ; PUT/DELETE /api/medications/:id
  app.use('/api/medications', medicationsRouter);

  // 5. Approvals: GET /api/approvals ; POST /api/approvals/:id/approve|reject (elder only)
  app.use('/api/approvals', approvalsRouter);

  // 6. Today's Doses: GET /api/today ; POST /api/doses/:id/take|skip|snooze
  app.get('/api/today', attachMember, getTodayDoses);
  app.use('/api/doses', dosesRouter);
  app.use('/api/adherence', adherenceRouter);

  // 7. Appointments: GET/POST /api/appointments ; PUT/DELETE /api/appointments/:id
  app.use('/api/appointments', appointmentsRouter);

  // 8. Dashboard overview: GET /api/dashboard
  app.get('/api/dashboard', attachMember, getDashboard);

  // 9. Adherence Reports: GET /api/reports/adherence
  app.get('/api/reports/adherence', attachMember, getAdherenceReport);

  // 10. Emergency Essentials: GET /api/emergency
  app.get('/api/emergency', attachMember, getEmergencyInfo);

  // 11. Activity Audit Trail: GET /api/activity
  app.get('/api/activity', attachMember, getActivity);

  // 12. Vitals & Notifications
  app.use('/api/vitals', vitalsRouter);
  app.use('/api/notifications', notificationsRouter);

  // 404 Route Handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint does not exist',
      },
    });
  });

  // Centralised Error Handler
  app.use(errorHandler);

  return app;
}
