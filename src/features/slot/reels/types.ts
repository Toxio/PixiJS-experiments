import type { BlurFilter, Container, Sprite } from 'pixi.js';

import type { WinLine } from '../../../hooks/useSlotsHubSignalR';

export interface WinCell {
  col: number;
  row: number;
  serverIdx: number;
}

export interface SlotSymbol {
  container: Container;
  sprite: Sprite;
}

export interface Reel {
  rc: Container;
  symbols: SlotSymbol[];
  position: number;
  prevPos: number;
  blur: BlurFilter;
  stopping: boolean;
}

export interface ReelTween {
  reel: Reel;
  from: number;
  to: number;
  startMs: number;
  duration: number;
  ease: (t: number) => number;
  onDone?: () => void;
}

export interface SlotReelsProps {
  spinning: boolean;
  targetMatrix: number[][] | null;
  /** Settled matrix (5 reels × 3 rows) used to locate winning cells. */
  matrix: number[][];
  winLines: WinLine[];
  /** Per-column expanding-wild flags (length 5). Non-zero = wild animates in that column. */
  expandingWild: number[];
  /** Total spin multiplier (`Odd`); triggers BIG / MEGA / SUPER overlay at 20× / 50× / 100×. */
  spinOdd: number | null;
  onSpinComplete: () => void;
}
