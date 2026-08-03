import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { env } from '../env.js';
import { prisma } from '../prisma.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import * as authService from '../services/authService.js';

export const authRouter = Router();

const REFRESH_COOKIE = 'mt_refresh';

function refreshCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: env.NODE_ENV === 'production',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000
  };
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: { code: 'CONFLICT', message: 'Too many login attempts, please try again later', details: [] }
    });
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

authRouter.post('/login', loginLimiter, validate({ body: loginSchema }), async (req, res, next) => {
  try {
    const { email, password } = req.body as z.infer<typeof loginSchema>;
    const { accessToken, refreshToken, user } = await authService.login(email, password);
    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
    res.json({ accessToken, user });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing refresh token', details: [] } });
      return;
    }
    const { accessToken, user } = await authService.refresh(token);
    res.json({ accessToken, user });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', requireAuth, (_req, res) => {
  res.clearCookie(REFRESH_COOKIE, { path: '/' });
  res.status(204).end();
});

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    // requireAuth guarantees req.user is set and active
    const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
    const user = authService.toPublicUser(dbUser);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6)
});

authRouter.patch(
  '/password',
  requireAuth,
  validate({ body: changePasswordSchema }),
  async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body as z.infer<typeof changePasswordSchema>;
      await authService.changePassword(req.user!.id, currentPassword, newPassword);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
);
