import { SetupPoseBoundsProvider, Spine } from '@esotericsoftware/spine-pixi-v8';
import { Assets, type Ticker } from 'pixi.js';

import lipstickAtlasUrl from '../assets/lipstick/lipstick.atlas?url';
import lipstickJsonUrl from '../assets/lipstick/lipstick.json?url';
import lipstickPngUrl from '../assets/lipstick/lipstick.png?url';

export const LIPSTICK_SKEL_ALIAS = 'lipstickSymbolSpineJson';
export const LIPSTICK_ATLAS_ALIAS = 'lipstickSymbolSpineAtlas';

/** Same UV grid as other reel symbols — `reel.png` 1641×1022 symbol area. */
export const LIPSTICK_REEL_GRID = { x: 0.18, y: 0.24, w: 0.64, h: 0.44 } as const;

let registered = false;

export function registerLipstickSpineAssets(): void {
  if (registered) return;
  Assets.add({ alias: LIPSTICK_SKEL_ALIAS, src: lipstickJsonUrl });
  Assets.add({
    alias: LIPSTICK_ATLAS_ALIAS,
    src: lipstickAtlasUrl,
    data: {
      images: {
        'lipstick.png': lipstickPngUrl,
      },
    },
  });
  registered = true;
}

let loadPromise: Promise<void> | null = null;

export function ensureLipstickSpineLoaded(): Promise<void> {
  registerLipstickSpineAssets();
  if (!loadPromise) {
    loadPromise = Assets.load([LIPSTICK_SKEL_ALIAS, LIPSTICK_ATLAS_ALIAS]).then(() => undefined);
  }
  return loadPromise;
}

export type LipstickAnimationName = 'win';

export type CreateLipstickSpineOptions = {
  ticker?: Ticker;
  loop?: boolean;
  animation?: LipstickAnimationName;
};

export function createLipstickSpine(options?: CreateLipstickSpineOptions): Spine {
  const spine = Spine.from({
    skeleton: LIPSTICK_SKEL_ALIAS,
    atlas: LIPSTICK_ATLAS_ALIAS,
    boundsProvider: new SetupPoseBoundsProvider(),
    ticker: options?.ticker,
  });
  spine.state.setAnimation(0, options?.animation ?? 'win', options?.loop ?? true);
  spine.update(0);
  return spine;
}

export function layoutLipstickInReelGridCell(
  spine: Spine,
  screenW: number,
  screenH: number,
  col: number,
  row: number,
  pad = 1.12,
  grid: typeof LIPSTICK_REEL_GRID = LIPSTICK_REEL_GRID,
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
