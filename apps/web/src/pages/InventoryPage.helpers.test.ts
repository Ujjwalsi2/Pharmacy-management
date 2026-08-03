import { describe, expect, it } from 'vitest';
import { daysUntil, expiryClassName, typeLabel } from './InventoryPage';

describe('typeLabel', () => {
  it('title-cases a DrugType enum value', () => {
    expect(typeLabel('TABLET')).toBe('Tablet');
    expect(typeLabel('INJECTION')).toBe('Injection');
    expect(typeLabel('OTHER')).toBe('Other');
  });
});

describe('daysUntil', () => {
  it('returns 0 for today', () => {
    const today = new Date();
    expect(daysUntil(today.toISOString())).toBe(0);
  });

  it('returns a positive count for future dates', () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);
    expect(daysUntil(future.toISOString())).toBe(10);
  });

  it('returns a negative count for past dates', () => {
    const past = new Date();
    past.setDate(past.getDate() - 5);
    expect(daysUntil(past.toISOString())).toBe(-5);
  });
});

describe('expiryClassName', () => {
  it('flags already-expired dates as danger', () => {
    const past = new Date();
    past.setDate(past.getDate() - 1);
    expect(expiryClassName(past.toISOString())).toContain('text-danger');
  });

  it('flags dates within the 90-day window as warning', () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 30);
    expect(expiryClassName(soon.toISOString())).toContain('text-warning');
  });

  it('leaves far-future dates unstyled', () => {
    const far = new Date();
    far.setDate(far.getDate() + 200);
    expect(expiryClassName(far.toISOString())).toBe('text-fg');
  });
});
