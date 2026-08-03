import { describe, expect, it } from 'vitest';
import { computeSaleTotals, round2 } from './money';

describe('round2', () => {
  it('rounds to 2 decimal places', () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(10)).toBe(10);
    expect(round2(3.14159)).toBe(3.14);
  });
});

describe('computeSaleTotals', () => {
  it('matches the contract example exactly', () => {
    // docs/API_CONTRACT.md example: subtotal 240, discount 10, taxRate 5 -> tax 11.5, total 241.5
    const totals = computeSaleTotals(240, 10, 5);
    expect(totals).toEqual({ subtotal: 240, discount: 10, taxRate: 5, tax: 11.5, total: 241.5 });
  });

  it('handles zero discount and tax', () => {
    const totals = computeSaleTotals(100, 0, 0);
    expect(totals).toEqual({ subtotal: 100, discount: 0, taxRate: 0, tax: 0, total: 100 });
  });

  it('clamps negative discount to zero', () => {
    const totals = computeSaleTotals(100, -5, 10);
    expect(totals.discount).toBe(0);
    expect(totals.tax).toBe(10);
    expect(totals.total).toBe(110);
  });

  it('rounds fractional cents consistently', () => {
    const totals = computeSaleTotals(99.99, 3.33, 18.5);
    // (99.99 - 3.33) * 18.5 / 100 = 17.8821 -> 17.88
    expect(totals.tax).toBe(17.88);
    expect(totals.total).toBe(round2(99.99 - 3.33 + 17.88));
  });
});
