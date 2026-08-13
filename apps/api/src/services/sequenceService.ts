import type { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

/**
 * Generates a race-safe, human-readable sequential number scoped by year,
 * e.g. INV-2026-0001 or PO-2026-0001.
 *
 * Implementation: a `Counter` row keyed by `${scope}-${year}` is atomically
 * incremented via `upsert` + `increment` inside the SAME `$transaction` that
 * creates the Sale/Purchase record. The counter row itself acts as the
 * serialization point — its upsert serializes concurrent transactions the
 * same way across SQLite (file-lock) and PostgreSQL (row-lock via upsert),
 * so the increment is always race-safe without retry loops.
 */
export async function nextSequence(
  tx: Tx,
  scope: 'sale' | 'purchase',
  prefix: string,
  year: number
): Promise<string> {
  const id = `${scope}-${year}`;
  const counter = await tx.counter.upsert({
    where: { id },
    update: { value: { increment: 1 } },
    create: { id, value: 1 }
  });
  const seq = String(counter.value).padStart(4, '0');
  return `${prefix}-${year}-${seq}`;
}
