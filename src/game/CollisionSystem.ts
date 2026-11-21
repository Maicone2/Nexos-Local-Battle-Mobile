import { FIGHTER_PROFILES, STAGE_LEFT, STAGE_RIGHT } from './constants';
import { Box, FighterState, Projectile } from './types';

export function getHurtbox(fighter: FighterState): Box {
  const profile = FIGHTER_PROFILES[fighter.id];
  const height = fighter.crouching ? profile.crouchHeight : profile.hurtboxHeight;
  const width = profile.hurtboxWidth;
  return {
    x: fighter.x - width / 2,
    y: fighter.y - height,
    width,
    height,
  };
}

export function getActiveHitbox(fighter: FighterState): Box | null {
  if (fighter.action !== 'light' && fighter.action !== 'heavy' && fighter.action !== 'special') {
    return null;
  }

  const profile = FIGHTER_PROFILES[fighter.id];
  const spec = profile.attacks[fighter.action];
  const start = spec.startup;
  const end = spec.startup + spec.active;

  if (fighter.actionFrame < start || fighter.actionFrame >= end) {
    return null;
  }

  // Projectile specials spawn an energy projectile rather than relying solely on melee box,
  // though close-range point-blank startup also hits if overlapping.
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

export function resolvePushboxes(p1: FighterState, p2: FighterState): void {
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

  p1.x = Math.max(STAGE_LEFT + 28, Math.min(STAGE_RIGHT - 28, p1.x));
  p2.x = Math.max(STAGE_LEFT + 28, Math.min(STAGE_RIGHT - 28, p2.x));
}
