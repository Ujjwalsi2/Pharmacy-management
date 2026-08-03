export type DrugStatus = 'EXPIRED' | 'OUT_OF_STOCK' | 'EXPIRING_SOON' | 'LOW_STOCK' | 'IN_STOCK';

const EXPIRING_SOON_WINDOW_DAYS = 90;

export interface DrugStatusInput {
  quantity: number;
  reorderLevel: number;
  expirationDate: Date;
}

/**
 * Derived status precedence (highest wins):
 *   EXPIRED (expirationDate < today)
 *   > OUT_OF_STOCK (quantity === 0)
 *   > EXPIRING_SOON (expires within 90 days)
 *   > LOW_STOCK (quantity <= reorderLevel)
 *   > IN_STOCK
 */
export function computeDrugStatus(drug: DrugStatusInput, now: Date = new Date()): DrugStatus {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const expiry = new Date(
    drug.expirationDate.getFullYear(),
    drug.expirationDate.getMonth(),
    drug.expirationDate.getDate()
  );

  if (expiry.getTime() < today.getTime()) return 'EXPIRED';
  if (drug.quantity === 0) return 'OUT_OF_STOCK';

  const msPerDay = 24 * 60 * 60 * 1000;
  const daysToExpiry = Math.round((expiry.getTime() - today.getTime()) / msPerDay);
  if (daysToExpiry <= EXPIRING_SOON_WINDOW_DAYS) return 'EXPIRING_SOON';

  if (drug.quantity <= drug.reorderLevel) return 'LOW_STOCK';

  return 'IN_STOCK';
}
