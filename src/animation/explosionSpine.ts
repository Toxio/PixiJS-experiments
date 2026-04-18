/**
 * Spine "Hit multiplier" — explosion / multiplier VFX.
 */
import { SetupPoseBoundsProvider, Spine } from '@esotericsoftware/spine-pixi-v8';
import { Assets, type Ticker } from 'pixi.js';

import explosionAtlasUrl from '../assets/explosion/hit-multiplier.atlas?url';
import explosionJsonUrl from '../assets/explosion/hit-multiplier.json?url';

export const EXPLOSION_SKEL_ALIAS = 'explosionSpineJson';
export const EXPLOSION_ATLAS_ALIAS = 'explosionSpineAtlas';

let registered = false;

export function registerExplosionSpineAssets(): void {
  if (registered) return;
  Assets.add({ alias: EXPLOSION_SKEL_ALIAS, src: explosionJsonUrl });
  Assets.add({ alias: EXPLOSION_ATLAS_ALIAS, src: explosionAtlasUrl });
  registered = true;
}

let loadPromise: Promise<void> | null = null;

export function ensureExplosionSpineLoaded(): Promise<void> {
  registerExplosionSpineAssets();
  if (!loadPromise) {
    loadPromise = Assets.load([EXPLOSION_SKEL_ALIAS, EXPLOSION_ATLAS_ALIAS]).then(() => undefined);
  }
  return loadPromise;
}

/**
 * After slot reels destroy Spine instances, GPU-backed atlas data can be invalid while
 * `Assets` still reports a resolved load — the Explosion preview tab then shows an empty stage.
 * Unload + reload aliases so a fresh `Spine.from` works on a new Application.
 */
export async function reloadExplosionSpineAssetsForPreview(): Promise<void> {
  registered = false;
  loadPromise = null;
  for (const alias of [EXPLOSION_SKEL_ALIAS, EXPLOSION_ATLAS_ALIAS]) {
    try {
      await Assets.unload(alias);
    } catch {
      /* alias not registered yet */
    }
  }
  registerExplosionSpineAssets();
  loadPromise = Assets.load([EXPLOSION_SKEL_ALIAS, EXPLOSION_ATLAS_ALIAS]).then(() => undefined);
  await loadPromise;
}

export type CreateExplosionSpineOptions = {
  ticker?: Ticker;
  /** If false, plays a single `Action` pass (one full cycle). */
  loop?: boolean;
};

export function createExplosionSpine(options?: CreateExplosionSpineOptions): Spine {
  const spine = Spine.from({
    skeleton: EXPLOSION_SKEL_ALIAS,
    atlas: EXPLOSION_ATLAS_ALIAS,
    boundsProvider: new SetupPoseBoundsProvider(),
    ticker: options?.ticker,
  });
  spine.state.setAnimation(0, 'Action', options?.loop ?? true);
  spine.update(0);
  return spine;
}

/** `contain`: fit inside; `cover`: scale up to fill (may crop). */
export type ExplosionLayoutFit = 'contain' | 'cover';

export function layoutExplosionOnScreen(
  spine: Spine,
  screenW: number,
  screenH: number,
  pad = 0.99,
  fit: ExplosionLayoutFit = 'contain',
): void {
  if (!Number.isFinite(screenW) || !Number.isFinite(screenH) || screenW <= 0 || screenH <= 0) {
    return;
  }
  spine.update(0);
  const lb = spine.getLocalBounds();
  const bw = lb.width > 0 ? lb.width : 1;
  const bh = lb.height > 0 ? lb.height : 1;
  const sw = screenW * pad;
  const sh = screenH * pad;
  const s = fit === 'cover' ? Math.max(sw / bw, sh / bh) : Math.min(sw / bw, sh / bh);
  spine.scale.set(s);
  spine.position.set(
    screenW / 2 - (lb.x + lb.width / 2) * s,
    screenH / 2 - (lb.y + lb.height / 2) * s,
  );
}

/** Fit into one symbol cell on the reel grid. */
export function layoutExplosionInRect(
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
