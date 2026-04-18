import { SetupPoseBoundsProvider, Spine } from '@esotericsoftware/spine-pixi-v8';
import { Assets, type Ticker } from 'pixi.js';

import gloveAtlasUrl from '../assets/glove/Glove.atlas?url';
import gloveJsonUrl from '../assets/glove/Glove.json?url';

export const GLOVE_SKEL_ALIAS = 'gloveSpineJson';
export const GLOVE_ATLAS_ALIAS = 'gloveSpineAtlas';

let registered = false;

export function registerGloveSpineAssets(): void {
  if (registered) return;
  Assets.add({ alias: GLOVE_SKEL_ALIAS, src: gloveJsonUrl });
  Assets.add({ alias: GLOVE_ATLAS_ALIAS, src: gloveAtlasUrl });
  registered = true;
}

let loadPromise: Promise<void> | null = null;

export function ensureGloveSpineLoaded(): Promise<void> {
  registerGloveSpineAssets();
  if (!loadPromise) {
    loadPromise = Assets.load([GLOVE_SKEL_ALIAS, GLOVE_ATLAS_ALIAS]).then(() => undefined);
  }
  return loadPromise;
}

export async function reloadGloveSpineAssetsForPreview(): Promise<void> {
  registered = false;
  loadPromise = null;
  for (const alias of [GLOVE_SKEL_ALIAS, GLOVE_ATLAS_ALIAS]) {
    try {
      await Assets.unload(alias);
    } catch {
      /* alias not registered yet */
    }
  }
  registerGloveSpineAssets();
  loadPromise = Assets.load([GLOVE_SKEL_ALIAS, GLOVE_ATLAS_ALIAS]).then(() => undefined);
  await loadPromise;
}

export type GloveAnimationName = 'Action' | 'Idle' | 'Landing';

export type CreateGloveSpineOptions = {
  ticker?: Ticker;
  loop?: boolean;
  animation?: GloveAnimationName;
};

export function createGloveSpine(options?: CreateGloveSpineOptions): Spine {
  const spine = Spine.from({
    skeleton: GLOVE_SKEL_ALIAS,
    atlas: GLOVE_ATLAS_ALIAS,
    boundsProvider: new SetupPoseBoundsProvider(),
    ticker: options?.ticker,
  });
  spine.state.setAnimation(0, options?.animation ?? 'Action', options?.loop ?? true);
  spine.update(0);
  return spine;
}

export function layoutGloveOnScreen(
  spine: Spine,
  screenW: number,
  screenH: number,
  pad = 0.99,
): void {
  if (!Number.isFinite(screenW) || !Number.isFinite(screenH) || screenW <= 0 || screenH <= 0) {
    return;
  }
  spine.update(0);
  const lb = spine.getLocalBounds();
  const bw = lb.width > 0 ? lb.width : 1;
  const bh = lb.height > 0 ? lb.height : 1;
  const s = Math.min((screenW * pad) / bw, (screenH * pad) / bh);
  spine.scale.set(s);
  spine.position.set(
    screenW / 2 - (lb.x + lb.width / 2) * s,
    screenH / 2 - (lb.y + lb.height / 2) * s,
  );
}
