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
import { useEffect, useRef } from 'react';

import { createGlassSpine, ensureGlassSpineLoaded } from '../../animation/glassSpine';
import { createGobletSpine, ensureGobletSpineLoaded } from '../../animation/gobletSpine';
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
import { createStarSpine, ensureStarSpineLoaded } from '../../animation/starSpine';
import reelImg from '../../assets/reel.png';
import glassImg from '../../assets/symbols/images/glass.png';
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

/**
 * Payline definitions — 1-indexed to match server line numbers.
 * Each entry: [row at col0, row at col1, …, row at col4] (0=top, 1=middle, 2=bottom).
 * Derived from observed win data: lines 1,3,5,7,8 all win with symbol=7 on
 * matrix [[1,6,6],[3,6,9],[6,9,5],...] + expandingWild=[0,0,9,0,0].
 */

const ALL_ASSETS = [
  { alias: 'reel', src: reelImg },
  { alias: 'glass', src: glassImg },
  { alias: 'goblet', src: gobletImg },
  { alias: 'lips', src: lipsImg },
  { alias: 'lipstick', src: lipstickImg },
  { alias: 'parfume', src: parfumeImg },
  { alias: 'rose', src: roseImg },
  { alias: 'seven', src: sevenImg },
  { alias: 'star', src: starImg },
];

const SYMBOL_ALIASES = ALL_ASSETS.slice(1).map((a) => a.alias);

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

