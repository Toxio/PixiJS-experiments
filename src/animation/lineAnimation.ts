/**
 * Payline win-line overlay animations.
 *
 * Always renders the full 5-column payline path so the player can see the line
 * shape. The winning portion (first `count` columns) is bright and animated;
 * the remaining columns are drawn dimmed for context.
 *
 * Assets used from src/assets/line/images/:
 *   lines_animation.png  — 1500×150 px strip (10 × 150 px frames); tiled as a
 *                          scrolling light texture along winning segments.
 *   goldenleaveA.png     — rotating decoration placed on winning cell centres.
 */

import { Assets, Container, Graphics, Sprite, Texture, TilingSprite } from 'pixi.js';

import goldenLeaveUrl from '../assets/line/images/goldenleaveA.png';
import linesAnimationUrl from '../assets/line/images/lines_animation.png';

// ── Payline colours (1-indexed to match server line numbers) ─────────────────
export const PAYLINE_COLORS: Record<number, number> = {
  1: 0xffd700, // gold
  2: 0xff4444, // red
  3: 0x44aaff, // blue
  4: 0xff44ff, // magenta
  5: 0x44ff88, // green
  6: 0xff8844, // orange
  7: 0x44ffff, // cyan
  8: 0xff44aa, // pink
  9: 0xaaff44, // lime
  10: 0xaa44ff, // purple
};

// ── Asset loading ─────────────────────────────────────────────────────────────
let loadPromise: Promise<void> | null = null;

export function ensureLineAssetsLoaded(): Promise<void> {
  if (!loadPromise) {
    loadPromise = Assets.load([
      { alias: 'linesAnimation', src: linesAnimationUrl },
      { alias: 'goldenLeave', src: goldenLeaveUrl },
    ]).then(() => undefined);
  }
  return loadPromise;
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface GridMetrics {
  gridX: number;
  gridY: number;
  cellW: number;
  cellH: number;
}

export interface PaylineAnimation {
  container: Container;
  /** Call every frame with the deltaMS for this tick. */
  update(dt: number): void;
  destroy(): void;
}

// ── Factory ───────────────────────────────────────────────────────────────────
/**
 * Creates an animated payline overlay for one winning line.
 *
 * @param lineId  Server line number (1–10).
 * @param rows    All five row-indices for this payline (0=top, 1=mid, 2=bot).
 * @param metrics Cell grid geometry in canvas pixels.
 * @param count   How many columns the win spans (remaining columns are dimmed).
 */
export function createPaylineAnimation(
  lineId: number,
  rows: number[],
  metrics: GridMetrics,
  count: number,
): PaylineAnimation {
  const { gridX, gridY, cellW, cellH } = metrics;
  const color = PAYLINE_COLORS[lineId] ?? 0xffffff;
  const winCount = Math.max(1, Math.min(count, 5));

  const container = new Container();

  // Build all 5 cell-centre points (full payline path)
  const allPts = rows.slice(0, 5).map((row, col) => ({
    x: gridX + col * cellW + cellW / 2,
    y: gridY + row * cellH + cellH / 2,
    winning: col < winCount,
  }));

  const winPts = allPts.filter((p) => p.winning);
  const dimPts = allPts.filter((p) => !p.winning);

  // ── Dim connector: full 5-point path at low opacity ──────────────────────
  const dimLine = new Graphics();
  drawPolyline(dimLine, allPts, 3, color, 0.25);
  container.addChild(dimLine);

  // ── Winning glow (wide, translucent) ─────────────────────────────────────
  const glow = new Graphics();
  drawPolyline(glow, winPts, 18, color, 0.22);
  container.addChild(glow);

  // ── Winning main line ─────────────────────────────────────────────────────
  const mainLine = new Graphics();
  drawPolyline(mainLine, winPts, 5, color, 1);
  container.addChild(mainLine);

  // ── Scrolling light texture along each winning segment ────────────────────
  const tilingSprites: TilingSprite[] = [];
  let linesTex: Texture | null = null;
  try {
    linesTex = Texture.from('linesAnimation');
  } catch {
    // texture not yet loaded — skip tiling effect
  }

  if (linesTex) {
    const TILE_H = linesTex.height; // 150 px

    for (let i = 1; i < winPts.length; i++) {
      const a = winPts[i - 1];
      const b = winPts[i];
      const segLen = Math.hypot(b.x - a.x, b.y - a.y);
      const angle = Math.atan2(b.y - a.y, b.x - a.x);

      const ts = new TilingSprite({ texture: linesTex, width: segLen, height: TILE_H });
      ts.tileScale.set(TILE_H / linesTex.height);
      ts.anchor.set(0, 0.5);
      ts.position.set(a.x, a.y);
      ts.rotation = angle;
      ts.alpha = 0.35;
      ts.blendMode = 'add';
      container.addChild(ts);
      tilingSprites.push(ts);
    }
  }

  // ── Winning cell decorations: bright dot + rotating golden leaf ───────────
  const leaves: Sprite[] = [];
  let leafTex: Texture | null = null;
  try {
    leafTex = Texture.from('goldenLeave');
  } catch {
    // skip
  }

  for (const p of winPts) {
    const dot = new Graphics();
    dot.circle(0, 0, 10).fill({ color: 0xffffff, alpha: 0.9 });
    dot.circle(0, 0, 7).fill({ color, alpha: 1 });
    dot.position.set(p.x, p.y);
    container.addChild(dot);

    if (leafTex) {
      const leaf = new Sprite(leafTex);
      leaf.anchor.set(0.5);
      leaf.position.set(p.x, p.y);
      leaf.scale.set(0.36);
      leaf.alpha = 0.9;
      container.addChild(leaf);
      leaves.push(leaf);
    }
  }

  // ── Dimmed dots on non-winning cells ─────────────────────────────────────
  for (const p of dimPts) {
    const dot = new Graphics();
    dot.circle(0, 0, 6).fill({ color, alpha: 0.3 });
    dot.position.set(p.x, p.y);
    container.addChild(dot);
  }

  // ── Line-number badge (left of first cell) ────────────────────────────────
  const badge = new Graphics();
  badge.circle(0, 0, 13).fill({ color, alpha: 0.9 });
  badge.position.set(gridX - 20, allPts[0]?.y ?? 0);
  container.addChild(badge);

  // ── Animation state ───────────────────────────────────────────────────────
  let elapsed = 0;

  return {
    container,

    update(dt: number) {
      elapsed += dt;
      const pulse = 0.5 + 0.5 * Math.sin(elapsed / 250);

      glow.alpha = pulse * 0.45;
      mainLine.alpha = 0.65 + 0.35 * pulse;
      badge.alpha = 0.7 + 0.3 * pulse;

      for (const ts of tilingSprites) {
        ts.tilePosition.x -= 2;
        ts.alpha = 0.25 + 0.2 * pulse;
      }

      for (const leaf of leaves) {
        leaf.rotation += 0.03;
        leaf.alpha = 0.7 + 0.3 * pulse;
      }
    },

    destroy() {
      container.destroy({ children: true });
    },
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function drawPolyline(
  g: Graphics,
  pts: { x: number; y: number }[],
  width: number,
  color: number,
  alpha: number,
): void {
  if (pts.length < 2) return;
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    g.lineTo(pts[i].x, pts[i].y);
  }
  g.stroke({ width, color, alpha, cap: 'round', join: 'round' });
}
