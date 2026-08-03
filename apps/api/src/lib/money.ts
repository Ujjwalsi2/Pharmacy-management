/** Round a number to 2 decimal places, avoiding common floating point drift. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
