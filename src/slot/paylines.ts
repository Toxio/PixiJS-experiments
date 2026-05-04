/**
 * Row index per reel for each payline id from the server (`Line` on win entries).
 * Rows: 0 = top, 1 = middle, 2 = bottom (matches matrix[i][row] in API).
 *
 * Lines 1–10 match the game’s published 5×3 payline diagram (10 lines).
 */
const PAYLINES: Record<number, readonly [number, number, number, number, number]> = {
  1: [1, 1, 1, 1, 1],
  2: [0, 0, 0, 0, 0],
  3: [2, 2, 2, 2, 2],
  4: [0, 1, 2, 1, 0],
  5: [2, 1, 0, 1, 2],
  6: [0, 0, 1, 2, 2],
  7: [2, 2, 1, 0, 0],
  8: [1, 2, 2, 2, 1],
  9: [1, 0, 0, 0, 1],
  10: [0, 1, 1, 1, 0],
};

/** Returns 5 row indices for `lineId`, or `null` if unknown. */
export function getPaylineForLineId(lineId: number): number[] | null {
  const p = PAYLINES[lineId];
  return p ? [...p] : null;
}
