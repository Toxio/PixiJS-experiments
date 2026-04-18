import { Application, useApplication } from '@pixi/react';
import type { Spine } from '@esotericsoftware/spine-pixi-v8';
import { useEffect, useRef } from 'react';

import {
  createWinFrameSpine,
  ensureWinFrameSpineLoaded,
  layoutWinFrameOnScreen,
} from '../animation/winFrameSpine';

function FrameSpineLayer() {
  const { app } = useApplication();
  const spineRef = useRef<Spine | null>(null);

  useEffect(() => {
    let cancelled = false;

    const layout = () => {
      const spine = spineRef.current;
      if (!spine) return;
      spine.update(0);
      layoutWinFrameOnScreen(spine, app.screen.width, app.screen.height, 0.99);
    };

    void (async () => {
      try {
        await ensureWinFrameSpineLoaded();
        if (cancelled) return;

        const spine = createWinFrameSpine({ ticker: app.ticker });
        if (cancelled) {
          spine.destroy();
          return;
        }

        spineRef.current = spine;
        app.stage.addChild(spine);
        layout();
        app.renderer.on('resize', layout);
      } catch (e) {
        console.warn('Frame Spine failed to load', e);
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

function frameViewportResolution() {
  if (typeof window === 'undefined') return 1;
  return Math.min(window.devicePixelRatio || 1, 2.5);
}

export function WinFrameScene() {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="frame-preview-scene">
      <div className="frame-preview-viewport" ref={containerRef}>
        <Application
          background={0x0a0a12}
          resizeTo={containerRef}
          antialias
          autoDensity
          resolution={frameViewportResolution()}
          preferWebGLVersion={2}
        >
          <FrameSpineLayer />
        </Application>
      </div>
    </div>
  );
}
