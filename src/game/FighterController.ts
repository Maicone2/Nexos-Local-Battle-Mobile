import { isAttackAction } from './CollisionSystem';
import {
  DEFAULT_INPUT_BUFFER_WINDOW,
  EMPTY_INPUT,
  FIGHTER_PROFILES,
  FLOOR_Y,
  getMoveSpec,
  STAGE_LEFT,
  STAGE_RIGHT,
} from './constants';
import { ActionState, FighterState, InputState, MoveId } from './types';

function moveToward(current: number, target: number, maxDelta: number): number {
  if (Math.abs(target - current) <= maxDelta) return target;
  return current + Math.sign(target - current) * maxDelta;
}

function resolveRequestedMove(
  fighter: FighterState,
  button: 'light' | 'medium' | 'heavy' | 'special' | 'sweep' | 'ultimate',
  input: InputState,
  currentTick: number,
  infiniteEnergy: boolean
): MoveId | null {
  const profile = FIGHTER_PROFILES[fighter.id];
  const moveDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const holdingForward = moveDir === fighter.facing;
  const holdingBack = moveDir === -fighter.facing;

  // Air attacks (Voadora & Sky Break)
  if (!fighter.grounded) {
    if (button === 'light') return 'air_light';
    if (button === 'medium') return 'air_medium';
    if (button === 'heavy') {
      if (input.down && fighter.id === 'kael' && profile.moves.sky_break) {
        return 'sky_break';
      }
      return 'air_heavy';
    }
    return null;
  }

  // Direct multi-button Rasteira shortcut (Ligeiro + Pesado)
  if (button === 'sweep') {
    return 'crouch_medium_sweep';
  }

  // Direct multi-button Ultimate shortcut (Médio + Pesado or ↓ + Ligeiro+Defesa)
  if (button === 'ultimate') {
    const ultId = profile.ultimateMoveId;
    const specId = profile.specialMoveId;
    const ultCost = profile.moves[ultId]?.energyCost ?? 100;
    const specCost = profile.moves[specId]?.energyCost ?? 50;
    if (infiniteEnergy || fighter.energy >= ultCost) {
      return ultId;
    }
    if (infiniteEnergy || fighter.energy >= specCost) {
      return specId;
    }
    return null;
  }

  // Ground attacks when already attacking (combo chains)
  if (isAttackAction(fighter.action) && fighter.currentMove) {
    if (button === 'light') {
      if (fighter.currentMove === 'stand_light') {
        return profile.chainLight2Id;
      }
      if (profile.chainLight3Id && fighter.currentMove === profile.chainLight2Id) {
        return profile.chainLight3Id;
      }
    }
  }

  // Ground Special / Ultimate
  if (button === 'special') {
    const ultId = profile.ultimateMoveId;
    const specId = profile.specialMoveId;
    const ultCost = profile.moves[ultId]?.energyCost ?? 100;
    const specCost = profile.moves[specId]?.energyCost ?? 50;

    if (input.down && (infiniteEnergy || fighter.energy >= ultCost)) {
      return ultId;
    }
    if (infiniteEnergy || fighter.energy >= specCost) {
      return specId;
    }
    return null;
  }

  // Crouching attacks:
  // - Down + Light or Down + Heavy (neutral/forward) -> Uppercut (-15% HP, Launcher)
  // - Down + Medium (or Back-Down diagonal + Heavy) -> Rasteira (-9% HP, Low Knockdown)
  if (input.down) {
    if (button === 'medium') return 'crouch_medium_sweep';
    if (button === 'heavy' && holdingBack) return 'crouch_medium_sweep';
    if (button === 'light' || button === 'heavy') return 'crouch_uppercut';
  }

  // Standing directional & neutral normals
  if (button === 'light') return 'stand_light';
  if (button === 'medium') {
    if (holdingForward) {
      return profile.forwardMediumId;
    }
    return 'stand_medium';
  }
  if (button === 'heavy') {
    if (holdingForward) {
      return profile.forwardHeavyId;
    }
    return 'stand_heavy';
  }

  void currentTick;
  return null;
}

