import { useApplication } from '@pixi/react';
import { useEffect } from 'react';
import type React from 'react';
import { Graphics } from 'pixi.js';

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: number;
}

const BALL_COUNT = 22;
const COLORS = [
  0xff6b6b, 0xff9f43, 0xffd32a, 0x00d2d3, 0x54a0ff, 0x5f27cd, 0xff9ff3, 0x1dd1a1, 0xee5a24,
  0x0652dd, 0x9980fa, 0xf368e0,
];

function createBalls(width: number, height: number): Ball[] {
  return Array.from({ length: BALL_COUNT }, () => {
    const radius = 12 + Math.random() * 28;
    return {
      x: radius + Math.random() * (width - radius * 2),
      y: radius + Math.random() * (height - radius * 2),
      vx: (Math.random() - 0.5) * 4.5,
      vy: (Math.random() - 0.5) * 4.5,
      radius,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    };
  });
}

interface Props {
  speedRef: React.RefObject<number>;
}

export function BouncingBalls({ speedRef }: Props) {
  const { app } = useApplication();

  useEffect(() => {
    const balls = createBalls(app.screen.width, app.screen.height);
    const g = new Graphics();
    app.stage.addChild(g);

    function tick() {
      const speed = speedRef.current ?? 1;
      const { width, height } = app.screen;

      balls.forEach((ball) => {
        ball.x += ball.vx * speed;
        ball.y += ball.vy * speed;

        if (ball.x - ball.radius < 0) {
          ball.x = ball.radius;
          ball.vx = Math.abs(ball.vx);
        } else if (ball.x + ball.radius > width) {
          ball.x = width - ball.radius;
          ball.vx = -Math.abs(ball.vx);
        }

        if (ball.y - ball.radius < 0) {
          ball.y = ball.radius;
          ball.vy = Math.abs(ball.vy);
        } else if (ball.y + ball.radius > height) {
          ball.y = height - ball.radius;
          ball.vy = -Math.abs(ball.vy);
        }
      });

      g.clear();

      balls.forEach((ball) => {
        // Outer glow
        g.setStrokeStyle({ color: ball.color, alpha: 0.2, width: 10 });
        g.circle(ball.x, ball.y, ball.radius + 6);
        g.stroke();

        // Inner rim
        g.setStrokeStyle({ color: ball.color, alpha: 0.5, width: 2 });
        g.circle(ball.x, ball.y, ball.radius);
        g.stroke();

        // Fill
        g.setFillStyle({ color: ball.color, alpha: 0.88 });
        g.circle(ball.x, ball.y, ball.radius);
        g.fill();

        // Specular highlight
        g.setFillStyle({ color: 0xffffff, alpha: 0.28 });
        g.ellipse(
          ball.x - ball.radius * 0.28,
          ball.y - ball.radius * 0.32,
          ball.radius * 0.38,
          ball.radius * 0.22,
        );
        g.fill();
      });
    }

    app.ticker.add(tick);

    return () => {
      app.ticker.remove(tick);
      app.stage.removeChild(g);
      g.destroy();
    };
  }, [app, speedRef]);

  return null;
}
