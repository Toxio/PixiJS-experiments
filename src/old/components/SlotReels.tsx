/**
 * Reel renderer — ported from the official PixiJS "misc: Slots" example.
 *
 * Visual style: dark navy background, per-reel column with amber/gold glow
 * border (classic EGT-style slot look).
 */

import type { Spine } from '@esotericsoftware/spine-pixi-v8';
import { useApplication } from '@pixi/react';
import { useEffect, useRef } from 'react';
import { BlurFilter, Container, Graphics, Text, TextStyle } from 'pixi.js';

import {
  createBlastSpine,
  ensureBlastSpineLoaded,
  layoutBlastInRect,
} from '../animation/blastSpine';
import {
  createExplosionSpine,
  ensureExplosionSpineLoaded,
  layoutExplosionInRect,
} from '../animation/explosionSpine';
import {
  createWinFrameSpine,
  ensureWinFrameSpineLoaded,
  getSpineAnimationDurationMs,
  layoutWinFrameInRect,
} from '../animation/winFrameSpine.ts';
import {
  createGloveSpine,
  ensureGloveSpineLoaded,
  layoutGloveInRect,
} from '../animation/gloveSpine';
import type { WinLine } from '../hooks/useSlotsHubSignalR';
import { getPaylineForLineId } from '../slot/paylines';

// ─── Layout ─────────────────────────────────────────────────────────────────
const REEL_COUNT = 5;
const REEL_SIZE = 8; // virtual loop length (must be > VISIBLE_ROWS + 1)
const SYMBOL_H = 118; // px per row
const SYMBOL_W = 124; // px per column
const REEL_GAP = 18; // gap between reel background rectangles
const REEL_PAD = 6; // how much the reel bg extends past the content
const VISIBLE_ROWS = 3;

/**
 * `reel.slots[1..3]` map to top / middle / bottom of the visible window.
 * Top-left of the middle cell is `y = SYMBOL_H` (not `2 * SYMBOL_H`, which is the bottom row).
 */

// Post-stop overlay visibility uses one full Spine `Action` duration (see `getSpineAnimationDurationMs`).

// ─── Animation ──────────────────────────────────────────────────────────────
const SPIN_SPEED = 28;

// Speed presets — mirrors the official example's progressive timing:
//   reel[i] duration = stopBase + i * stopStep  (later reels take longer → stop later)
//   total ≈ minSpin + stopBase + (REEL_COUNT-1) * stopStep
const SPEED_PRESETS = {
  1: { minSpin: 300, stopBase: 220, stopStep: 110 }, // total ~1.1 s
  2: { minSpin: 150, stopBase: 110, stopStep: 55 }, // total ~0.6 s
  3: { minSpin: 50, stopBase: 55, stopStep: 25 }, // total ~0.2 s
} as const;

// ─── Colours ────────────────────────────────────────────────────────────────
const BG_COLOR = 0x050d3a; // stage + cover background
const REEL_BG_COLOR = 0x091460; // each reel column fill

// ─── Symbols ────────────────────────────────────────────────────────────────
const SYMS: Record<number, string> = {
  0: '',
  1: '🍋',
  2: '🍊',
  3: '🍇',
  4: '🍉',
  5: '🔔',
  6: '⭐',
  7: '🍀',
  8: '7',
  9: '👑',
  10: '💎',
  11: '🌟',
};
const SYM_COUNT = Object.keys(SYMS).length;

/** Symbol ids — Blast while spinning vs Explosion after reels stop (final grid). */
const SYM_LEMON = 1;
const SYM_BELL = 5;
const SYM_STAR = 6;
const SYM_CROWN = 9;
const SYM_STAR_BURST = 11;
const SYM_GLOVE = 0;

function symUsesBlastWhileSpinning(id: number): boolean {
  return id === SYM_LEMON || id === SYM_STAR || id === SYM_STAR_BURST;
}

