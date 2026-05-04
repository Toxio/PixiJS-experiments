import { SetupPoseBoundsProvider, Spine } from '@esotericsoftware/spine-pixi-v8';
import { Assets, type Ticker } from 'pixi.js';

import parfumeAtlasUrl from '../assets/parfume/parfume.atlas?url';
import parfumeJsonUrl from '../assets/parfume/parfume.json?url';
import parfumePngUrl from '../assets/parfume/parfume.png?url';

export const PARFUME_SKEL_ALIAS = 'parfumeSymbolSpineJson';
export const PARFUME_ATLAS_ALIAS = 'parfumeSymbolSpineAtlas';

/** Same UV grid as other reel symbols — `reel.png` 1641×1022 symbol area. */
export const PARFUME_REEL_GRID = { x: 0.18, y: 0.24, w: 0.64, h: 0.44 } as const;

let registered = false;

export function registerParfumeSpineAssets(): void {
  if (registered) return;
  Assets.add({ alias: PARFUME_SKEL_ALIAS, src: parfumeJsonUrl });
  Assets.add({
    alias: PARFUME_ATLAS_ALIAS,
    src: parfumeAtlasUrl,
    data: {
      images: {
        'parfume.png': parfumePngUrl,
      },
    },
  });
  registered = true;
}

let loadPromise: Promise<void> | null = null;

export function ensureParfumeSpineLoaded(): Promise<void> {
  registerParfumeSpineAssets();
  if (!loadPromise) {
    loadPromise = Assets.load([PARFUME_SKEL_ALIAS, PARFUME_ATLAS_ALIAS]).then(() => undefined);
  }
  return loadPromise;
}

export type ParfumeAnimationName = 'win';

export type CreateParfumeSpineOptions = {
  ticker?: Ticker;
  loop?: boolean;
  animation?: ParfumeAnimationName;
};

export function createParfumeSpine(options?: CreateParfumeSpineOptions): Spine {
  const spine = Spine.from({
    skeleton: PARFUME_SKEL_ALIAS,
    atlas: PARFUME_ATLAS_ALIAS,
    boundsProvider: new SetupPoseBoundsProvider(),
    ticker: options?.ticker,
  });
  spine.state.setAnimation(0, options?.animation ?? 'win', options?.loop ?? true);
  spine.update(0);
  return spine;
}

export function layoutParfumeInReelGridCell(
  spine: Spine,
  screenW: number,
  screenH: number,
  col: number,
  row: number,
  pad = 1.12,
  grid: typeof PARFUME_REEL_GRID = PARFUME_REEL_GRID,
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
