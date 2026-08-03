import type { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

/**
 * Generates a race-safe, human-readable sequential number scoped by year,
 * e.g. INV-2026-0001 or PO-2026-0001.
 *
 * Implementation: a `Counter` row keyed by `${scope}-${year}` is atomically
 * incremented via `upsert` + `increment` inside the SAME `$transaction` that
 * creates the Sale/Purchase record. SQLite serializes writers at the
 * database-file level, so once a transaction acquires the write lock to
 * upsert the counter, no other transaction can interleave and read a stale
 * value - this makes the increment race-safe without needing optimistic
 * retry loops. If we ever move off SQLite to a database with real MVCC
 * (e.g. Postgres), this same upsert pattern still works because the counter
 * row itself is the serialization point (SELECT ... FOR UPDATE semantics via
 * upsert), but a unique-constraint retry loop on the final insert would be a
 * reasonable additional safety net.
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
