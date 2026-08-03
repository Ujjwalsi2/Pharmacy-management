/**
 * Rounds to 2 decimal places using the exact contract formula so the POS
 * total always matches what the server will compute and persist.
 */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export interface SaleTotals {
  subtotal: number;
  discount: number;
  taxRate: number;
  tax: number;
  total: number;
}

/**
 * `tax = round((subtotal - discount) * taxRate / 100, 2)`;
 * `total = subtotal - discount + tax`. Mirrors `docs/API_CONTRACT.md` exactly
 * so the displayed total always matches what `POST /sales` will persist.
 */
export function computeSaleTotals(subtotal: number, discount: number, taxRate: number): SaleTotals {
  const safeSubtotal = round2(subtotal);
  const safeDiscount = round2(Math.max(0, discount));
  const tax = round2(((safeSubtotal - safeDiscount) * taxRate) / 100);
  const total = round2(safeSubtotal - safeDiscount + tax);
  return { subtotal: safeSubtotal, discount: safeDiscount, taxRate, tax, total };
}