/** Create the win-animation Spine for a given symbol index (0–7). */
function createWinSpineForSymbol(symIdx: number, ticker: Ticker): Spine | null {
  switch (symIdx) {
    case 0:
      return createGlassSpine({ loop: true, animation: 'win', ticker });
    case 1:
      return createGobletSpine({ loop: true, ticker });
    case 2:
      return createLipsSpine({ loop: true, animation: 'win', ticker });
    case 3:
      return createLipstickSpine({ loop: true, ticker });
    case 4:
      return createParfumeSpine({ loop: true, ticker });
    case 5:
      return createRoseSpine({ loop: true, ticker });
    case 6:
      return createSevenSpine({ loop: true, ticker });
    case 7:
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

// ── Internal types ────────────────────────────────────────────────────────────
interface SlotSymbol {
  container: Container;
  sprite: Sprite;
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
  onSpinComplete: () => void;
}

export function SlotReels({ spinning, targetMatrix, matrix, onSpinComplete, winLines }: SlotReelsProps) {
  const { app } = useApplication();

  const spinRef = useRef(spinning);
  const completeRef = useRef(onSpinComplete);
  const reelsRef = useRef<Reel[]>([]);
  const tweensRef = useRef<Tween[]>([]);
  const spinStartRef = useRef(0);
  const stopFiredRef = useRef(false);
  const loadedRef = useRef(false);
  const targetMatrixRef = useRef<number[][] | null>(null);

  const winOverlayRef = useRef<Container | null>(null);
  const spineReadyRef = useRef(false);

  const paylineLayerRef = useRef<Container | null>(null);
  const paylineAnimsRef = useRef<PaylineAnimation[]>([]);
  const paylineCycleIdxRef = useRef(0);
  const paylineCycleElapsedRef = useRef(0);

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
    spinStartRef.current = Date.now();
    stopFiredRef.current = false;
    tweensRef.current = [];
    reelsRef.current.forEach((r) => {
      r.stopping = false;
      // Restore any static sprites that were hidden during win animation
      r.symbols.forEach((sym) => {
        sym.sprite.visible = true;
      });
    });
    winOverlayRef.current?.removeChildren();
    for (const anim of paylineAnimsRef.current) anim.destroy();
    paylineAnimsRef.current = [];
    paylineLayerRef.current?.removeChildren();
  }, [spinning]);

  // Show win animations once reels have stopped.
  // PAYLINES determines the exact row for each column; the server win data
  // (winLines) tells us which symbol to animate.  For lines not in PAYLINES we
  // fall back to scanning the matrix for the matching symbol.
  useEffect(() => {
    if (spinning || !winLines.length || !spineReadyRef.current) return;
    const overlay = winOverlayRef.current;
    if (!overlay) return;

    overlay.removeChildren();

    const { width, height } = app.screen;
    const gridX = Math.round(width * REEL_GRID.x);
    const gridY = Math.round(height * REEL_GRID.y);
    const gridW = Math.round(width * REEL_GRID.w);
    const gridH = Math.round(height * REEL_GRID.h);
    const cellW = gridW / REEL_COUNT;
    const cellH = gridH / VISIBLE_ROWS;

    // key = "col,row"  value = symIdx  — deduplicated across multiple win lines
    const cells = new Map<string, number>();

    for (const win of winLines) {
      const symIdx = win.symbol % SYMBOL_ALIASES.length;
      const payline = getPaylineForLineId(win.line);

      for (let col = 0; col < win.count && col < REEL_COUNT; col++) {
        const reelCol = matrix[col];
        let row: number;

        if (payline) {
          // Payline defines the exact row for this column on this line
          row = payline[col] ?? 1;
          // Only animate if the settled matrix actually shows the winning symbol
          // at this cell.  Wild-substituted cells are skipped — the substitution
          // happens server-side but visually the cell shows a different symbol.
          if ((reelCol?.[row] ?? -1) % SYMBOL_ALIASES.length !== symIdx) continue;
        } else {
          // Unknown payline — find the cell in this column that shows the symbol
          row = reelCol?.findIndex((s) => s % SYMBOL_ALIASES.length === symIdx) ?? -1;
          if (row < 0) continue;
        }

        cells.set(`${col},${row}`, symIdx);
      }
    }

    for (const [key, symIdx] of cells) {
      const [col, row] = key.split(',').map(Number);
      const spine = createWinSpineForSymbol(symIdx, app.ticker);
      if (!spine) continue;

      const absX = gridX + col * cellW + cellW / 2;
      const absY = gridY + row * cellH + cellH / 2;
      layoutSpineInCell(spine, absX, absY, cellW, cellH);
      overlay.addChild(spine);

      // Hide the static sprite so only the win animation is visible
      const staticSym = reelsRef.current[col]?.symbols[row + 1];
      // eslint-disable-next-line react-hooks/immutability
      if (staticSym) staticSym.sprite.visible = false;
    }
  }, [spinning, winLines, matrix, app]);

  // Build payline animations whenever a new set of win lines arrives.
  // All animations are pre-created but only the current one is shown at a time.
  useEffect(() => {
    if (spinning || !winLines.length) return;
    const layer = paylineLayerRef.current;
    if (!layer) return;

    layer.removeChildren();
    for (const a of paylineAnimsRef.current) a.destroy();
    paylineAnimsRef.current = [];
    paylineCycleIdxRef.current = 0;
    paylineCycleElapsedRef.current = 0;

    const { width, height } = app.screen;
    const gridX = Math.round(width * REEL_GRID.x);
    const gridY = Math.round(height * REEL_GRID.y);
    const gridW = Math.round(width * REEL_GRID.w);
    const gridH = Math.round(height * REEL_GRID.h);
    const metrics = {
      gridX,
      gridY,
      cellW: gridW / REEL_COUNT,
      cellH: gridH / VISIBLE_ROWS,
      ticker: app.ticker,
    };

    for (const win of winLines) {
      const rows = getPaylineForLineId(win.line);
      if (!rows) continue;
      const anim = createPaylineAnimation(win.line, rows, metrics, win.count);
      paylineAnimsRef.current.push(anim);
    }

    if (paylineAnimsRef.current.length > 0) {
      layer.addChild(paylineAnimsRef.current[0].container);
    }
  }, [spinning, winLines, app]);

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

    // Payline layer sits between the reel grid and the symbol win overlay
    const paylineLayer = new Container();
    app.stage.addChild(paylineLayer);
    paylineLayerRef.current = paylineLayer;

    // Win overlay sits above the reels so spine animations are not clipped by reel masks
    const winOverlayCont = new Container();
    app.stage.addChild(winOverlayCont);
    winOverlayRef.current = winOverlayCont;

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
      ensureLineAssetsLoaded(),
    ])
      .then(() => {
        if (!cancelled) spineReadyRef.current = true;
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
    }

    void init();

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
                updateSymbol(sym, SYMBOL_ALIASES[col[rowIdx] % SYMBOL_ALIASES.length], cellW, cellH);
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
      const anims = paylineAnimsRef.current;
      const layer = paylineLayerRef.current;
      if (!spinRef.current && anims.length > 0 && layer) {
        const CYCLE_DURATION = 1400; // ms each line is shown before advancing
        paylineCycleElapsedRef.current += app.ticker.deltaMS;

        if (paylineCycleElapsedRef.current >= CYCLE_DURATION) {
          paylineCycleElapsedRef.current = 0;

          // Advance to next line (wrap around to 0 after the last)
          const nextIdx = (paylineCycleIdxRef.current + 1) % anims.length;
          paylineCycleIdxRef.current = nextIdx;

          layer.removeChildren();
          layer.addChild(anims[nextIdx].container);
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
      for (const a of paylineAnimsRef.current) a.destroy();
      paylineAnimsRef.current = [];
      winOverlayCont.destroy({ children: true });
      paylineLayer.destroy({ children: true });
      reelCont.destroy({ children: true });
      if (reelCont.parent) reelCont.parent.removeChild(reelCont);
    };
  }, [app]);

  return null;
}
