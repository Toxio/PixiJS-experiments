import { SetupPoseBoundsProvider, Spine } from '@esotericsoftware/spine-pixi-v8';
import { Application, useApplication } from '@pixi/react';
import { useEffect, useRef } from 'react';
import { Assets } from 'pixi.js';

import winFrameAtlasUrl from '../assets/winFrame/win-frame.atlas?url';
import winFrameJsonUrl from '../assets/winFrame/win-frame.json?url';

const FRAME_SPINE_SKEL_ALIAS = 'frameSpineJson';
const FRAME_SPINE_ATLAS_ALIAS = 'frameSpineAtlas';

const VIEWPORT_PAD = 0.99;

let frameSpineAssetsRegistered = false;

function registerFrameSpineAssets() {
  if (frameSpineAssetsRegistered) return;
  Assets.add({ alias: FRAME_SPINE_SKEL_ALIAS, src: winFrameJsonUrl });
  Assets.add({ alias: FRAME_SPINE_ATLAS_ALIAS, src: winFrameAtlasUrl });
  frameSpineAssetsRegistered = true;
}

function FrameSpineLayer() {
  const { app } = useApplication();
  const spineRef = useRef<Spine | null>(null);

  useEffect(() => {
    let cancelled = false;

    const layout = () => {
      const spine = spineRef.current;
      if (!spine) return;
      spine.update(0);
      const lb = spine.getLocalBounds();
      const bw = lb.width > 0 ? lb.width : 1;
      const bh = lb.height > 0 ? lb.height : 1;
      const w = app.screen.width;
      const h = app.screen.height;
      const s = Math.min((w * VIEWPORT_PAD) / bw, (h * VIEWPORT_PAD) / bh);
      spine.scale.set(s);
      spine.position.set(w / 2 - (lb.x + lb.width / 2) * s, h / 2 - (lb.y + lb.height / 2) * s);
    };

    void (async () => {
      try {
        registerFrameSpineAssets();
        await Assets.load([FRAME_SPINE_SKEL_ALIAS, FRAME_SPINE_ATLAS_ALIAS]);
        if (cancelled) return;

        const spine = Spine.from({
          skeleton: FRAME_SPINE_SKEL_ALIAS,
          atlas: FRAME_SPINE_ATLAS_ALIAS,
          boundsProvider: new SetupPoseBoundsProvider(),
        });

        spine.state.setAnimation(0, 'Action', true);

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
      spineRef.current?.destroy();
      spineRef.current = null;
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
