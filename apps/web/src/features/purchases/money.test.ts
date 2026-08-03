import { describe, expect, it } from 'vitest';
import { round2 } from './money';

describe('round2', () => {
  it('rounds to 2 decimal places', () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(10)).toBe(10);
    expect(round2(3.14159)).toBe(3.14);
  });

  it('matches per-line purchase amount computation (quantity * unitCost)', () => {
    // 3 units at 12.345 unit cost -> 37.035 -> rounds to 37.04, mirroring the
    // server's `round2(qty * unitCost)` in purchaseService.createPurchase.
    expect(round2(3 * 12.345)).toBe(37.04);
  });

  it('accumulates a running total the same way the server does', () => {
    const amounts = [round2(2 * 10.5), round2(5 * 3.333)];
    const total = amounts.reduce((sum, amount) => round2(sum + amount), 0);
    expect(amounts).toEqual([21, 16.67]);
    expect(total).toBe(37.67);
  });

  it('handles zero and negative-epsilon edge cases without drifting', () => {
    expect(round2(0)).toBe(0);
    expect(round2(-1.005)).toBe(-1);
  });
});
