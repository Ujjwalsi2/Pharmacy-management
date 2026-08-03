import type { Role } from '../types/index.js';
import { prisma } from '../prisma.js';
import { AppError } from '../lib/errors.js';
import { parsePagination, toSkipTake, buildListEnvelope, parseSort } from '../lib/pagination.js';
import { hashPassword, publicUserSelect, toPublicUser } from './authService.js';

export interface ListUsersQuery {
  page?: string;
  pageSize?: string;
  search?: string;
  role?: Role;
  active?: string;
  sort?: string;
}

export async function listUsers(query: ListUsersQuery, callerRole: Role) {
  const pagination = parsePagination(query);
  const where: Record<string, unknown> = {};

  if (query.search) {
    where.OR = [
      { name: { contains: query.search } },
      { email: { contains: query.search } }
    ];
  }
  if (query.role) where.role = query.role;
  if (query.active !== undefined) where.active = query.active === 'true';

  const orderBy = parseSort(query.sort, ['name', 'email', 'createdAt'], { createdAt: 'desc' });

  const reducedSelect = { id: true, name: true, email: true, role: true } as const;
  const select = callerRole === 'PHARMACIST' ? reducedSelect : publicUserSelect;

  const [rows, total] = await Promise.all([
    prisma.user.findMany({ where, orderBy, select, ...toSkipTake(pagination) }),
    prisma.user.count({ where })
  ]);

  return buildListEnvelope(rows, total, pagination);
}

export async function getUser(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: publicUserSelect });
  if (!user) throw AppError.notFound('User not found');
  return user;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: Role;
  phone?: string;
  address?: string;
  dob?: string;
  salary?: number;
}

export async function createUser(input: CreateUserInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw AppError.conflict('A user with this email already exists');

  const hashed = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      password: hashed,
      role: input.role,
      phone: input.phone,
      address: input.address,
      dob: input.dob,
      salary: input.salary
    }
  });
  return toPublicUser(user);
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
  role?: Role;
  phone?: string;
  address?: string;
  dob?: string;
  salary?: number;
  active?: boolean;
}

export async function updateUser(id: string, input: UpdateUserInput) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('User not found');

  if (input.email && input.email !== existing.email) {
    const dupe = await prisma.user.findUnique({ where: { email: input.email } });
    if (dupe) throw AppError.conflict('A user with this email already exists');
  }

  const data: Record<string, unknown> = { ...input };
  if (input.password) {
    data.password = await hashPassword(input.password);
  }

  const user = await prisma.user.update({ where: { id }, data });
  return toPublicUser(user);
}

export async function deleteUser(id: string, callerId: string) {
  if (id === callerId) {
    throw AppError.conflict('You cannot delete your own account');
  }
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('User not found');

  const user = await prisma.user.update({ where: { id }, data: { active: false } });
  return toPublicUser(user);
}
