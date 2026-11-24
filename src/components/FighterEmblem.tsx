import { useEffect, useRef } from 'react';
import { drawFighter } from '../game/AnimationSystem';
import { createFighterState } from '../game/CombatSystem';
import { getMoveSpec } from '../game/constants';
import { ActionState, FighterAppearance, FighterId } from '../game/types';

interface FighterPortraitProps {
  fighterId: FighterId;
  size?: number;
  appearance?: FighterAppearance;
  previewAction?: 'idle' | 'heavy' | 'victory';
  flipX?: boolean;
}

export function FighterPortrait({
  fighterId,
  size = 160,
  appearance,
  previewAction = 'idle',
  flipX = false,
}: FighterPortraitProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const dummy = createFighterState(1, fighterId, fighterId.toUpperCase());
    dummy.x = 0;
    dummy.y = 590;
    dummy.facing = 1;
    dummy.action = previewAction as ActionState;
    if (previewAction === 'heavy') {
      dummy.currentMove = 'stand_heavy';
    }

    const spec = getMoveSpec(fighterId, 'stand_heavy');
    const totalHeavyFrames = spec.startup + spec.active + spec.recovery;
    const start = performance.now();

    const render = (now: number) => {
      const t = (now - start) / 1000;
      if (previewAction === 'heavy') {
        dummy.actionFrame = Math.floor((t * 32) % totalHeavyFrames);
      } else {
        dummy.actionFrame = Math.floor(t * 60);
      }

      ctx.clearRect(0, 0, size, size);
      ctx.save();
      const s = size / 235;
      ctx.translate(size * 0.5, size * 0.9);
      ctx.scale(flipX ? -s : s, s);
      ctx.translate(0, -590);
      drawFighter(ctx, dummy, t, true, appearance);
      ctx.restore();
      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [fighterId, size, appearance, previewAction, flipX]);

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
