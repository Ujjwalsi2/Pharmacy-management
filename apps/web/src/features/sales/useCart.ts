import { useCallback, useMemo, useState } from 'react';
import type { Drug } from '@/types/api';
import { addLine, cartSubtotal, removeLine, setLineQuantity } from './cartReducer';
import type { CartLine } from './cartReducer';
import { computeSaleTotals } from './money';
import type { SaleTotals } from './money';

export interface AddToCartResult {
  ok: boolean;
  reason?: string;
}

export interface UseCartResult {
  lines: CartLine[];
  isEmpty: boolean;
  subtotal: number;
  discount: number;
  setDiscount: (discount: number) => void;
  taxRate: number;
  setTaxRate: (taxRate: number) => void;
  totals: SaleTotals;
  addDrug: (drug: Drug, quantity?: number) => AddToCartResult;
  setLineQuantity: (drugId: string, quantity: number) => void;
  removeLine: (drugId: string) => void;
  clear: () => void;
}

export type { CartLine };

/** Cart state + totals for the POS screen, scoped to `features/sales`. */
export function useCart(): UseCartResult {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(5);

  const subtotal = useMemo(() => cartSubtotal(lines), [lines]);
  const totals = useMemo(() => computeSaleTotals(subtotal, discount, taxRate), [subtotal, discount, taxRate]);

  const addDrug = useCallback((drug: Drug, quantity = 1): AddToCartResult => {
    const result = addLine(lines, drug, quantity);
    if (result.ok) setLines(result.lines);
    return { ok: result.ok, reason: result.reason };
  }, [lines]);

  const updateLineQuantity = useCallback((drugId: string, quantity: number) => {
    setLines((prev) => setLineQuantity(prev, drugId, quantity));
  }, []);

  const removeCartLine = useCallback((drugId: string) => {
    setLines((prev) => removeLine(prev, drugId));
  }, []);

  const clear = useCallback(() => {
    setLines([]);
    setDiscount(0);
    setTaxRate(5);
  }, []);

  return {
    lines,
    isEmpty: lines.length === 0,
    subtotal,
    discount,
    setDiscount,
    taxRate,
    setTaxRate,
    totals,
    addDrug,
    setLineQuantity: updateLineQuantity,
    removeLine: removeCartLine,
    clear,
  };
}
