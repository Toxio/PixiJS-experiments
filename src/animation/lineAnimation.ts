/**
 * Payline win-line overlay animations driven by the Spine skeleton in
 * src/assets/line/ (line.json + line.atlas.txt + line.png).
 *
 * The skeleton contains 5 IK-target column bones (bone1–bone5).  By setting
 * each bone's Y in Spine coordinate space (Y-up) we route the animated line
 * through any payline shape before the animation loop starts.  The "anim"
 * timeline only drives the leaf sprites and the scrolling light mesh — the
 * column bones are NOT keyframed, so our offsets persist throughout playback.
 */

import {SetupPoseBoundsProvider, Spine} from '@esotericsoftware/spine-pixi-v8';
import {Assets, Container, type Ticker} from 'pixi.js';

import lineAtlasUrl from '../assets/line/line.atlas.txt?url';
import lineJsonUrl from '../assets/line/line.json?url';
import linePngUrl from '../assets/line/line.png?url';

// ── Asset aliases ──────────────────────────────────────────────────────────────
const LINE_SKEL_ALIAS = 'lineSpineSkel';
const LINE_ATLAS_ALIAS = 'lineSpineAtlas';

// ── Spine-space column bone data ───────────────────────────────────────────────
// X positions of the 5 column IK-target bones in the setup pose (Spine units).
const BONE1_X = -123.08;
const BONE5_X = 1159.37;
// Total span between first and last column bone.
const SPINE_COL_SPAN = BONE5_X - BONE1_X; // ≈ 1282.45 Spine units

const COL_BONE_NAMES = ['bone1', 'bone2', 'bone3', 'bone4', 'bone5'] as const;

// ── Asset registration ─────────────────────────────────────────────────────────
let registered = false;

function registerLineSpineAssets(): void {
    if (registered) return;
    Assets.add({alias: LINE_SKEL_ALIAS, src: lineJsonUrl});
    // The atlas file ends in .atlas.txt, not .atlas, so we explicitly tell the
    // PixiJS asset system to use the Spine atlas parser via loadParser.
    Assets.add({
        alias: LINE_ATLAS_ALIAS,
        src: lineAtlasUrl,
        loadParser: 'spineTextureAtlasLoader',
        data: {images: {'line.png': linePngUrl}},
    });
    registered = true;
}

let loadPromise: Promise<void> | null = null;

export function ensureLineAssetsLoaded(): Promise<void> {
    registerLineSpineAssets();
    if (!loadPromise) {
        loadPromise = Assets.load([LINE_SKEL_ALIAS, LINE_ATLAS_ALIAS]).then(() => undefined);
    }
    return loadPromise;
}

// ── Public types ───────────────────────────────────────────────────────────────
export interface GridMetrics {
    gridX: number;
    gridY: number;
    cellW: number;
    cellH: number;
    ticker: Ticker;
}

export interface PaylineAnimation {
    container: Container;

    /** Called every frame — no-op here because Spine auto-ticks via the app ticker. */
    update(dt: number): void;

    destroy(): void;
}

// ── Factory ────────────────────────────────────────────────────────────────────
/**
 * Creates a looping Spine payline animation for one winning line.
 *
 * @param _lineId  Server line number (unused — all lines share one skeleton).
 * @param rows     Row index (0=top, 1=mid, 2=bot) per column (5 values).
 * @param metrics  Cell grid geometry + app ticker.
 */
export function createPaylineAnimation(
    _lineId: number,
    rows: number[],
    metrics: GridMetrics,
): PaylineAnimation {
    const {gridX, gridY, cellW, cellH, ticker} = metrics;

    const container = new Container();

    const spine = Spine.from({
        skeleton: LINE_SKEL_ALIAS,
        atlas: LINE_ATLAS_ALIAS,
        boundsProvider: new SetupPoseBoundsProvider(),
        ticker,
    });

    // show it in loop
    spine.state.setAnimation(0, 'anim', true);

    // Scale: map the bone1→bone5 span to 4 × cellW screen pixels (column 0–4).
    const scale = (4 * cellW) / SPINE_COL_SPAN;
    spine.scale.set(scale);

    // X: shift so that bone1 (column 0 IK target) sits at the column-0 centre.
    //    bone1.worldX in screen space = spine.x + BONE1_X * scale
    //    We want that to equal gridX + cellW / 2.
    spine.x = gridX + cellW / 2 - BONE1_X * scale;

    // Y: place Spine Y=0 at the centre of the middle row (row 1).
    //    spine-pixi-v8 renders with Spine's Y-up convention, so positive bone Y
    //    goes UP on screen (= smaller screen Y).
    spine.y = gridY + cellH * 1.5;

    // Route each column bone through its payline row.
    // bone.y = (1 - row) * cellH / scale
    //   row 0 (top)  → +cellH/scale  (positive Spine Y = up = smaller screen Y) ✓
    //   row 1 (mid)  → 0             (spine Y=0 is already at middle row)       ✓
    //   row 2 (bot)  → −cellH/scale  (negative Spine Y = down = larger screen Y) ✓
    for (let col = 0; col < 5; col++) {
        const bone = spine.skeleton.findBone(COL_BONE_NAMES[col]);
        if (!bone) continue;
        const row = rows[col] ?? 1;
        bone.y = ((1 - row) * cellH) / scale;
    }

    // Apply bone offsets before the first rendered frame.
    spine.update(0);

    container.addChild(spine);

    return {
        container,

        // Spine auto-updates via the ticker passed to Spine.from — no manual work needed.
        update() {},

        destroy() {
            container.destroy({children: true});
        },
    };
}
