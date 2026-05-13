/** UV inset — pixel-precise from the pink divider lines in reel.png (1641×1022). */
export const REEL_GRID = { x: 0.01, y: 0.038, w: 0.962, h: 0.957 } as const;

/** Shorter mask vs grid height so spinning symbols/blur don’t paint over the bottom frame. */
export const REEL_MASK_BOTTOM_PAD_FRAC = 0.012;

export const REEL_COUNT = 5;
export const VISIBLE_ROWS = 3;
/** Virtual loop length (must be > VISIBLE_ROWS + 1). */
export const REEL_SIZE = 10;
export const SPIN_SPEED = 25;

export const SPEED = {
  minSpin: 300,
  stopBase: 280,
  stopStep: 140,
} as const;

/**
 * Blank pause (ms) between consecutive win lines.
 * Show duration comes from the Spine animation so the timer advances on loop boundaries.
 */
export const LINE_DELAY_MS = 300;
