import { SetupPoseBoundsProvider, Spine } from '@esotericsoftware/spine-pixi-v8';
import { Assets, type Ticker } from 'pixi.js';

import scatterAtlasUrl from '../assets/scatter/scatter_box.atlas.txt?url';
import scatterJsonUrl from '../assets/scatter/scatter_box.json?url';
import scatterPngUrl from '../assets/scatter/scatter_box.png?url';

export const SCATTER_SKEL_ALIAS = 'scatterSymbolSpineJson';
export const SCATTER_ATLAS_ALIAS = 'scatterSymbolSpineAtlas';

/** Same UV grid as other reel symbols — `reel.png` 1641×1022 symbol area. */
export const SCATTER_REEL_GRID = { x: 0.18, y: 0.24, w: 0.64, h: 0.44 } as const;

let registered = false;

export function registerScatterSpineAssets(): void {
  if (registered) return;
  Assets.add({ alias: SCATTER_SKEL_ALIAS, src: scatterJsonUrl });
  Assets.add({
    alias: SCATTER_ATLAS_ALIAS,
    src: scatterAtlasUrl,
    loadParser: 'spineTextureAtlasLoader',
    data: {
      images: {
        'scatter_box.png': scatterPngUrl,
      },
    },
  });
  registered = true;
}

let loadPromise: Promise<void> | null = null;

export function ensureScatterSpineLoaded(): Promise<void> {
  registerScatterSpineAssets();
  if (!loadPromise) {
    loadPromise = Assets.load([SCATTER_SKEL_ALIAS, SCATTER_ATLAS_ALIAS]).then(() => undefined);
  }
  return loadPromise;
}

export type ScatterAnimationName = 'win';

export type CreateScatterSpineOptions = {
  ticker?: Ticker;
  loop?: boolean;
  animation?: ScatterAnimationName;
};

export function createScatterSpine(options?: CreateScatterSpineOptions): Spine {
  const spine = Spine.from({
    skeleton: SCATTER_SKEL_ALIAS,
    atlas: SCATTER_ATLAS_ALIAS,
    boundsProvider: new SetupPoseBoundsProvider(),
    ticker: options?.ticker,
  });
  spine.state.setAnimation(0, options?.animation ?? 'win', options?.loop ?? true);
  spine.update(0);
  return spine;
}

export function layoutScatterInReelGridCell(
  spine: Spine,
  screenW: number,
  screenH: number,
  col: number,
  row: number,
  pad = 1.12,
  grid: typeof SCATTER_REEL_GRID = SCATTER_REEL_GRID,
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
