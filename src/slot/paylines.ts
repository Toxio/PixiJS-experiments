/**
 * Row index per reel for each payline id from the server (`Line` on win entries).
 * Rows: 0 = top, 1 = middle, 2 = bottom (matches matrix[i][row] in API).
 * Adjust if partner/game docs specify different geometry.
 */
const PAYLINES: Record<number, readonly [number, number, number, number, number]> = {
  1: [1, 1, 1, 1, 1],
  2: [0, 0, 0, 0, 0],
  3: [2, 2, 2, 2, 2],
  4: [0, 1, 2, 1, 0],
  5: [2, 1, 0, 1, 2],
  6: [0, 0, 1, 0, 0],
  7: [2, 2, 1, 2, 2],
  8: [0, 1, 0, 1, 0],
  9: [2, 1, 2, 1, 2],
  10: [1, 0, 0, 0, 1],
  11: [1, 2, 2, 2, 1],
  12: [1, 0, 1, 0, 1],
  13: [0, 0, 2, 0, 0],
  14: [2, 2, 0, 2, 2],
  15: [1, 1, 0, 1, 1],
  16: [1, 1, 2, 1, 1],
  17: [0, 1, 1, 1, 0],
  18: [2, 1, 1, 1, 2],
  19: [1, 2, 1, 2, 1],
  20: [0, 2, 0, 2, 0],
};

/** Returns 5 row indices for `lineId`, or `null` if unknown. */
export function getPaylineForLineId(lineId: number): number[] | null {
  const p = PAYLINES[lineId];
  return p ? [...p] : null;
}
