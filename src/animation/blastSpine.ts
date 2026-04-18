/**
 * Spine «Blast» — окремий прев’ю-асет (Action / Idle).
 */
import { SetupPoseBoundsProvider, Spine } from '@esotericsoftware/spine-pixi-v8';
import { Assets, type Ticker } from 'pixi.js';

import blastAtlasUrl from '../assets/blast/blast.atlas?url';
import blastJsonUrl from '../assets/blast/blast.json?url';

export const BLAST_SKEL_ALIAS = 'blastSpineJson';
export const BLAST_ATLAS_ALIAS = 'blastSpineAtlas';

let registered = false;

export function registerBlastSpineAssets(): void {
  if (registered) return;
  Assets.add({ alias: BLAST_SKEL_ALIAS, src: blastJsonUrl });
  Assets.add({ alias: BLAST_ATLAS_ALIAS, src: blastAtlasUrl });
  registered = true;
}

let loadPromise: Promise<void> | null = null;

export function ensureBlastSpineLoaded(): Promise<void> {
  registerBlastSpineAssets();
  if (!loadPromise) {
    loadPromise = Assets.load([BLAST_SKEL_ALIAS, BLAST_ATLAS_ALIAS]).then(() => undefined);
  }
  return loadPromise;
}

export type CreateBlastSpineOptions = {
  ticker?: Ticker;
  loop?: boolean;
  /** За замовчуванням `Action` (є також `Idle`). */
  animation?: 'Action' | 'Idle';
};

export function createBlastSpine(options?: CreateBlastSpineOptions): Spine {
  const spine = Spine.from({
    skeleton: BLAST_SKEL_ALIAS,
    atlas: BLAST_ATLAS_ALIAS,
    boundsProvider: new SetupPoseBoundsProvider(),
    ticker: options?.ticker,
  });
  spine.state.setAnimation(0, options?.animation ?? 'Action', options?.loop ?? true);
  spine.update(0);
  return spine;
}

export type BlastLayoutFit = 'contain' | 'cover';

export function layoutBlastOnScreen(
  spine: Spine,
  screenW: number,
  screenH: number,
  pad = 0.99,
  fit: BlastLayoutFit = 'contain',
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