function actionCategoryFromMove(fighterId: FighterState['id'], moveId: MoveId): ActionState {
  const spec = getMoveSpec(fighterId, moveId);
  return spec.category;
}

export function updateFighterInputAndMovement(
  fighter: FighterState,
  opponent: FighterState,
  input: InputState,
  infiniteEnergy: boolean,
  currentTick: number,
  bufferWindow: number,
  emitEvent: (type: 'jump' | 'special' | 'ultimate' | 'dash' | 'charge') => void
): void {
  const profile = FIGHTER_PROFILES[fighter.id];
  const effectiveBuffer = Math.max(4, Math.min(16, bufferWindow || DEFAULT_INPUT_BUFFER_WINDOW));

  // Edge detection for one-shot actions & double-tap dash
  const justLeft = input.left && !fighter.edge.prev.left;
  const justRight = input.right && !fighter.edge.prev.right;
  const justLight = input.light && !fighter.edge.prev.light;
  const justMedium = input.medium && !fighter.edge.prev.medium;
  const justHeavy = input.heavy && !fighter.edge.prev.heavy;
  const justSpecial = input.special && !fighter.edge.prev.special;
  const justJump = input.up && !fighter.edge.prev.up;
  const justBlock = input.block && !fighter.edge.prev.block;

  if (fighter.edge.chordGuardTicks > 0) {
    fighter.edge.chordGuardTicks--;
  }

  const specId = profile.specialMoveId;
  const ultId = profile.ultimateMoveId;
  const specCost = profile.moves[specId]?.energyCost ?? 50;
  const ultCost = profile.moves[ultId]?.energyCost ?? 100;
  const canSpecial = infiniteEnergy || fighter.energy >= specCost;
  const canUlt = infiniteEnergy || fighter.energy >= ultCost;

  // Double-tap dash detection (within 14 ticks)
  let doubleTapDir: -1 | 0 | 1 = 0;
  if (justLeft) {
    if (currentTick - fighter.edge.lastTapLeftTick <= 14) {
      doubleTapDir = -1;
    }
    fighter.edge.lastTapLeftTick = currentTick;
  }
  if (justRight) {
    if (currentTick - fighter.edge.lastTapRightTick <= 14) {
      doubleTapDir = 1;
    }
    fighter.edge.lastTapRightTick = currentTick;
  }

  // Simultaneous multi-button shortcuts (chords with 3-frame human tolerance):
  // 1) Ligeiro + Defesa => Ataque Especial (ou Ultimate se ↓ + 100% Energia)
  // 2) Ligeiro + Pesado => Rasteira (-9% HP)
  // 3) Médio + Pesado => Ultimate (100% Energia)
  const nearLight =
    fighter.edge.bufferedAction === 'light' &&
    fighter.edge.bufferFrames >= effectiveBuffer - 3;
  const nearMedium =
    fighter.edge.bufferedAction === 'medium' &&
    fighter.edge.bufferFrames >= effectiveBuffer - 3;
  const nearHeavy =
    fighter.edge.bufferedAction === 'heavy' &&
    fighter.edge.bufferFrames >= effectiveBuffer - 3;
  const nearBlock = fighter.action === 'block' && fighter.blockFrames <= 4;

  const chordSpecial =
    canSpecial &&
    fighter.grounded &&
    ((justLight && input.block) ||
      (justBlock && input.light) ||
      (justBlock && nearLight) ||
      (justLight && nearBlock));

  const chordSweep =
    fighter.grounded &&
    ((justLight && input.heavy) ||
      (justHeavy && input.light) ||
      (justHeavy && nearLight) ||
      (justLight && nearHeavy));

  const chordUltimate =
    canUlt &&
    fighter.grounded &&
    ((justMedium && input.heavy) ||
      (justHeavy && input.medium) ||
      (justHeavy && nearMedium) ||
      (justMedium && nearHeavy));

  if (chordUltimate) {
    fighter.edge.bufferedAction = 'ultimate';
    fighter.edge.bufferFrames = effectiveBuffer;
  } else if (chordSpecial) {
    fighter.edge.bufferedAction = input.down && canUlt ? 'ultimate' : 'special';
    fighter.edge.bufferFrames = effectiveBuffer;
    fighter.edge.chordGuardTicks = 8;
  } else if (chordSweep) {
    fighter.edge.bufferedAction = 'sweep';
    fighter.edge.bufferFrames = effectiveBuffer;
  } else if (justSpecial) {
    fighter.edge.bufferedAction = 'special';
    fighter.edge.bufferFrames = effectiveBuffer;
  } else if (justHeavy) {
    fighter.edge.bufferedAction = 'heavy';
    fighter.edge.bufferFrames = effectiveBuffer;
  } else if (justMedium) {
    fighter.edge.bufferedAction = 'medium';
    fighter.edge.bufferFrames = effectiveBuffer;
  } else if (justLight) {
    fighter.edge.bufferedAction = 'light';
    fighter.edge.bufferFrames = effectiveBuffer;
  } else if (justJump) {
    fighter.edge.bufferedAction = 'jump';
    fighter.edge.bufferFrames = effectiveBuffer;
  } else if (doubleTapDir !== 0 && fighter.grounded && fighter.dashCooldown === 0) {
    fighter.edge.bufferedAction =
      doubleTapDir === fighter.facing ? 'dash_fwd' : 'dash_back';
    fighter.edge.bufferFrames = effectiveBuffer;
  } else if (fighter.edge.bufferFrames > 0) {
    fighter.edge.bufferFrames--;
    if (fighter.edge.bufferFrames === 0) {
      fighter.edge.bufferedAction = null;
    }
  }

  fighter.edge.prev = { ...input };

  if (fighter.dashCooldown > 0) fighter.dashCooldown--;

  // Fade dash / Phantom Step afterimages
  if (fighter.afterimages.length > 0) {
    fighter.afterimages = fighter.afterimages
      .map((g) => ({ ...g, alpha: g.alpha - 0.14 }))
      .filter((g) => g.alpha > 0.05);
  }

  // Auto-face opponent when grounded and neutral
  const isNeutralGrounded =
    fighter.grounded &&
    (fighter.action === 'idle' ||
      fighter.action === 'walk_fwd' ||
      fighter.action === 'walk_back' ||
      fighter.action === 'crouch' ||
      fighter.action === 'crouch_walk' ||
      fighter.action === 'charge' ||
      fighter.action === 'block');

  if (isNeutralGrounded && Math.abs(opponent.x - fighter.x) > 8) {
    fighter.facing = opponent.x >= fighter.x ? 1 : -1;
  }

  // Knockdown state -> gets up with brief invulnerability
  if (fighter.action === 'knockdown') {
    fighter.crouching = false;
    fighter.vx *= 0.86;
    if (fighter.grounded) {
      fighter.knockdownTimer--;
      if (fighter.knockdownTimer <= 0) {
        fighter.action = 'idle';
        fighter.actionFrame = 0;
        fighter.invulnFrames = 14;
      }
    }
    return;
  }

  // Guard break / Stunned / Victory / Defeat
  if (
    fighter.action === 'guard_break' ||
    fighter.action === 'stunned' ||
    fighter.action === 'victory' ||
    fighter.action === 'defeat'
  ) {
    fighter.crouching = false;
    fighter.vx *= 0.84;
    return;
  }

  // Hitstun & Air Recovery (when knocked into the air and hitstun expires, pressing block/jump performs Air Recovery)
  if (fighter.action === 'hitstun') {
    fighter.crouching = false;
    if (!fighter.grounded && fighter.stunTimer <= 8 && (justJump || justBlock)) {
      fighter.action = 'air_recovery';
      fighter.actionFrame = 0;
      fighter.stunTimer = 0;
      fighter.vy = -8.5;
      fighter.vx = -fighter.facing * 5.2;
      fighter.invulnFrames = 12;
      emitEvent('jump');
    }
    return;
  }

  if (fighter.action === 'air_recovery') {
    const moveDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    fighter.vx = moveToward(fighter.vx, moveDir * profile.walkSpeed * 0.9, profile.airAccel);
    if (fighter.actionFrame >= 16) {
      fighter.action = 'jump';
      fighter.actionFrame = 0;
    }
    return;
  }

  // Landing recovery (4 frames)
  if (fighter.action === 'landing') {
    fighter.vx = moveToward(fighter.vx, 0, 1.8);
    if (fighter.actionFrame >= 4) {
      fighter.action = 'idle';
      fighter.actionFrame = 0;
    }
    return;
  }

  // Forward / Backward Dash with afterimages
  if (fighter.action === 'dash_fwd' || fighter.action === 'dash_back') {
    const duration = profile.dashDuration;
    if (fighter.actionFrame % 3 === 1) {
      fighter.afterimages.push({
        x: fighter.x,
        y: fighter.y,
        facing: fighter.facing,
        alpha: 0.72,
        action: fighter.action,
        moveId: null,
      });
    }
    if (fighter.actionFrame >= duration) {
      fighter.action = 'idle';
      fighter.actionFrame = 0;
      fighter.vx *= 0.5;
    } else if (fighter.edge.bufferedAction && fighter.action === 'dash_fwd') {
      // Allow canceling forward dash into attacks
      const b = fighter.edge.bufferedAction;
      if (b === 'light' || b === 'medium' || b === 'heavy' || b === 'special') {
        const moveId = resolveRequestedMove(fighter, b, input, currentTick, infiniteEnergy);
        if (moveId) {
          startAttack(fighter, moveId, infiniteEnergy, emitEvent);
          fighter.edge.bufferedAction = null;
          fighter.edge.bufferFrames = 0;
          return;
        }
      }
    }
    return;
  }

  // Currently executing an attack
  if (isAttackAction(fighter.action)) {
    const spec = getMoveSpec(fighter.id, fighter.currentMove);
    const totalFrames = spec.startup + spec.active + spec.recovery;

    if (spec.isDashStrike && fighter.actionFrame % 3 === 1) {
      fighter.afterimages.push({
        x: fighter.x,
        y: fighter.y,
        facing: fighter.facing,
        alpha: 0.65,
        action: fighter.action,
        moveId: fighter.currentMove,
      });
    }

    // Combo cancel window (only when attack connected)
    const inCancelWindow =
      fighter.hasHitCurrentAttack &&
      fighter.actionFrame >= spec.startup &&
      fighter.actionFrame < totalFrames;

    if (inCancelWindow && fighter.edge.bufferedAction) {
      const buffered = fighter.edge.bufferedAction;
      if (buffered === 'jump' && spec.canJumpCancel && fighter.grounded) {
        executeJump(fighter, input, false, emitEvent);
        fighter.edge.bufferedAction = null;
        fighter.edge.bufferFrames = 0;
        return;
      }

      if (
        buffered === 'light' ||
        buffered === 'medium' ||
        buffered === 'heavy' ||
        buffered === 'special' ||
        buffered === 'sweep' ||
        buffered === 'ultimate'
      ) {
        const candidateMove = resolveRequestedMove(
          fighter,
          buffered,
          input,
          currentTick,
          infiniteEnergy
        );
        if (candidateMove && spec.cancelInto.includes(candidateMove)) {
          // Enforce air combo limit (prevent infinite air loops)
          if (fighter.grounded || fighter.airComboCount < 3) {
            startAttack(fighter, candidateMove, infiniteEnergy, emitEvent);
            fighter.edge.bufferedAction = null;
            fighter.edge.bufferFrames = 0;
            return;
          }
        }
      }
    }

    // Attack movement physics
    if (spec.diveSpeedY && !fighter.grounded) {
      fighter.vy = spec.diveSpeedY;
      fighter.vx = fighter.facing * 5.2;
    } else if (spec.isDashStrike) {
      if (fighter.actionFrame >= spec.startup && fighter.actionFrame < spec.startup + spec.active) {
        fighter.vx = fighter.facing * (spec.advanceVx || 11.5);
      } else {
        fighter.vx = moveToward(fighter.vx, 0, 1.4);
      }
    } else if (spec.advanceVx && fighter.actionFrame < spec.startup + 4 && fighter.grounded) {
      fighter.vx = moveToward(fighter.vx, fighter.facing * spec.advanceVx, 1.6);
    } else if (fighter.grounded) {
      fighter.vx = moveToward(fighter.vx, 0, 1.5);
    }

    if (fighter.actionFrame >= totalFrames) {
      fighter.action = fighter.grounded ? 'idle' : 'jump';
      fighter.currentMove = null;
      fighter.actionFrame = 0;
      fighter.hasHitCurrentAttack = false;
    }
    return;
  }

  // Consume buffered attacks / shortcuts BEFORE block so Ligeiro+Defesa triggers Especial cleanly
  const buffered = fighter.edge.bufferedAction;
  const shouldPrioritySpecial =
    buffered === 'special' || buffered === 'ultimate' || buffered === 'sweep';

  if (shouldPrioritySpecial) {
    const moveId = resolveRequestedMove(fighter, buffered, input, currentTick, infiniteEnergy);
    if (moveId) {
      if (fighter.grounded && Math.abs(opponent.x - fighter.x) > 4) {
        fighter.facing = opponent.x >= fighter.x ? 1 : -1;
      }
      startAttack(fighter, moveId, infiniteEnergy, emitEvent);
      fighter.edge.bufferedAction = null;
      fighter.edge.bufferFrames = 0;
      return;
    }
  }

  // Blocking: Standing Guard, Crouching Guard, or Air Guard
  const holdingBack =
    (fighter.facing === 1 && input.left) || (fighter.facing === -1 && input.right);
  const opponentAttacking = isAttackAction(opponent.action);

  if ((input.block && fighter.edge.chordGuardTicks === 0) || (holdingBack && opponentAttacking)) {
    const wasBlocking = fighter.action === 'block';
    fighter.action = 'block';
    fighter.blockFrames = wasBlocking ? fighter.blockFrames + 1 : 1;
    fighter.crouching = fighter.grounded && input.down;
    if (fighter.grounded) {
      fighter.vx = moveToward(fighter.vx, 0, 1.8);
    }
    return;
  } else {
    fighter.blockFrames = 0;
  }

  // Consume buffered normal attacks / dashes / jumps
  if (
    buffered === 'light' ||
    buffered === 'medium' ||
    buffered === 'heavy' ||
    buffered === 'special' ||
    buffered === 'sweep' ||
    buffered === 'ultimate'
  ) {
    const moveId = resolveRequestedMove(fighter, buffered, input, currentTick, infiniteEnergy);
    if (moveId) {
      if (fighter.grounded && Math.abs(opponent.x - fighter.x) > 4) {
        fighter.facing = opponent.x >= fighter.x ? 1 : -1;
      }
      startAttack(fighter, moveId, infiniteEnergy, emitEvent);
      fighter.edge.bufferedAction = null;
      fighter.edge.bufferFrames = 0;
      return;
    }
  }

  if (buffered === 'dash_fwd' || buffered === 'dash_back') {
    const dir = buffered === 'dash_fwd' ? fighter.facing : -fighter.facing;
    fighter.action = buffered;
    fighter.actionFrame = 0;
    fighter.currentMove = null;
    fighter.crouching = false;
    fighter.vx = dir * profile.dashSpeed;
    fighter.dashCooldown = 18;
    fighter.edge.bufferedAction = null;
    fighter.edge.bufferFrames = 0;
    emitEvent('dash');
    return;
  }

  if (buffered === 'jump') {
    if (fighter.grounded) {
      executeJump(fighter, input, false, emitEvent);
      fighter.edge.bufferedAction = null;
      fighter.edge.bufferFrames = 0;
      return;
    } else if (profile.canDoubleJump && fighter.airJumpsLeft > 0 && fighter.actionFrame >= 5) {
      executeJump(fighter, input, true, emitEvent);
      fighter.edge.bufferedAction = null;
      fighter.edge.bufferFrames = 0;
      return;
    }
  }

  // Airborne directional control (allows diagonal jumps + mid-air steering)
  if (!fighter.grounded) {
    const moveDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const maxAirVx = profile.walkSpeed * 1.15;
    if (moveDir !== 0) {
      fighter.vx = moveToward(fighter.vx, moveDir * maxAirVx, profile.airAccel);
    } else {
      fighter.vx = moveToward(fighter.vx, 0, profile.airAccel * 0.25);
    }
    return;
  }

  // Energy Charge (Carregar Barra de Energia — Braços Cruzados com efeito '+')
  if (input.charge) {
    const wasCharging = fighter.action === 'charge';
    if (!wasCharging) {
      fighter.actionFrame = 0;
    }
    fighter.action = 'charge';
    fighter.currentMove = null;
    fighter.crouching = false;
    fighter.vx = moveToward(fighter.vx, 0, 1.8);
    fighter.energy = Math.min(fighter.maxEnergy, fighter.energy + 0.65);
    if (!wasCharging || fighter.actionFrame % 6 === 0) {
      emitEvent('charge');
    }
    return;
  }

  // Crouching & Crouch Walk (supports ↙ and ↘ diagonal crouch walk!)
  if (input.down) {
    fighter.crouching = true;
    const moveDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (moveDir !== 0) {
      fighter.vx = moveToward(fighter.vx, moveDir * profile.crouchWalkSpeed, 1.1);
      fighter.action = 'crouch_walk';
    } else {
      fighter.vx = moveToward(fighter.vx, 0, 1.6);
      fighter.action = 'crouch';
    }
    return;
  }
  fighter.crouching = false;

  // Ground horizontal movement with smooth acceleration & deceleration
  const moveDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (moveDir !== 0) {
    const movingForward = moveDir === fighter.facing;
    const targetVx = moveDir * (movingForward ? profile.walkSpeed : profile.backWalkSpeed);
    fighter.vx = moveToward(fighter.vx, targetVx, 1.35);
    fighter.action = movingForward ? 'walk_fwd' : 'walk_back';
  } else {
    fighter.vx = moveToward(fighter.vx, 0, 1.65);
    fighter.action = 'idle';
  }
}

