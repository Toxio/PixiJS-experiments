/**
 * Reel renderer — ported from the official PixiJS "misc: Slots" example.
 *
 * Visual style: dark navy background, per-reel column with amber/gold glow
 * border (matching the Shining Crown EGT aesthetic from the reference screenshot).
 */

import { useApplication } from '@pixi/react';
import { useEffect, useRef } from 'react';
import { BlurFilter, Container, Graphics, Text, TextStyle } from 'pixi.js';

// ─── Layout ─────────────────────────────────────────────────────────────────
const REEL_COUNT = 5;
const REEL_SIZE = 8;   // virtual loop length (must be > VISIBLE_ROWS + 1)
const SYMBOL_H = 118;  // px per row
const SYMBOL_W = 124;  // px per column
const REEL_GAP = 18;   // gap between reel background rectangles
const REEL_PAD = 6;    // how much the reel bg extends past the content
const VISIBLE_ROWS = 3;

// ─── Animation ──────────────────────────────────────────────────────────────
const SPIN_SPEED = 28;

// Speed presets — mirrors the official example's progressive timing:
//   reel[i] duration = stopBase + i * stopStep  (later reels take longer → stop later)
//   total ≈ minSpin + stopBase + (REEL_COUNT-1) * stopStep
const SPEED_PRESETS = {
  1: { minSpin: 300, stopBase: 220, stopStep: 110 }, // total ~1.1 s
  2: { minSpin: 150, stopBase: 110, stopStep:  55 }, // total ~0.6 s
  3: { minSpin:  50, stopBase:  55, stopStep:  25 }, // total ~0.2 s
} as const;

// ─── Colours ────────────────────────────────────────────────────────────────
const BG_COLOR = 0x050d3a;       // stage + cover background
const REEL_BG_COLOR = 0x091460;  // each reel column fill

// ─── Symbols ────────────────────────────────────────────────────────────────
const SYMS: Record<number, string> = {
  0: '🍒', 1: '🍋', 2: '🍊', 3: '🍇',
  4: '🍉', 5: '🔔', 6: '⭐', 7: '🍀',
  8: '7',  9: '👑', 10: '💎', 11: '🌟',
};
const SYM_COUNT = Object.keys(SYMS).length;

// ─── Types ───────────────────────────────────────────────────────────────────
interface Slot { container: Container; label: Text }

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
  from: number; to: number;
  startMs: number; duration: number;
  ease: (t: number) => number;
  onDone?: () => void;
}

// ─── Helpers (verbatim from official example) ────────────────────────────────
function lerp(a: number, b: number, t: number) { return a * (1 - t) + b * t; }
function backout(amt: number) {
  return (t: number) => (--t * t * ((amt + 1) * t + amt) + 1);
}
function randomSymId() { return Math.floor(Math.random() * SYM_COUNT); }

function paintSlot(slot: Slot, id: number) {
  const sym = SYMS[id] ?? '?';
  slot.label.text = sym;
  if (sym === '7') {
    slot.label.style.fontFamily = 'Impact, "Arial Black", system-ui, sans-serif';
    slot.label.style.fontSize   = Math.floor(SYMBOL_H * 0.68);
    slot.label.style.fontWeight = '900';
    slot.label.style.fill       = 0xff2222;
    slot.label.style.stroke     = { color: 0xffd700, width: 4 };
  } else {
    slot.label.style.fontFamily = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",system-ui,sans-serif';
    slot.label.style.fontSize   = Math.floor(SYMBOL_H * 0.60);
    slot.label.style.fontWeight = '400';
    slot.label.style.fill       = 0xffffff;
    slot.label.style.stroke     = { color: 0x000000, width: 0 };
  }
}

// ─── Gold glow border helper ─────────────────────────────────────────────────
function drawReelColumn(g: Graphics, x: number, y: number, w: number, h: number) {
  const r = 10;
  // Outer soft glow layers
  g.roundRect(x - 7, y - 7, w + 14, h + 14, r + 5).stroke({ color: 0xff8c00, width: 14, alpha: 0.08 });
  g.roundRect(x - 4, y - 4, w + 8,  h + 8,  r + 3).stroke({ color: 0xffa040, width: 8,  alpha: 0.18 });
  g.roundRect(x - 2, y - 2, w + 4,  h + 4,  r + 1).stroke({ color: 0xffb830, width: 4,  alpha: 0.35 });
  // Column fill
  g.roundRect(x, y, w, h, r).fill(REEL_BG_COLOR);
  // Gold border (two layers for richness)
  g.roundRect(x, y, w, h, r).stroke({ color: 0xffa500, width: 2.5, alpha: 1.0 });
  g.roundRect(x, y, w, h, r).stroke({ color: 0xffd700, width: 1,   alpha: 0.55 });
}

