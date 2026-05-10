/**
 * PixiJS slot machine — 5 reels × 3 rows
 * Based on the official PixiJS "misc: Slots" example.
 *
 * reel.png (1641×1022) is the frame background.
 * REEL_GRID defines where the pink cell grid sits inside the image
 * (measured from the actual pixel boundaries of the divider lines).
 */

import {Application, useApplication} from '@pixi/react';
import {Assets, BlurFilter, Container, Graphics, Sprite, Texture} from 'pixi.js';
import {useEffect, useRef, useState} from 'react';

import reelImg from '../assets/reel.png';
import glassImg from '../assets/symbols/images/glass.png';
import gobletImg from '../assets/symbols/images/goblet.png';
import lipsImg from '../assets/symbols/images/lips.png';
import lipstickImg from '../assets/symbols/images/lipstick.png';
import parfumeImg from '../assets/symbols/images/parfume.png';
import roseImg from '../assets/symbols/images/rose.png';
import sevenImg from '../assets/symbols/images/seven.png';
import starImg from '../assets/symbols/images/star.png';

// ── Grid UV inset — pixel-precise from the pink divider lines in reel.png (1641×1022).
// Vertical dividers at x ≈ 328/648/965/1282  → col width ≈ 311 px → grid x: 17..1596
// Horizontal dividers at y ≈ 363/690          → row height ≈ 324 px → grid y: 39..1017
const REEL_GRID = {x: 0.010, y: 0.038, w: 0.962, h: 0.957} as const;

// ── Slot config ───────────────────────────────────────────────────────────────
const REEL_COUNT = 5;
const VISIBLE_ROWS = 3;
const REEL_SIZE = 10; // virtual loop length (must be > VISIBLE_ROWS + 1)
const SPIN_SPEED = 25;

// ── Speed preset (mirrors the official PixiJS example timing) ─────────────────
const SPEED = {
    minSpin: 300,
    stopBase: 280,
    stopStep: 140,
};

// ── Assets ────────────────────────────────────────────────────────────────────
const ALL_ASSETS = [
    {alias: 'reel', src: reelImg},
    {alias: 'glass', src: glassImg},
    {alias: 'goblet', src: gobletImg},
    {alias: 'lips', src: lipsImg},
    {alias: 'lipstick', src: lipstickImg},
    {alias: 'parfume', src: parfumeImg},
    {alias: 'rose', src: roseImg},
    {alias: 'seven', src: sevenImg},
    {alias: 'star', src: starImg},
];

const SYMBOL_ALIASES = ALL_ASSETS.slice(1).map((a) => a.alias);

// ── Helpers (verbatim from official example) ──────────────────────────────────
function lerp(a: number, b: number, t: number) {
    return a * (1 - t) + b * t;
}

function backout(amount: number) {
    return (t: number) => --t * t * ((amount + 1) * t + amount) + 1;
}

function randomAlias() {
    return SYMBOL_ALIASES[Math.floor(Math.random() * SYMBOL_ALIASES.length)];
}

// ── Types ─────────────────────────────────────────────────────────────────────
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
    return {container, sprite};
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

// ── Inner PixiJS component ────────────────────────────────────────────────────
interface SlotReelsPngProps {
    spinning: boolean;
    onSpinComplete: () => void;
}

function SlotReelsPng({spinning, onSpinComplete}: SlotReelsPngProps) {
    const {app} = useApplication();

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
        const {width, height} = app.screen;

        // Compute grid area from UV inset constants
        const gridX = Math.round(width * REEL_GRID.x);
        const gridY = Math.round(height * REEL_GRID.y);
        const gridW = Math.round(width * REEL_GRID.w);
        const gridH = Math.round(height * REEL_GRID.h);
        const cellW = gridW / REEL_COUNT;
        const cellH = gridH / VISIBLE_ROWS;

        // Container for reel columns — positioned at the grid inset
        const reelCont = new Container();
        reelCont.x = gridX;
        reelCont.y = gridY;
        app.stage.addChild(reelCont);

        let cancelled = false;

        async function init() {
            await Assets.load(ALL_ASSETS);
            if (cancelled) return;

            loadedRef.current = true;

            const bgSprite = new Sprite(Texture.from('reel'));
            bgSprite.width = width;
            bgSprite.height = height;
            // Insert at index 0 so it stays below the reel container
            app.stage.addChildAt(bgSprite, 0);

            // Build reel columns
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

                reels.push({rc, symbols, position: 0, prevPos: 0, blur, stopping: false});
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

            // Fire stop tweens after minSpin ms have elapsed
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

                    // Swap symbol when it wraps off the top
                    if (sym.container.y < 0 && prevY > cellH && !reel.stopping) {
                        updateSymbol(sym, randomAlias(), cellW, cellH);
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
            reelCont.destroy({children: true});
            if (reelCont.parent) reelCont.parent.removeChild(reelCont);
        };

    }, [app]);

    return null;
}

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
                <Application resizeTo={containerRef} antialias>
                    <SlotReelsPng spinning={spinning} onSpinComplete={handleSpinComplete}/>
                </Application>
            </div>

            <button className="smp-spin-btn" type="button" onClick={handleSpin} disabled={spinning}>
                {spinning ? 'Spinning…' : 'SPIN'}
            </button>
        </div>
    );
}
