import { Application, useApplication } from '@pixi/react';
import type { Spine } from '@esotericsoftware/spine-pixi-v8';
import { useEffect, useRef, useState } from 'react';

import {
  createGloveSpine,
  ensureGloveSpineLoaded,
  type GloveAnimationName,
  layoutGloveOnScreen,
} from '../animation/gloveSpine';

const GLOVE_PREVIEW_ANIMATIONS: GloveAnimationName[] = ['Action', 'Idle'];

function GloveSpineLayer({ animation }: { animation: GloveAnimationName }) {
  const { app } = useApplication();
  const spineRef = useRef<Spine | null>(null);

  useEffect(() => {
    let cancelled = false;

    const layout = () => {
      const spine = spineRef.current;
      if (!spine) return;
      spine.update(0);
      layoutGloveOnScreen(spine, app.screen.width, app.screen.height, 0.99);
    };

    void (async () => {
      try {
        await ensureGloveSpineLoaded();
        if (cancelled) return;

        const spine = createGloveSpine({ ticker: app.ticker, loop: true, animation });
        if (cancelled) {
          spine.destroy();
          return;
        }

        spineRef.current = spine;
        app.stage.addChild(spine);
        layout();
        app.renderer.on('resize', layout);
      } catch (e) {
        console.warn('Glove Spine failed to load', e);
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

  useEffect(() => {
    const spine = spineRef.current;
    if (!spine) return;
    spine.state.setAnimation(0, animation, true);
    spine.update(0);
    layoutGloveOnScreen(spine, app.screen.width, app.screen.height, 0.99);
  }, [animation, app]);

  return null;
}

function gloveViewportResolution() {
  if (typeof window === 'undefined') return 1;
  return Math.min(window.devicePixelRatio || 1, 2.5);
}

export function GloveScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [animation, setAnimation] = useState<GloveAnimationName>('Action');

  return (
    <div className="frame-preview-scene">
      <div className="frame-preview-viewport" ref={containerRef}>
        <Application
          background={0x0a0a12}
          resizeTo={containerRef}
          antialias
          autoDensity
          resolution={gloveViewportResolution()}
          preferWebGLVersion={2}
        >
          <GloveSpineLayer animation={animation} />
        </Application>
        <div className="glove-ui">
          <div
            className="glove-animation-selector"
            role="tablist"
            aria-label="Glove animation selector"
          >
            {GLOVE_PREVIEW_ANIMATIONS.map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={animation === item}
                className={`glove-animation-btn${animation === item ? ' glove-animation-btn--active' : ''}`}
                onClick={() => setAnimation(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
