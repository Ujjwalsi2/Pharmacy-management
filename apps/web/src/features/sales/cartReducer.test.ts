import { describe, expect, it } from 'vitest';
import type { Drug } from '@/types/api';
import { addLine, cartSubtotal, removeLine, setLineQuantity, unsellableReason } from './cartReducer';

function makeDrug(overrides: Partial<Drug> = {}): Drug {
  return {
    id: 'd1',
    name: 'Novafol',
    barcode: '123',
    type: 'TABLET',
    dose: '500mg',
    code: 'abc',
    costPrice: 2,
    sellingPrice: 40,
    companyId: 'c1',
    company: { id: 'c1', name: 'Cipla' },
    productionDate: '2025-01-01',
    expirationDate: '2027-01-01',
    place: 'A1',
    quantity: 6,
    reorderLevel: 2,
    status: 'IN_STOCK',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('unsellableReason', () => {
  it('blocks expired drugs', () => {
    expect(unsellableReason(makeDrug({ status: 'EXPIRED' }))).toMatch(/expired/i);
  });

  it('blocks out-of-stock drugs', () => {
    expect(unsellableReason(makeDrug({ status: 'OUT_OF_STOCK' }))).toMatch(/out of stock/i);
  });

  it('allows in-stock and low-stock drugs', () => {
    expect(unsellableReason(makeDrug({ status: 'IN_STOCK' }))).toBeNull();
    expect(unsellableReason(makeDrug({ status: 'LOW_STOCK' }))).toBeNull();
    expect(unsellableReason(makeDrug({ status: 'EXPIRING_SOON' }))).toBeNull();
  });
});

describe('addLine', () => {
  it('adds a new line for a sellable drug', () => {
    const result = addLine([], makeDrug());
    expect(result.ok).toBe(true);
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]).toMatchObject({ drugId: 'd1', quantity: 1, unitPrice: 40 });
  });

  it('increments an existing line instead of duplicating', () => {
    const first = addLine([], makeDrug());
    const second = addLine(first.lines, makeDrug());
    expect(second.ok).toBe(true);
    expect(second.lines).toHaveLength(1);
    expect(second.lines[0].quantity).toBe(2);
  });

  it('rejects adding an expired drug', () => {
    const result = addLine([], makeDrug({ status: 'EXPIRED' }));
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/expired/i);
    expect(result.lines).toHaveLength(0);
  });

  it('rejects adding an out-of-stock drug', () => {
    const result = addLine([], makeDrug({ status: 'OUT_OF_STOCK', quantity: 0 }));
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/out of stock/i);
  });

  it('rejects exceeding available stock across multiple adds', () => {
    const drug = makeDrug({ quantity: 3 });
    const first = addLine([], drug, 3);
    expect(first.ok).toBe(true);
    const second = addLine(first.lines, drug, 1);
    expect(second.ok).toBe(false);
    expect(second.reason).toMatch(/only 3 in stock/i);
    // Cart is left unchanged on rejection.
    expect(second.lines).toBe(first.lines);
  });
});

describe('setLineQuantity', () => {
  it('clamps quantity to [1, availableStock]', () => {
    const lines = addLine([], makeDrug({ quantity: 5 })).lines;
    expect(setLineQuantity(lines, 'd1', 10)[0].quantity).toBe(5);
    expect(setLineQuantity(lines, 'd1', 0)[0].quantity).toBe(1);
    expect(setLineQuantity(lines, 'd1', -3)[0].quantity).toBe(1);
    expect(setLineQuantity(lines, 'd1', 3)[0].quantity).toBe(3);
  });
});

describe('removeLine', () => {
  it('removes the matching line only', () => {
    const withOne = addLine([], makeDrug()).lines;
    const withTwo = addLine(withOne, makeDrug({ id: 'd2', barcode: '456' })).lines;
    const result = removeLine(withTwo, 'd1');
    expect(result).toHaveLength(1);
    expect(result[0].drugId).toBe('d2');
  });
});

describe('cartSubtotal', () => {
  it('sums unitPrice * quantity across lines', () => {
    const lines = [
      { drugId: 'a', name: 'A', dose: '', unitPrice: 10, quantity: 2, availableStock: 10 },
      { drugId: 'b', name: 'B', dose: '', unitPrice: 5.5, quantity: 3, availableStock: 10 },
    ];
    expect(cartSubtotal(lines)).toBeCloseTo(36.5, 5);
  });

  it('returns 0 for an empty cart', () => {
    expect(cartSubtotal([])).toBe(0);
  });
});
