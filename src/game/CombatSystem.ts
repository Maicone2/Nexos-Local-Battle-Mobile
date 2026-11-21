import { boxesOverlap, getActiveHitbox, getHurtbox, getProjectileBox, resolvePushboxes } from './CollisionSystem';
import {
  EMPTY_INPUT,
  FIGHTER_PROFILES,
  FIXED_FPS,
  FLOOR_Y,
  ROUNDS_TO_WIN,
  ROUND_TIME_SECONDS,
  STAGE_LEFT,
  STAGE_RIGHT,
} from './constants';
import { applyFighterPhysics, resetFighterEdge, updateFighterInputAndMovement } from './FighterController';
import {
  CombatEvent,
  FighterId,
  FighterState,
  GameMode,
  InputState,
  MatchState,
  Projectile,
  StageId,
} from './types';

export function createFighterState(
  slot: 1 | 2,
  id: FighterId,
  playerName: string,
  hpPercent = 100
): FighterState {
  const profile = FIGHTER_PROFILES[id];
  const scaledMax = Math.max(100, Math.round((profile.maxHp * hpPercent) / 100));
  return {
    slot,
    id,
    playerName,
    x: slot === 1 ? 390 : 890,
    y: FLOOR_Y,
    vx: 0,
    vy: 0,
    facing: slot === 1 ? 1 : -1,
    grounded: true,
    crouching: false,
    hp: scaledMax,
    trailHp: scaledMax,
    maxHp: scaledMax,
    energy: slot === 1 ? 25 : 25,
    maxEnergy: 100,
    stun: 0,
    maxStun: 100,
    action: 'idle',
    actionFrame: 0,
    stunTimer: 0,
    hitFlashFrames: 0,
    hasHitCurrentAttack: false,
    comboCount: 0,
    comboTimer: 0,
    maxComboReached: 0,
    totalDamageDealt: 0,
    roundsWon: 0,
    invulnFrames: 0,
    edge: {
      prev: { ...EMPTY_INPUT },
      bufferedAction: null,
      bufferFrames: 0,
    },
  };
}

export interface CreateMatchOptions {
  mode: GameMode;
  stage: StageId;
  p1Id: FighterId;
  p2Id: FighterId;
  p1Name?: string;
  p2Name?: string;
  trainingHpPercent?: number;
  trainingInfiniteEnergy?: boolean;
  trainingAutoRegen?: boolean;
}

export function createMatchState(opts: CreateMatchOptions): MatchState {
  const hpPct = opts.mode === 'training' ? opts.trainingHpPercent ?? 100 : 100;
  return {
    tick: 0,
    mode: opts.mode,
    stage: opts.stage,
    phase: 'intro',
    phaseTimer: 65,
    roundNumber: 1,
    timerSeconds: ROUND_TIME_SECONDS,
    timerSubTicks: 0,
    hitstopFrames: 0,
    cameraShake: 0,
    winnerSlot: null,
    p1: createFighterState(1, opts.p1Id, opts.p1Name ?? 'JOGADOR 1', hpPct),
    p2: createFighterState(2, opts.p2Id, opts.p2Name ?? (opts.mode === 'training' ? 'CPU' : 'JOGADOR 2'), hpPct),
    projectiles: [],
    nextProjectileId: 1,
    trainingInfiniteEnergy: opts.mode === 'training' ? Boolean(opts.trainingInfiniteEnergy) : false,
    trainingAutoRegen: opts.mode === 'training' ? Boolean(opts.trainingAutoRegen) : false,
    trainingHpPercent: hpPct,
    events: [],
  };
}

