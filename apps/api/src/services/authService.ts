import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { Role } from '../types/index.js';
import { prisma } from '../prisma.js';
import { env } from '../env.js';
import { AppError } from '../lib/errors.js';
import type { AccessTokenPayload, RefreshTokenPayload } from '../types/index.js';

const BCRYPT_ROUNDS = 10;

export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  phone: true,
  address: true,
  dob: true,
  salary: true,
  active: true,
  createdAt: true,
  updatedAt: true
} as const;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = { expiresIn: env.ACCESS_TOKEN_TTL as SignOptions['expiresIn'] };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  const options: SignOptions = { expiresIn: env.REFRESH_TOKEN_TTL as SignOptions['expiresIn'] };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw AppError.unauthorized('Invalid email or password');
  }
  const valid = await verifyPassword(password, user.password);
  if (!valid) {
    await prisma.loginAudit.create({ data: { userId: user.id, success: false } });
    throw AppError.unauthorized('Invalid email or password');
  }
  if (!user.active) {
    throw AppError.unauthorized('This account has been deactivated');
  }

  await prisma.loginAudit.create({ data: { userId: user.id, success: true } });

  const accessToken = signAccessToken({ sub: user.id, role: user.role as Role });
  const refreshToken = signRefreshToken({ sub: user.id });

  return { accessToken, refreshToken, user: toPublicUser(user) };
}

export async function refresh(refreshToken: string) {
  let payload: RefreshTokenPayload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw AppError.unauthorized('Invalid or expired refresh token');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.active) {
    throw AppError.unauthorized('Invalid or expired refresh token');
  }

  const accessToken = signAccessToken({ sub: user.id, role: user.role as Role });
  return { accessToken, user: toPublicUser(user) };
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.notFound('User not found');
  const valid = await verifyPassword(currentPassword, user.password);
  if (!valid) throw AppError.validation('Current password is incorrect');
  const hashed = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone: string | null;
  address: string | null;
  dob: string | null;
  salary: number | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function toPublicUser(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  address: string | null;
  dob: string | null;
  salary: number | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    phone: user.phone,
    address: user.address,
    dob: user.dob,
    salary: user.salary,
    active: user.active,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}
