import { FIGHTER_PROFILES, getMoveSpec, STAGE_LEFT, STAGE_RIGHT } from './constants';
import { Box, FighterState, Projectile } from './types';

export function isAttackAction(action: FighterState['action']): boolean {
  return (
    action === 'light' ||
    action === 'medium' ||
    action === 'heavy' ||
    action === 'special' ||
    action === 'ultimate'
  );
}

export function getHurtbox(fighter: FighterState): Box {
  const profile = FIGHTER_PROFILES[fighter.id];
  let height = fighter.crouching ? profile.crouchHeight : profile.hurtboxHeight;
  let width = profile.hurtboxWidth;

  if (fighter.action === 'knockdown') {
    height = 54;
    width = 112;
  } else if (fighter.action === 'dash_fwd' || fighter.action === 'dash_back') {
    height = Math.round(profile.hurtboxHeight * 0.88);
  }

  return {
    x: fighter.x - width / 2,
    y: fighter.y - height,
    width,
    height,
  };
}

export function getActiveHitbox(fighter: FighterState): Box | null {
  if (!isAttackAction(fighter.action)) {
    return null;
  }

  const spec = getMoveSpec(fighter.id, fighter.currentMove);
  const start = spec.startup;
  const end = spec.startup + spec.active;

  if (fighter.actionFrame < start || fighter.actionFrame >= end) {
    return null;
  }

  const boxX =
    fighter.facing === 1
      ? fighter.x + spec.hitboxOffsetX
      : fighter.x - spec.hitboxOffsetX - spec.hitboxWidth;

  return {
    x: boxX,
    y: fighter.y + spec.hitboxOffsetY,
    width: spec.hitboxWidth,
    height: spec.hitboxHeight,
  };
}

export function getProjectileBox(proj: Projectile): Box {
  return {
    x: proj.x - proj.radius,
    y: proj.y - proj.radius,
    width: proj.radius * 2,
    height: proj.radius * 2,
  };
}

export function boxesOverlap(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function stageEdgeMargin(fighter: FighterState): number {
  return fighter.action === 'knockdown' || fighter.action === 'defeat' ? 96 : 42;
}

export function resolvePushboxes(p1: FighterState, p2: FighterState): void {
  const m1 = stageEdgeMargin(p1);
  const m2 = stageEdgeMargin(p2);

  // Knocked-down or defeated fighters pass smoothly without hard pushlock
  if (p1.action === 'knockdown' || p2.action === 'knockdown' || p1.action === 'defeat' || p2.action === 'defeat') {
    p1.x = Math.max(STAGE_LEFT + m1, Math.min(STAGE_RIGHT - m1, p1.x));
    p2.x = Math.max(STAGE_LEFT + m2, Math.min(STAGE_RIGHT - m2, p2.x));
    return;
  }

  const w1 = FIGHTER_PROFILES[p1.id].hurtboxWidth;
  const w2 = FIGHTER_PROFILES[p2.id].hurtboxWidth;
  const minDist = (w1 + w2) * 0.45;
  const verticalOverlap = Math.abs(p1.y - p2.y) < 120;

  if (verticalOverlap) {
    const dx = p2.x - p1.x;
    const absDx = Math.abs(dx);
    if (absDx < minDist) {
      const overlap = (minDist - absDx) * 0.5;
      const dir = dx >= 0 ? 1 : -1;
      p1.x -= dir * overlap;
      p2.x += dir * overlap;
    }
  }

  p1.x = Math.max(STAGE_LEFT + m1, Math.min(STAGE_RIGHT - m1, p1.x));
  p2.x = Math.max(STAGE_LEFT + m2, Math.min(STAGE_RIGHT - m2, p2.x));
}
