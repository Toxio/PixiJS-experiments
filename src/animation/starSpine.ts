import { SetupPoseBoundsProvider, Spine } from '@esotericsoftware/spine-pixi-v8';
import { Assets, type Ticker } from 'pixi.js';

import starAtlasUrl from '../assets/star/star.atlas?url';
import starJsonUrl from '../assets/star/star.json?url';
import starPngUrl from '../assets/star/star.png?url';

export const STAR_SKEL_ALIAS = 'starSymbolSpineJson';
export const STAR_ATLAS_ALIAS = 'starSymbolSpineAtlas';

export const STAR_REEL_GRID = { x: 0.18, y: 0.24, w: 0.64, h: 0.44 } as const;

let registered = false;

export function registerStarSpineAssets(): void {
  if (registered) return;
  Assets.add({ alias: STAR_SKEL_ALIAS, src: starJsonUrl });
  Assets.add({
    alias: STAR_ATLAS_ALIAS,
    src: starAtlasUrl,
    data: {
      images: {
        'star.png': starPngUrl,
      },
    },
  });
  registered = true;
}

let loadPromise: Promise<void> | null = null;

export function ensureStarSpineLoaded(): Promise<void> {
  registerStarSpineAssets();
  if (!loadPromise) {
    loadPromise = Assets.load([STAR_SKEL_ALIAS, STAR_ATLAS_ALIAS]).then(() => undefined);
  }
  return loadPromise;
}

export type StarAnimationName = 'animation' | 'win';

export type CreateStarSpineOptions = {
  ticker?: Ticker;
  loop?: boolean;
  animation?: StarAnimationName;
};

export function createStarSpine(options?: CreateStarSpineOptions): Spine {
  const spine = Spine.from({
    skeleton: STAR_SKEL_ALIAS,
    atlas: STAR_ATLAS_ALIAS,
    boundsProvider: new SetupPoseBoundsProvider(),
    ticker: options?.ticker,
  });
  const anim = options?.animation ?? 'win';
  spine.state.setAnimation(0, anim, options?.loop ?? true);
  spine.update(0);
  return spine;
}

export function layoutStarInReelGridCell(
  spine: Spine,
  screenW: number,
  screenH: number,
  col: number,
  row: number,
  pad = 1.12,
  grid: typeof STAR_REEL_GRID = STAR_REEL_GRID,
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
