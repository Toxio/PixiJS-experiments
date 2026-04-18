import { Application, useApplication } from '@pixi/react';
import type { Spine } from '@esotericsoftware/spine-pixi-v8';
import { useEffect, useRef } from 'react';

import {
  createBlastSpine,
  ensureBlastSpineLoaded,
  layoutBlastOnScreen,
} from '../animation/blastSpine';

function BlastSpineLayer() {
  const { app } = useApplication();
  const spineRef = useRef<Spine | null>(null);

  useEffect(() => {
    let cancelled = false;

    const layout = () => {
      const spine = spineRef.current;
      if (!spine) return;
      spine.update(0);
      layoutBlastOnScreen(spine, app.screen.width, app.screen.height, 1, 'cover');
    };

    void (async () => {
      try {
        await ensureBlastSpineLoaded();
        if (cancelled) return;

        const spine = createBlastSpine({ ticker: app.ticker, loop: true, animation: 'Action' });
        if (cancelled) {
          spine.destroy();
          return;
        }

        spineRef.current = spine;
        app.stage.addChild(spine);
        layout();
        app.renderer.on('resize', layout);
      } catch (e) {
        console.warn('Blast Spine failed to load', e);
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

function blastViewportResolution() {
  if (typeof window === 'undefined') return 1;
  return Math.min(window.devicePixelRatio || 1, 2.5);
}

export function BlastScene() {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="frame-preview-scene">
      <div className="frame-preview-viewport" ref={containerRef}>
        <Application
          background={0x0a0a12}
          resizeTo={containerRef}
          antialias
          autoDensity
          resolution={blastViewportResolution()}
          preferWebGLVersion={2}
        >
          <BlastSpineLayer />
        </Application>
      </div>
    </div>
  );
}
