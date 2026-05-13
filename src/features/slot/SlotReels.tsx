/**
 * PixiJS reel animation — 5 reels × 3 rows.
 * Must be rendered inside a @pixi/react <Application> context.
 *
 * reel.png (1641×1022) is the frame background.
 * REEL_GRID defines where the cell grid sits inside the image.
 */

import { Spine } from '@esotericsoftware/spine-pixi-v8';
import { useApplication } from '@pixi/react';
import { Assets, BlurFilter, Container, Graphics, Sprite, Texture, type Ticker } from 'pixi.js';
import { useEffect, useReducer, useRef } from 'react';

import { createGlassSpine, ensureGlassSpineLoaded } from '../../animation/glassSpine';
import { createGobletSpine, ensureGobletSpineLoaded } from '../../animation/gobletSpine';
import { createHeelsSpine, ensureHeelsSpineLoaded } from '../../animation/heelsSpine';
import { createScatterSpine, ensureScatterSpineLoaded } from '../../animation/scatterSpine';
import {
  createWildSpine,
  ensureWildSpineLoaded,
  type WildAnimationName,
} from '../../animation/wildSpine';
import {
  createPaylineAnimation,
  ensureLineAssetsLoaded,
  type PaylineAnimation,
} from '../../animation/lineAnimation';
import { createLipsSpine, ensureLipsSpineLoaded } from '../../animation/lipsSpine';
import { createLipstickSpine, ensureLipstickSpineLoaded } from '../../animation/lipstickSpine';
import { createParfumeSpine, ensureParfumeSpineLoaded } from '../../animation/parfumeSpine';
import { createRoseSpine, ensureRoseSpineLoaded } from '../../animation/roseSpine';
import { createSevenSpine, ensureSevenSpineLoaded } from '../../animation/sevenSpine';
import {
  bigWinAnimationForOdd,
  createBigWinSpine,
  createBigWinShineSpine,
  ensureBigWinSpineLoaded,
  layoutBigWinShineSpine,
  layoutBigWinSpine,
} from '../../animation/bigWinSpine';
import { createStarSpine, ensureStarSpineLoaded } from '../../animation/starSpine';
import reelImg from '../../assets/reel.png';
import glassImg from '../../assets/symbols/images/glass.png';
import heelsImg from '../../assets/heels/heels.png';
import scatterImg from '../../assets/scatter/scatter.png';
import wildImg from '../../assets/wild/wild-icon.png';
import gobletImg from '../../assets/symbols/images/goblet.png';
import lipsImg from '../../assets/symbols/images/lips.png';
import lipstickImg from '../../assets/symbols/images/lipstick.png';
import parfumeImg from '../../assets/symbols/images/parfume.png';
import roseImg from '../../assets/symbols/images/rose.png';
import sevenImg from '../../assets/symbols/images/seven.png';
import starImg from '../../assets/symbols/images/star.png';
import type { WinLine } from '../../hooks/useSlotsHubSignalR';
import { getPaylineForLineId } from '../../slot/paylines';

// ── Grid UV inset — pixel-precise from the pink divider lines in reel.png (1641×1022).
const REEL_GRID = { x: 0.01, y: 0.038, w: 0.962, h: 0.957 } as const;

const REEL_COUNT = 5;
const VISIBLE_ROWS = 3;
const REEL_SIZE = 10; // virtual loop length (must be > VISIBLE_ROWS + 1)
const SPIN_SPEED = 25;

const SPEED = {
  minSpin: 300,
  stopBase: 280,
  stopStep: 140,
};

// ── Win animation timing ──────────────────────────────────────────────────────
/**
 * Blank pause (ms) between consecutive win lines.
 * The SHOW duration is read from the Spine animation itself so the timer always
 * advances on an exact loop boundary — no mid-cycle cut-off glitch.
 */
const LINE_DELAY_MS = 300;

/** One cell that participates in a win line. */
interface WinCell {
  col: number;
  row: number;
  serverIdx: number;
}

