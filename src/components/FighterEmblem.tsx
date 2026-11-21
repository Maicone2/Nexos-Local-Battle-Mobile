import { useEffect, useRef } from 'react';
import { drawFighter } from '../game/AnimationSystem';
import { createFighterState } from '../game/CombatSystem';
import { FighterId } from '../game/types';

interface FighterPortraitProps {
  fighterId: FighterId;
  size?: number;
}

export function FighterPortrait({ fighterId, size = 160 }: FighterPortraitProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const dummy = createFighterState(1, fighterId, fighterId.toUpperCase());
    dummy.x = size * 0.5;
    dummy.y = size * 0.9;
    dummy.facing = 1;
    dummy.action = 'idle';

    const start = performance.now();
    const render = (now: number) => {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, size, size);
      ctx.save();
      const s = size / 225;
      ctx.translate(size * 0.5, size * 0.92);
      ctx.scale(s, s);
      dummy.x = 0;
      dummy.y = 590;
      ctx.translate(0, -590);
      drawFighter(ctx, dummy, t, true);
      ctx.restore();
      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [fighterId, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="block pointer-events-none"
      aria-hidden="true"
    />
  );
}
