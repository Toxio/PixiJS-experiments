import { Assets, Rectangle, Texture } from 'pixi.js';

import heelsAtlasPageUrl from '../../../assets/heels/heels.png';
import glassImg from '../../../assets/symbols/images/glass.png';
import gobletImg from '../../../assets/symbols/images/goblet.png';
import lipsImg from '../../../assets/symbols/images/lips.png';
import lipstickImg from '../../../assets/symbols/images/lipstick.png';
import parfumeImg from '../../../assets/symbols/images/parfume.png';
import roseImg from '../../../assets/symbols/images/rose.png';
import scatterImg from '../../../assets/scatter/scatter_box.png';
import sevenImg from '../../../assets/symbols/images/seven.png';
import starImg from '../../../assets/symbols/images/star.png';
import wildImg from '../../../assets/wild/wild-icon.png';
import reelImg from '../../../assets/reel.png';

/** Internal alias for full atlas page (multi-region); reel uses cropped {@link ensureHeelsReelSymbolTexture}. */
const HEELS_ATLAS_PAGE_ALIAS = '__heelsAtlasPage';

/** Region `heels` in `heels.atlas.txt` — matches default mesh attachment on the Spine symbol. */
const HEELS_REEL_BOUNDS = { x: 294, y: 5, w: 291, h: 300 };

let heelsReelTexture: Texture | null = null;

export async function ensureHeelsReelSymbolTexture(): Promise<void> {
  await Assets.load({ alias: HEELS_ATLAS_PAGE_ALIAS, src: heelsAtlasPageUrl });
  const pageTexture = Texture.from(HEELS_ATLAS_PAGE_ALIAS);
  const prev = heelsReelTexture;
  heelsReelTexture = new Texture({
    source: pageTexture.source,
    frame: new Rectangle(
      HEELS_REEL_BOUNDS.x,
      HEELS_REEL_BOUNDS.y,
      HEELS_REEL_BOUNDS.w,
      HEELS_REEL_BOUNDS.h,
    ),
    orig: new Rectangle(0, 0, HEELS_REEL_BOUNDS.w, HEELS_REEL_BOUNDS.h),
  });
  prev?.destroy(false);
}

/** Resolves reel sprite textures; `heels` uses a cropped atlas region (see {@link ensureHeelsReelSymbolTexture}). */
export function resolveSymbolTexture(alias: string): Texture {
  if (alias === 'heels') {
    if (!heelsReelTexture) {
      throw new Error(
        'heels reel texture missing — ensureHeelsReelSymbolTexture must run before symbols',
      );
    }
    return heelsReelTexture;
  }
  return Texture.from(alias);
}

export const ALL_ASSETS = [
  { alias: 'reel', src: reelImg },
  { alias: 'sym-rose', src: roseImg },
  { alias: 'sym-star', src: starImg },
  { alias: 'sym-goblet', src: gobletImg },
  { alias: 'sym-seven', src: sevenImg },
  { alias: 'sym-lips', src: lipsImg },
  { alias: 'sym-lipstick', src: lipstickImg },
  { alias: 'sym-parfume', src: parfumeImg },
  { alias: 'sym-glass', src: glassImg },
  { alias: 'sym-wild', src: wildImg },
  { alias: 'sym-scatter', src: scatterImg },
] as const;

/**
 * Server symbol index → reel sprite alias.
 * Prefix `sym-` avoids Pixi `Assets` clashes with Spine atlas page keys (e.g. `seven.png` resolving as alias `seven`).
 */
const SYMBOL_MAP: Record<number, string> = {
  1: 'sym-seven',
  2: 'sym-lips',
  3: 'sym-parfume',
  4: 'sym-rose',
  5: 'sym-glass',
  6: 'sym-lipstick',
  7: 'sym-goblet',
  8: 'heels',
  9: 'sym-wild',
  10: 'sym-scatter',
  11: 'sym-star',
};

const SYMBOL_ALIASES = Object.values(SYMBOL_MAP);

export function symbolAlias(serverIdx: number): string {
  return SYMBOL_MAP[serverIdx] ?? 'sym-seven';
}

export function randomAlias(): string {
  return SYMBOL_ALIASES[Math.floor(Math.random() * SYMBOL_ALIASES.length)];
}