export function resetRound(state: MatchState): void {
  const p1Wins = state.p1.roundsWon;
  const p2Wins = state.p2.roundsWon;
  const p1Dmg = state.p1.totalDamageDealt;
  const p2Dmg = state.p2.totalDamageDealt;
  const p1MaxCombo = state.p1.maxComboReached;
  const p2MaxCombo = state.p2.maxComboReached;

  state.p1 = createFighterState(1, state.p1.id, state.p1.playerName, state.trainingHpPercent);
  state.p2 = createFighterState(2, state.p2.id, state.p2.playerName, state.trainingHpPercent);

  state.p1.roundsWon = p1Wins;
  state.p2.roundsWon = p2Wins;
  state.p1.totalDamageDealt = p1Dmg;
  state.p2.totalDamageDealt = p2Dmg;
  state.p1.maxComboReached = p1MaxCombo;
  state.p2.maxComboReached = p2MaxCombo;

  state.projectiles = [];
  state.timerSeconds = ROUND_TIME_SECONDS;
  state.timerSubTicks = 0;
  state.hitstopFrames = 0;
  state.cameraShake = 0;
  state.phase = 'intro';
  state.phaseTimer = 60;
}

export function stepMatchSimulation(
  state: MatchState,
  p1Input: InputState,
  p2Input: InputState
): CombatEvent[] {
  state.events = [];
  state.tick++;

  // Smoothly decay trailing damage bar and camera shake even during hitstop
  state.cameraShake = Math.max(0, state.cameraShake * 0.84 - 0.12);
  decayTrailHp(state.p1);
  decayTrailHp(state.p2);
  if (state.p1.hitFlashFrames > 0) state.p1.hitFlashFrames--;
  if (state.p2.hitFlashFrames > 0) state.p2.hitFlashFrames--;

  if (state.hitstopFrames > 0) {
    state.hitstopFrames--;
    return state.events;
  }

  // Round intro countdown
  if (state.phase === 'intro') {
    state.phaseTimer--;
    state.p1.actionFrame++;
    state.p2.actionFrame++;
    if (state.phaseTimer === 1) {
      state.events.push({
        type: 'round_start',
        x: 640,
        y: 300,
        slot: 1,
        fighterId: state.p1.id,
      });
    }
    if (state.phaseTimer <= 0) {
      state.phase = 'fighting';
    }
    return state.events;
  }

  // KO / Round Over / Match Over transitions
  if (state.phase === 'ko') {
    state.phaseTimer--;
    applyFighterPhysics(state.p1);
    applyFighterPhysics(state.p2);
    state.p1.actionFrame++;
    state.p2.actionFrame++;
    if (state.phaseTimer <= 0) {
      if (state.p1.roundsWon >= ROUNDS_TO_WIN || state.p2.roundsWon >= ROUNDS_TO_WIN) {
        state.phase = 'match_over';
        state.winnerSlot = state.p1.roundsWon >= ROUNDS_TO_WIN ? 1 : 2;
      } else {
        state.roundNumber++;
        resetRound(state);
      }
    }
    return state.events;
  }

  if (state.phase === 'match_over') {
    state.p1.actionFrame++;
    state.p2.actionFrame++;
    return state.events;
  }

  // Active Fighting Phase
  if (state.mode !== 'training') {
    state.timerSubTicks++;
    if (state.timerSubTicks >= FIXED_FPS) {
      state.timerSubTicks = 0;
      if (state.timerSeconds > 0) {
        state.timerSeconds--;
      }
      if (state.timerSeconds === 0) {
        resolveTimeoutRound(state);
        return state.events;
      }
    }
  } else {
    // Training mode infinite energy & auto regen
    if (state.trainingInfiniteEnergy) {
      state.p1.energy = state.p1.maxEnergy;
      state.p2.energy = state.p2.maxEnergy;
    }
    if (state.trainingAutoRegen) {
      if (state.p2.comboTimer === 0 && state.p2.action !== 'hitstun' && state.p2.hp < state.p2.maxHp) {
        state.p2.hp = Math.min(state.p2.maxHp, state.p2.hp + 8);
      }
      if (state.p1.comboTimer === 0 && state.p1.action !== 'hitstun' && state.p1.hp < state.p1.maxHp) {
        state.p1.hp = Math.min(state.p1.maxHp, state.p1.hp + 8);
      }
    }
  }

  // Update stun / hitstun / combo timers
  tickFighterStatus(state.p1);
  tickFighterStatus(state.p2);

  // Process player inputs
  updateFighterInputAndMovement(state.p1, state.p2, p1Input, state.trainingInfiniteEnergy, (evt) => {
    state.events.push({ type: evt, x: state.p1.x, y: state.p1.y - 90, slot: 1, fighterId: state.p1.id });
  });
  updateFighterInputAndMovement(state.p2, state.p1, p2Input, state.trainingInfiniteEnergy, (evt) => {
    state.events.push({ type: evt, x: state.p2.x, y: state.p2.y - 90, slot: 2, fighterId: state.p2.id });
  });

  // Advance action frames
  state.p1.actionFrame++;
  state.p2.actionFrame++;

  // Spawn projectile for Kael's Pulso Solar on active startup frame
  maybeSpawnSpecialProjectile(state, state.p1);
  maybeSpawnSpecialProjectile(state, state.p2);

  // Integrate physics & pushboxes
  applyFighterPhysics(state.p1);
  applyFighterPhysics(state.p2);
  resolvePushboxes(state.p1, state.p2);

  // Melee Hitbox Checks
  checkMeleeHit(state, state.p1, state.p2);
  checkMeleeHit(state, state.p2, state.p1);

  // Projectiles Update & Collision
  updateProjectiles(state);

  // Check KO condition
  checkKoState(state);

  return state.events;
}

