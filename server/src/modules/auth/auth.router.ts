import { Router } from 'express';
import { validate } from '../../middlewares/validate.js';
import { attachMember } from '../../middlewares/attachMember.js';
import { loginSchema } from './auth.schema.js';
import { createCircleRequestSchema } from '../circles/circles.schema.js';
import { createCircle } from '../circles/circles.controller.js';
import { login, logout, getMe } from './auth.controller.js';

export const authRouter = Router();

authRouter.post('/create-circle', validate({ body: createCircleRequestSchema }), createCircle);
authRouter.post('/login', validate({ body: loginSchema }), login);
authRouter.post('/logout', logout);
authRouter.get('/me', attachMember, getMe);