const ALL_ASSETS = [
  { alias: 'reel', src: reelImg },
  { alias: 'rose', src: roseImg },
  { alias: 'star', src: starImg },
  { alias: 'goblet', src: gobletImg },
  { alias: 'seven', src: sevenImg },
  { alias: 'lips', src: lipsImg },
  { alias: 'lipstick', src: lipstickImg },
  { alias: 'parfume', src: parfumeImg },
  { alias: 'glass', src: glassImg },
  { alias: 'heels', src: heelsImg },
  { alias: 'wild', src: wildImg },
  { alias: 'scatter', src: scatterImg },
];

/** Maps server symbol index (1-based) → PixiJS texture alias. */
const SYMBOL_MAP: Record<number, string> = {
  1: 'seven',
  2: 'lips',
  3: 'parfume',
  4: 'rose',
  5: 'glass',
  6: 'lipstick',
  7: 'goblet',
  8: 'heels',
  9: 'wild',
  10: 'scatter',
  11: 'star',
};

const SYMBOL_ALIASES = Object.values(SYMBOL_MAP);

function symbolAlias(serverIdx: number): string {
  return SYMBOL_MAP[serverIdx] ?? 'seven';
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number) {
  return a * (1 - t) + b * t;
}

function backout(amount: number) {
  return (t: number) => --t * t * ((amount + 1) * t + amount) + 1;
}

function randomAlias() {
  return SYMBOL_ALIASES[Math.floor(Math.random() * SYMBOL_ALIASES.length)];
}

function wildAnimationForRow(row: number): WildAnimationName {
  return row === 0 ? 'wild1' : row === 2 ? 'wild3' : 'wild2';
}

/** Create the win-animation Spine for a given server symbol index (1-based).
 *  `row` (0=top, 1=mid, 2=bot) is required for wild (index 9) to pick wild1/2/3. */
function createWinSpineForSymbol(serverIdx: number, ticker: Ticker, row?: number): Spine | null {
  switch (serverIdx) {
    case 1:
      return createSevenSpine({ loop: true, ticker });
    case 2:
      return createLipsSpine({ loop: true, animation: 'win', ticker });
    case 3:
      return createParfumeSpine({ loop: true, ticker });
    case 4:
      return createRoseSpine({ loop: true, ticker });
    case 5:
      return createGlassSpine({ loop: true, animation: 'win', ticker });
    case 6:
      return createLipstickSpine({ loop: true, ticker });
    case 7:
      return createGobletSpine({ loop: true, ticker });
    case 8:
      return createHeelsSpine({ loop: true, animation: 'win', ticker });
    case 9: {
      const r = row ?? 1;
      return createWildSpine({ loop: true, animation: wildAnimationForRow(r), ticker });
    }
    case 10:
      return createScatterSpine({ loop: true, animation: 'win', ticker });
    case 11:
      return createStarSpine({ loop: true, animation: 'win', ticker });
    default:
      return null;
  }
}

const SPINE_CELL_SCALE = 0.82;

/** Scale and centre a Spine so it fits inside one reel cell (same padding as static sprites). */
function layoutSpineInCell(
  spine: Spine,
  absX: number,
  absY: number,
  cellW: number,
  cellH: number,
): void {
  spine.update(0);
  const lb = spine.getLocalBounds();
  const bw = lb.width > 0 ? lb.width : 1;
  const bh = lb.height > 0 ? lb.height : 1;
  const s = Math.min((cellW * SPINE_CELL_SCALE) / bw, (cellH * SPINE_CELL_SCALE) / bh);
  spine.scale.set(s);
  spine.position.set(absX - (lb.x + lb.width / 2) * s, absY - (lb.y + lb.height / 2) * s);
}

const EXPANDED_WILD_SIDE_PAD_FRAC = 0.048;
/** Cover-scale height vs column (still uses max(scaleW, scaleH)). */
const EXPANDED_WILD_HEIGHT_MUL = 1.22;
/** Extra downward offset after centering — fraction of full column height. */
const EXPANDED_WILD_SHIFT_DOWN_FRAC = 0.09;
/** Nudge left — fraction of one reel cell width (positive = move left). */
const EXPANDED_WILD_SHIFT_LEFT_FRAC = 0.1;

