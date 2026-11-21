import { EMPTY_INPUT, FIGHTER_PROFILES, FLOOR_Y, INPUT_BUFFER_WINDOW } from './constants';
import { FighterState, InputState } from './types';

export function updateFighterInputAndMovement(
  fighter: FighterState,
  opponent: FighterState,
  input: InputState,
  infiniteEnergy: boolean,
  emitEvent: (type: 'jump' | 'special') => void
): void {
  const profile = FIGHTER_PROFILES[fighter.id];

  // Edge detection for one-shot actions
  const justLight = input.light && !fighter.edge.prev.light;
  const justHeavy = input.heavy && !fighter.edge.prev.heavy;
  const justSpecial = input.special && !fighter.edge.prev.special;
  const justJump = input.up && !fighter.edge.prev.up;

  if (justSpecial) {
    fighter.edge.bufferedAction = 'special';
    fighter.edge.bufferFrames = INPUT_BUFFER_WINDOW;
  } else if (justHeavy) {
    fighter.edge.bufferedAction = 'heavy';
    fighter.edge.bufferFrames = INPUT_BUFFER_WINDOW;
  } else if (justLight) {
    fighter.edge.bufferedAction = 'light';
    fighter.edge.bufferFrames = INPUT_BUFFER_WINDOW;
  } else if (justJump) {
    fighter.edge.bufferedAction = 'jump';
    fighter.edge.bufferFrames = INPUT_BUFFER_WINDOW;
  } else if (fighter.edge.bufferFrames > 0) {
    fighter.edge.bufferFrames--;
    if (fighter.edge.bufferFrames === 0) {
      fighter.edge.bufferedAction = null;
    }
  }

  fighter.edge.prev = { ...input };

  // Auto-face opponent when grounded and neutral
  const isNeutralGrounded =
    fighter.grounded &&
    (fighter.action === 'idle' ||
      fighter.action === 'walk_fwd' ||
      fighter.action === 'walk_back' ||
      fighter.action === 'crouch' ||
      fighter.action === 'block');

  if (isNeutralGrounded && Math.abs(opponent.x - fighter.x) > 8) {
    fighter.facing = opponent.x >= fighter.x ? 1 : -1;
  }

  // Cannot act during hitstun, stunned, victory, defeat
  if (
    fighter.action === 'hitstun' ||
    fighter.action === 'stunned' ||
    fighter.action === 'victory' ||
    fighter.action === 'defeat'
  ) {
    fighter.crouching = false;
    return;
  }

  // Check if currently in an attack
  if (fighter.action === 'light' || fighter.action === 'heavy' || fighter.action === 'special') {
    const spec = profile.attacks[fighter.action];
    const totalFrames = spec.startup + spec.active + spec.recovery;

    // Target-combo / special cancel window: if attack connected, allow chaining Light -> Heavy -> Special
    const inCancelWindow =
      fighter.hasHitCurrentAttack &&
      fighter.actionFrame >= spec.startup &&
      fighter.actionFrame < totalFrames;

    if (inCancelWindow && fighter.edge.bufferedAction) {
      const next = fighter.edge.bufferedAction;
      if (fighter.action === 'light' && next === 'heavy') {
        startAttack(fighter, 'heavy', infiniteEnergy, emitEvent);
        fighter.edge.bufferedAction = null;
        fighter.edge.bufferFrames = 0;
        return;
      }
      if ((fighter.action === 'light' || fighter.action === 'heavy') && next === 'special') {
        if (canUseSpecial(fighter, infiniteEnergy)) {
          startAttack(fighter, 'special', infiniteEnergy, emitEvent);
          fighter.edge.bufferedAction = null;
          fighter.edge.bufferFrames = 0;
          return;
        }
      }
    }

    // Vexa's Vórtice Azul dash lunge during active frames
    if (fighter.action === 'special' && spec.isDashStrike) {
      if (fighter.actionFrame >= spec.startup && fighter.actionFrame < spec.startup + spec.active) {
        fighter.vx = fighter.facing * 12.2;
      } else {
        fighter.vx *= 0.78;
      }
    } else if (fighter.grounded) {
      fighter.vx *= 0.75;
    }

    if (fighter.actionFrame >= totalFrames) {
      fighter.action = fighter.grounded ? 'idle' : 'jump';
      fighter.actionFrame = 0;
      fighter.hasHitCurrentAttack = false;
    }
    return;
  }

  // Blocking: dedicated block button OR holding back while opponent is attacking
  const holdingBack =
    (fighter.facing === 1 && input.left) || (fighter.facing === -1 && input.right);
  const opponentAttacking =
    opponent.action === 'light' || opponent.action === 'heavy' || opponent.action === 'special';

  if (fighter.grounded && (input.block || (holdingBack && opponentAttacking))) {
    fighter.action = 'block';
    fighter.vx = 0;
    fighter.crouching = input.down;
    return;
  }

  // Consume buffered attacks / jump
  const buffered = fighter.edge.bufferedAction;
  if (buffered === 'special' && canUseSpecial(fighter, infiniteEnergy)) {
    if (fighter.grounded && Math.abs(opponent.x - fighter.x) > 4) {
      fighter.facing = opponent.x >= fighter.x ? 1 : -1;
    }
    startAttack(fighter, 'special', infiniteEnergy, emitEvent);
    fighter.edge.bufferedAction = null;
    fighter.edge.bufferFrames = 0;
    return;
  }
  if (buffered === 'heavy') {
    if (fighter.grounded && Math.abs(opponent.x - fighter.x) > 4) {
      fighter.facing = opponent.x >= fighter.x ? 1 : -1;
    }
    startAttack(fighter, 'heavy', infiniteEnergy, emitEvent);
    fighter.edge.bufferedAction = null;
    fighter.edge.bufferFrames = 0;
    return;
  }
  if (buffered === 'light') {
    if (fighter.grounded && Math.abs(opponent.x - fighter.x) > 4) {
      fighter.facing = opponent.x >= fighter.x ? 1 : -1;
    }
    startAttack(fighter, 'light', infiniteEnergy, emitEvent);
    fighter.edge.bufferedAction = null;
    fighter.edge.bufferFrames = 0;
    return;
  }
  if (buffered === 'jump' && fighter.grounded) {
    fighter.vy = profile.jumpVelocity;
    fighter.grounded = false;
    fighter.crouching = false;
    fighter.action = 'jump';
    fighter.actionFrame = 0;
    const moveDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    fighter.vx = moveDir * profile.walkSpeed * 1.05;
    fighter.edge.bufferedAction = null;
    fighter.edge.bufferFrames = 0;
    emitEvent('jump');
    return;
  }

  // Crouch
  if (fighter.grounded && input.down) {
    fighter.crouching = true;
    fighter.action = 'crouch';
    fighter.vx = 0;
    return;
  }
  fighter.crouching = false;

  // Horizontal movement
  if (fighter.grounded) {
    const moveDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (moveDir !== 0) {
      const movingForward = moveDir === fighter.facing;
      fighter.vx = moveDir * (movingForward ? profile.walkSpeed : profile.backWalkSpeed);
      fighter.action = movingForward ? 'walk_fwd' : 'walk_back';
    } else {
      fighter.vx = 0;
      fighter.action = 'idle';
    }
  }
}

