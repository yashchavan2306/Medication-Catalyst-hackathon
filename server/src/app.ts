import express, { type Application, type Request, type Response } from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { authRouter } from './modules/auth/auth.router.js';
import { circlesRouter } from './modules/circles/circles.router.js';
import { medicationsRouter } from './modules/medications/medications.router.js';
import { approvalsRouter } from './modules/approvals/approvals.router.js';
import { adherenceRouter } from './modules/adherence/adherence.router.js';
import { appointmentsRouter } from './modules/appointments/appointments.router.js';
import { vitalsRouter } from './modules/vitals/vitals.router.js';
import { notificationsRouter } from './modules/notifications/notifications.router.js';

export function createApp(): Application {
  const app = express();

  app.use(
    cors({
      origin: [env.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
    })
  );

  app.use(express.json());

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API modules
  app.use('/api/auth', authRouter);
  app.use('/api/circles', circlesRouter);
  app.use('/api/medications', medicationsRouter);
  app.use('/api/approvals', approvalsRouter);
  app.use('/api/adherence', adherenceRouter);
  app.use('/api/appointments', appointmentsRouter);
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
