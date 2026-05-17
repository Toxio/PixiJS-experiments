/**
 * PixiJS reel animation — 5 reels × 3 rows.
 * Must be rendered inside a @pixi/react <Application> context.
 */

import { Spine } from '@esotericsoftware/spine-pixi-v8';
import { useApplication } from '@pixi/react';
import { Assets, BlurFilter, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { useEffect, useReducer, useRef } from 'react';

import {
  bigWinAnimationForOdd,
  createBigWinShineSpine,
  createBigWinSpine,
  ensureBigWinSpineLoaded,
  layoutBigWinShineSpine,
  layoutBigWinSpine,
} from '../../../animation/bigWinSpine';
import { ensureGlassSpineLoaded } from '../../../animation/glassSpine';
import { ensureGobletSpineLoaded } from '../../../animation/gobletSpine';
import { ensureHeelsSpineLoaded } from '../../../animation/heelsSpine';
import {
  createPaylineAnimation,
  ensureLineAssetsLoaded,
  type PaylineAnimation,
} from '../../../animation/lineAnimation';
import { ensureLipsSpineLoaded } from '../../../animation/lipsSpine';
import { ensureLipstickSpineLoaded } from '../../../animation/lipstickSpine';
import { ensureParfumeSpineLoaded } from '../../../animation/parfumeSpine';
import { ensureRoseSpineLoaded } from '../../../animation/roseSpine';
import { ensureSevenSpineLoaded } from '../../../animation/sevenSpine';
import { ensureScatterSpineLoaded } from '../../../animation/scatterSpine';
import { ensureStarSpineLoaded } from '../../../animation/starSpine';
import { createWildSpineShowThenIdle, ensureWildSpineLoaded } from '../../../animation/wildSpine';
import { getPaylineForLineId } from '../../../constant/paylines';
import {
  ALL_ASSETS,
  ensureHeelsReelSymbolTexture,
  ensureScatterReelSymbolTexture,
  randomAlias,
  symbolAlias,
} from './assets';
import { LINE_DELAY_MS, REEL_COUNT, REEL_SIZE, SPEED, SPIN_SPEED } from './constants';
import { backout, lerp } from './easing';
import { getSlotGridMetrics } from './grid';
import {
  createWinSpineForSymbol,
  layoutSpineInCell,
  layoutWildSpineExpandedInColumn,
  wildAnimationForRow,
} from './spineWin';
import { createSymbolSprite, setSlotSymbolVisibility, updateSymbol } from './symbolSprites';
import type { Reel, ReelTween, SlotReelsProps, SlotSymbol, WinCell } from './types';

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
  const tweensRef = useRef<ReelTween[]>([]);
  const spinStartRef = useRef(0);
  const stopFiredRef = useRef(false);
  const loadedRef = useRef(false);
  const targetMatrixRef = useRef<number[][] | null>(null);

  const winOverlayRef = useRef<Container | null>(null);
  const spineReadyRef = useRef(false);

  const bigWinLayerRef = useRef<Container | null>(null);
  const prevSpinningBigWinRef = useRef(spinning);

  const wildOverlayRef = useRef<Container | null>(null);
  const wildActiveSpinesRef = useRef<Spine[]>([]);
  const expandingWildColsRef = useRef<number[]>([]);

  const paylineLayerRef = useRef<Container | null>(null);
  const paylineAnimsRef = useRef<PaylineAnimation[]>([]);
  const paylineCycleIdxRef = useRef(0);
  const paylineCycleElapsedRef = useRef(0);

  const winCellsByLineRef = useRef<WinCell[][]>([]);
  const activeWinSpinesRef = useRef<Spine[]>([]);
  const paylineInDelayRef = useRef(false);
  const activateWinLineRef = useRef<((idx: number) => void) | null>(null);
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
    for (const spine of wildActiveSpinesRef.current) {
      if (spine.parent) spine.parent.removeChild(spine);
      spine.destroy();
    }
    wildActiveSpinesRef.current = [];
    expandingWildColsRef.current = [];
    wildOverlayRef.current?.removeChildren();
  }, [spinning]);

  useEffect(() => {
    if (spinning || !winLines.length) return;
    const layer = paylineLayerRef.current;
    if (!layer) return;

    const hasExpandColumn = expandingWild.some((x) => x !== 0);
    const wildCols: number[] = [];
    if (hasExpandColumn) {
      for (let col = 0; col < matrix.length && col < REEL_COUNT; col++) {
        if (expandingWild[col]) wildCols.push(col);
      }
    }
    expandingWildColsRef.current = wildCols;
    if (loadedRef.current && reelsRef.current.length === REEL_COUNT && wildCols.length > 0) {
      for (const col of wildCols) {
        const reel = reelsRef.current[col];
        if (!reel) continue;
        for (const sym of reel.symbols) setSlotSymbolVisibility(sym, false);
      }
    }

    layer.removeChildren();
    for (const a of paylineAnimsRef.current) a.destroy();
    paylineAnimsRef.current = [];
    winCellsByLineRef.current = [];
    paylineCycleIdxRef.current = 0;
    paylineCycleElapsedRef.current = 0;
    paylineInDelayRef.current = false;

    const { width, height } = app.screen;
    const { gridX, gridY, cellW, cellH } = getSlotGridMetrics(width, height);

    for (const win of winLines) {
      const payline = getPaylineForLineId(win.line);
      if (!payline) continue;

      const anim = createPaylineAnimation(win.line, payline, {
        gridX,
        gridY,
        cellW,
        cellH,
        ticker: app.ticker,
      });
      paylineAnimsRef.current.push(anim);

      const serverIdx = win.symbol;
      const cells: WinCell[] = [];
      for (let col = 0; col < win.count && col < REEL_COUNT; col++) {
        if (expandingWild[col]) continue;
        const row = payline[col] ?? 1;
        if (symbolAlias(matrix[col]?.[row] ?? -1) !== symbolAlias(serverIdx)) continue;
        cells.push({ col, row, serverIdx });
      }
      winCellsByLineRef.current.push(cells);
    }

    if (paylineAnimsRef.current.length > 0) {
      activateWinLineRef.current?.(0);
    }
  }, [spinning, winLines, matrix, expandingWild, app]);

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

    if (loadedRef.current && reelsRef.current.length === REEL_COUNT && wildCols.length > 0) {
      hideWildStripColumnsRef.current?.(wildCols);
    }

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
    const { gridX, gridY, gridH, cellW } = getSlotGridMetrics(width, height);

    for (let col = 0; col < matrix.length; col++) {
      if (!expandingWild[col]) continue;
      const anim = wildAnimationForRow(1);
      const spine = createWildSpineShowThenIdle(anim, app.ticker);
      const cx = gridX + col * cellW + cellW / 2;
      const cy = gridY + gridH / 2;
      layoutWildSpineExpandedInColumn(spine, cx, cy, cellW, gridH);
      overlay.addChild(spine);
      wildActiveSpinesRef.current.push(spine);
    }
  }, [spinning, matrix, winLines, expandingWild, app, sceneAssetsEpoch]);

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

  useEffect(() => {
    const { width, height } = app.screen;
    const { gridX, gridY, maskH, cellW, cellH } = getSlotGridMetrics(width, height);

    const reelCont = new Container();
    reelCont.x = gridX;
    reelCont.y = gridY;
    app.stage.addChild(reelCont);

    const winOverlayCont = new Container();
    app.stage.addChild(winOverlayCont);
    winOverlayRef.current = winOverlayCont;

    /** Above per-symbol win spines, below payline (line must stay on top). */
    const wildOverlayCont = new Container();
    app.stage.addChild(wildOverlayCont);
    wildOverlayRef.current = wildOverlayCont;

    const paylineLayer = new Container();
    app.stage.addChild(paylineLayer);
    paylineLayerRef.current = paylineLayer;

    const bigWinLayer = new Container();
    app.stage.addChild(bigWinLayer);
    bigWinLayerRef.current = bigWinLayer;

    let reelBgSprite: Sprite | null = null;

    let cancelled = false;

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
      await ensureHeelsReelSymbolTexture();
      await ensureScatterReelSymbolTexture(app.renderer);
      await Assets.load(ALL_ASSETS);
      if (cancelled) return;

      loadedRef.current = true;

      const bgSprite = new Sprite(Texture.from('reel'));
      bgSprite.width = width;
      bgSprite.height = height;
      app.stage.addChildAt(bgSprite, 0);
      reelBgSprite = bgSprite;

      const reels: Reel[] = [];

      for (let i = 0; i < REEL_COUNT; i++) {
        const rc = new Container();
        rc.x = i * cellW;
        reelCont.addChild(rc);

        const blur = new BlurFilter();
        blur.blurX = 0;
        blur.blurY = 0;
        rc.filters = [blur];

        const mask = new Graphics();
        mask.rect(0, 0, cellW, maskH).fill(0xffffff);
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

    function deactivateCurrentLine() {
      for (const spine of activeWinSpinesRef.current) {
        if (spine.parent) spine.parent.removeChild(spine);
        spine.destroy();
      }
      activeWinSpinesRef.current = [];
      for (const reel of reelsRef.current) {
        for (const sym of reel.symbols) setSlotSymbolVisibility(sym, true);
      }
      hideWildStripColumnsRef.current?.(expandingWildColsRef.current);
      paylineLayerRef.current?.removeChildren();
    }

    function activateWinLine(idx: number) {
      deactivateCurrentLine();

      const anims = paylineAnimsRef.current;
      const layer = paylineLayerRef.current;
      const overlay = winOverlayRef.current;
      if (!layer || !overlay || idx >= anims.length) return;

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

      const done: ReelTween[] = [];
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

          if (sym.container.y < 0 && prevY > cellH && !reel.stopping) {
            updateSymbol(sym, randomAlias(), cellW, cellH);
          }
        }
      }

      const anims = paylineAnimsRef.current;
      if (!spinRef.current && anims.length > 0) {
        const lineShowMs = anims[paylineCycleIdxRef.current]?.durationMs ?? 1000;
        const lineCycleMs = lineShowMs + LINE_DELAY_MS;

        paylineCycleElapsedRef.current += app.ticker.deltaMS;
        const elapsed = paylineCycleElapsedRef.current;

        if (elapsed >= lineCycleMs) {
          paylineCycleElapsedRef.current = 0;
          paylineInDelayRef.current = false;
          const nextIdx = (paylineCycleIdxRef.current + 1) % anims.length;
          paylineCycleIdxRef.current = nextIdx;
          activateWinLine(nextIdx);
        } else if (elapsed >= lineShowMs && !paylineInDelayRef.current) {
          paylineInDelayRef.current = true;
          paylineLayerRef.current?.removeChildren();
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
      reelBgSprite?.destroy();
      reelBgSprite = null;
      reelCont.destroy({ children: true });
      if (reelCont.parent) reelCont.parent.removeChild(reelCont);
    };
  }, [app]);

  return null;
}
