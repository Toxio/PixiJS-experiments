import { Application, useApplication } from '@pixi/react';
import type { Spine } from '@esotericsoftware/spine-pixi-v8';
import { useEffect, useRef } from 'react';

import {
  createExplosionSpine,
  layoutExplosionOnScreen,
  reloadExplosionSpineAssetsForPreview,
} from '../animation/explosionSpine';

function ExplosionSpineLayer() {
  const { app } = useApplication();
  const spineRef = useRef<Spine | null>(null);

  useEffect(() => {
    let cancelled = false;

    const layout = () => {
      const spine = spineRef.current;
      if (!spine) return;
      const w = app.screen.width;
      const h = app.screen.height;
      if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return;
      spine.update(0);
      layoutExplosionOnScreen(spine, w, h, 0.99, 'contain');
    };

    void (async () => {
      try {
        await reloadExplosionSpineAssetsForPreview();
        if (cancelled) return;

        const spine = createExplosionSpine({ ticker: app.ticker, loop: true });
        if (cancelled) {
          spine.destroy();
          return;
        }

        spineRef.current = spine;
        app.stage.addChild(spine);
        layout();
        app.renderer.on('resize', layout);
        requestAnimationFrame(() => {
          if (!cancelled) layout();
        });
      } catch (e) {
        console.warn('Explosion Spine failed to load', e);
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

export function ExplosionScene() {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="frame-preview-scene">
      <div ref={containerRef} className="canvas-wrapper">
        <Application background={0x0a0a12} resizeTo={containerRef} antialias>
          <ExplosionSpineLayer />
        </Application>
      </div>
    </div>
  );
}