// ─── Component ───────────────────────────────────────────────────────────────
interface Props {
  matrix: number[][];
  spinning: boolean;
  targetMatrix: number[][] | null;
  onSpinComplete: () => void;
  spinSpeed: 1 | 2 | 3;
}

export function ShiningCrownReels({ matrix, spinning, targetMatrix, onSpinComplete, spinSpeed }: Props) {
  const { app } = useApplication();

  const spinRef     = useRef(spinning);
  const targetRef   = useRef(targetMatrix);
  const completeRef = useRef(onSpinComplete);
  const speedRef    = useRef(spinSpeed);
  useEffect(() => { spinRef.current     = spinning;      }, [spinning]);
  useEffect(() => { targetRef.current   = targetMatrix;  }, [targetMatrix]);
  useEffect(() => { completeRef.current = onSpinComplete;}, [onSpinComplete]);
  useEffect(() => { speedRef.current    = spinSpeed;     }, [spinSpeed]);

  const reelsRef     = useRef<Reel[]>([]);
  const tweensRef    = useRef<Tween[]>([]);
  const spinStartRef = useRef(0);
  const stopFiredRef = useRef(false);

  useEffect(() => {
    if (!spinning) return;
    spinStartRef.current = Date.now();
    stopFiredRef.current = false;
    reelsRef.current.forEach(r => { r.stopping = false; });
    tweensRef.current = [];
  }, [spinning]);

  // ── One-time scene setup ──────────────────────────────────────────────────
  useEffect(() => {
    const { width, height } = app.screen;
    const totalW   = REEL_COUNT * SYMBOL_W + (REEL_COUNT - 1) * REEL_GAP;
    const visH     = VISIBLE_ROWS * SYMBOL_H;
    const marginTop = Math.round((height - visH) / 2);
    const startX    = Math.round((width  - totalW) / 2);

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
      const ch = visH     + REEL_PAD * 2;
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
    const emojiSize = Math.floor(SYMBOL_H * 0.60);

    for (let i = 0; i < REEL_COUNT; i++) {
      const rc = new Container();
      rc.x = i * (SYMBOL_W + REEL_GAP);
      reelCont.addChild(rc);

      const blur = new BlurFilter();
      blur.blurX = 0; blur.blurY = 0;
      rc.filters = [blur];

      const slots: Slot[] = [];
      for (let j = 0; j < REEL_SIZE; j++) {
        const container = new Container();
        const label = new Text({
          text: '',
          style: new TextStyle({
            fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",system-ui,sans-serif',
            fontSize: emojiSize,
            fontWeight: '400',
            fill: 0xffffff,
          }),
        });
        label.anchor.set(0.5);
        label.x = SYMBOL_W / 2;
        label.y = SYMBOL_H  / 2;
        container.addChild(label);
        container.y = j * SYMBOL_H;
        rc.addChild(container);

        const slot: Slot = { container, label };
        paintSlot(slot, randomSymId());
        slots.push(slot);
      }

      reels.push({ rc, slots, position: 0, prevPos: 0, blur, stopping: false });
    }
    reelsRef.current = reels;

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
      if (spinRef.current && targetRef.current && !stopFiredRef.current && now - spinStartRef.current >= preset.minSpin) {
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
            reel, from: reel.position, to: targetPos,
            startMs: now, // all start together — duration difference creates the cascade
            duration: preset.stopBase + i * preset.stopStep,
            ease: backout(0.4),
            onDone: i === REEL_COUNT - 1 ? () => completeRef.current() : undefined,
          });
        });
      }

      // Process tweens
      const done: Tween[] = [];
      for (const tw of tweensRef.current) {
        if (now < tw.startMs) continue;
        const phase = Math.min(1, (now - tw.startMs) / tw.duration);
        tw.reel.position = lerp(tw.from, tw.to, tw.ease(phase));
        if (phase >= 1) { tw.reel.position = tw.to; done.push(tw); tw.onDone?.(); }
      }
      if (done.length) tweensRef.current = tweensRef.current.filter(t => !done.includes(t));

      // Update reels
      for (const reel of reels) {
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
        }
      }
    };

    app.ticker.add(onTick);

    return () => {
      app.ticker.remove(onTick);
      tweensRef.current = [];
      reelsRef.current  = [];
      [bgG, colG, reelCont, topCover, botCover].forEach(c => {
        if (c.parent) c.parent.removeChild(c);
        c.destroy({ children: true });
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app]);

  return null;
}
