import { SetupPoseBoundsProvider, Spine } from '@esotericsoftware/spine-pixi-v8';
import { Assets, type Ticker } from 'pixi.js';

import wildAtlasUrl from '../assets/wild/wild.atlas?url';
import wildJsonUrl from '../assets/wild/wild.json?url';
import wildPngUrl from '../assets/wild/wild.png?url';

export const WILD_SKEL_ALIAS = 'wildSymbolSpineJson';
export const WILD_ATLAS_ALIAS = 'wildSymbolSpineAtlas';

export const WILD_REEL_GRID = { x: 0.18, y: 0.24, w: 0.64, h: 0.44 } as const;

let registered = false;

export function registerWildSpineAssets(): void {
  if (registered) return;
  Assets.add({ alias: WILD_SKEL_ALIAS, src: wildJsonUrl });
  Assets.add({
    alias: WILD_ATLAS_ALIAS,
    src: wildAtlasUrl,
    data: {
      images: {
        'wild.png': wildPngUrl,
      },
    },
  });
  registered = true;
}

let loadPromise: Promise<void> | null = null;

export function ensureWildSpineLoaded(): Promise<void> {
  registerWildSpineAssets();
  if (!loadPromise) {
    loadPromise = Assets.load([WILD_SKEL_ALIAS, WILD_ATLAS_ALIAS]).then(() => undefined);
  }
  return loadPromise;
}

/** No `win` clip — use `wild1`–`wild3` or `idle` / `idle1`–`idle3`. */
export type WildAnimationName = 'idle' | 'idle1' | 'idle2' | 'idle3' | 'wild1' | 'wild2' | 'wild3';

export type CreateWildSpineOptions = {
  ticker?: Ticker;
  loop?: boolean;
  animation?: WildAnimationName;
};

export function createWildSpine(options?: CreateWildSpineOptions): Spine {
  const spine = Spine.from({
    skeleton: WILD_SKEL_ALIAS,
    atlas: WILD_ATLAS_ALIAS,
    boundsProvider: new SetupPoseBoundsProvider(),
    ticker: options?.ticker,
  });
  const anim = options?.animation ?? 'wild1';
  spine.state.setAnimation(0, anim, options?.loop ?? true);
  spine.update(0);
  return spine;
}

/** `pad` > 1 scales past the cell “safe” inset; wild uses a larger default so it reads bigger on the reel. */
export function layoutWildInReelGridCell(
  spine: Spine,
  screenW: number,
  screenH: number,
  col: number,
  row: number,
  pad = 1.58,
  grid: typeof WILD_REEL_GRID = WILD_REEL_GRID,
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
