/** Rounds to 2 decimal places, mirroring the server's `round2` so the displayed
 * per-line amount and grand total always match what `POST /purchases` persists. */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
