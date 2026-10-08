/** Indicator output aligned with the input: `null` during the warm-up period. */
export type Series = (number | null)[];

/** An all-null series of the given length. */
export const emptySeries = (length: number): Series =>
  Array.from({ length }, () => null);
