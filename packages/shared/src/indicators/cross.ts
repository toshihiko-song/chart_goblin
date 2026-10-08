import type { Series } from './types.js';

export type CrossDirection = 'above' | 'below';

/**
 * Whether series `a` crossed series `b` between index `i - 1` and `i`
 * (defaults to the last element). Returns null if there was no cross.
 */
export function crossAt(
  a: Series,
  b: Series,
  i = a.length - 1,
): CrossDirection | null {
  if (i < 1) return null;
  const [a0, a1, b0, b1] = [a[i - 1], a[i], b[i - 1], b[i]];
  if (a0 == null || a1 == null || b0 == null || b1 == null) return null;
  if (a0 <= b0 && a1 > b1) return 'above';
  if (a0 >= b0 && a1 < b1) return 'below';
  return null;
}
