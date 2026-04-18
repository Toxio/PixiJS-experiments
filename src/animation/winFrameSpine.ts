/**
 * Shared loading and Spine win-frame instantiation (`Action` loop).
 * Used in the frame preview tab and on slot reels.
 */
import { SetupPoseBoundsProvider, Spine } from '@esotericsoftware/spine-pixi-v8';
import { Assets, type Ticker } from 'pixi.js';

import winFrameAtlasUrl from '../assets/winFrame/win-frame.atlas?url';
import winFrameJsonUrl from '../assets/winFrame/win-frame.json?url';

export const WIN_FRAME_SKEL_ALIAS = 'frameSpineJson';
export const WIN_FRAME_ATLAS_ALIAS = 'frameSpineAtlas';

let registered = false;

export function registerWinFrameSpineAssets(): void {
  if (registered) return;
  Assets.add({ alias: WIN_FRAME_SKEL_ALIAS, src: winFrameJsonUrl });
  Assets.add({ alias: WIN_FRAME_ATLAS_ALIAS, src: winFrameAtlasUrl });
  registered = true;
}

let loadPromise: Promise<void> | null = null;

/** Ensures skeleton JSON and atlas are loaded into Pixi Assets cache. */
export function ensureWinFrameSpineLoaded(): Promise<void> {
  registerWinFrameSpineAssets();
  if (!loadPromise) {
    loadPromise = Assets.load([WIN_FRAME_SKEL_ALIAS, WIN_FRAME_ATLAS_ALIAS]).then(() => undefined);
  }
  return loadPromise;
}

export type CreateWinFrameSpineOptions = {
  /**
   * Must be the same `app.ticker` as the Application; otherwise Spine stays on
   * `Ticker.shared` and mesh data is not updated before render → BatchableSpineSlot crash.
   */
  ticker?: Ticker;
  /** Default true. Set false for a single full `Action` cycle. */
  loop?: boolean;
};

/** New instance with `Action` animation. Call after `ensureWinFrameSpineLoaded`. */
export function createWinFrameSpine(options?: CreateWinFrameSpineOptions): Spine {
  const spine = Spine.from({
    skeleton: WIN_FRAME_SKEL_ALIAS,
    atlas: WIN_FRAME_ATLAS_ALIAS,
    boundsProvider: new SetupPoseBoundsProvider(),
    ticker: options?.ticker,
  });
  spine.state.setAnimation(0, 'Action', options?.loop ?? true);
  spine.update(0);
  return spine;
}

/** Length of one full animation cycle in ms (Spine data duration, seconds → ms). */
export function getSpineAnimationDurationMs(spine: Spine, animationName: string): number {
  const anim = spine.skeleton.data.findAnimation(animationName);
  const sec = anim?.duration ?? 1;
  return Math.max(1, Math.round(sec * 1000));
}

/**
 * Fits the skeleton into rectangle (0,0)–(w,h), centered.
 * @param pad — inset from edges (1 = tight fit)
 */
export function layoutWinFrameInRect(
  spine: Spine,
  width: number,
  height: number,
  pad = 1.05,
): void {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return;
  }
  spine.update(0);
  const lb = spine.getLocalBounds();
  const bw = lb.width > 0 ? lb.width : 1;
  const bh = lb.height > 0 ? lb.height : 1;
  const s = Math.min((width * pad) / bw, (height * pad) / bh);
  spine.scale.set(s);
  spine.position.set(
    width / 2 - (lb.x + lb.width / 2) * s,
    height / 2 - (lb.y + lb.height / 2) * s,
  );
}

/** Full-screen layout (same as frame preview scene). */
export function layoutWinFrameOnScreen(
  spine: Spine,
  screenW: number,
  screenH: number,
  pad = 0.99,
): void {
  if (!Number.isFinite(screenW) || !Number.isFinite(screenH) || screenW <= 0 || screenH <= 0) {
    return;
  }
  layoutWinFrameInRect(spine, screenW, screenH, pad);
}
