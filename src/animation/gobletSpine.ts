import { SetupPoseBoundsProvider, Spine } from '@esotericsoftware/spine-pixi-v8';
import { Assets, type Ticker } from 'pixi.js';

import gobletAtlasUrl from '../assets/goblet/goblet.atlas?url';
import gobletJsonUrl from '../assets/goblet/goblet.json?url';
import gobletPngUrl from '../assets/goblet/goblet.png?url';

export const GOBLET_SKEL_ALIAS = 'gobletSymbolSpineJson';
export const GOBLET_ATLAS_ALIAS = 'gobletSymbolSpineAtlas';

/** Same UV grid as glass — `reel.png` 1641×1022 symbol area. */
export const GOBLET_REEL_GRID = { x: 0.18, y: 0.24, w: 0.64, h: 0.44 } as const;

let registered = false;

export function registerGobletSpineAssets(): void {
  if (registered) return;
  Assets.add({ alias: GOBLET_SKEL_ALIAS, src: gobletJsonUrl });
  Assets.add({
    alias: GOBLET_ATLAS_ALIAS,
    src: gobletAtlasUrl,
    data: {
      images: {
        'goblet.png': gobletPngUrl,
      },
    },
  });
  registered = true;
}

let loadPromise: Promise<void> | null = null;

export function ensureGobletSpineLoaded(): Promise<void> {
  registerGobletSpineAssets();
  if (!loadPromise) {
    loadPromise = Assets.load([GOBLET_SKEL_ALIAS, GOBLET_ATLAS_ALIAS]).then(() => undefined);
  }
  return loadPromise;
}

export type GobletAnimationName = 'win';

export type CreateGobletSpineOptions = {
  ticker?: Ticker;
  loop?: boolean;
  animation?: GobletAnimationName;
};

export function createGobletSpine(options?: CreateGobletSpineOptions): Spine {
  const spine = Spine.from({
    skeleton: GOBLET_SKEL_ALIAS,
    atlas: GOBLET_ATLAS_ALIAS,
    boundsProvider: new SetupPoseBoundsProvider(),
    ticker: options?.ticker,
  });
  spine.state.setAnimation(0, options?.animation ?? 'win', options?.loop ?? true);
  spine.update(0);
  return spine;
}

export function layoutGobletInReelGridCell(
  spine: Spine,
  screenW: number,
  screenH: number,
  col: number,
  row: number,
  pad = 1.12,
  grid: typeof GOBLET_REEL_GRID = GOBLET_REEL_GRID,
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