function executeJump(
  fighter: FighterState,
  input: InputState,
  isDoubleJump: boolean,
  emitEvent: (type: 'jump' | 'special' | 'ultimate' | 'dash' | 'charge') => void
): void {
  const profile = FIGHTER_PROFILES[fighter.id];
  const moveDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  fighter.vy = isDoubleJump ? profile.jumpVelocity * 0.88 : profile.jumpVelocity;
  fighter.grounded = false;
  fighter.crouching = false;
  fighter.action = isDoubleJump ? 'double_jump' : 'jump';
  fighter.currentMove = null;
  fighter.actionFrame = 0;
  fighter.vx = moveDir * profile.walkSpeed * 1.12;
  if (isDoubleJump) {
    fighter.airJumpsLeft = Math.max(0, fighter.airJumpsLeft - 1);
  }
  emitEvent('jump');
}

function startAttack(
  fighter: FighterState,
  moveId: MoveId,
  infiniteEnergy: boolean,
  emitEvent: (type: 'jump' | 'special' | 'ultimate' | 'dash' | 'charge') => void
): void {
  const spec = getMoveSpec(fighter.id, moveId);
  if (!infiniteEnergy && spec.energyCost > 0) {
    fighter.energy = Math.max(0, fighter.energy - spec.energyCost);
  }
  fighter.action = actionCategoryFromMove(fighter.id, moveId);
  fighter.currentMove = moveId;
  fighter.actionFrame = 0;
  fighter.hasHitCurrentAttack = false;
  fighter.crouching = moveId === 'crouch_medium_sweep' || moveId === 'crouch_uppercut';
  fighter.lastMoveName = spec.name;
  fighter.lastMoveStartup = spec.startup;
  fighter.lastMoveActive = spec.active;
  fighter.lastMoveRecovery = spec.recovery;

  if (spec.advanceVx && fighter.grounded) {
    fighter.vx = fighter.facing * spec.advanceVx * 0.55;
  } else if (fighter.grounded && !spec.isDashStrike) {
    fighter.vx *= 0.35;
  }

  if (spec.category === 'ultimate') {
    emitEvent('ultimate');
  } else if (spec.category === 'special') {
    emitEvent('special');
  }
}

