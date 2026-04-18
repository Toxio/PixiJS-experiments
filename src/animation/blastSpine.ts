/**
 * Spine "Blast" asset — preview tab and slot reels (Action / Idle).
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

/**
 * Same idea as explosion preview: after slot Spine instances are destroyed, Pixi `Assets` may
 * still look loaded while textures are invalid for a new Application — unload + reload aliases.
 */
export async function reloadBlastSpineAssetsForPreview(): Promise<void> {
  registered = false;
  loadPromise = null;
  for (const alias of [BLAST_SKEL_ALIAS, BLAST_ATLAS_ALIAS]) {
    try {
      await Assets.unload(alias);
    } catch {
      /* alias not registered yet */
    }
  }
  registerBlastSpineAssets();
  loadPromise = Assets.load([BLAST_SKEL_ALIAS, BLAST_ATLAS_ALIAS]).then(() => undefined);
  await loadPromise;
}

export type CreateBlastSpineOptions = {
  ticker?: Ticker;
  loop?: boolean;
  /** Defaults to `Action`; `Idle` is also available. */
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

/** Fit into one symbol cell (same idea as `layoutWinFrameInRect`). */
export function layoutBlastInRect(spine: Spine, width: number, height: number, pad = 1.05): void {
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
