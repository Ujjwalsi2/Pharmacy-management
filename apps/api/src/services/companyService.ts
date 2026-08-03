import { prisma } from '../prisma.js';
import { AppError } from '../lib/errors.js';
import { parsePagination, toSkipTake, buildListEnvelope, parseSort } from '../lib/pagination.js';

function toCompanyDto(company: {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { drugs: number };
}) {
  return {
    id: company.id,
    name: company.name,
    address: company.address,
    phone: company.phone,
    email: company.email,
    drugCount: company._count?.drugs ?? 0,
    createdAt: company.createdAt,
    updatedAt: company.updatedAt
  };
}

export interface ListCompaniesQuery {
  page?: string;
  pageSize?: string;
  search?: string;
  sort?: string;
}

export async function listCompanies(query: ListCompaniesQuery) {
  const pagination = parsePagination(query);
  const where: Record<string, unknown> = {};
  if (query.search) {
    where.name = { contains: query.search };
  }
  const orderBy = parseSort(query.sort, ['name', 'createdAt'], { name: 'asc' });

  const [rows, total] = await Promise.all([
    prisma.company.findMany({
      where,
      orderBy,
      include: { _count: { select: { drugs: true } } },
      ...toSkipTake(pagination)
    }),
    prisma.company.count({ where })
  ]);

  return buildListEnvelope(rows.map(toCompanyDto), total, pagination);
}

export async function getCompany(id: string) {
  const company = await prisma.company.findUnique({
    where: { id },
    include: { _count: { select: { drugs: true } } }
  });
  if (!company) throw AppError.notFound('Company not found');
  return toCompanyDto(company);
}

export interface CompanyInput {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
}

export async function createCompany(input: CompanyInput) {
  const existing = await prisma.company.findUnique({ where: { name: input.name } });
  if (existing) throw AppError.conflict('A company with this name already exists');
  const company = await prisma.company.create({
    data: input,
    include: { _count: { select: { drugs: true } } }
  });
  return toCompanyDto(company);
}

export async function updateCompany(id: string, input: Partial<CompanyInput>) {
  const existing = await prisma.company.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Company not found');
  if (input.name && input.name !== existing.name) {
    const dupe = await prisma.company.findUnique({ where: { name: input.name } });
    if (dupe) throw AppError.conflict('A company with this name already exists');
  }
  const company = await prisma.company.update({
    where: { id },
    data: input,
    include: { _count: { select: { drugs: true } } }
  });
  return toCompanyDto(company);
}

export async function deleteCompany(id: string) {
  const existing = await prisma.company.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Company not found');

  const [drugCount, purchaseCount] = await Promise.all([
    prisma.drug.count({ where: { companyId: id } }),
    prisma.purchase.count({ where: { companyId: id } })
  ]);
  if (drugCount > 0 || purchaseCount > 0) {
    throw AppError.conflict('Cannot delete a company that is referenced by drugs or purchases');
  }

  await prisma.company.delete({ where: { id } });
}