function canUseSpecial(fighter: FighterState, infiniteEnergy: boolean): boolean {
  const cost = FIGHTER_PROFILES[fighter.id].attacks.special.energyCost;
  return infiniteEnergy || fighter.energy >= cost;
}

function startAttack(
  fighter: FighterState,
  attackType: 'light' | 'heavy' | 'special',
  infiniteEnergy: boolean,
  emitEvent: (type: 'jump' | 'special') => void
): void {
  const spec = FIGHTER_PROFILES[fighter.id].attacks[attackType];
  if (attackType === 'special' && !infiniteEnergy) {
    fighter.energy = Math.max(0, fighter.energy - spec.energyCost);
  }
  fighter.action = attackType;
  fighter.actionFrame = 0;
  fighter.hasHitCurrentAttack = false;
  fighter.crouching = false;
  if (fighter.grounded) {
    fighter.vx = attackType === 'heavy' ? fighter.facing * 2.2 : 0;
  }
  if (attackType === 'special') {
    emitEvent('special');
  }
}

export function applyFighterPhysics(fighter: FighterState): void {
  const profile = FIGHTER_PROFILES[fighter.id];

  fighter.x += fighter.vx;
  fighter.y += fighter.vy;

  if (!fighter.grounded) {
    fighter.vy += profile.gravity;
    if (fighter.y >= FLOOR_Y) {
      fighter.y = FLOOR_Y;
      fighter.vy = 0;
      fighter.grounded = true;
      if (fighter.action === 'jump') {
        fighter.action = 'idle';
        fighter.actionFrame = 0;
      }
    }
  } else {
    fighter.y = FLOOR_Y;
    if (fighter.action === 'hitstun' || fighter.action === 'stunned') {
      fighter.vx *= 0.84;
    }
  }
}

export function resetFighterEdge(fighter: FighterState): void {
  fighter.edge = {
    prev: { ...EMPTY_INPUT },
    bufferedAction: null,
    bufferFrames: 0,
  };
}
