import { SetupPoseBoundsProvider, Spine } from '@esotericsoftware/spine-pixi-v8';
import { Assets, type Ticker } from 'pixi.js';

import bigWinAtlasUrl from '../assets/big-win/big_win.atlas.txt?url';
import bigWinJsonUrl from '../assets/big-win/big_win.json?url';
import bigWinPngUrl from '../assets/big-win/big_win.png?url';
import bigWinPng2Url from '../assets/big-win/big_win_2.png?url';
import bigWinShineAtlasUrl from '../assets/big-win/big_win_shine.atlas.txt?url';
import bigWinShineJsonUrl from '../assets/big-win/big_win_shine.json?url';
import bigWinShinePngUrl from '../assets/big-win/big_win_shine.png?url';
import bigWinShinePng2Url from '../assets/big-win/big_win_shine_2.png?url';

export const BIG_WIN_SKEL_ALIAS = 'bigWinSpineJson';
export const BIG_WIN_ATLAS_ALIAS = 'bigWinSpineAtlas';
export const BIG_WIN_SHINE_SKEL_ALIAS = 'bigWinShineSpineJson';
export const BIG_WIN_SHINE_ATLAS_ALIAS = 'bigWinShineSpineAtlas';

let registered = false;

export function registerBigWinSpineAssets(): void {
  if (registered) return;
  Assets.add({ alias: BIG_WIN_SKEL_ALIAS, src: bigWinJsonUrl });
  Assets.add({
    alias: BIG_WIN_ATLAS_ALIAS,
    src: bigWinAtlasUrl,
    loadParser: 'spineTextureAtlasLoader',
    data: {
      images: {
        'big_win.png': bigWinPngUrl,
        'big_win_2.png': bigWinPng2Url,
      },
    },
  });
  Assets.add({ alias: BIG_WIN_SHINE_SKEL_ALIAS, src: bigWinShineJsonUrl });
  Assets.add({
    alias: BIG_WIN_SHINE_ATLAS_ALIAS,
    src: bigWinShineAtlasUrl,
    loadParser: 'spineTextureAtlasLoader',
    data: {
      images: {
        'big_win_shine.png': bigWinShinePngUrl,
        'big_win_shine_2.png': bigWinShinePng2Url,
      },
    },
  });
  registered = true;
}

let loadPromise: Promise<void> | null = null;

export function ensureBigWinSpineLoaded(): Promise<void> {
  registerBigWinSpineAssets();
  if (!loadPromise) {
    loadPromise = Assets.load([
      BIG_WIN_SKEL_ALIAS,
      BIG_WIN_ATLAS_ALIAS,
      BIG_WIN_SHINE_SKEL_ALIAS,
      BIG_WIN_SHINE_ATLAS_ALIAS,
    ]).then(() => undefined);
  }
  return loadPromise;
}

/** Spine clips: `big` = BIG WIN, `mega` = MEGA WIN, `super` = SUPER WIN. */
export type BigWinAnimationName = 'big' | 'mega' | 'super';

/**
 * Total spin multiplier from the server (`Odd`). Thresholds: 20× / 50× / 100×.
 */
export function bigWinAnimationForOdd(odd: number): BigWinAnimationName | null {
  if (!Number.isFinite(odd) || odd < 20) return null;
  if (odd >= 100) return 'super';
  if (odd >= 50) return 'mega';
  return 'big';
}

export type CreateBigWinSpineOptions = {
  ticker?: Ticker;
  loop?: boolean;
  animation: BigWinAnimationName;
};

export function createBigWinSpine(options: CreateBigWinSpineOptions): Spine {
  const spine = Spine.from({
    skeleton: BIG_WIN_SKEL_ALIAS,
    atlas: BIG_WIN_ATLAS_ALIAS,
    boundsProvider: new SetupPoseBoundsProvider(),
    ticker: options.ticker,
  });
  spine.state.setAnimation(0, options.animation, options.loop ?? false);
  spine.update(0);
  return spine;
}

/** Background shine / particles — single clip `anim`, used for BIG, MEGA, and SUPER. */
export type CreateBigWinShineSpineOptions = {
  ticker?: Ticker;
  loop?: boolean;
};

export function createBigWinShineSpine(options?: CreateBigWinShineSpineOptions): Spine {
  const spine = Spine.from({
    skeleton: BIG_WIN_SHINE_SKEL_ALIAS,
    atlas: BIG_WIN_SHINE_ATLAS_ALIAS,
    boundsProvider: new SetupPoseBoundsProvider(),
    ticker: options?.ticker,
  });
  spine.state.setAnimation(0, 'anim', options?.loop ?? true);
  spine.update(0);
  return spine;
}

/** Scale multiplier applied after fitting to viewport. */
const BIG_WIN_VISUAL_SCALE = 1.5;

/** Base vertical anchor (fraction of screen height) before top padding. */
const BIG_WIN_ANCHOR_Y_FRAC = 0.38;
/** Push celebration down — extra space from the top, as a fraction of screen height. */
const BIG_WIN_TOP_PADDING_FRAC = 0.1;

function bigWinCenterY(screenH: number): number {
  return screenH * (BIG_WIN_ANCHOR_Y_FRAC + BIG_WIN_TOP_PADDING_FRAC);
}

/** Fit the celebration banner roughly in the upper–middle viewport. */
export function layoutBigWinSpine(spine: Spine, screenW: number, screenH: number): void {
  if (!Number.isFinite(screenW) || !Number.isFinite(screenH) || screenW <= 0 || screenH <= 0) {
    return;
  }
  spine.update(0);
  const lb = spine.getLocalBounds();
  const bw = lb.width > 0 ? lb.width : 1;
  const bh = lb.height > 0 ? lb.height : 1;
  const targetW = screenW * 0.88;
  const targetH = screenH * 0.42;
  const s = Math.min(targetW / bw, targetH / bh) * BIG_WIN_VISUAL_SCALE;
  spine.scale.set(s);
  const cy = bigWinCenterY(screenH);
  spine.position.set(screenW / 2 - (lb.x + bw / 2) * s, cy - (lb.y + bh / 2) * s);
}

/** Wider / taller fit so the glow sits behind the banner for all win tiers. */
export function layoutBigWinShineSpine(spine: Spine, screenW: number, screenH: number): void {
  if (!Number.isFinite(screenW) || !Number.isFinite(screenH) || screenW <= 0 || screenH <= 0) {
    return;
  }
  spine.update(0);
  const lb = spine.getLocalBounds();
  const bw = lb.width > 0 ? lb.width : 1;
  const bh = lb.height > 0 ? lb.height : 1;
  const targetW = screenW * 0.98;
  const targetH = screenH * 0.55;
  const s = Math.min(targetW / bw, targetH / bh) * BIG_WIN_VISUAL_SCALE;
  spine.scale.set(s);
  const cy = bigWinCenterY(screenH);
  spine.position.set(screenW / 2 - (lb.x + bw / 2) * s, cy - (lb.y + bh / 2) * s);
}
