import type { Spine } from '@esotericsoftware/spine-pixi-v8';
import { Application, useApplication } from '@pixi/react';
import type { Application as PixiApplication } from 'pixi.js';
import { useEffect, useRef } from 'react';

import {
  createLipsSpine,
  ensureLipsSpineLoaded,
  layoutLipsInReelGridCell,
} from '../animation/lipsSpine';

function lipsResolution() {
  if (typeof window === 'undefined') return 1;
  return Math.min(window.devicePixelRatio || 1, 2.5);
}

function LipsSpineLayer() {
  const { app } = useApplication();
  const spineRef = useRef<Spine | null>(null);

  useEffect(() => {
    let cancelled = false;

    const layout = () => {
      const spine = spineRef.current;
      if (!spine) return;
      spine.update(0);
      layoutLipsInReelGridCell(spine, app.screen.width, app.screen.height, 3, 1);
    };

    void (async () => {
      try {
        await ensureLipsSpineLoaded();
        if (cancelled) return;

        const spine = createLipsSpine({ ticker: app.ticker, loop: true, animation: 'win' });
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
        console.warn('Lips Spine failed to load', e);
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

/** Transparent Pixi overlay for the lips Spine (column 3, row 1 of the 5×3 grid). */
export function Lips() {
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
    <div className="main-reel-lips-host" ref={hostRef}>
      <Application
        backgroundAlpha={0}
        resizeTo={hostRef}
        antialias
        autoDensity
        resolution={lipsResolution()}
        preferWebGLVersion={2}
        onInit={(application) => {
          pixiAppRef.current = application;
          queueMicrotask(() => application.resize());
        }}
      >
        <LipsSpineLayer />
      </Application>
    </div>
  );
}
