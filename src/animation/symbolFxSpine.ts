import { SetupPoseBoundsProvider, Spine } from '@esotericsoftware/spine-pixi-v8';
import { Assets, type Ticker } from 'pixi.js';

import symbolFxAtlasUrl from '../assets/symbol_fx/symbol_fx.atlas.txt?url';
import symbolFxJsonUrl from '../assets/symbol_fx/symbol_fx.json?url';
import symbolFxPngUrl from '../assets/symbol_fx/symbol_fx.png?url';

export const SYMBOL_FX_SKEL_ALIAS = 'symbolFxSpineJson';
export const SYMBOL_FX_ATLAS_ALIAS = 'symbolFxSpineAtlas';

let registered = false;

export function registerSymbolFxSpineAssets(): void {
  if (registered) return;
  Assets.add({ alias: SYMBOL_FX_SKEL_ALIAS, src: symbolFxJsonUrl });
  Assets.add({
    alias: SYMBOL_FX_ATLAS_ALIAS,
    src: symbolFxAtlasUrl,
    loadParser: 'spineTextureAtlasLoader',
    data: {
      images: {
        'symbol_fx.png': symbolFxPngUrl,
      },
    },
  });
  registered = true;
}

let loadPromise: Promise<void> | null = null;

export function ensureSymbolFxSpineLoaded(): Promise<void> {
  registerSymbolFxSpineAssets();
  if (!loadPromise) {
    loadPromise = Assets.load([SYMBOL_FX_SKEL_ALIAS, SYMBOL_FX_ATLAS_ALIAS]).then(() => undefined);
  }
  return loadPromise;
}

export type SymbolFxAnimationName = 'win';

export type CreateSymbolFxSpineOptions = {
  ticker?: Ticker;
  loop?: boolean;
  animation?: SymbolFxAnimationName;
};

export function createSymbolFxSpine(options?: CreateSymbolFxSpineOptions): Spine {
  const spine = Spine.from({
    skeleton: SYMBOL_FX_SKEL_ALIAS,
    atlas: SYMBOL_FX_ATLAS_ALIAS,
    boundsProvider: new SetupPoseBoundsProvider(),
    ticker: options?.ticker,
  });
  spine.state.setAnimation(0, options?.animation ?? 'win', options?.loop ?? true);
  spine.update(0);
  return spine;
}
