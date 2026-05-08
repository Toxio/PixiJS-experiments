/**
 * PixiJS slot machine — 5 reels × 3 rows
 * Based on the official PixiJS "misc: Slots" example.
 * Symbols: 8 PNG images from src/assets/symbols/images/
 */

import { Application, useApplication } from '@pixi/react';
import { Assets, BlurFilter, Container, Graphics, Sprite, Texture } from 'pixi.js';
import { useEffect, useRef, useState } from 'react';

import glassImg from '../assets/symbols/images/glass.png';
import gobletImg from '../assets/symbols/images/goblet.png';
import lipsImg from '../assets/symbols/images/lips.png';
import lipstickImg from '../assets/symbols/images/lipstick.png';
import parfumeImg from '../assets/symbols/images/parfume.png';
import roseImg from '../assets/symbols/images/rose.png';
import sevenImg from '../assets/symbols/images/seven.png';
import starImg from '../assets/symbols/images/star.png';

// ── Layout ─────────────────────────────────────────────────────────────────
const REEL_COUNT = 5;
const VISIBLE_ROWS = 3;
const REEL_SIZE = 8; // virtual loop length (must be > VISIBLE_ROWS + 1)
const SYMBOL_W = 120;
const SYMBOL_H = 120;
const REEL_GAP = 12;
const SPIN_SPEED = 25;

// ── Speed preset ────────────────────────────────────────────────────────────
const SPEED = {
    minSpin: 300,
    stopBase: 280,
    stopStep: 140,
    stopDelayStep: 0,
};

// ── Symbol assets ───────────────────────────────────────────────────────────
const SYMBOL_SRCS = [
    { alias: 'glass', src: glassImg },
    { alias: 'goblet', src: gobletImg },
    { alias: 'lips', src: lipsImg },
    { alias: 'lipstick', src: lipstickImg },
    { alias: 'parfume', src: parfumeImg },
    { alias: 'rose', src: roseImg },
    { alias: 'seven', src: sevenImg },
    { alias: 'star', src: starImg },
];

const ALIASES = SYMBOL_SRCS.map((s) => s.alias);

// ── Colors ───────────────────────────────────────────────────────────────────
const BG_COLOR = 0x0d0a1e;
const REEL_BG_COLOR = 0x16213e;

// ── Helpers (verbatim from official example) ─────────────────────────────────
function lerp(a: number, b: number, t: number) {
    return a * (1 - t) + b * t;
}

function backout(amount: number) {
    return (t: number) => --t * t * ((amount + 1) * t + amount) + 1;
}

function randomAlias() {
    return ALIASES[Math.floor(Math.random() * ALIASES.length)];
}

// ── Types ────────────────────────────────────────────────────────────────────
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

// ── Sprite helpers ───────────────────────────────────────────────────────────
function fitSprite(sprite: Sprite): void {
    sprite.anchor.set(0.5);
    sprite.x = SYMBOL_W / 2;
    sprite.y = SYMBOL_H / 2;
    const tw = sprite.texture.width || 1;
    const th = sprite.texture.height || 1;
    sprite.scale.set(Math.min((SYMBOL_W * 0.82) / tw, (SYMBOL_H * 0.82) / th));
}

function createSymbolSprite(alias: string): SlotSymbol {
    const container = new Container();
    const sprite = new Sprite(Texture.from(alias));
    fitSprite(sprite);
    container.addChild(sprite);
    return { container, sprite };
}

function updateSymbol(sym: SlotSymbol, alias: string): void {
    sym.sprite.texture = Texture.from(alias);
    fitSprite(sym.sprite);
}

// ── Inner PixiJS component ────────────────────────────────────────────────────
interface SlotReelsPngProps {
    spinning: boolean;
    onSpinComplete: () => void;
}

