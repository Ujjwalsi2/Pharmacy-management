export interface PaginationParams {
  page: number;
  pageSize: number;
}

export function parsePagination(query: { page?: unknown; pageSize?: unknown }): PaginationParams {
  const page = Math.max(1, Number.parseInt(String(query.page ?? '1'), 10) || 1);
  const pageSizeRaw = Number.parseInt(String(query.pageSize ?? '20'), 10) || 20;
  const pageSize = Math.min(100, Math.max(1, pageSizeRaw));
  return { page, pageSize };
}

export function toSkipTake({ page, pageSize }: PaginationParams) {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

export interface ListEnvelope<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

export function buildListEnvelope<T>(
  data: T[],
  total: number,
  pagination: PaginationParams
): ListEnvelope<T> {
  return { data, page: pagination.page, pageSize: pagination.pageSize, total };
}

/** Parse a `field:asc|desc` sort string into a Prisma orderBy object. */
export function parseSort(
  sort: unknown,
  allowedFields: string[],
  fallback: Record<string, 'asc' | 'desc'>
): Record<string, 'asc' | 'desc'> {
  if (typeof sort !== 'string' || !sort.includes(':')) return fallback;
  const [field, dir] = sort.split(':');
  if (!field || !allowedFields.includes(field)) return fallback;
  const direction = dir === 'desc' ? 'desc' : 'asc';
  return { [field]: direction };
}
