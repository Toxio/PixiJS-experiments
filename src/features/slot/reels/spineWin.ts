import { Spine } from '@esotericsoftware/spine-pixi-v8';
import type { Ticker } from 'pixi.js';

import { createGlassSpine } from '../../../animation/glassSpine';
import { createGobletSpine } from '../../../animation/gobletSpine';
import { createHeelsSpine } from '../../../animation/heelsSpine';
import { createScatterSpine } from '../../../animation/scatterSpine';
import { createWildSpine, type WildAnimationName } from '../../../animation/wildSpine';
import { createLipsSpine } from '../../../animation/lipsSpine';
import { createLipstickSpine } from '../../../animation/lipstickSpine';
import { createParfumeSpine } from '../../../animation/parfumeSpine';
import { createRoseSpine } from '../../../animation/roseSpine';
import { createSevenSpine } from '../../../animation/sevenSpine';
import { createStarSpine } from '../../../animation/starSpine';

const SPINE_CELL_SCALE = 0.82;

const EXPANDED_WILD_SIDE_PAD_FRAC = 0.048;
const EXPANDED_WILD_HEIGHT_MUL = 1.22;
const EXPANDED_WILD_SHIFT_DOWN_FRAC = 0.09;
const EXPANDED_WILD_SHIFT_LEFT_FRAC = 0.1;

export function wildAnimationForRow(row: number): WildAnimationName {
  return row === 0 ? 'wild1' : row === 2 ? 'wild3' : 'wild2';
}

/** Win Spine for server symbol index (1-based). `row` required for wild (9) → wild1/2/3. */
export function createWinSpineForSymbol(
  serverIdx: number,
  ticker: Ticker,
  row?: number,
): Spine | null {
  switch (serverIdx) {
    case 1:
      return createSevenSpine({ loop: true, ticker });
    case 2:
      return createLipsSpine({ loop: true, animation: 'win', ticker });
    case 3:
      return createParfumeSpine({ loop: true, ticker });
    case 4:
      return createRoseSpine({ loop: true, ticker });
    case 5:
      return createGlassSpine({ loop: true, animation: 'win', ticker });
    case 6:
      return createLipstickSpine({ loop: true, ticker });
    case 7:
      return createGobletSpine({ loop: true, ticker });
    case 8:
      return createHeelsSpine({ loop: true, animation: 'win', ticker });
    case 9: {
      const r = row ?? 1;
      return createWildSpine({ loop: true, animation: wildAnimationForRow(r), ticker });
    }
    case 10:
      return createScatterSpine({ loop: true, animation: 'win', ticker });
    case 11:
      return createStarSpine({ loop: true, animation: 'win', ticker });
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

export function layoutWildSpineExpandedInColumn(
  spine: Spine,
  absXCenter: number,
  absYCenter: number,
  cellW: number,
  columnHeight: number,
): void {
  spine.update(0);
  const lb = spine.getLocalBounds();
  const bw = lb.width > 0 ? lb.width : 1;
  const bh = lb.height > 0 ? lb.height : 1;
  const paddedW = cellW * Math.max(0.55, 1 - 2 * EXPANDED_WILD_SIDE_PAD_FRAC);
  const targetW = paddedW;
  const targetH = columnHeight * 0.98 * EXPANDED_WILD_HEIGHT_MUL;
  const s = Math.max(targetW / bw, targetH / bh);
  spine.scale.set(s);
  const nx = absXCenter - (lb.x + lb.width / 2) * s - cellW * EXPANDED_WILD_SHIFT_LEFT_FRAC;
  let ny = absYCenter - (lb.y + lb.height / 2) * s;
  ny += columnHeight * EXPANDED_WILD_SHIFT_DOWN_FRAC;
  spine.position.set(nx, ny);
}
