import type { NextFunction, Request, Response } from 'express';
import type { Role } from '../types/index.js';
import { prisma } from '../prisma.js';
import { AppError } from '../lib/errors.js';
import { verifyAccessToken } from '../services/authService.js';

/**
 * Try the standard Authorization header first, then x-access-token as fallback.
 * The public preview proxy rewrites the Authorization header (replacing the JWT
 * with a session UUID), so x-access-token is the reliable path through the proxy.
 */
function extractTokens(req: Request): string[] {
  const tokens: string[] = [];
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    tokens.push(authHeader.slice(7).trim());
  }
  const alt = req.headers['x-access-token'];
  if (typeof alt === 'string' && alt.trim().length > 0) {
    tokens.push(alt.trim());
  }
  return tokens;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const tokens = extractTokens(req);
    if (tokens.length === 0) {
      throw AppError.unauthorized('Missing access token');
    }

    let payload;
    let lastError: unknown;
    for (const token of tokens) {
      try {
        payload = verifyAccessToken(token);
        break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!payload) {
      throw lastError instanceof Error
        ? AppError.unauthorized('Invalid or expired access token')
        : AppError.unauthorized('Invalid or expired access token');
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
