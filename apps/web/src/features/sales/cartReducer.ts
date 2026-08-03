import type { Drug } from '@/types/api';

export interface CartLine {
  drugId: string;
  name: string;
  dose: string;
  unitPrice: number;
  quantity: number;
  /** Snapshot of available stock at the time the line was added/updated. */
  availableStock: number;
}

export interface AddLineResult {
  lines: CartLine[];
  ok: boolean;
  reason?: string;
}

/** Returns a reason string if `drug` cannot be sold at all, otherwise null. */
export function unsellableReason(drug: Drug): string | null {
  if (drug.status === 'EXPIRED') return 'This drug is expired and cannot be sold.';
  if (drug.status === 'OUT_OF_STOCK') return 'This drug is out of stock.';
  return null;
}

/**
 * Pure cart-line reducer helpers (no React) so they can be unit tested
 * directly. `useCart` wraps these in `useState` updaters.
 */
export function addLine(lines: CartLine[], drug: Drug, quantity = 1): AddLineResult {
  const reason = unsellableReason(drug);
  if (reason) return { lines, ok: false, reason };

  const existing = lines.find((line) => line.drugId === drug.id);
  const currentQty = existing?.quantity ?? 0;
  const nextQty = currentQty + quantity;

  if (nextQty > drug.quantity) {
    return {
      lines,
      ok: false,
      reason: `Only ${drug.quantity} in stock — you already have ${currentQty} in the cart.`,
    };
  }

  if (existing) {
    return {
      lines: lines.map((line) =>
        line.drugId === drug.id ? { ...line, quantity: nextQty, availableStock: drug.quantity } : line,
      ),
      ok: true,
    };
  }

  return {
    lines: [
      ...lines,
      {
        drugId: drug.id,
        name: drug.name,
        dose: drug.dose,
        unitPrice: drug.sellingPrice,
        quantity: nextQty,
        availableStock: drug.quantity,
      },
    ],
    ok: true,
  };
}

/** Clamps `quantity` to `[1, line.availableStock]`. */
export function setLineQuantity(lines: CartLine[], drugId: string, quantity: number): CartLine[] {
  return lines.map((line) => {
    if (line.drugId !== drugId) return line;
    const clamped = Math.max(1, Math.min(quantity, line.availableStock));
    return { ...line, quantity: clamped };
  });
}

export function removeLine(lines: CartLine[], drugId: string): CartLine[] {
  return lines.filter((line) => line.drugId !== drugId);
}

export function cartSubtotal(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
}
