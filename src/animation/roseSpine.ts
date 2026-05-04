import { SetupPoseBoundsProvider, Spine } from '@esotericsoftware/spine-pixi-v8';
import { Assets, type Ticker } from 'pixi.js';

import roseAtlasUrl from '../assets/rose/rose.atlas?url';
import roseJsonUrl from '../assets/rose/rose.json?url';
import rosePngUrl from '../assets/rose/rose.png?url';

export const ROSE_SKEL_ALIAS = 'roseSymbolSpineJson';
export const ROSE_ATLAS_ALIAS = 'roseSymbolSpineAtlas';

/** Same UV grid as other reel symbols — `reel.png` 1641×1022 symbol area. */
export const ROSE_REEL_GRID = { x: 0.18, y: 0.24, w: 0.64, h: 0.44 } as const;

let registered = false;

export function registerRoseSpineAssets(): void {
  if (registered) return;
  Assets.add({ alias: ROSE_SKEL_ALIAS, src: roseJsonUrl });
  Assets.add({
    alias: ROSE_ATLAS_ALIAS,
    src: roseAtlasUrl,
    data: {
      images: {
        'rose.png': rosePngUrl,
      },
    },
  });
  registered = true;
}

let loadPromise: Promise<void> | null = null;

export function ensureRoseSpineLoaded(): Promise<void> {
  registerRoseSpineAssets();
  if (!loadPromise) {
    loadPromise = Assets.load([ROSE_SKEL_ALIAS, ROSE_ATLAS_ALIAS]).then(() => undefined);
  }
  return loadPromise;
}

export type RoseAnimationName = 'win';

export type CreateRoseSpineOptions = {
  ticker?: Ticker;
  loop?: boolean;
  animation?: RoseAnimationName;
};

export function createRoseSpine(options?: CreateRoseSpineOptions): Spine {
  const spine = Spine.from({
    skeleton: ROSE_SKEL_ALIAS,
    atlas: ROSE_ATLAS_ALIAS,
    boundsProvider: new SetupPoseBoundsProvider(),
    ticker: options?.ticker,
  });
  spine.state.setAnimation(0, options?.animation ?? 'win', options?.loop ?? true);
  spine.update(0);
  return spine;
}

export function layoutRoseInReelGridCell(
  spine: Spine,
  screenW: number,
  screenH: number,
  col: number,
  row: number,
  pad = 1.12,
  grid: typeof ROSE_REEL_GRID = ROSE_REEL_GRID,
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
