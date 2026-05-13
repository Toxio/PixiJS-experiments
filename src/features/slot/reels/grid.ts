import { REEL_GRID, REEL_COUNT, REEL_MASK_BOTTOM_PAD_FRAC, VISIBLE_ROWS } from './constants';

export interface SlotGridMetrics {
  gridX: number;
  gridY: number;
  gridW: number;
  gridH: number;
  maskH: number;
  cellW: number;
  cellH: number;
}

export function getSlotGridMetrics(screenWidth: number, screenHeight: number): SlotGridMetrics {
  const gridX = Math.round(screenWidth * REEL_GRID.x);
  const gridY = Math.round(screenHeight * REEL_GRID.y);
  const gridW = Math.round(screenWidth * REEL_GRID.w);
  const gridH = Math.round(screenHeight * REEL_GRID.h);
  const maskH = Math.max(1, Math.round(gridH * (1 - REEL_MASK_BOTTOM_PAD_FRAC)));
  const cellW = gridW / REEL_COUNT;
  const cellH = gridH / VISIBLE_ROWS;
  return { gridX, gridY, gridW, gridH, maskH, cellW, cellH };
}