function decayTrailHp(f: FighterState): void {
  if (f.trailHp > f.hp) {
    f.trailHp = Math.max(f.hp, f.trailHp - Math.max(2, (f.trailHp - f.hp) * 0.08));
  } else {
    f.trailHp = f.hp;
  }
}

function tickFighterStatus(f: FighterState): void {
  if (f.invulnFrames > 0) f.invulnFrames--;

  if (f.comboTimer > 0) {
    f.comboTimer--;
    if (f.comboTimer === 0) {
      f.comboCount = 0;
    }
  }

  if (f.stunTimer > 0) {
    f.stunTimer--;
    if (f.stunTimer === 0) {
      if (f.action === 'stunned') {
        f.stun = 0;
        f.action = 'idle';
        f.actionFrame = 0;
      } else if (f.action === 'hitstun') {
        f.action = f.grounded ? 'idle' : 'jump';
        f.actionFrame = 0;
      }
    }
  } else if (f.stun > 0 && f.action !== 'hitstun' && f.action !== 'stunned') {
    f.stun = Math.max(0, f.stun - 0.12);
  }
}

function maybeSpawnSpecialProjectile(state: MatchState, fighter: FighterState): void {
  if (fighter.action !== 'special') return;
  const spec = FIGHTER_PROFILES[fighter.id].attacks.special;
  if (!spec.isProjectile || fighter.actionFrame !== spec.startup) return;

  const proj: Projectile = {
    id: state.nextProjectileId++,
    ownerSlot: fighter.slot,
    fighterId: fighter.id,
    x: fighter.x + fighter.facing * 64,
    y: fighter.y - 102,
    vx: fighter.facing * 13.5,
    vy: 0,
    radius: 34,
    damage: spec.damage,
    chipDamage: spec.chipDamage,
    hitstun: spec.hitstun,
    blockstun: spec.blockstun,
    knockbackX: spec.knockbackX,
    stunBuild: spec.stunBuild,
    lifeFrames: 0,
    maxLifeFrames: 85,
  };
  state.projectiles.push(proj);
}

function checkMeleeHit(state: MatchState, attacker: FighterState, defender: FighterState): void {
  if (attacker.hasHitCurrentAttack || defender.invulnFrames > 0) return;
  if (attacker.action !== 'light' && attacker.action !== 'heavy' && attacker.action !== 'special') {
    return;
  }

  const spec = FIGHTER_PROFILES[attacker.id].attacks[attacker.action];
  // For projectile specials, projectile handles ranged hit; melee box still hits point-blank once
  const hitbox = getActiveHitbox(attacker);
  if (!hitbox) return;

  const hurtbox = getHurtbox(defender);
  if (!boxesOverlap(hitbox, hurtbox)) return;

  attacker.hasHitCurrentAttack = true;
  applyAttackImpact(state, attacker, defender, {
    damage: spec.damage,
    chipDamage: spec.chipDamage,
    hitstun: spec.hitstun,
    blockstun: spec.blockstun,
    knockbackX: spec.knockbackX,
    knockbackY: spec.knockbackY,
    stunBuild: spec.stunBuild,
    energyGain: spec.energyGain,
    hitstopFrames: spec.hitstopFrames,
    isHeavyOrSpecial: attacker.action !== 'light',
    hitX: (hitbox.x + hitbox.width / 2 + defender.x) / 2,
    hitY: hitbox.y + hitbox.height / 2,
    dir: attacker.facing,
  });
}

