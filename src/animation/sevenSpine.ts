import { SetupPoseBoundsProvider, Spine } from '@esotericsoftware/spine-pixi-v8';
import { Assets, type Ticker } from 'pixi.js';

import sevenAtlasUrl from '../assets/seven/seven.atlas?url';
import sevenJsonUrl from '../assets/seven/seven.json?url';
import sevenPngUrl from '../assets/seven/seven.png?url';

export const SEVEN_SKEL_ALIAS = 'sevenSymbolSpineJson';
export const SEVEN_ATLAS_ALIAS = 'sevenSymbolSpineAtlas';

export const SEVEN_REEL_GRID = { x: 0.18, y: 0.24, w: 0.64, h: 0.44 } as const;

let registered = false;

export function registerSevenSpineAssets(): void {
  if (registered) return;
  Assets.add({ alias: SEVEN_SKEL_ALIAS, src: sevenJsonUrl });
  Assets.add({
    alias: SEVEN_ATLAS_ALIAS,
    src: sevenAtlasUrl,
    data: {
      images: {
        'seven.png': sevenPngUrl,
      },
    },
  });
  registered = true;
}

let loadPromise: Promise<void> | null = null;

export function ensureSevenSpineLoaded(): Promise<void> {
  registerSevenSpineAssets();
  if (!loadPromise) {
    loadPromise = Assets.load([SEVEN_SKEL_ALIAS, SEVEN_ATLAS_ALIAS]).then(() => undefined);
  }
  return loadPromise;
}

export type SevenAnimationName = 'win';

export type CreateSevenSpineOptions = {
  ticker?: Ticker;
  loop?: boolean;
  animation?: SevenAnimationName;
};

export function createSevenSpine(options?: CreateSevenSpineOptions): Spine {
  const spine = Spine.from({
    skeleton: SEVEN_SKEL_ALIAS,
    atlas: SEVEN_ATLAS_ALIAS,
    boundsProvider: new SetupPoseBoundsProvider(),
    ticker: options?.ticker,
  });
  spine.state.setAnimation(0, options?.animation ?? 'win', options?.loop ?? true);
  spine.update(0);
  return spine;
}

export function layoutSevenInReelGridCell(
  spine: Spine,
  screenW: number,
  screenH: number,
  col: number,
  row: number,
  pad = 1.12,
  grid: typeof SEVEN_REEL_GRID = SEVEN_REEL_GRID,
): void {
  if (!Number.isFinite(screenW) || !Number.isFinite(screenH) || screenW <= 0 || screenH <= 0) {
    return;
  }
  const gx = screenW * grid.x;
  const gy = screenH * grid.y;
  const gw = screenW * grid.w;
  const gh = screenH * grid.h;
  const cellW = gw / 5;
  const cellH = gh / 3;
  const cx = gx + (col + 0.5) * cellW;
  const cy = gy + (row + 0.5) * cellH;

  spine.update(0);
  const lb = spine.getLocalBounds();
  const bw = lb.width > 0 ? lb.width : 1;
  const bh = lb.height > 0 ? lb.height : 1;
  const s = Math.min((cellW * pad) / bw, (cellH * pad) / bh);
  spine.scale.set(s);
  spine.position.set(cx - (lb.x + lb.width / 2) * s, cy - (lb.y + lb.height / 2) * s);
}
