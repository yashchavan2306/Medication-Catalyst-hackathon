import { Router } from 'express';
import { validate } from '../../middlewares/validate.js';
import { attachMember } from '../../middlewares/attachMember.js';
import { createCircleSchema, loginSchema } from './auth.schema.js';
import { createCircle, login, getMe } from './auth.controller.js';

export const authRouter = Router();

authRouter.post('/create-circle', validate({ body: createCircleSchema }), createCircle);
authRouter.post('/login', validate({ body: loginSchema }), login);
authRouter.get('/me', attachMember, getMe);
