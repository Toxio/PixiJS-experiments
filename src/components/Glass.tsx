import type {Spine} from '@esotericsoftware/spine-pixi-v8';
import {Application, useApplication} from '@pixi/react';
import type {Application as PixiApplication} from 'pixi.js';
import {useEffect, useRef} from 'react';

import {createGlassSpine, ensureGlassSpineLoaded, layoutGlassInReelGridCell,} from '../animation/glassSpine';

function glassResolution() {
    if (typeof window === 'undefined') return 1;
    return Math.min(window.devicePixelRatio || 1, 2.5);
}

function GlassSpineLayer() {
    const {app} = useApplication();
    const spineRef = useRef<Spine | null>(null);

    useEffect(() => {
        let cancelled = false;

        const layout = () => {
            const spine = spineRef.current;
            if (!spine) return;
            spine.update(0);
            layoutGlassInReelGridCell(spine, app.screen.width, app.screen.height, 2, 1);
        };

        void (async () => {
            try {
                await ensureGlassSpineLoaded();
                if (cancelled) return;


                const spine = createGlassSpine({ticker: app.ticker, loop: true, animation: 'win'});
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
                console.warn('Glass Spine failed to load', e);
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

/** Transparent Pixi overlay for the glass Spine on the reel (host fills `.main-reel-wrap`). */
export function Glass() {
    const glassHostRef = useRef<HTMLDivElement>(null);
    const pixiAppRef = useRef<PixiApplication | null>(null);

    useEffect(() => {
        const el = glassHostRef.current;
        if (!el || typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(() => {
            queueMicrotask(() => pixiAppRef.current?.resize());
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    return (
        <div className="main-reel-glass-host" ref={glassHostRef}>
            <Application
                backgroundAlpha={0}
                resizeTo={glassHostRef}
                antialias
                autoDensity
                resolution={glassResolution()}
                preferWebGLVersion={2}
                onInit={(application) => {
                    pixiAppRef.current = application;
                    queueMicrotask(() => application.resize());
                }}
            >
                <GlassSpineLayer/>
            </Application>
        </div>
    );
}