function symUsesExplosionAfterStop(id: number): boolean {
  return id === SYM_CROWN || id === SYM_BELL;
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface Slot {
  container: Container;
  label: Text;
  symId: number;
  blastFx?: Spine;
  gloveFx?: Spine;
  gloveAnim?: 'Idle' | 'Action';
}

interface Reel {
  rc: Container;
  slots: Slot[];
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

// ─── Helpers (verbatim from official example) ────────────────────────────────
function lerp(a: number, b: number, t: number) {
  return a * (1 - t) + b * t;
}
function backout(amt: number) {
  return (t: number) => --t * t * ((amt + 1) * t + amt) + 1;
}
function randomSymId() {
  return Math.floor(Math.random() * SYM_COUNT);
}

/** Whether the symbol cell intersects the three visible rows of the reel window. */
function isSlotInVisibleStrip(containerY: number): boolean {
  return containerY > -SYMBOL_H * 0.5 && containerY < VISIBLE_ROWS * SYMBOL_H;
}

/** Visible row index 0–2 from reel-local slot Y (matches matrix[..][row]). */
function visibleRowIndex(containerY: number): number | null {
  const r = Math.round(containerY / SYMBOL_H);
  if (r < 0 || r >= VISIBLE_ROWS) return null;
  return r;
}

function paintSlot(slot: Slot, id: number) {
  slot.symId = id;
  const sym = SYMS[id] ?? '?';
  slot.label.text = sym;
  if (sym === '7') {
    slot.label.style.fontFamily = 'Impact, "Arial Black", system-ui, sans-serif';
    slot.label.style.fontSize = Math.floor(SYMBOL_H * 0.68);
    slot.label.style.fontWeight = '900';
    slot.label.style.fill = 0xff2222;
    slot.label.style.stroke = { color: 0xffd700, width: 4 };
  } else {
    slot.label.style.fontFamily =
      '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",system-ui,sans-serif';
    slot.label.style.fontSize = Math.floor(SYMBOL_H * 0.6);
    slot.label.style.fontWeight = '400';
    slot.label.style.fill = 0xffffff;
    slot.label.style.stroke = { color: 0x000000, width: 0 };
  }
}

// ─── Gold glow border helper ─────────────────────────────────────────────────
function drawReelColumn(g: Graphics, x: number, y: number, w: number, h: number) {
  const r = 10;
  // Outer soft glow layers
  g.roundRect(x - 7, y - 7, w + 14, h + 14, r + 5).stroke({
    color: 0xff8c00,
    width: 14,
    alpha: 0.08,
  });
  g.roundRect(x - 4, y - 4, w + 8, h + 8, r + 3).stroke({ color: 0xffa040, width: 8, alpha: 0.18 });
  g.roundRect(x - 2, y - 2, w + 4, h + 4, r + 1).stroke({ color: 0xffb830, width: 4, alpha: 0.35 });
  // Column fill
  g.roundRect(x, y, w, h, r).fill(REEL_BG_COLOR);
  // Gold border (two layers for richness)
  g.roundRect(x, y, w, h, r).stroke({ color: 0xffa500, width: 2.5, alpha: 1.0 });
  g.roundRect(x, y, w, h, r).stroke({ color: 0xffd700, width: 1, alpha: 0.55 });
}

// ─── Component ───────────────────────────────────────────────────────────────
interface Props {
  matrix: number[][];
  spinning: boolean;
  targetMatrix: number[][] | null;
  winLines: WinLine[];
  onSpinComplete: () => void;
  spinSpeed: 1 | 2 | 3;
}

export function SlotReels({
  matrix,
  spinning,
  targetMatrix,
  winLines,
  onSpinComplete,
  spinSpeed,
}: Props) {
  const { app } = useApplication();

  const spinRef = useRef(spinning);
  const targetRef = useRef(targetMatrix);
  const completeRef = useRef(onSpinComplete);
  const speedRef = useRef(spinSpeed);
  const winLinesRef = useRef<WinLine[]>(winLines);
  const winHighlightCellsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    spinRef.current = spinning;
  }, [spinning]);
  useEffect(() => {
    targetRef.current = targetMatrix;
  }, [targetMatrix]);
  useEffect(() => {
    completeRef.current = onSpinComplete;
  }, [onSpinComplete]);
  useEffect(() => {
    speedRef.current = spinSpeed;
  }, [spinSpeed]);
  useEffect(() => {
    winLinesRef.current = winLines;
  }, [winLines]);

  const reelsRef = useRef<Reel[]>([]);
  const tweensRef = useRef<Tween[]>([]);
  const spinStartRef = useRef(0);
  const stopFiredRef = useRef(false);

  const clearWinFlashRef = useRef<(() => void) | null>(null);
  const clearLemonBlastsRef = useRef<(() => void) | null>(null);
  const clearCrownFlashRef = useRef<(() => void) | null>(null);
  const spineFxReadyRef = useRef(false);
  const winFlashActiveRef = useRef(false);

  useEffect(() => {
    if (!spinning) return;
    spinStartRef.current = Date.now();
    stopFiredRef.current = false;
    reelsRef.current.forEach((r) => {
      r.stopping = false;
    });
    tweensRef.current = [];
    clearWinFlashRef.current?.();
    clearLemonBlastsRef.current?.();
    clearCrownFlashRef.current?.();
  }, [spinning]);

  // Keep visible cells in sync with server / React state (InitialState, recovery) — setup only runs once
  useEffect(() => {
    if (spinning) return;
    const reels = reelsRef.current;
    if (reels.length === 0) return;
    for (let i = 0; i < REEL_COUNT; i++) {
      const reel = reels[i];
      paintSlot(reel.slots[1], matrix[i]?.[0] ?? 0);
      paintSlot(reel.slots[2], matrix[i]?.[1] ?? 0);
      paintSlot(reel.slots[3], matrix[i]?.[2] ?? 0);
    }
  }, [matrix, spinning]);

  // ── One-time scene setup ──────────────────────────────────────────────────
  useEffect(() => {
    spineFxReadyRef.current = false;
    void Promise.all([
      ensureBlastSpineLoaded(),
      ensureExplosionSpineLoaded(),
      ensureGloveSpineLoaded(),
    ]).then(() => {
      spineFxReadyRef.current = true;
    });

    const { width, height } = app.screen;
    const totalW = REEL_COUNT * SYMBOL_W + (REEL_COUNT - 1) * REEL_GAP;
    const visH = VISIBLE_ROWS * SYMBOL_H;
    const marginTop = Math.round((height - visH) / 2);
    const startX = Math.round((width - totalW) / 2);

    // Stage background
    const bgG = new Graphics();
    bgG.rect(0, 0, width, height).fill(BG_COLOR);
    app.stage.addChild(bgG);

    // Per-reel column backgrounds + gold glow borders
    const colG = new Graphics();
    for (let i = 0; i < REEL_COUNT; i++) {
      const cx = startX + i * (SYMBOL_W + REEL_GAP) - REEL_PAD;
      const cy = marginTop - REEL_PAD;
      const cw = SYMBOL_W + REEL_PAD * 2;
      const ch = visH + REEL_PAD * 2;
      drawReelColumn(colG, cx, cy, cw, ch);
    }
    app.stage.addChild(colG);

    // Reel container (y=0 → top of visible window)
    const reelCont = new Container();
    reelCont.x = startX;
    reelCont.y = marginTop;
    app.stage.addChild(reelCont);

    // ── Build reels ──────────────────────────────────────────────────────────
    const reels: Reel[] = [];
    const emojiSize = Math.floor(SYMBOL_H * 0.6);

    for (let i = 0; i < REEL_COUNT; i++) {
      const rc = new Container();
      rc.x = i * (SYMBOL_W + REEL_GAP);
      reelCont.addChild(rc);

      const blur = new BlurFilter();
      blur.blurX = 0;
      blur.blurY = 0;
      rc.filters = [blur];

      const slots: Slot[] = [];
      for (let j = 0; j < REEL_SIZE; j++) {
        const container = new Container();
        const label = new Text({
          text: '',
          style: new TextStyle({
            fontFamily:
              '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",system-ui,sans-serif',
            fontSize: emojiSize,
            fontWeight: '400',
            fill: 0xffffff,
          }),
        });
        label.anchor.set(0.5);
        label.x = SYMBOL_W / 2;
        label.y = SYMBOL_H / 2;
        label.zIndex = 0;
        container.sortableChildren = true;
        container.addChild(label);
        container.y = j * SYMBOL_H;
        rc.addChild(container);

        const slot: Slot = { container, label, symId: 0 };
        paintSlot(slot, randomSymId());
        slots.push(slot);
      }

      reels.push({ rc, slots, position: 0, prevPos: 0, blur, stopping: false });
    }
    reelsRef.current = reels;

    reelCont.sortableChildren = true;

    const winLineLayer = new Container();
    winLineLayer.zIndex = 100;
    winLineLayer.eventMode = 'none';
    reelCont.addChild(winLineLayer);

    function clearWinLineFlash() {
      winFlashActiveRef.current = false;
      winHighlightCellsRef.current = new Set();
      for (const c of winLineLayer.removeChildren()) {
        c.destroy({ children: true });
      }
    }

    /** Win frames stay until the next spin (`spinning` clears via ref). */
    async function flashWinFramesForWins() {
      clearWinLineFlash();
      const wins = winLinesRef.current;
      if (wins.length === 0) return;
      try {
        await ensureWinFrameSpineLoaded();
      } catch {
        return;
      }
      // Union of (reel, row) for the first `count` stops on each payline — can show
      // mixed sprites when wilds substitute; `WinLine.symbol` is still one paytable id.
      const cellKeys = new Set<string>();
      for (const w of wins) {
        const path = getPaylineForLineId(w.line);
        if (!path) continue;
        const n = Math.min(Math.max(1, w.count), REEL_COUNT);
        for (let reelIdx = 0; reelIdx < n; reelIdx++) {
          cellKeys.add(`${reelIdx},${path[reelIdx]}`);
        }
      }
      if (cellKeys.size === 0) return;
      winHighlightCellsRef.current = cellKeys;
      winFlashActiveRef.current = true;
      for (const key of cellKeys) {
        const [rs, ys] = key.split(',');
        const reelI = Number(rs);
        const rowI = Number(ys);
        const holder = new Container();
        holder.x = reelI * (SYMBOL_W + REEL_GAP);
        holder.y = rowI * SYMBOL_H;
        winLineLayer.addChild(holder);
        const spine = createWinFrameSpine({ ticker: app.ticker, loop: true });
        layoutWinFrameInRect(spine, SYMBOL_W, SYMBOL_H, 1.05);
        holder.addChild(spine);
      }
    }

    clearWinFlashRef.current = clearWinLineFlash;

    const crownExplosionLayer = new Container();
    crownExplosionLayer.zIndex = 102;
    crownExplosionLayer.eventMode = 'none';
    reelCont.addChild(crownExplosionLayer);

    let crownFlashTimer: ReturnType<typeof setTimeout> | null = null;

    function clearCrownExplosionFlash() {
      if (crownFlashTimer !== null) {
        clearTimeout(crownFlashTimer);
        crownFlashTimer = null;
      }
      for (const c of crownExplosionLayer.removeChildren()) {
        c.destroy({ children: true });
      }
    }

    function clearAllLemonBlasts() {
      for (const reel of reels) {
        for (const slot of reel.slots) {
          if (slot.blastFx) {
            const b = slot.blastFx;
            slot.blastFx = undefined;
            if (b.parent) b.parent.removeChild(b);
            b.destroy();
          }
          if (slot.gloveFx) {
            const g = slot.gloveFx;
            slot.gloveFx = undefined;
            slot.gloveAnim = undefined;
            if (g.parent) g.parent.removeChild(g);
            g.destroy();
          }
          slot.label.visible = true;
        }
      }
    }
    clearLemonBlastsRef.current = clearAllLemonBlasts;
    clearCrownFlashRef.current = clearCrownExplosionFlash;

    /** Blast loops while lemon / star symbols are visible during an active spin. */
    function syncBlastFxForSlot(slot: Slot) {
      const wantBlast =
        spineFxReadyRef.current &&
        spinRef.current &&
        symUsesBlastWhileSpinning(slot.symId) &&
        isSlotInVisibleStrip(slot.container.y);

      if (!wantBlast) {
        if (slot.blastFx) {
          const b = slot.blastFx;
          slot.blastFx = undefined;
          if (b.parent) b.parent.removeChild(b);
          b.destroy();
        }
        slot.label.visible = true;
        return;
      }

      if (!slot.blastFx) {
        const spine = createBlastSpine({ ticker: app.ticker, loop: true, animation: 'Action' });
        slot.blastFx = spine;
        spine.zIndex = 2;
        slot.container.addChild(spine);
      }
      slot.label.visible = false;
      layoutBlastInRect(slot.blastFx!, SYMBOL_W, SYMBOL_H, 1.05);
    }

    function syncGloveFxForSlot(reelIndex: number, slot: Slot) {
      const wantGlove =
        spineFxReadyRef.current &&
        slot.symId === SYM_GLOVE &&
        isSlotInVisibleStrip(slot.container.y);

      if (!wantGlove) {
        if (slot.gloveFx) {
          const g = slot.gloveFx;
          slot.gloveFx = undefined;
          slot.gloveAnim = undefined;
          if (g.parent) g.parent.removeChild(g);
          g.destroy();
        }
        return;
      }

      if (!slot.gloveFx) {
        const spine = createGloveSpine({ ticker: app.ticker, loop: true, animation: 'Idle' });
        slot.gloveFx = spine;
        slot.gloveAnim = 'Idle';
        spine.zIndex = 2;
        slot.container.addChild(spine);
      }

      const visRow = visibleRowIndex(slot.container.y);
      const inWin =
        visRow !== null &&
        winFlashActiveRef.current &&
        winHighlightCellsRef.current.has(`${reelIndex},${visRow}`);
      const desired: 'Idle' | 'Action' = inWin ? 'Action' : 'Idle';
      if (slot.gloveAnim !== desired) {
        slot.gloveFx.state.setAnimation(0, desired, true);
        slot.gloveAnim = desired;
      }

      slot.label.visible = false;
      layoutGloveInRect(slot.gloveFx, SYMBOL_W, SYMBOL_H, 1.05);
    }

    async function flashPostStopExplosions(mat: number[][]) {
      clearCrownExplosionFlash();
      try {
        await ensureExplosionSpineLoaded();
      } catch {
        return;
      }
      let flashMs = 1000;
      let anyTarget = false;
      let firstExplosion = true;
      for (let i = 0; i < REEL_COUNT; i++) {
        for (let r = 0; r < VISIBLE_ROWS; r++) {
          if (!symUsesExplosionAfterStop(mat[i]?.[r] ?? -1)) continue;
          anyTarget = true;
          const holder = new Container();
          holder.x = i * (SYMBOL_W + REEL_GAP);
          holder.y = r * SYMBOL_H;
          crownExplosionLayer.addChild(holder);
          const spine = createExplosionSpine({ ticker: app.ticker, loop: false });
          if (firstExplosion) {
            flashMs = getSpineAnimationDurationMs(spine, 'Action');
            firstExplosion = false;
          }
          layoutExplosionInRect(spine, SYMBOL_W, SYMBOL_H, 1.05);
          holder.addChild(spine);
        }
      }
      if (!anyTarget) return;
      crownFlashTimer = setTimeout(() => clearCrownExplosionFlash(), flashMs);
    }

    // Initial matrix display
    reels.forEach((reel, i) => {
      paintSlot(reel.slots[1], matrix[i]?.[0] ?? 0);
      paintSlot(reel.slots[2], matrix[i]?.[1] ?? 0);
      paintSlot(reel.slots[3], matrix[i]?.[2] ?? 0);
    });

    // Top / bottom covers — same technique as the official example
    const topCover = new Graphics();
    topCover.rect(0, 0, width, marginTop).fill(BG_COLOR);
    app.stage.addChild(topCover);

    const botCover = new Graphics();
    botCover.rect(0, marginTop + visH, width, height - marginTop - visH).fill(BG_COLOR);
    app.stage.addChild(botCover);

    // ── Ticker ───────────────────────────────────────────────────────────────
    const onTick = () => {
      const now = Date.now();

      // Trigger stop — mirrors the official example:
      //   all reels start their tween together, but reel[i] gets more distance
      //   and more time so it finishes later → natural left-to-right cascade.
      const preset = SPEED_PRESETS[speedRef.current];
      if (
        spinRef.current &&
        targetRef.current &&
        !stopFiredRef.current &&
        now - spinStartRef.current >= preset.minSpin
      ) {
        stopFiredRef.current = true;
        const mat = targetRef.current;

        reels.forEach((reel, i) => {
          reel.stopping = true;

          // Extra cycles: reel 0 gets +2, reel 4 gets +6 — gives each reel
          // enough distance for the backout deceleration to look smooth.
          const extraCycles = 2 + i;
          const targetPos = (Math.ceil(reel.position / REEL_SIZE) + extraCycles) * REEL_SIZE;

          paintSlot(reel.slots[1], mat[i]?.[0] ?? 0);
          paintSlot(reel.slots[2], mat[i]?.[1] ?? 0);
          paintSlot(reel.slots[3], mat[i]?.[2] ?? 0);

          tweensRef.current.push({
            reel,
            from: reel.position,
            to: targetPos,
            startMs: now, // all start together — duration difference creates the cascade
            duration: preset.stopBase + i * preset.stopStep,
            ease: backout(0.4),
            onDone:
              i === REEL_COUNT - 1
                ? () => {
                    void flashWinFramesForWins();
                    void flashPostStopExplosions(mat);
                    completeRef.current();
                  }
                : undefined,
          });
        });
      }

      // Process tweens
      const done: Tween[] = [];
      for (const tw of tweensRef.current) {
        if (now < tw.startMs) continue;
        const phase = Math.min(1, (now - tw.startMs) / tw.duration);
        tw.reel.position = lerp(tw.from, tw.to, tw.ease(phase));
        if (phase >= 1) {
          tw.reel.position = tw.to;
          done.push(tw);
          tw.onDone?.();
        }
      }
      if (done.length) tweensRef.current = tweensRef.current.filter((t) => !done.includes(t));

      // Update reels
      for (let ri = 0; ri < reels.length; ri++) {
        const reel = reels[ri];
        if (spinRef.current && !reel.stopping) reel.position += SPIN_SPEED / 60;

        reel.blur.blurY = Math.abs(reel.position - reel.prevPos) * 8;
        reel.prevPos = reel.position;

        for (let j = 0; j < reel.slots.length; j++) {
          const s = reel.slots[j];
          const prevY = s.container.y;
          s.container.y = ((reel.position + j) % REEL_SIZE) * SYMBOL_H - SYMBOL_H;
          if (s.container.y < 0 && prevY > SYMBOL_H && !reel.stopping) {
            paintSlot(s, randomSymId());
          }
          syncBlastFxForSlot(s);
          syncGloveFxForSlot(ri, s);
        }
      }
    };

    app.ticker.add(onTick);

    return () => {
      spineFxReadyRef.current = false;
      clearWinFlashRef.current = null;
      clearLemonBlastsRef.current = null;
      clearCrownFlashRef.current = null;
      clearWinLineFlash();
      clearCrownExplosionFlash();
      clearAllLemonBlasts();
      app.ticker.remove(onTick);
      tweensRef.current = [];
      reelsRef.current = [];
      [bgG, colG, reelCont, topCover, botCover].forEach((c) => {
        if (c.parent) c.parent.removeChild(c);
        c.destroy({ children: true });
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app]);

  return null;
}
