import { Spine } from '@esotericsoftware/spine-pixi-v8';
import type { Ticker } from 'pixi.js';

import { createGlassSpine } from '../../../animation/glassSpine';
import { createGobletSpine } from '../../../animation/gobletSpine';
import { createHeelsSpine } from '../../../animation/heelsSpine';
import { createScatterSpine } from '../../../animation/scatterSpine';
import {
  applyWildShowThenIdleLoop,
  createWildSpineShowThenIdle,
  type WildShowAnimationName,
} from '../../../animation/wildSpine';
import { symbolAlias } from './assets';
import { VISIBLE_ROWS } from './constants';
import { createLipsSpine } from '../../../animation/lipsSpine';
import { createLipstickSpine } from '../../../animation/lipstickSpine';
import { createParfumeSpine } from '../../../animation/parfumeSpine';
import { createRoseSpine } from '../../../animation/roseSpine';
import { createSevenSpine } from '../../../animation/sevenSpine';
import { createStarSpine } from '../../../animation/starSpine';

const SPINE_CELL_SCALE = 0.82;

const EXPANDED_WILD_SIDE_PAD_FRAC = 0.07;
const EXPANDED_WILD_HEIGHT_MUL = 1.12;
const EXPANDED_WILD_COLUMN_H_FRAC = 0.92;
/** Applied after width/height fit so the whole spine is smaller (<1 shrinks both axes). */
const EXPANDED_WILD_FIT_SCALE = 1.27;
const EXPANDED_WILD_SHIFT_DOWN_FRAC = 0.16;
/** Positive nudges the sprite to the left; lower / negative → further right. */
const EXPANDED_WILD_SHIFT_LEFT_FRAC = -0.17;

export function wildAnimationForRow(row: number): WildShowAnimationName {
  return row === 0 ? 'wild1' : row === 2 ? 'wild3' : 'wild2';
}

/** Row of the wild symbol before column expansion (`wild1` / `wild2` / `wild3`); fallback middle. */
export function wildRevealRowForExpandingColumn(matrix: number[][], col: number): number {
  const wildAlias = symbolAlias(9);
  for (let row = 0; row < VISIBLE_ROWS; row++) {
    if (symbolAlias(matrix[col]?.[row] ?? -1) === wildAlias) return row;
  }
  return 1;
}

/** One shot per payline highlight — no chained repeat (see symbol_fx the same). */
function winSpineOnce(spine: Spine, animationName: string): Spine {
  spine.state.setAnimation(0, animationName, false);
  spine.update(0);
  return spine;
}

/** Win Spine for server symbol index (1-based). `row` required for wild (9) → wild1/2/3. */
export function createWinSpineForSymbol(
  serverIdx: number,
  ticker: Ticker,
  row?: number,
): Spine | null {
  switch (serverIdx) {
    case 1:
      return winSpineOnce(createSevenSpine({ loop: false, ticker }), 'win');
    case 2:
      return winSpineOnce(createLipsSpine({ loop: false, animation: 'win', ticker }), 'win');
    case 3:
      return winSpineOnce(createParfumeSpine({ loop: false, ticker }), 'win');
    case 4:
      return winSpineOnce(createRoseSpine({ loop: false, ticker }), 'win');
    case 5:
      return winSpineOnce(createGlassSpine({ loop: false, animation: 'win', ticker }), 'win');
    case 6:
      return winSpineOnce(createLipstickSpine({ loop: false, ticker }), 'win');
    case 7:
      return winSpineOnce(createGobletSpine({ loop: false, ticker }), 'win');
    case 8:
      return winSpineOnce(createHeelsSpine({ loop: false, animation: 'win', ticker }), 'win');
    case 9: {
      const r = row ?? 1;
      const anim = wildAnimationForRow(r);
      return createWildSpineShowThenIdle(anim, ticker);
    }
    case 10:
      return winSpineOnce(createScatterSpine({ loop: false, animation: 'win', ticker }), 'win');
    case 11:
      return winSpineOnce(createStarSpine({ loop: false, animation: 'win', ticker }), 'win');
    default:
      return null;
  }
}

/** Scale and centre a Spine inside one reel cell (same padding as static sprites). */
export function layoutSpineInCell(
  spine: Spine,
  absX: number,
  absY: number,
  cellW: number,
  cellH: number,
): void {
  spine.update(0);
  const lb = spine.getLocalBounds();
  const bw = lb.width > 0 ? lb.width : 1;
  const bh = lb.height > 0 ? lb.height : 1;
  const s = Math.min((cellW * SPINE_CELL_SCALE) / bw, (cellH * SPINE_CELL_SCALE) / bh);
  spine.scale.set(s);
  spine.position.set(absX - (lb.x + lb.width / 2) * s, absY - (lb.y + lb.height / 2) * s);
}

/** Background `symbol_fx` only — larger fit than {@link layoutSpineInCell} so glow extends past the symbol. */
const SYMBOL_FX_CELL_SCALE_MUL = 1.8;

export function layoutSymbolFxInCell(
  spine: Spine,
  absX: number,
  absY: number,
  cellW: number,
  cellH: number,
): void {
  spine.update(0);
  const lb = spine.getLocalBounds();
  const bw = lb.width > 0 ? lb.width : 1;
  const bh = lb.height > 0 ? lb.height : 1;
  const pad = SPINE_CELL_SCALE * SYMBOL_FX_CELL_SCALE_MUL;
  const s = Math.min((cellW * pad) / bw, (cellH * pad) / bh);
  spine.scale.set(s);
  spine.position.set(absX - (lb.x + lb.width / 2) * s, absY - (lb.y + lb.height / 2) * s);
}

export function layoutWildSpineExpandedInColumn(
  spine: Spine,
  absXCenter: number,
  absYCenter: number,
  cellW: number,
  columnHeight: number,
  revealAnim: WildShowAnimationName,
): void {
  /** Fit and column center use wild2 skeleton bounds (`SetupPoseBoundsProvider`), then reveal plays wild1/wild2/wild3. */
  const refEntry = spine.state.setAnimation(0, 'wild2', false);
  if (refEntry) refEntry.trackTime = 0;
  spine.update(0);
  const lb = spine.getLocalBounds();
  const bw = lb.width > 0 ? lb.width : 1;
  const bh = lb.height > 0 ? lb.height : 1;
  const paddedW = cellW * Math.max(0.55, 1 - 2 * EXPANDED_WILD_SIDE_PAD_FRAC);
  const targetW = paddedW;
  const targetH = columnHeight * EXPANDED_WILD_COLUMN_H_FRAC * EXPANDED_WILD_HEIGHT_MUL;
  const s = Math.max(targetW / bw, targetH / bh) * EXPANDED_WILD_FIT_SCALE;
  spine.scale.set(s);
  const nx = absXCenter - (lb.x + lb.width / 2) * s - cellW * EXPANDED_WILD_SHIFT_LEFT_FRAC;
  let ny = absYCenter - (lb.y + lb.height / 2) * s;
  ny += columnHeight * EXPANDED_WILD_SHIFT_DOWN_FRAC;

  /** Top/bottom reveals are offset ±1 reel row vs `wild2` in the Spine; layout uses wild2 sizing (see tests `win-anim-wild`, `wild-3-line1`). */
  const rowH = columnHeight / VISIBLE_ROWS;
  if (revealAnim === 'wild1') ny -= rowH;
  else if (revealAnim === 'wild3') ny += rowH;

  spine.position.set(nx, ny);

  applyWildShowThenIdleLoop(spine, revealAnim);
}