export function applyFighterPhysics(fighter: FighterState): void {
  const profile = FIGHTER_PROFILES[fighter.id];

  fighter.x += fighter.vx;
  fighter.y += fighter.vy;

  if (!fighter.grounded) {
    fighter.vy = Math.min(24, fighter.vy + profile.gravity);
    if (fighter.y >= FLOOR_Y) {
      fighter.y = FLOOR_Y;
      fighter.vy = 0;
      fighter.grounded = true;
      fighter.airJumpsLeft = profile.canDoubleJump ? 1 : 0;
      fighter.airComboCount = 0;

      if (fighter.action === 'hitstun') {
        // Hard air falls land into knockdown; small mid-combo stagger hops remain in hitstun so cancels connect
        if (fighter.vy >= 8.5 || fighter.stunTimer <= 3) {
          fighter.action = 'knockdown';
          fighter.knockdownTimer = 18;
          fighter.actionFrame = 0;
        }
      } else if (fighter.action === 'knockdown') {
        fighter.knockdownTimer = 24;
      } else if (
        fighter.action === 'jump' ||
        fighter.action === 'double_jump' ||
        fighter.action === 'air_recovery' ||
        (isAttackAction(fighter.action) && fighter.currentMove?.startsWith('air_')) ||
        fighter.currentMove === 'sky_break'
      ) {
        fighter.action = 'landing';
        fighter.currentMove = null;
        fighter.actionFrame = 0;
        fighter.hasHitCurrentAttack = false;
      }
    }
  } else {
    fighter.y = FLOOR_Y;
    if (
      fighter.action === 'hitstun' ||
      fighter.action === 'stunned' ||
      fighter.action === 'guard_break'
    ) {
      fighter.vx *= 0.84;
    }
  }

  // Hard stage boundary clamp so knocked-down or defeated fighters never fall off the stage
  const isDowned = fighter.action === 'knockdown' || fighter.action === 'defeat';
  const edgeMargin = isDowned ? 96 : 42;
  const minX = STAGE_LEFT + edgeMargin;
  const maxX = STAGE_RIGHT - edgeMargin;
  if (fighter.x < minX) {
    fighter.x = minX;
    if (fighter.vx < 0) fighter.vx = 0;
  } else if (fighter.x > maxX) {
    fighter.x = maxX;
    if (fighter.vx > 0) fighter.vx = 0;
  }
  if (fighter.y > FLOOR_Y) {
    fighter.y = FLOOR_Y;
    if (fighter.vy > 0) fighter.vy = 0;
    fighter.grounded = true;
  }
}

export function resetFighterEdge(fighter: FighterState): void {
  fighter.edge = {
    prev: { ...EMPTY_INPUT },
    bufferedAction: null,
    bufferFrames: 0,
    lastTapLeftTick: -100,
    lastTapRightTick: -100,
    chordGuardTicks: 0,
  };
}
