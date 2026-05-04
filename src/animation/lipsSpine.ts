import { SetupPoseBoundsProvider, Spine } from '@esotericsoftware/spine-pixi-v8';
import { Assets, type Ticker } from 'pixi.js';

import lipsAtlasUrl from '../assets/lips/lips.atlas?url';
import lipsJsonUrl from '../assets/lips/lips.json?url';
import lipsPngUrl from '../assets/lips/lips.png?url';

export const LIPS_SKEL_ALIAS = 'lipsSymbolSpineJson';
export const LIPS_ATLAS_ALIAS = 'lipsSymbolSpineAtlas';

/** Same UV grid as glass / goblet — `reel.png` 1641×1022 symbol area. */
export const LIPS_REEL_GRID = { x: 0.18, y: 0.24, w: 0.64, h: 0.44 } as const;

let registered = false;

export function registerLipsSpineAssets(): void {
  if (registered) return;
  Assets.add({ alias: LIPS_SKEL_ALIAS, src: lipsJsonUrl });
  Assets.add({
    alias: LIPS_ATLAS_ALIAS,
    src: lipsAtlasUrl,
    data: {
      images: {
        'lips.png': lipsPngUrl,
      },
    },
  });
  registered = true;
}

let loadPromise: Promise<void> | null = null;

export function ensureLipsSpineLoaded(): Promise<void> {
  registerLipsSpineAssets();
  if (!loadPromise) {
    loadPromise = Assets.load([LIPS_SKEL_ALIAS, LIPS_ATLAS_ALIAS]).then(() => undefined);
  }
  return loadPromise;
}

export type LipsAnimationName = 'animation' | 'win';

export type CreateLipsSpineOptions = {
  ticker?: Ticker;
  loop?: boolean;
  animation?: LipsAnimationName;
};

export function createLipsSpine(options?: CreateLipsSpineOptions): Spine {
  const spine = Spine.from({
    skeleton: LIPS_SKEL_ALIAS,
    atlas: LIPS_ATLAS_ALIAS,
    boundsProvider: new SetupPoseBoundsProvider(),
    ticker: options?.ticker,
  });
  const anim = options?.animation ?? 'win';
  spine.state.setAnimation(0, anim, options?.loop ?? true);
  spine.update(0);
  return spine;
}

export function layoutLipsInReelGridCell(
  spine: Spine,
  screenW: number,
  screenH: number,
  col: number,
  row: number,
  pad = 1.12,
  grid: typeof LIPS_REEL_GRID = LIPS_REEL_GRID,
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
