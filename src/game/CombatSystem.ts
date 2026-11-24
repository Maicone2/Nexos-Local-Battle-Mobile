import {
  boxesOverlap,
  getActiveHitbox,
  getHurtbox,
  getProjectileBox,
  isAttackAction,
  resolvePushboxes,
} from './CollisionSystem';
import {
  DEFAULT_INPUT_BUFFER_WINDOW,
  EMPTY_INPUT,
  FIGHTER_PROFILES,
  FIXED_FPS,
  FLOOR_Y,
  getMoveSpec,
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
  MoveId,
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
    energy: 25,
    maxEnergy: 100,
    stun: 0,
    maxStun: 100,
    guardMeter: 100,
    maxGuardMeter: 100,
    action: 'idle',
    currentMove: null,
    actionFrame: 0,
    blockFrames: 0,
    stunTimer: 0,
    knockdownTimer: 0,
    hitFlashFrames: 0,
    hasHitCurrentAttack: false,
    airJumpsLeft: profile.canDoubleJump ? 1 : 0,
    airComboCount: 0,
    wallBouncedThisCombo: false,
    comboCount: 0,
    comboDamage: 0,
    comboTimer: 0,
    lastComboCount: 0,
    droppedComboTimer: 0,
    maxComboReached: 0,
    totalDamageDealt: 0,
    roundsWon: 0,
    invulnFrames: 0,
    dashCooldown: 0,
    lastMoveStartup: 0,
    lastMoveActive: 0,
    lastMoveRecovery: 0,
    lastMoveName: '—',
    afterimages: [],
    edge: {
      prev: { ...EMPTY_INPUT },
      bufferedAction: null,
      bufferFrames: 0,
      lastTapLeftTick: -100,
      lastTapRightTick: -100,
      chordGuardTicks: 0,
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
  const isPractice = opts.mode === 'training' || opts.mode === 'combo_trials';
  const hpPct = isPractice ? opts.trainingHpPercent ?? 100 : 100;
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
    firstAttackAwarded: false,
    winnerSlot: null,
    p1: createFighterState(1, opts.p1Id, opts.p1Name ?? 'JOGADOR 1', hpPct),
    p2: createFighterState(2, opts.p2Id, opts.p2Name ?? (isPractice ? 'ALVO' : 'JOGADOR 2'), hpPct),
    projectiles: [],
    nextProjectileId: 1,
    callouts: [],
    nextCalloutId: 1,
    trainingInfiniteEnergy: isPractice ? Boolean(opts.trainingInfiniteEnergy ?? true) : false,
    trainingAutoRegen: isPractice ? Boolean(opts.trainingAutoRegen ?? true) : false,
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
  state.callouts = [];
  state.firstAttackAwarded = false;
  state.timerSeconds = ROUND_TIME_SECONDS;
  state.timerSubTicks = 0;
  state.hitstopFrames = 0;
  state.cameraShake = 0;
  state.phase = 'intro';
  state.phaseTimer = 60;
}

export interface StepSimulationOptions {
  inputBufferFrames?: number;
  cameraShakeLevel?: number;
}

function pushCallout(state: MatchState, slot: 1 | 2, text: string, color: string, frames = 48): void {
  state.callouts.push({
    id: state.nextCalloutId++,
    slot,
    text,
    color,
    framesLeft: frames,
  });
  if (state.callouts.length > 6) {
    state.callouts.shift();
  }
}

export function stepMatchSimulation(
  state: MatchState,
  p1Input: InputState,
  p2Input: InputState,
  options?: StepSimulationOptions
): CombatEvent[] {
  state.events = [];
  state.tick++;

  const bufferWindow = options?.inputBufferFrames ?? DEFAULT_INPUT_BUFFER_WINDOW;
  const shakeScale = options?.cameraShakeLevel ?? 1.0;

  // Decay camera callouts
  if (state.callouts.length > 0) {
    state.callouts = state.callouts
      .map((c) => ({ ...c, framesLeft: c.framesLeft - 1 }))
      .filter((c) => c.framesLeft > 0);
  }

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
    resolvePushboxes(state.p1, state.p2);
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
  if (state.mode !== 'training' && state.mode !== 'combo_trials') {
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
    if (state.trainingInfiniteEnergy) {
      state.p1.energy = state.p1.maxEnergy;
      state.p2.energy = state.p2.maxEnergy;
    }
    if (state.trainingAutoRegen) {
      if (
        state.p2.comboTimer === 0 &&
        state.p2.action !== 'hitstun' &&
        state.p2.action !== 'knockdown' &&
        state.p2.hp < state.p2.maxHp
      ) {
        state.p2.hp = Math.min(state.p2.maxHp, state.p2.hp + 10);
      }
      if (
        state.p1.comboTimer === 0 &&
        state.p1.action !== 'hitstun' &&
        state.p1.action !== 'knockdown' &&
        state.p1.hp < state.p1.maxHp
      ) {
        state.p1.hp = Math.min(state.p1.maxHp, state.p1.hp + 10);
      }
    }
  }

  // Update stun / hitstun / guard meter / combo timers
  tickFighterStatus(state.p1);
  tickFighterStatus(state.p2);

  // Process player inputs
  updateFighterInputAndMovement(
    state.p1,
    state.p2,
    p1Input,
    state.trainingInfiniteEnergy,
    state.tick,
    bufferWindow,
    (evt) => {
      state.events.push({ type: evt, x: state.p1.x, y: state.p1.y - 90, slot: 1, fighterId: state.p1.id });
    }
  );
  updateFighterInputAndMovement(
    state.p2,
    state.p1,
    p2Input,
    state.trainingInfiniteEnergy,
    state.tick,
    bufferWindow,
    (evt) => {
      state.events.push({ type: evt, x: state.p2.x, y: state.p2.y - 90, slot: 2, fighterId: state.p2.id });
    }
  );

  // Advance action frames
  state.p1.actionFrame++;
  state.p2.actionFrame++;

  // Spawn projectile for Kael's Pulse Wave on startup frame
  maybeSpawnSpecialProjectile(state, state.p1);
  maybeSpawnSpecialProjectile(state, state.p2);

  // Integrate physics & pushboxes
  applyFighterPhysics(state.p1);
  applyFighterPhysics(state.p2);
  resolvePushboxes(state.p1, state.p2);

  // Wall Bounce check when knocked hard into arena corners
  checkWallBounce(state, state.p1);
  checkWallBounce(state, state.p2);

  // Melee Hitbox Checks
  checkMeleeHit(state, state.p1, state.p2, shakeScale);
  checkMeleeHit(state, state.p2, state.p1, shakeScale);

  // Projectiles Update & Collision
  updateProjectiles(state, shakeScale);

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
  if (f.droppedComboTimer > 0) f.droppedComboTimer--;

  if (f.comboTimer > 0) {
    f.comboTimer--;
    if (f.comboTimer === 0) {
      if (f.comboCount >= 2) {
        f.lastComboCount = f.comboCount;
        f.droppedComboTimer = 42;
      }
      f.comboCount = 0;
      f.comboDamage = 0;
      f.wallBouncedThisCombo = false;
    }
  }

  // Recover guard meter when not actively blocking or guard-broken
  if (f.action !== 'block' && f.action !== 'guard_break' && f.guardMeter < f.maxGuardMeter) {
    f.guardMeter = Math.min(f.maxGuardMeter, f.guardMeter + 0.16);
  }

  if (f.stunTimer > 0) {
    f.stunTimer--;
    if (f.stunTimer === 0) {
      if (f.action === 'stunned') {
        f.stun = 0;
        f.action = 'idle';
        f.actionFrame = 0;
      } else if (f.action === 'guard_break') {
        f.guardMeter = f.maxGuardMeter;
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

function checkWallBounce(state: MatchState, defender: FighterState): void {
  if (
    defender.action === 'hitstun' &&
    !defender.grounded &&
    !defender.wallBouncedThisCombo &&
    Math.abs(defender.vx) > 8 &&
    (defender.x <= STAGE_LEFT + 34 || defender.x >= STAGE_RIGHT - 34)
  ) {
    defender.wallBouncedThisCombo = true;
    const bounceDir = defender.x <= STAGE_LEFT + 34 ? 1 : -1;
    defender.vx = bounceDir * 7.8;
    defender.vy = -10.8;
    defender.stunTimer = Math.max(defender.stunTimer, 24);
    state.cameraShake = Math.max(state.cameraShake, 9);
    const attackerSlot: 1 | 2 = defender.slot === 1 ? 2 : 1;
    pushCallout(state, attackerSlot, 'WALL BOUNCE!', '#38BDF8', 46);
    state.events.push({
      type: 'wall_bounce',
      x: defender.x,
      y: defender.y - 90,
      slot: defender.slot,
      fighterId: defender.id,
    });
  }
}

function maybeSpawnSpecialProjectile(state: MatchState, fighter: FighterState): void {
  if (fighter.action !== 'special' || !fighter.currentMove) return;
  const spec = getMoveSpec(fighter.id, fighter.currentMove);
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
    guardDamage: spec.guardDamage,
    lifeFrames: 0,
    maxLifeFrames: 85,
    moveId: fighter.currentMove,
  };
  state.projectiles.push(proj);
}

function checkMeleeHit(
  state: MatchState,
  attacker: FighterState,
  defender: FighterState,
  shakeScale: number
): void {
  if (attacker.hasHitCurrentAttack || defender.invulnFrames > 0 || defender.action === 'knockdown') {
    return;
  }
  if (!isAttackAction(attacker.action)) {
    return;
  }

  const spec = getMoveSpec(attacker.id, attacker.currentMove);
  const hitbox = getActiveHitbox(attacker);
  if (!hitbox) return;

  const hurtbox = getHurtbox(defender);
  if (!boxesOverlap(hitbox, hurtbox)) return;

  attacker.hasHitCurrentAttack = true;
  if (!attacker.grounded) {
    attacker.airComboCount++;
  }

  const baseDamage = spec.hpPercentDamage
    ? Math.round(defender.maxHp * spec.hpPercentDamage)
    : spec.damage;

  applyAttackImpact(
    state,
    attacker,
    defender,
    {
      damage: baseDamage,
      chipDamage: spec.chipDamage,
      hitstun: spec.hitstun,
      blockstun: spec.blockstun,
      knockbackX: spec.knockbackX,
      knockbackY: spec.knockbackY,
      stunBuild: spec.stunBuild,
      guardDamage: spec.guardDamage,
      energyGain: spec.energyGain,
      hitstopFrames: spec.hitstopFrames,
      category: spec.category,
      isLow: Boolean(spec.isLow),
      isOverhead: Boolean(spec.isOverhead),
      causesKnockdown: Boolean(spec.causesKnockdown),
      causesWallBounce: Boolean(spec.causesWallBounce),
      moveId: spec.id,
      label: spec.name,
      hitX: (hitbox.x + hitbox.width / 2 + defender.x) / 2,
      hitY: hitbox.y + hitbox.height / 2,
      dir: attacker.facing,
    },
    shakeScale
  );
}

function updateProjectiles(state: MatchState, shakeScale: number): void {
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

    if (
      defender.invulnFrames === 0 &&
      defender.action !== 'knockdown' &&
      boxesOverlap(getProjectileBox(proj), getHurtbox(defender))
    ) {
      applyAttackImpact(
        state,
        attacker,
        defender,
        {
          damage: proj.damage,
          chipDamage: proj.chipDamage,
          hitstun: proj.hitstun,
          blockstun: proj.blockstun,
          knockbackX: proj.knockbackX,
          knockbackY: -4.5,
          stunBuild: proj.stunBuild,
          guardDamage: proj.guardDamage,
          energyGain: 0,
          hitstopFrames: 8,
          category: 'special',
          isLow: false,
          isOverhead: false,
          causesKnockdown: false,
          causesWallBounce: false,
          moveId: proj.moveId,
          label: FIGHTER_PROFILES[proj.fighterId].specialMoveName,
          hitX: proj.x,
          hitY: proj.y,
          dir: proj.vx >= 0 ? 1 : -1,
        },
        shakeScale
      );
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
  guardDamage: number;
  energyGain: number;
  hitstopFrames: number;
  category: 'light' | 'medium' | 'heavy' | 'special' | 'ultimate';
  isLow: boolean;
  isOverhead: boolean;
  causesKnockdown: boolean;
  causesWallBounce: boolean;
  moveId?: MoveId;
  label?: string;
  hitX: number;
  hitY: number;
  dir: 1 | -1;
}

function applyAttackImpact(
  state: MatchState,
  attacker: FighterState,
  defender: FighterState,
  impact: ImpactData,
  shakeScale: number
): void {
  // Guard rules:
  // - Low attacks (Rasteira) break standing guard unless crouching!
  // - Overhead / Air attacks break crouching guard unless standing or airborne!
  const guardBlockedHighLow =
    defender.action === 'block' &&
    (!impact.isLow || defender.crouching) &&
    (!impact.isOverhead || !defender.crouching || !defender.grounded);

  if (guardBlockedHighLow) {
    const isPerfectGuard = defender.blockFrames > 0 && defender.blockFrames <= 5;
    if (isPerfectGuard) {
      // Perfect Guard: 0 chip, +14 energy, faster recovery, visual callout!
      defender.vx = impact.dir * impact.knockbackX * 0.35;
      defender.stunTimer = Math.max(4, impact.blockstun - 5);
      defender.energy = Math.min(defender.maxEnergy, defender.energy + 14);
      state.hitstopFrames = Math.max(3, Math.floor(impact.hitstopFrames * 0.8));
      state.cameraShake = Math.max(state.cameraShake, 4 * shakeScale);
      pushCallout(state, defender.slot, 'PERFECT GUARD!', '#00E5FF', 44);
      state.events.push({
        type: 'perfect_guard',
        x: impact.hitX,
        y: impact.hitY,
        slot: defender.slot,
        fighterId: defender.id,
        damage: 0,
        label: impact.label,
      });
      return;
    }

    // Standard block + guard meter drain
    defender.guardMeter = Math.max(0, defender.guardMeter - impact.guardDamage);
    if (defender.guardMeter === 0) {
      defender.action = 'guard_break';
      defender.actionFrame = 0;
      defender.stunTimer = 42;
      defender.vx = impact.dir * 8;
      state.hitstopFrames = 9;
      state.cameraShake = Math.max(state.cameraShake, 10 * shakeScale);
      pushCallout(state, attacker.slot, 'GUARD BREAK!', '#EF4444', 52);
      state.events.push({
        type: 'guard_break',
        x: impact.hitX,
        y: impact.hitY,
        slot: defender.slot,
        fighterId: defender.id,
        label: impact.label,
      });
      return;
    }

    const chip = Math.min(Math.max(1, defender.hp - 1), impact.chipDamage);
    defender.hp = Math.max(1, defender.hp - chip);
    defender.vx = impact.dir * impact.knockbackX * 0.65;
    defender.stunTimer = impact.blockstun;
    defender.energy = Math.min(defender.maxEnergy, defender.energy + 6);
    attacker.energy = Math.min(attacker.maxEnergy, attacker.energy + Math.round(impact.energyGain * 0.5));
    state.hitstopFrames = Math.max(2, Math.floor(impact.hitstopFrames * 0.6));
    state.cameraShake = Math.max(state.cameraShake, 3.5 * shakeScale);
    state.events.push({
      type: 'block',
      x: impact.hitX,
      y: impact.hitY,
      slot: defender.slot,
      fighterId: defender.id,
      damage: chip,
      label: impact.label,
    });
    return;
  }

  // First Attack Bonus Callout
  if (!state.firstAttackAwarded) {
    state.firstAttackAwarded = true;
    attacker.energy = Math.min(attacker.maxEnergy, attacker.energy + 10);
    pushCallout(state, attacker.slot, 'PRIMEIRO GOLPE!', '#F5B700', 48);
    state.events.push({
      type: 'first_attack',
      x: impact.hitX,
      y: impact.hitY - 24,
      slot: attacker.slot,
      fighterId: attacker.id,
    });
  }

  // Counter Hit / Punish Counter detection
  let counterMult = 1.0;
  let extraHitstun = 0;
  if (isAttackAction(defender.action)) {
    const defSpec = getMoveSpec(defender.id, defender.currentMove);
    if (defender.actionFrame < defSpec.startup + defSpec.active) {
      counterMult = 1.2;
      extraHitstun = 4;
      pushCallout(state, attacker.slot, 'CONTRA-GOLPE!', '#F5B700', 48);
      state.events.push({
        type: 'counter_hit',
        x: impact.hitX,
        y: impact.hitY,
        slot: attacker.slot,
        fighterId: attacker.id,
      });
    } else {
      counterMult = 1.25;
      extraHitstun = 6;
      pushCallout(state, attacker.slot, 'PUNISH COUNTER!', '#FB7185', 52);
      state.events.push({
        type: 'punish_counter',
        x: impact.hitX,
        y: impact.hitY,
        slot: attacker.slot,
        fighterId: attacker.id,
      });
    }
  }

  // Combo scaling: preserve exact raw HP% on 1st hit, scale gracefully on chained combos
  defender.comboCount++;
  defender.comboTimer = 58;
  const scale = defender.comboCount === 1 ? 1.0 : Math.max(0.5, 1 - (defender.comboCount - 1) * 0.08);
  const finalDamage = Math.round(impact.damage * scale * counterMult);

  defender.hp = Math.max(0, defender.hp - finalDamage);
  defender.comboDamage += finalDamage;
  attacker.totalDamageDealt += finalDamage;
  attacker.maxComboReached = Math.max(attacker.maxComboReached, defender.comboCount);

  attacker.energy = Math.min(attacker.maxEnergy, attacker.energy + impact.energyGain);
  defender.energy = Math.min(defender.maxEnergy, defender.energy + 7);

  defender.vx = impact.dir * impact.knockbackX;
  if (impact.knockbackY < 0) {
    defender.vy = impact.knockbackY;
    defender.grounded = false;
  } else if (impact.knockbackY > 0 && !defender.grounded) {
    defender.vy = impact.knockbackY;
  }
  defender.crouching = false;
  defender.hitFlashFrames = 4;

  // Stun & Knockdown handling
  defender.stun = Math.min(defender.maxStun, defender.stun + impact.stunBuild);
  if (defender.stun >= defender.maxStun && defender.hp > 0) {
    defender.action = 'stunned';
    defender.currentMove = null;
    defender.actionFrame = 0;
    defender.stunTimer = 95;
    defender.stun = 0;
    pushCallout(state, attacker.slot, 'ATORDOADO!', '#F5B700', 55);
    state.events.push({
      type: 'stun',
      x: defender.x,
      y: defender.y - 165,
      slot: defender.slot,
      fighterId: defender.id,
    });
  } else if (impact.causesKnockdown) {
    defender.action = 'knockdown';
    defender.currentMove = null;
    defender.actionFrame = 0;
    defender.knockdownTimer = 28;
    defender.stunTimer = 0;
  } else {
    defender.action = 'hitstun';
    defender.currentMove = null;
    defender.actionFrame = 0;
    defender.stunTimer = impact.hitstun + extraHitstun;
  }

  state.hitstopFrames = impact.hitstopFrames + (counterMult > 1 ? 2 : 0);
  const baseShake =
    impact.category === 'ultimate'
      ? 16
      : impact.category === 'heavy' || impact.category === 'special'
      ? 10.5
      : impact.category === 'medium'
      ? 6.5
      : 4.0;
  state.cameraShake = Math.max(state.cameraShake, baseShake * shakeScale);

  const eventType: CombatEvent['type'] =
    impact.category === 'ultimate'
      ? 'ultimate'
      : impact.category === 'heavy' || impact.category === 'special'
      ? 'heavy_hit'
      : impact.category === 'medium'
      ? 'medium_hit'
      : 'hit';

  state.events.push({
    type: eventType,
    x: impact.hitX,
    y: impact.hitY,
    slot: defender.slot,
    fighterId: defender.id,
    damage: finalDamage,
    combo: defender.comboCount,
    moveId: impact.moveId,
    label: impact.label,
  });
}

function checkKoState(state: MatchState): void {
  if (state.p1.hp > 0 && state.p2.hp > 0) return;

  if (state.mode === 'training' || state.mode === 'combo_trials') {
    if (state.p1.hp <= 0) state.p1.hp = state.p1.maxHp;
    if (state.p2.hp <= 0) state.p2.hp = state.p2.maxHp;
    return;
  }

  state.phase = 'ko';
  state.phaseTimer = 110;
  state.cameraShake = 16;

  if (state.p1.hp <= 0 && state.p2.hp <= 0) {
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