function SlotReelsPng({ spinning, onSpinComplete }: SlotReelsPngProps) {
    const { app } = useApplication();

    const spinRef = useRef(spinning);
    const completeRef = useRef(onSpinComplete);
    const reelsRef = useRef<Reel[]>([]);
    const tweensRef = useRef<Tween[]>([]);
    const spinStartRef = useRef(0);
    const stopFiredRef = useRef(false);
    const loadedRef = useRef(false);

    useEffect(() => {
        spinRef.current = spinning;
    }, [spinning]);

    useEffect(() => {
        completeRef.current = onSpinComplete;
    }, [onSpinComplete]);

    // Reset spin state whenever a new spin starts
    useEffect(() => {
        if (!spinning) return;
        spinStartRef.current = Date.now();
        stopFiredRef.current = false;
        tweensRef.current = [];
        reelsRef.current.forEach((r) => {
            r.stopping = false;
        });
    }, [spinning]);

    // ── One-time scene setup ──────────────────────────────────────────────────
    useEffect(() => {
        const { width, height } = app.screen;

        const totalW = REEL_COUNT * SYMBOL_W + (REEL_COUNT - 1) * REEL_GAP;
        const visH = VISIBLE_ROWS * SYMBOL_H;
        const marginX = Math.round((width - totalW) / 2);
        const marginY = Math.round((height - visH) / 2);

        // Stage background
        const bgG = new Graphics();
        bgG.rect(0, 0, width, height).fill(BG_COLOR);
        app.stage.addChild(bgG);

        // Column backgrounds with gold border
        const colG = new Graphics();
        for (let i = 0; i < REEL_COUNT; i++) {
            const cx = marginX + i * (SYMBOL_W + REEL_GAP);

            // Outer glow layers
            colG.roundRect(cx - 6, marginY - 6, SYMBOL_W + 12, visH + 12, 10).stroke({
                color: 0xff8c00,
                width: 12,
                alpha: 0.1,
            });
            colG.roundRect(cx - 3, marginY - 3, SYMBOL_W + 6, visH + 6, 9).stroke({
                color: 0xffa040,
                width: 6,
                alpha: 0.22,
            });
            colG.roundRect(cx - 1, marginY - 1, SYMBOL_W + 2, visH + 2, 8).stroke({
                color: 0xffd700,
                width: 2,
                alpha: 0.45,
            });

            // Column fill + border
            colG.roundRect(cx, marginY, SYMBOL_W, visH, 6).fill(REEL_BG_COLOR);
            colG.roundRect(cx, marginY, SYMBOL_W, visH, 6).stroke({
                color: 0xffa500,
                width: 2,
                alpha: 0.9,
            });
        }
        app.stage.addChild(colG);

        // Container for all reels
        const reelCont = new Container();
        reelCont.x = marginX;
        reelCont.y = marginY;
        app.stage.addChild(reelCont);

        // Top / bottom covers to clip symbols outside the 3-row window
        const topCover = new Graphics();
        topCover.rect(0, 0, width, marginY).fill(BG_COLOR);
        app.stage.addChild(topCover);

        const botCover = new Graphics();
        botCover.rect(0, marginY + visH, width, height).fill(BG_COLOR);
        app.stage.addChild(botCover);

        // ── Async: load textures then build reels ─────────────────────────────
        let cancelled = false;

        async function init() {
            await Assets.load(SYMBOL_SRCS);
            if (cancelled) return;

            loadedRef.current = true;

            const reels: Reel[] = [];

            for (let i = 0; i < REEL_COUNT; i++) {
                const rc = new Container();
                rc.x = i * (SYMBOL_W + REEL_GAP);
                reelCont.addChild(rc);

                const blur = new BlurFilter();
                blur.blurX = 0;
                blur.blurY = 0;
                rc.filters = [blur];

                // Mask clips symbols to exactly the 3-row visible window
                const mask = new Graphics();
                mask.rect(0, 0, SYMBOL_W, visH).fill(0xffffff);
                rc.addChild(mask);
                rc.mask = mask;

                const symbols: SlotSymbol[] = [];
                for (let j = 0; j < REEL_SIZE; j++) {
                    const sym = createSymbolSprite(randomAlias());
                    sym.container.y = j * SYMBOL_H;
                    rc.addChild(sym.container);
                    symbols.push(sym);
                }

                reels.push({ rc, symbols, position: 0, prevPos: 0, blur, stopping: false });
            }

            reelsRef.current = reels;
        }

        void init();

        // ── Ticker: runs every frame ──────────────────────────────────────────
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

                    // Extra cycles so later reels travel further → natural cascade
                    const extraCycles = 2 + i;
                    const targetPos = (Math.ceil(reel.position / REEL_SIZE) + extraCycles) * REEL_SIZE;

                    tweensRef.current.push({
                        reel,
                        from: reel.position,
                        to: targetPos,
                        startMs: now + i * SPEED.stopDelayStep,
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
                    sym.container.y = ((reel.position + j) % REEL_SIZE) * SYMBOL_H - SYMBOL_H;

                    // Swap symbol when it wraps off the top
                    if (sym.container.y < 0 && prevY > SYMBOL_H && !reel.stopping) {
                        updateSymbol(sym, randomAlias());
                    }
                }
            }
        };

        app.ticker.add(onTick);

        return () => {
            cancelled = true;
            loadedRef.current = false;
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

// ── Exported component ────────────────────────────────────────────────────────
export function SlotMachinePixi() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [spinning, setSpinning] = useState(false);

    const handleSpin = () => {
        if (spinning) return;
        setSpinning(true);
    };

    const handleSpinComplete = () => {
        setSpinning(false);
    };

    return (
        <div className="smp-wrapper">
            <div ref={containerRef} className="smp-canvas">
                <Application resizeTo={containerRef} background={BG_COLOR} antialias>
                    <SlotReelsPng spinning={spinning} onSpinComplete={handleSpinComplete} />
                </Application>
            </div>

            <button className="smp-spin-btn" type="button" onClick={handleSpin} disabled={spinning}>
                {spinning ? 'Spinning…' : 'SPIN'}
            </button>
        </div>
    );
}