function updateProjectiles(state: MatchState): void {
  const remaining: Projectile[] = [];

  for (const proj of state.projectiles) {
    proj.x += proj.vx;
    proj.y += proj.vy;
    proj.lifeFrames++;

    if (proj.lifeFrames >= proj.maxLifeFrames || proj.x < STAGE_LEFT - 80 || proj.x > STAGE_RIGHT + 80) {
      continue;
    }

    // Projectile clash
    let clashed = false;
    for (const other of state.projectiles) {
      if (other.id !== proj.id && other.ownerSlot !== proj.ownerSlot) {
        if (boxesOverlap(getProjectileBox(proj), getProjectileBox(other))) {
          clashed = true;
          state.events.push({
            type: 'block',
            x: (proj.x + other.x) / 2,
            y: proj.y,
            slot: proj.ownerSlot,
            fighterId: proj.fighterId,
          });
          break;
        }
      }
    }
    if (clashed) continue;

    const attacker = proj.ownerSlot === 1 ? state.p1 : state.p2;
    const defender = proj.ownerSlot === 1 ? state.p2 : state.p1;

    if (defender.invulnFrames === 0 && boxesOverlap(getProjectileBox(proj), getHurtbox(defender))) {
      applyAttackImpact(state, attacker, defender, {
        damage: proj.damage,
        chipDamage: proj.chipDamage,
        hitstun: proj.hitstun,
        blockstun: proj.blockstun,
        knockbackX: proj.knockbackX,
        knockbackY: -4.5,
        stunBuild: proj.stunBuild,
        energyGain: 0,
        hitstopFrames: 8,
        isHeavyOrSpecial: true,
        hitX: proj.x,
        hitY: proj.y,
        dir: proj.vx >= 0 ? 1 : -1,
      });
      continue;
    }

    remaining.push(proj);
  }

  state.projectiles = remaining;
}

interface ImpactData {
  damage: number;
  chipDamage: number;
  hitstun: number;
  blockstun: number;
  knockbackX: number;
  knockbackY: number;
  stunBuild: number;
  energyGain: number;
  hitstopFrames: number;
  isHeavyOrSpecial: boolean;
  hitX: number;
  hitY: number;
  dir: 1 | -1;
}

