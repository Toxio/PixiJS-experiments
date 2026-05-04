import {SetupPoseBoundsProvider, Spine} from '@esotericsoftware/spine-pixi-v8';
import {Assets, type Ticker} from 'pixi.js';

import glassAtlasUrl from '../assets/glass/glass.atlas?url';
import glassJsonUrl from '../assets/glass/glass.json?url';
import glassPngUrl from '../assets/glass/glass.png?url';

export const GLASS_SKEL_ALIAS = 'glassSymbolSpineJson';
export const GLASS_ATLAS_ALIAS = 'glassSymbolSpineAtlas';

/** Reference art `reel.png` is 1641×1022; UV inset of the 5×3 symbol grid (tweak if art shifts). */
export const GLASS_REEL_GRID = {x: 0.18, y: 0.24, w: 0.64, h: 0.44} as const;

let registered = false;

export function registerGlassSpineAssets(): void {
    if (registered) return;
    Assets.add({alias: GLASS_SKEL_ALIAS, src: glassJsonUrl});
    Assets.add({
        alias: GLASS_ATLAS_ALIAS,
        src: glassAtlasUrl,
        data: {
            images: {
                'glass.png': glassPngUrl,
            },
        },
    });
    registered = true;
}

let loadPromise: Promise<void> | null = null;

export function ensureGlassSpineLoaded(): Promise<void> {
    registerGlassSpineAssets();
    if (!loadPromise) {
        loadPromise = Assets.load([GLASS_SKEL_ALIAS, GLASS_ATLAS_ALIAS]).then(() => undefined);
    }
    return loadPromise;
}

export type GlassAnimationName = 'animation' | 'win';

export type CreateGlassSpineOptions = {
    ticker?: Ticker;
    loop?: boolean;
    animation?: GlassAnimationName;
};

export function createGlassSpine(options?: CreateGlassSpineOptions): Spine {
    const spine = Spine.from({
        skeleton: GLASS_SKEL_ALIAS,
        atlas: GLASS_ATLAS_ALIAS,
        boundsProvider: new SetupPoseBoundsProvider(),
        ticker: options?.ticker,
    });
    const anim = options?.animation ?? 'animation';
    spine.state.setAnimation(0, anim, options?.loop ?? true);
    spine.update(0);
    return spine;
}

/** Scale to fit the reel overlay viewport (same idea as `layoutGloveOnScreen`). */
export function layoutGlassOnScreen(
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

/** Place the symbol in one cell of the 5×3 grid over `reel.png` (see `GLASS_REEL_GRID`). */
export function layoutGlassInReelGridCell(
    spine: Spine,
    screenW: number,
    screenH: number,
    col: number,
    row: number,
    pad = 1.12,
    grid: typeof GLASS_REEL_GRID = GLASS_REEL_GRID,
): void {
    if (!Number.isFinite(screenW) || !Number.isFinite(screenH) || screenW <= 0 || screenH <= 0) {
        return;
    }
    const gx = screenW * grid.x;
    const gy = screenH * grid.y;
    const gw = screenW * grid.w;
    const gh = screenH * grid.h;
    const cellW = gw / 5;
    const cellH = gh / 3;
    const cx = gx + (col + 0.5) * cellW;
    const cy = gy + (row + 0.5) * cellH;

    spine.update(0);
    const lb = spine.getLocalBounds();
    const bw = lb.width > 0 ? lb.width : 1;
    const bh = lb.height > 0 ? lb.height : 1;
    const s = Math.min((cellW * pad) / bw, (cellH * pad) / bh);
    spine.scale.set(s);
    spine.position.set(cx - (lb.x + lb.width / 2) * s, cy - (lb.y + lb.height / 2) * s);
}
