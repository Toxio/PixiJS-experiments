import type { Spine } from '@esotericsoftware/spine-pixi-v8';
import type { AnimationStateListener, TrackEntry } from '@esotericsoftware/spine-core';

/** Crossfade length when chaining the same clip (avoids modulo snap from loop:true). */
const DEFAULT_WIN_MIX_SEC = 0.2;

/** Pause (seconds) after each win clip finishes before the next repeat (holds last frame). */
const DEFAULT_WIN_LOOP_GAP_SEC = 0.22;

/**
 * Smooth repeating win playback: chain non-looping segments with A→A mix instead of loop:true.
 */
export function applySmoothWinLoop(
  spine: Spine,
  animationName: string,
  mixSec = DEFAULT_WIN_MIX_SEC,
  loopGapSec = DEFAULT_WIN_LOOP_GAP_SEC,
): void {
  const state = spine.state;
  state.data.setMix(animationName, animationName, mixSec);

  state.setAnimation(0, animationName, false);
  state.addAnimation(0, animationName, false, 0);

  const listener: AnimationStateListener = {
    complete(entry: TrackEntry) {
      if (entry.trackIndex !== 0) return;
      const anim = entry.animation;
      if (!anim || anim.name !== animationName) return;
      state.addAnimation(0, animationName, false, loopGapSec);
    },
  };
  state.addListener(listener);

  spine.update(0);
}
