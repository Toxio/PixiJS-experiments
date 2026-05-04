import { Application } from '@pixi/react';
import { useRef, useState } from 'react';
import { BouncingBalls } from './BouncingBalls';

const MIN_SPEED = 0;
const MAX_SPEED = 4;
const DEFAULT_SPEED = 1;

export function DemoScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const speedRef = useRef<number>(DEFAULT_SPEED);
  const [speed, setSpeed] = useState(DEFAULT_SPEED);

  function handleSpeedChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = parseFloat(e.target.value);
    speedRef.current = value;
    setSpeed(value);
  }

  return (
    <div ref={containerRef} className="canvas-wrapper">
      <Application background={0x0a0a1e} resizeTo={containerRef} antialias>
        <BouncingBalls speedRef={speedRef} />
      </Application>

      <div className="overlay">
        <h1>Fanny balls</h1>

        <div className="speed-control">
          <label htmlFor="speed-slider">
            Speed
            <span className="speed-value">{speed.toFixed(1)}×</span>
          </label>
          <input
            id="speed-slider"
            type="range"
            min={MIN_SPEED}
            max={MAX_SPEED}
            step={0.1}
            value={speed}
            onChange={handleSpeedChange}
          />
        </div>
      </div>
    </div>
  );
}
