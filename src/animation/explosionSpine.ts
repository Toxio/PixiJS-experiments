/**
 * Spine «Hit multiplier» — анімація вибуху / множника.
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

export type CreateExplosionSpineOptions = {
  ticker?: Ticker;
  /** Якщо false — один прохід `Action` без циклу */
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

/** `contain` — вміщається в екран; `cover` — максимальний масштаб, заповнює в’юпорт (можливе обрізання). */
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