function applyAttackImpact(
  state: MatchState,
  attacker: FighterState,
  defender: FighterState,
  impact: ImpactData
): void {
  const isBlocking = defender.action === 'block' && defender.grounded;

  if (isBlocking) {
    const chip = Math.min(Math.max(1, defender.hp - 1), impact.chipDamage);
    defender.hp = Math.max(1, defender.hp - chip);
    defender.vx = impact.dir * impact.knockbackX * 0.65;
    defender.stunTimer = impact.blockstun;
    defender.energy = Math.min(defender.maxEnergy, defender.energy + 6);
    attacker.energy = Math.min(attacker.maxEnergy, attacker.energy + Math.round(impact.energyGain * 0.5));
    state.hitstopFrames = Math.max(2, Math.floor(impact.hitstopFrames * 0.6));
    state.cameraShake = Math.max(state.cameraShake, 3.5);
    state.events.push({
      type: 'block',
      x: impact.hitX,
      y: impact.hitY,
      slot: defender.slot,
      fighterId: defender.id,
      damage: chip,
    });
    return;
  }

  // Combo scaling: preserve rewarding combos without instant 1-touch KOs
  defender.comboCount++;
  defender.comboTimer = 55;
  const scale = Math.max(0.55, 1 - (defender.comboCount - 1) * 0.1);
  const finalDamage = Math.round(impact.damage * scale);

  defender.hp = Math.max(0, defender.hp - finalDamage);
  attacker.totalDamageDealt += finalDamage;
  attacker.maxComboReached = Math.max(attacker.maxComboReached, defender.comboCount);

  attacker.energy = Math.min(attacker.maxEnergy, attacker.energy + impact.energyGain);
  defender.energy = Math.min(defender.maxEnergy, defender.energy + 7);

  defender.vx = impact.dir * impact.knockbackX;
  if (impact.knockbackY < 0) {
    defender.vy = impact.knockbackY;
    defender.grounded = false;
  }
  defender.crouching = false;
  defender.hitFlashFrames = 4;

  // Stun accumulation
  defender.stun = Math.min(defender.maxStun, defender.stun + impact.stunBuild);
  if (defender.stun >= defender.maxStun && defender.hp > 0) {
    defender.action = 'stunned';
    defender.actionFrame = 0;
    defender.stunTimer = 95; // temporary dizzy window
    defender.stun = 0;
    state.events.push({
      type: 'stun',
      x: defender.x,
      y: defender.y - 165,
      slot: defender.slot,
      fighterId: defender.id,
    });
  } else {
    defender.action = 'hitstun';
    defender.actionFrame = 0;
    defender.stunTimer = impact.hitstun;
  }

  state.hitstopFrames = impact.hitstopFrames;
  state.cameraShake = Math.max(state.cameraShake, impact.isHeavyOrSpecial ? 11 : 4.5);

  state.events.push({
    type: impact.isHeavyOrSpecial ? 'heavy_hit' : 'hit',
    x: impact.hitX,
    y: impact.hitY,
    slot: defender.slot,
    fighterId: defender.id,
    damage: finalDamage,
    combo: defender.comboCount,
  });
}

function checkKoState(state: MatchState): void {
  if (state.p1.hp > 0 && state.p2.hp > 0) return;

  if (state.mode === 'training') {
    // In training mode, recover KO'd dummy quickly instead of ending match
    if (state.p1.hp <= 0) state.p1.hp = state.p1.maxHp;
    if (state.p2.hp <= 0) state.p2.hp = state.p2.maxHp;
    return;
  }

  state.phase = 'ko';
  state.phaseTimer = 110;
  state.cameraShake = 16;

  if (state.p1.hp <= 0 && state.p2.hp <= 0) {
    // Double KO: award point to higher rounds or P1 tiebreak if final
    state.p1.action = 'defeat';
    state.p2.action = 'defeat';
    state.p1.roundsWon++;
  } else if (state.p2.hp <= 0) {
    state.p2.action = 'defeat';
    state.p2.actionFrame = 0;
    state.p1.action = 'victory';
    state.p1.actionFrame = 0;
    state.p1.roundsWon++;
  } else {
    state.p1.action = 'defeat';
    state.p1.actionFrame = 0;
    state.p2.action = 'victory';
    state.p2.actionFrame = 0;
    state.p2.roundsWon++;
  }

  resetFighterEdge(state.p1);
  resetFighterEdge(state.p2);

  state.events.push({
    type: 'ko',
    x: 640,
    y: 340,
    slot: state.p2.hp <= 0 ? 1 : 2,
    fighterId: state.p2.hp <= 0 ? state.p1.id : state.p2.id,
  });
}

function resolveTimeoutRound(state: MatchState): void {
  const p1Ratio = state.p1.hp / state.p1.maxHp;
  const p2Ratio = state.p2.hp / state.p2.maxHp;

  state.phase = 'ko';
  state.phaseTimer = 100;

  if (p1Ratio >= p2Ratio) {
    state.p1.roundsWon++;
    state.p1.action = 'victory';
    state.p2.action = 'defeat';
  } else {
    state.p2.roundsWon++;
    state.p2.action = 'victory';
    state.p1.action = 'defeat';
  }
  state.p1.actionFrame = 0;
  state.p2.actionFrame = 0;
  resetFighterEdge(state.p1);
  resetFighterEdge(state.p2);
}
