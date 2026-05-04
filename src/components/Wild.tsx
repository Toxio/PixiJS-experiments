import type {Spine} from '@esotericsoftware/spine-pixi-v8';
import {Application, useApplication} from '@pixi/react';
import type {Application as PixiApplication} from 'pixi.js';
import {useEffect, useRef} from 'react';

import {createWildSpine, ensureWildSpineLoaded, layoutWildInReelGridCell,} from '../animation/wildSpine';

function wildResolution() {
    if (typeof window === 'undefined') return 1;
    return Math.min(window.devicePixelRatio || 1, 2.5);
}

function WildSpineLayer() {
    const {app} = useApplication();
    const spineRef = useRef<Spine | null>(null);

    useEffect(() => {
        let cancelled = false;

        const layout = () => {
            const spine = spineRef.current;
            if (!spine) return;
            spine.update(0);
            layoutWildInReelGridCell(spine, app.screen.width, app.screen.height, 2, 2);
        };

        void (async () => {
            try {
                await ensureWildSpineLoaded();
                if (cancelled) return;

                const spine = createWildSpine({ticker: app.ticker, loop: true, animation: 'wild2'});
                if (cancelled) {
                    spine.destroy();
                    return;
                }

                spineRef.current = spine;
                app.stage.addChild(spine);
                app.resize();
                layout();
                app.renderer.on('resize', layout);
            } catch (e) {
                console.warn('Wild Spine failed to load', e);
            }
        })();

        return () => {
            cancelled = true;
            app.renderer.off('resize', layout);
            const s = spineRef.current;
            spineRef.current = null;
            if (s) {
                if (s.parent) {
                    s.parent.removeChild(s);
                }
                s.destroy();
            }
        };
    }, [app]);

    return null;
}

/**
 * Wild has no `win` animation — uses looped `wild1` (see `WildAnimationName` in `wildSpine.ts`).
 * Grid cell (2, 2): bottom row, center.
 */
export function Wild() {
    const hostRef = useRef<HTMLDivElement>(null);
    const pixiAppRef = useRef<PixiApplication | null>(null);

    useEffect(() => {
        const el = hostRef.current;
        if (!el || typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(() => {
            queueMicrotask(() => pixiAppRef.current?.resize());
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    return (
        <div className="main-reel-wild-host" ref={hostRef}>
            <Application
                backgroundAlpha={0}
                resizeTo={hostRef}
                antialias
                autoDensity
                resolution={wildResolution()}
                preferWebGLVersion={2}
                onInit={(application) => {
                    pixiAppRef.current = application;
                    queueMicrotask(() => application.resize());
                }}
            >
                <WildSpineLayer/>
            </Application>
        </div>
    );
}
