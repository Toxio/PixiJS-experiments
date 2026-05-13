import { SetupPoseBoundsProvider, Spine } from '@esotericsoftware/spine-pixi-v8';
import { Assets, type Ticker } from 'pixi.js';

import heelsAtlasUrl from '../assets/heels/heels.atlas.txt?url';
import heelsJsonUrl from '../assets/heels/heels.json?url';
import heelsPngUrl from '../assets/heels/heels.png?url';

export const HEELS_SKEL_ALIAS = 'heelsSymbolSpineJson';
export const HEELS_ATLAS_ALIAS = 'heelsSymbolSpineAtlas';

export const HEELS_REEL_GRID = { x: 0.18, y: 0.24, w: 0.64, h: 0.44 } as const;

let registered = false;

export function registerHeelsSpineAssets(): void {
  if (registered) return;
  Assets.add({ alias: HEELS_SKEL_ALIAS, src: heelsJsonUrl });
  Assets.add({
    alias: HEELS_ATLAS_ALIAS,
    src: heelsAtlasUrl,
    loadParser: 'spineTextureAtlasLoader',
    data: { images: { 'heels.png': heelsPngUrl } },
  });
  registered = true;
}

let loadPromise: Promise<void> | null = null;

export function ensureHeelsSpineLoaded(): Promise<void> {
  registerHeelsSpineAssets();
  if (!loadPromise) {
    loadPromise = Assets.load([HEELS_SKEL_ALIAS, HEELS_ATLAS_ALIAS]).then(() => undefined);
  }
  return loadPromise;
}

export type HeelsAnimationName = 'win';

export type CreateHeelsSpineOptions = {
  ticker?: Ticker;
  loop?: boolean;
  animation?: HeelsAnimationName;
};

export function createHeelsSpine(options?: CreateHeelsSpineOptions): Spine {
  const spine = Spine.from({
    skeleton: HEELS_SKEL_ALIAS,
    atlas: HEELS_ATLAS_ALIAS,
    boundsProvider: new SetupPoseBoundsProvider(),
    ticker: options?.ticker,
  });
  spine.state.setAnimation(0, options?.animation ?? 'win', options?.loop ?? true);
  spine.update(0);
  return spine;
}

export function layoutHeelsInReelGridCell(
  spine: Spine,
  screenW: number,
  screenH: number,
  col: number,
  row: number,
  pad = 1.12,
  grid: typeof HEELS_REEL_GRID = HEELS_REEL_GRID,
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
