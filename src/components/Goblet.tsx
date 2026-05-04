import type { Spine } from '@esotericsoftware/spine-pixi-v8';
import { Application, useApplication } from '@pixi/react';
import type { Application as PixiApplication } from 'pixi.js';
import { useEffect, useRef } from 'react';

import {
  createGobletSpine,
  ensureGobletSpineLoaded,
  layoutGobletInReelGridCell,
} from '../animation/gobletSpine';

function gobletResolution() {
  if (typeof window === 'undefined') return 1;
  return Math.min(window.devicePixelRatio || 1, 2.5);
}

function GobletSpineLayer() {
  const { app } = useApplication();
  const spineRef = useRef<Spine | null>(null);

  useEffect(() => {
    let cancelled = false;

    const layout = () => {
      const spine = spineRef.current;
      if (!spine) return;
      spine.update(0);
      layoutGobletInReelGridCell(spine, app.screen.width, app.screen.height, 1, 1);
    };

    void (async () => {
      try {
        await ensureGobletSpineLoaded();
        if (cancelled) return;

        const spine = createGobletSpine({ ticker: app.ticker, loop: true, animation: 'win' });
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
        console.warn('Goblet Spine failed to load', e);
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

/** Transparent Pixi overlay for the goblet Spine (column 1, row 1 of the 5×3 grid). */
export function Goblet() {
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
    <div className="main-reel-goblet-host" ref={hostRef}>
      <Application
        backgroundAlpha={0}
        resizeTo={hostRef}
        antialias
        autoDensity
        resolution={gobletResolution()}
        preferWebGLVersion={2}
        onInit={(application) => {
          pixiAppRef.current = application;
          queueMicrotask(() => application.resize());
        }}
      >
        <GobletSpineLayer />
      </Application>
    </div>
  );
}
