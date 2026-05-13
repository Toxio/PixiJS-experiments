import { SetupPoseBoundsProvider, Spine } from '@esotericsoftware/spine-pixi-v8';
import { Assets, type Ticker } from 'pixi.js';

import scatterAtlasUrl from '../assets/scatter/scatter.atlas.txt?url';
import scatterJsonUrl from '../assets/scatter/scatter.json?url';
import scatterPngUrl from '../assets/scatter/scatter.png?url';

export const SCATTER_SKEL_ALIAS = 'scatterSymbolSpineJson';
export const SCATTER_ATLAS_ALIAS = 'scatterSymbolSpineAtlas';

let registered = false;

export function registerScatterSpineAssets(): void {
  if (registered) return;
  Assets.add({ alias: SCATTER_SKEL_ALIAS, src: scatterJsonUrl });
  Assets.add({
    alias: SCATTER_ATLAS_ALIAS,
    src: scatterAtlasUrl,
    loadParser: 'spineTextureAtlasLoader',
    data: { images: { 'scatter.png': scatterPngUrl } },
  });
  registered = true;
}

let loadPromise: Promise<void> | null = null;

export function ensureScatterSpineLoaded(): Promise<void> {
  registerScatterSpineAssets();
  if (!loadPromise) {
    loadPromise = Assets.load([SCATTER_SKEL_ALIAS, SCATTER_ATLAS_ALIAS]).then(() => undefined);
  }
  return loadPromise;
}

export type ScatterAnimationName = 'win';

export type CreateScatterSpineOptions = {
  ticker?: Ticker;
  loop?: boolean;
  animation?: ScatterAnimationName;
};

export function createScatterSpine(options?: CreateScatterSpineOptions): Spine {
  const spine = Spine.from({
    skeleton: SCATTER_SKEL_ALIAS,
    atlas: SCATTER_ATLAS_ALIAS,
    boundsProvider: new SetupPoseBoundsProvider(),
    ticker: options?.ticker,
  });
  spine.state.setAnimation(0, options?.animation ?? 'win', options?.loop ?? true);
  spine.update(0);
  return spine;
}