/**
 * Expanding wild: cover-style scale with **horizontal padding** inset from reel edges,
 * then shift **down** and slightly **left** so the frame aligns visually in the column.
 */
function layoutWildSpineExpandedInColumn(
  spine: Spine,
  absXCenter: number,
  absYCenter: number,
  cellW: number,
  columnHeight: number,
): void {
  spine.update(0);
  const lb = spine.getLocalBounds();
  const bw = lb.width > 0 ? lb.width : 1;
  const bh = lb.height > 0 ? lb.height : 1;
  const paddedW = cellW * Math.max(0.55, 1 - 2 * EXPANDED_WILD_SIDE_PAD_FRAC);
  const targetW = paddedW;
  const targetH = columnHeight * 0.98 * EXPANDED_WILD_HEIGHT_MUL;
  const s = Math.max(targetW / bw, targetH / bh);
  spine.scale.set(s);
  const nx = absXCenter - (lb.x + lb.width / 2) * s - cellW * EXPANDED_WILD_SHIFT_LEFT_FRAC;
  let ny = absYCenter - (lb.y + lb.height / 2) * s;
  ny += columnHeight * EXPANDED_WILD_SHIFT_DOWN_FRAC;
  spine.position.set(nx, ny);
}

// ── Internal types ────────────────────────────────────────────────────────────
interface SlotSymbol {
  container: Container;
  sprite: Sprite;
}

function setSlotSymbolVisibility(sym: SlotSymbol | undefined, visible: boolean): void {
  if (!sym) return;
  sym.sprite.visible = visible;
  sym.container.visible = visible;
}

interface Reel {
  rc: Container;
  symbols: SlotSymbol[];
  position: number;
  prevPos: number;
  blur: BlurFilter;
  stopping: boolean;
}

interface Tween {
  reel: Reel;
  from: number;
  to: number;
  startMs: number;
  duration: number;
  ease: (t: number) => number;
  onDone?: () => void;
}

// ── Sprite helpers ────────────────────────────────────────────────────────────
function createSymbolSprite(alias: string, cw: number, ch: number): SlotSymbol {
  const container = new Container();
  const sprite = new Sprite(Texture.from(alias));
  fitSprite(sprite, cw, ch);
  container.addChild(sprite);
  return { container, sprite };
}

function fitSprite(sprite: Sprite, cw: number, ch: number): void {
  sprite.anchor.set(0.5);
  sprite.x = cw / 2;
  sprite.y = ch / 2;
  const tw = sprite.texture.width || 1;
  const th = sprite.texture.height || 1;
  sprite.scale.set(Math.min((cw * 0.82) / tw, (ch * 0.82) / th));
}

function updateSymbol(sym: SlotSymbol, alias: string, cw: number, ch: number): void {
  sym.sprite.texture = Texture.from(alias);
  fitSprite(sym.sprite, cw, ch);
}

// ── Component ─────────────────────────────────────────────────────────────────
export interface SlotReelsProps {
  spinning: boolean;
  targetMatrix: number[][] | null;
  /** Settled matrix (5 reels × 3 rows) used to locate winning cells. */
  matrix: number[][];
  winLines: WinLine[];
  /** Per-column expanding-wild flags (length 5). Non-zero = wild animates in that column. */
  expandingWild: number[];
  /** Total spin multiplier (`Odd`); triggers BIG / MEGA / SUPER overlay at 20× / 50× / 100×. */
  spinOdd: number | null;
  onSpinComplete: () => void;
}

