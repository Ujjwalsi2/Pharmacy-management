import type { NextFunction, Request, Response } from 'express';
import type { Role } from '../types/index.js';
import { prisma } from '../prisma.js';
import { AppError } from '../lib/errors.js';
import { verifyAccessToken } from '../services/authService.js';

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw AppError.unauthorized('Missing access token');
    }
    const token = header.slice('Bearer '.length);
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw AppError.unauthorized('Invalid or expired access token');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.active) {
      throw AppError.unauthorized('Invalid or expired access token');
    }

    req.user = { id: user.id, role: user.role as Role };
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(AppError.forbidden('You do not have permission to perform this action'));
      return;
    }
    next();
  };
}