export function SlotReels({
  spinning,
  targetMatrix,
  matrix,
  onSpinComplete,
  winLines,
  expandingWild,
  spinOdd,
}: SlotReelsProps) {
  const { app } = useApplication();

  const spinRef = useRef(spinning);
  const completeRef = useRef(onSpinComplete);
  const reelsRef = useRef<Reel[]>([]);
  /** Bumps when reel strips are built or Spine preload finishes — retriggers expanding-wild sprite hides. */
  const [sceneAssetsEpoch, bumpSceneAssets] = useReducer((n: number) => n + 1, 0);
  const tweensRef = useRef<Tween[]>([]);
  const spinStartRef = useRef(0);
  const stopFiredRef = useRef(false);
  const loadedRef = useRef(false);
  const targetMatrixRef = useRef<number[][] | null>(null);

  const winOverlayRef = useRef<Container | null>(null);
  const spineReadyRef = useRef(false);

  const bigWinLayerRef = useRef<Container | null>(null);
  const prevSpinningBigWinRef = useRef(spinning);

  /** Persistent overlay for wild cells — always visible regardless of win-cycle phase. */
  const wildOverlayRef = useRef<Container | null>(null);
  const wildActiveSpinesRef = useRef<Spine[]>([]);
  /** Reel columns with expanding wild — entire strip must stay hidden under the Spine overlay. */
  const expandingWildColsRef = useRef<number[]>([]);

  const paylineLayerRef = useRef<Container | null>(null);
  const paylineAnimsRef = useRef<PaylineAnimation[]>([]);
  const paylineCycleIdxRef = useRef(0);
  const paylineCycleElapsedRef = useRef(0);

  /** Per win-line list of cells to animate (parallel to paylineAnimsRef). */
  const winCellsByLineRef = useRef<WinCell[][]>([]);
  /** Win-spine objects currently visible in the overlay (for the active line). */
  const activeWinSpinesRef = useRef<Spine[]>([]);
  /** True while we are in the blank-delay phase between two lines. */
  const paylineInDelayRef = useRef(false);
  /** Exposed by the one-time setup effect so the payline effect can trigger line 0. */
  const activateWinLineRef = useRef<((idx: number) => void) | null>(null);
  /** Hides every symbol slot in the given reel columns (full strip); defined in one-time setup. */
  const hideWildStripColumnsRef = useRef<((cols: number[]) => void) | null>(null);

  useEffect(() => {
    spinRef.current = spinning;
  }, [spinning]);

  useEffect(() => {
    completeRef.current = onSpinComplete;
  }, [onSpinComplete]);

  useEffect(() => {
    targetMatrixRef.current = targetMatrix;
  }, [targetMatrix]);

  // Clear win overlay and reset per-spin state when a new spin begins
  useEffect(() => {
    if (!spinning) return;
    const bwLayer = bigWinLayerRef.current;
    if (bwLayer) {
      for (const c of [...bwLayer.children]) {
        bwLayer.removeChild(c);
        c.destroy();
      }
    }
    spinStartRef.current = Date.now();
    stopFiredRef.current = false;
    tweensRef.current = [];
    reelsRef.current.forEach((r) => {
      r.stopping = false;
      r.symbols.forEach((sym) => setSlotSymbolVisibility(sym, true));
    });
    // Destroy active win spines
    for (const spine of activeWinSpinesRef.current) {
      if (spine.parent) spine.parent.removeChild(spine);
      spine.destroy();
    }
    activeWinSpinesRef.current = [];
    winCellsByLineRef.current = [];
    paylineInDelayRef.current = false;
    winOverlayRef.current?.removeChildren();
    for (const anim of paylineAnimsRef.current) anim.destroy();
    paylineAnimsRef.current = [];
    paylineLayerRef.current?.removeChildren();
    if (paylineLayerRef.current) paylineLayerRef.current.visible = true;
    // Destroy persistent wild spines
    for (const spine of wildActiveSpinesRef.current) {
      if (spine.parent) spine.parent.removeChild(spine);
      spine.destroy();
    }
    wildActiveSpinesRef.current = [];
    expandingWildColsRef.current = [];
    wildOverlayRef.current?.removeChildren();
  }, [spinning]);

  // Build payline + win-cell data whenever a new result arrives.
  // Animations play sequentially: payline line + its symbol spines are shown
  // together, then a brief blank delay, then the next line.
  useEffect(() => {
    if (spinning || !winLines.length) return;
    const layer = paylineLayerRef.current;
    if (!layer) return;

    layer.removeChildren();
    for (const a of paylineAnimsRef.current) a.destroy();
    paylineAnimsRef.current = [];
    winCellsByLineRef.current = [];
    paylineCycleIdxRef.current = 0;
    paylineCycleElapsedRef.current = 0;
    paylineInDelayRef.current = false;

    const { width, height } = app.screen;
    const gridX = Math.round(width * REEL_GRID.x);
    const gridY = Math.round(height * REEL_GRID.y);
    const gridW = Math.round(width * REEL_GRID.w);
    const gridH = Math.round(height * REEL_GRID.h);
    const cellW = gridW / REEL_COUNT;
    const cellH = gridH / VISIBLE_ROWS;

    for (const win of winLines) {
      const payline = getPaylineForLineId(win.line);
      if (!payline) continue;

      // Payline overlay animation
      const anim = createPaylineAnimation(win.line, payline, {
        gridX,
        gridY,
        cellW,
        cellH,
        ticker: app.ticker,
      });
      paylineAnimsRef.current.push(anim);

      // Cells whose symbols should animate while this line is shown — skip expanding-wild columns entirely.
      const serverIdx = win.symbol;
      const cells: WinCell[] = [];
      for (let col = 0; col < win.count && col < REEL_COUNT; col++) {
        if (expandingWild[col]) continue;
        const row = payline[col] ?? 1;
        // Skip cells where the settled matrix shows a different symbol (wild sub)
        if (symbolAlias(matrix[col]?.[row] ?? -1) !== symbolAlias(serverIdx)) continue;
        cells.push({ col, row, serverIdx });
      }
      winCellsByLineRef.current.push(cells);
    }

    // Immediately show the first line
    if (paylineAnimsRef.current.length > 0) {
      activateWinLineRef.current?.(0);
    }
  }, [spinning, winLines, matrix, expandingWild, app]);

  // Populate persistent expanding-wild spine overlay whenever the matrix settles.
  useEffect(() => {
    if (spinning) return;

    for (const spine of wildActiveSpinesRef.current) {
      if (spine.parent) spine.parent.removeChild(spine);
      spine.destroy();
    }
    wildActiveSpinesRef.current = [];

    const overlay = wildOverlayRef.current;
    const hasWins = winLines.length > 0;
    const hasExpandColumn = expandingWild.some((x) => x !== 0);

    const wildCols: number[] = [];
    if (hasWins && hasExpandColumn) {
      for (let col = 0; col < matrix.length && col < REEL_COUNT; col++) {
        if (expandingWild[col]) wildCols.push(col);
      }
    }

    expandingWildColsRef.current = wildCols;

    // Hide entire reel strips under expanding columns (all buffer slots too — avoids symbols over the wild).
    if (loadedRef.current && reelsRef.current.length === REEL_COUNT && wildCols.length > 0) {
      hideWildStripColumnsRef.current?.(wildCols);
    }

    // No active expanding wild slots — reveal full strips only once wins are cleared.
    if (
      loadedRef.current &&
      reelsRef.current.length === REEL_COUNT &&
      wildCols.length === 0 &&
      winLines.length === 0
    ) {
      for (const reel of reelsRef.current) {
        for (const sym of reel.symbols) setSlotSymbolVisibility(sym, true);
      }
    }

    if (!overlay || !spineReadyRef.current || !hasWins || !hasExpandColumn || wildCols.length === 0)
      return;

    const { width, height } = app.screen;
    const gridX = Math.round(width * REEL_GRID.x);
    const gridY = Math.round(height * REEL_GRID.y);
    const gridW = Math.round(width * REEL_GRID.w);
    const gridH = Math.round(height * REEL_GRID.h);
    const cellW = gridW / REEL_COUNT;

    for (let col = 0; col < matrix.length; col++) {
      if (!expandingWild[col]) continue;
      const spine = createWildSpine({
        loop: true,
        animation: wildAnimationForRow(1),
        ticker: app.ticker,
      });
      const cx = gridX + col * cellW + cellW / 2;
      const cy = gridY + gridH / 2;
      layoutWildSpineExpandedInColumn(spine, cx, cy, cellW, gridH);
      overlay.addChild(spine);
      wildActiveSpinesRef.current.push(spine);
    }
  }, [spinning, matrix, winLines, expandingWild, app, sceneAssetsEpoch]);

  // BIG / MEGA / SUPER win banner — loops until the player starts the next spin.
  useEffect(() => {
    const justStopped = prevSpinningBigWinRef.current && !spinning;
    prevSpinningBigWinRef.current = spinning;
    if (!justStopped) return;

    const tier = spinOdd != null ? bigWinAnimationForOdd(spinOdd) : null;
    if (!tier || winLines.length === 0) return;

    const appRef = app;
    void ensureBigWinSpineLoaded().then(() => {
      if (spinRef.current) return;
      const stillTier = spinOdd != null ? bigWinAnimationForOdd(spinOdd) : null;
      if (stillTier !== tier) return;
      const layer = bigWinLayerRef.current;
      if (!layer || !appRef?.ticker) return;

      for (const c of [...layer.children]) {
        layer.removeChild(c);
        c.destroy();
      }

      const { width, height } = appRef.screen;
      const shine = createBigWinShineSpine({ ticker: appRef.ticker, loop: true });
      layoutBigWinShineSpine(shine, width, height);
      layer.addChild(shine);

      const spine = createBigWinSpine({ animation: tier, ticker: appRef.ticker, loop: true });
      layoutBigWinSpine(spine, width, height);
      layer.addChild(spine);
    });
  }, [spinning, spinOdd, winLines.length, app]);

  // One-time scene setup
  useEffect(() => {
    const { width, height } = app.screen;

    const gridX = Math.round(width * REEL_GRID.x);
    const gridY = Math.round(height * REEL_GRID.y);
    const gridW = Math.round(width * REEL_GRID.w);
    const gridH = Math.round(height * REEL_GRID.h);
    const cellW = gridW / REEL_COUNT;
    const cellH = gridH / VISIBLE_ROWS;

    const reelCont = new Container();
    reelCont.x = gridX;
    reelCont.y = gridY;
    app.stage.addChild(reelCont);

    const wildOverlayCont = new Container();
    app.stage.addChild(wildOverlayCont);
    wildOverlayRef.current = wildOverlayCont;

    const winOverlayCont = new Container();
    app.stage.addChild(winOverlayCont);
    winOverlayRef.current = winOverlayCont;

    // Payline above wild + win symbol spines; under big-win only.
    const paylineLayer = new Container();
    app.stage.addChild(paylineLayer);
    paylineLayerRef.current = paylineLayer;

    const bigWinLayer = new Container();
    app.stage.addChild(bigWinLayer);
    bigWinLayerRef.current = bigWinLayer;

    let cancelled = false;

    // Preload all spine assets in parallel with PNG assets
    Promise.all([
      ensureGlassSpineLoaded(),
      ensureGobletSpineLoaded(),
      ensureLipsSpineLoaded(),
      ensureLipstickSpineLoaded(),
      ensureParfumeSpineLoaded(),
      ensureRoseSpineLoaded(),
      ensureSevenSpineLoaded(),
      ensureStarSpineLoaded(),
      ensureHeelsSpineLoaded(),
      ensureWildSpineLoaded(),
      ensureScatterSpineLoaded(),
      ensureBigWinSpineLoaded(),
      ensureLineAssetsLoaded(),
    ])
      .then(() => {
        if (!cancelled) {
          spineReadyRef.current = true;
          bumpSceneAssets();
        }
      })
      .catch(() => {});

    async function init() {
      await Assets.load(ALL_ASSETS);
      if (cancelled) return;

      loadedRef.current = true;

      const bgSprite = new Sprite(Texture.from('reel'));
      bgSprite.width = width;
      bgSprite.height = height;
      app.stage.addChildAt(bgSprite, 0);

      const reels: Reel[] = [];

      for (let i = 0; i < REEL_COUNT; i++) {
        const rc = new Container();
        rc.x = i * cellW;
        reelCont.addChild(rc);

        const blur = new BlurFilter();
        blur.blurX = 0;
        blur.blurY = 0;
        rc.filters = [blur];

        // Mask clips each column to exactly cellW × (3 × cellH)
        const mask = new Graphics();
        mask.rect(0, 0, cellW, gridH).fill(0xffffff);
        rc.addChild(mask);
        rc.mask = mask;

        const symbols: SlotSymbol[] = [];
        for (let j = 0; j < REEL_SIZE; j++) {
          const sym = createSymbolSprite(randomAlias(), cellW, cellH);
          sym.container.y = j * cellH;
          rc.addChild(sym.container);
          symbols.push(sym);
        }

        reels.push({ rc, symbols, position: 0, prevPos: 0, blur, stopping: false });
      }

      reelsRef.current = reels;
      bumpSceneAssets();
    }

    void init();

    // ── Win-line helpers (close over scene nodes and grid metrics) ────────────

    /** Destroy active win spines, restore hidden static sprites, clear payline. */
    function deactivateCurrentLine() {
      for (const spine of activeWinSpinesRef.current) {
        if (spine.parent) spine.parent.removeChild(spine);
        spine.destroy();
      }
      activeWinSpinesRef.current = [];
      for (const reel of reelsRef.current) {
        for (const sym of reel.symbols) setSlotSymbolVisibility(sym, true);
      }
      // Full reel strips under expanding wild columns stay hidden (every slot index, not only rows 0–2).
      hideWildStripColumnsRef.current?.(expandingWildColsRef.current);
      paylineLayerRef.current?.removeChildren();
    }

    /** Show payline N + create win spines for its cells; hides prior line first. */
    function activateWinLine(idx: number) {
      deactivateCurrentLine();

      const anims = paylineAnimsRef.current;
      const layer = paylineLayerRef.current;
      const overlay = winOverlayRef.current;
      if (!layer || !overlay || idx >= anims.length) return;

      // Always restart from time 0 — the Spine keeps ticking while off-screen,
      // so without this reset it would resume mid-loop and cause a visual jerk.
      anims[idx].restart();
      layer.addChild(anims[idx].container);

      if (!spineReadyRef.current) return;

      const newSpines: Spine[] = [];
      for (const { col, row, serverIdx } of winCellsByLineRef.current[idx] ?? []) {
        if (expandingWildColsRef.current.includes(col)) continue;
        if (serverIdx === 9) {
          setSlotSymbolVisibility(reelsRef.current[col]?.symbols[row + 1], false);
          continue;
        }
        const spine = createWinSpineForSymbol(serverIdx, app.ticker, row);
        if (!spine) continue;
        const absX = gridX + col * cellW + cellW / 2;
        const absY = gridY + row * cellH + cellH / 2;
        layoutSpineInCell(spine, absX, absY, cellW, cellH);
        overlay.addChild(spine);
        newSpines.push(spine);
        setSlotSymbolVisibility(reelsRef.current[col]?.symbols[row + 1], false);
      }
      activeWinSpinesRef.current = newSpines;
    }

    activateWinLineRef.current = activateWinLine;

    hideWildStripColumnsRef.current = (cols: number[]) => {
      for (const col of cols) {
        const reel = reelsRef.current[col];
        if (!reel) continue;
        for (const sym of reel.symbols) setSlotSymbolVisibility(sym, false);
      }
    };

    const ease = backout(0.4);

    const onTick = () => {
      if (!loadedRef.current) return;

      const now = Date.now();
      const reels = reelsRef.current;

      // Fire stop tweens after minSpin ms
      if (
        spinRef.current &&
        !stopFiredRef.current &&
        reels.length > 0 &&
        now - spinStartRef.current >= SPEED.minSpin
      ) {
        stopFiredRef.current = true;

        reels.forEach((reel, i) => {
          reel.stopping = true;

          const extraCycles = 2 + i;
          const targetPos = (Math.ceil(reel.position / REEL_SIZE) + extraCycles) * REEL_SIZE;

          // Stamp server symbols onto the visible slots at rest position.
          // At position = any multiple of REEL_SIZE, visible symbols are indices 1, 2, 3.
          const col = targetMatrixRef.current?.[i];
          if (col) {
            [1, 2, 3].forEach((symIdx, rowIdx) => {
              const sym = reel.symbols[symIdx];
              if (sym && col[rowIdx] !== undefined) {
                updateSymbol(sym, symbolAlias(col[rowIdx]), cellW, cellH);
              }
            });
          }

          tweensRef.current.push({
            reel,
            from: reel.position,
            to: targetPos,
            startMs: now,
            duration: SPEED.stopBase + i * SPEED.stopStep,
            ease,
            onDone: i === REEL_COUNT - 1 ? () => completeRef.current() : undefined,
          });
        });
      }

      // Process active tweens
      const done: Tween[] = [];
      for (const tw of tweensRef.current) {
        if (now < tw.startMs) continue;
        const phase = Math.min(1, (now - tw.startMs) / tw.duration);
        tw.reel.position = lerp(tw.from, tw.to, ease(phase));
        if (phase >= 1) {
          tw.reel.position = tw.to;
          done.push(tw);
          tw.onDone?.();
        }
      }
      if (done.length) tweensRef.current = tweensRef.current.filter((t) => !done.includes(t));

      // Update every reel's symbol positions each frame
      for (const reel of reels) {
        if (spinRef.current && !reel.stopping) {
          reel.position += SPIN_SPEED / 60;
        }

        reel.blur.blurY = Math.abs(reel.position - reel.prevPos) * 8;
        reel.prevPos = reel.position;

        for (let j = 0; j < reel.symbols.length; j++) {
          const sym = reel.symbols[j];
          const prevY = sym.container.y;
          sym.container.y = ((reel.position + j) % REEL_SIZE) * cellH - cellH;

          // Swap symbol when it wraps off the top (only while freely spinning)
          if (sym.container.y < 0 && prevY > cellH && !reel.stopping) {
            updateSymbol(sym, randomAlias(), cellW, cellH);
          }
        }
      }

      // ── Payline sequential animation ─────────────────────────────────────────
      // Show duration = exact Spine loop length (no mid-cycle cut-off).
      // Cycle = showMs + LINE_DELAY_MS blank pause.
      const anims = paylineAnimsRef.current;
      if (!spinRef.current && anims.length > 0) {
        const lineShowMs = anims[paylineCycleIdxRef.current]?.durationMs ?? 1000;
        const lineCycleMs = lineShowMs + LINE_DELAY_MS;

        paylineCycleElapsedRef.current += app.ticker.deltaMS;
        const elapsed = paylineCycleElapsedRef.current;

        if (elapsed >= lineCycleMs) {
          // Advance to next line
          paylineCycleElapsedRef.current = 0;
          paylineInDelayRef.current = false;
          const nextIdx = (paylineCycleIdxRef.current + 1) % anims.length;
          paylineCycleIdxRef.current = nextIdx;
          activateWinLine(nextIdx);
        } else if (elapsed >= lineShowMs && !paylineInDelayRef.current) {
          // Enter blank-delay phase: hide everything until next advance
          paylineInDelayRef.current = true;
          deactivateCurrentLine();
        }
      }
    };

    app.ticker.add(onTick);

    return () => {
      cancelled = true;
      loadedRef.current = false;
      spineReadyRef.current = false;
      app.ticker.remove(onTick);
      tweensRef.current = [];
      reelsRef.current = [];
      winOverlayRef.current = null;
      paylineLayerRef.current = null;
      bigWinLayerRef.current = null;
      activateWinLineRef.current = null;
      for (const spine of activeWinSpinesRef.current) spine.destroy();
      activeWinSpinesRef.current = [];
      for (const a of paylineAnimsRef.current) a.destroy();
      paylineAnimsRef.current = [];
      winCellsByLineRef.current = [];
      for (const spine of wildActiveSpinesRef.current) spine.destroy();
      wildActiveSpinesRef.current = [];
      expandingWildColsRef.current = [];
      wildOverlayRef.current = null;
      hideWildStripColumnsRef.current = null;
      wildOverlayCont.destroy({ children: true });
      winOverlayCont.destroy({ children: true });
      paylineLayer.destroy({ children: true });
      bigWinLayer.destroy({ children: true });
      reelCont.destroy({ children: true });
      if (reelCont.parent) reelCont.parent.removeChild(reelCont);
    };
  }, [app]);

  return null;
}
