import test from 'node:test';
import assert from 'node:assert/strict';
import { createMatchState, stepMatchSimulation } from './CombatSystem';
import { EMPTY_INPUT } from './constants';
import { InputState, MatchState } from './types';

function advanceTicks(state: MatchState, ticks: number, p1: InputState = EMPTY_INPUT, p2: InputState = EMPTY_INPUT) {
  const allEvents = [];
  for (let i = 0; i < ticks; i++) {
    allEvents.push(...stepMatchSimulation(state, p1, p2));
  }
  return allEvents;
}

test('match starts in intro and transitions to fighting without errors', () => {
  const state = createMatchState({
    mode: 'local2p',
    stage: 'orbital_arena',
    p1Id: 'kael',
    p2Id: 'vexa',
  });
  assert.equal(state.phase, 'intro');
  advanceTicks(state, 70);
  assert.equal(state.phase, 'fighting');
  assert.equal(state.p1.hp, state.p1.maxHp);
  assert.equal(state.p2.hp, state.p2.maxHp);
});

test('fighters move horizontally and pushboxes prevent overlapping', () => {
  const state = createMatchState({
    mode: 'local2p',
    stage: 'orbital_arena',
    p1Id: 'kael',
    p2Id: 'vexa',
  });
  advanceTicks(state, 70);

  const startDist = state.p2.x - state.p1.x;
  assert.ok(startDist > 300);

  advanceTicks(
    state,
    90,
    { ...EMPTY_INPUT, right: true },
    { ...EMPTY_INPUT, left: true }
  );

  const endDist = state.p2.x - state.p1.x;
  assert.ok(endDist < startDist);
  assert.ok(endDist >= 50, `Expected pushbox separation >= 50, got ${endDist}`);
});

test('light -> heavy combo deals scaled damage, builds energy, and triggers hitstop', () => {
  const state = createMatchState({
    mode: 'local2p',
    stage: 'orbital_arena',
    p1Id: 'kael',
    p2Id: 'vexa',
  });
  advanceTicks(state, 70);

  state.p1.x = 600;
  state.p2.x = 690;

  stepMatchSimulation(state, { ...EMPTY_INPUT, light: true }, EMPTY_INPUT);
  advanceTicks(state, 10, EMPTY_INPUT, EMPTY_INPUT);

  assert.ok(state.p2.hp < state.p2.maxHp, 'Light attack should deal damage');
  assert.ok(state.p1.energy > 25, 'Light attack should build energy');
  const hpAfterLight = state.p2.hp;

  stepMatchSimulation(state, { ...EMPTY_INPUT, heavy: true }, EMPTY_INPUT);
  advanceTicks(state, 22, EMPTY_INPUT, EMPTY_INPUT);

  assert.ok(state.p2.hp < hpAfterLight, 'Heavy follow-up should deal additional damage');
  assert.ok(state.p1.maxComboReached >= 2, `Expected combo >= 2, got ${state.p1.maxComboReached}`);
});

test('blocking mitigates damage and puts defender into block state', () => {
  const state = createMatchState({
    mode: 'local2p',
    stage: 'orbital_arena',
    p1Id: 'kael',
    p2Id: 'vexa',
  });
  advanceTicks(state, 70);

  state.p1.x = 600;
  state.p2.x = 695;

  stepMatchSimulation(state, { ...EMPTY_INPUT, heavy: true }, { ...EMPTY_INPUT, block: true });
  const events = advanceTicks(state, 24, EMPTY_INPUT, { ...EMPTY_INPUT, block: true });

  const blockEvents = events.filter((e) => e.type === 'block');
  assert.ok(blockEvents.length > 0, 'Expected block event');
  assert.equal(state.p2.maxHp - state.p2.hp, 18);
});

test('Kael Pulso Solar consumes energy, spawns projectile, and hits across stage', () => {
  const state = createMatchState({
    mode: 'local2p',
    stage: 'energy_dock',
    p1Id: 'kael',
    p2Id: 'vexa',
  });
  advanceTicks(state, 70);

  state.p1.energy = 60;
  state.p1.x = 300;
  state.p2.x = 800;

  stepMatchSimulation(state, { ...EMPTY_INPUT, special: true }, EMPTY_INPUT);
  assert.equal(state.p1.energy, 10, 'Special should spend 50 energy');

  advanceTicks(state, 45, EMPTY_INPUT, EMPTY_INPUT);
  assert.ok(state.p2.hp < state.p2.maxHp, 'Pulso Solar projectile should hit Vexa across arena');
});

test('first player to win 2 rounds wins the match', () => {
  const state = createMatchState({
    mode: 'local2p',
    stage: 'orbital_arena',
    p1Id: 'vexa',
    p2Id: 'kael',
  });
  advanceTicks(state, 70);

  state.p2.hp = 10;
  state.p1.x = 600;
  state.p2.x = 685;
  stepMatchSimulation(state, { ...EMPTY_INPUT, light: true }, EMPTY_INPUT);
  advanceTicks(state, 130, EMPTY_INPUT, EMPTY_INPUT);

  assert.equal(state.p1.roundsWon, 1);
  assert.equal(state.roundNumber, 2);
  assert.equal(state.phase, 'intro');

  advanceTicks(state, 65, EMPTY_INPUT, EMPTY_INPUT);
  assert.equal(state.phase, 'fighting');

  state.p2.hp = 10;
  state.p1.x = 600;
  state.p2.x = 685;
  stepMatchSimulation(state, { ...EMPTY_INPUT, light: true }, EMPTY_INPUT);
  advanceTicks(state, 130, EMPTY_INPUT, EMPTY_INPUT);

  assert.equal(state.p1.roundsWon, 2);
  assert.equal(state.phase, 'match_over');
  assert.equal(state.winnerSlot, 1);
});

test('cross-up attack snaps facing toward opponent and hits in front', () => {
  const state = createMatchState({
    mode: 'local2p',
    stage: 'orbital_arena',
    p1Id: 'kael',
    p2Id: 'vexa',
  });
  advanceTicks(state, 70);

  state.p1.x = 700;
  state.p2.x = 620;
  state.p1.facing = 1;

  stepMatchSimulation(state, { ...EMPTY_INPUT, light: true }, EMPTY_INPUT);
  assert.equal(state.p1.facing, -1, 'P1 should face toward P2 (-1) when attacking from the right');

  advanceTicks(state, 10, EMPTY_INPUT, EMPTY_INPUT);
  assert.ok(state.p2.hp < state.p2.maxHp, 'Light attack after cross-up should hit P2');
});

test('Rasteira (down + medium) deals exact -9% maxHp, breaks standing guard, and causes knockdown', () => {
  const state = createMatchState({
    mode: 'local2p',
    stage: 'orbital_arena',
    p1Id: 'kael',
    p2Id: 'vexa',
  });
  advanceTicks(state, 70);

  state.p1.x = 600;
  state.p2.x = 690;
  const expectedDamage = Math.round(state.p2.maxHp * 0.09);

  // Even while P2 holds standing block, Rasteira is low and hits!
  stepMatchSimulation(state, { ...EMPTY_INPUT, down: true, medium: true }, { ...EMPTY_INPUT, block: true });
  assert.equal(state.p1.currentMove, 'crouch_medium_sweep');
  advanceTicks(state, 16, { ...EMPTY_INPUT, down: true }, { ...EMPTY_INPUT, block: true });

  assert.equal(state.p2.maxHp - state.p2.hp, expectedDamage, 'Rasteira must deal exact 9% of defender maxHp');
  assert.equal(state.p2.action, 'knockdown', 'Rasteira should cause knockdown on grounded defender');
});

test('Uppercut (down + light and down + heavy) deals exact -15% maxHp, launches opponent, and supports jump cancel', () => {
  const stateA = createMatchState({
    mode: 'local2p',
    stage: 'orbital_arena',
    p1Id: 'kael',
    p2Id: 'vexa',
  });
  advanceTicks(stateA, 70);
  stateA.p1.x = 600;
  stateA.p2.x = 675;
  const expectedDmg = Math.round(stateA.p2.maxHp * 0.15);

  stepMatchSimulation(stateA, { ...EMPTY_INPUT, down: true, light: true }, EMPTY_INPUT);
  assert.equal(stateA.p1.currentMove, 'crouch_uppercut');
  advanceTicks(stateA, 18, EMPTY_INPUT, EMPTY_INPUT);

  assert.equal(stateA.p2.maxHp - stateA.p2.hp, expectedDmg, 'down + light Uppercut must deal 15% maxHp');
  assert.equal(stateA.p2.grounded, false, 'Uppercut must launch opponent into the air');

  // Jump cancel into air light (Voadora)
  stepMatchSimulation(stateA, { ...EMPTY_INPUT, up: true, right: true }, EMPTY_INPUT);
  assert.equal(stateA.p1.grounded, false, 'Uppercut hit should allow Jump Cancel');

  // Also test down + heavy Uppercut
  const stateB = createMatchState({
    mode: 'local2p',
    stage: 'orbital_arena',
    p1Id: 'vexa',
    p2Id: 'kael',
  });
  advanceTicks(stateB, 70);
  stateB.p1.x = 600;
  stateB.p2.x = 675;
  stepMatchSimulation(stateB, { ...EMPTY_INPUT, down: true, heavy: true }, EMPTY_INPUT);
  assert.equal(stateB.p1.currentMove, 'crouch_uppercut');
  advanceTicks(stateB, 16, EMPTY_INPUT, EMPTY_INPUT);
  assert.equal(stateB.p2.maxHp - stateB.p2.hp, Math.round(stateB.p2.maxHp * 0.15));
});

test('Voadora (air light / air heavy) deals exact -10% maxHp and hits crouching guard', () => {
  const state = createMatchState({
    mode: 'local2p',
    stage: 'orbital_arena',
    p1Id: 'kael',
    p2Id: 'vexa',
  });
  advanceTicks(state, 70);

  state.p1.x = 620;
  state.p1.y = 480;
  state.p1.grounded = false;
  state.p1.action = 'jump';
  state.p2.x = 680;
  const expectedDamage = Math.round(state.p2.maxHp * 0.10);

  // Defender holds crouching block -> Voadora is an overhead and breaks crouching guard
  stepMatchSimulation(state, { ...EMPTY_INPUT, heavy: true }, { ...EMPTY_INPUT, down: true, block: true });
  assert.equal(state.p1.currentMove, 'air_heavy');
  advanceTicks(state, 16, EMPTY_INPUT, { ...EMPTY_INPUT, down: true, block: true });

  assert.equal(state.p2.maxHp - state.p2.hp, expectedDamage, 'Voadora must deal exact 10% of defender maxHp');
});

test('Diagonal inputs drive forward jump, crouch walk, and Vexa double jump', () => {
  const state = createMatchState({
    mode: 'local2p',
    stage: 'orbital_arena',
    p1Id: 'vexa',
    p2Id: 'kael',
  });
  advanceTicks(state, 70);

  // Diagonal down-right -> crouch walk
  advanceTicks(state, 6, { ...EMPTY_INPUT, down: true, right: true }, EMPTY_INPUT);
  assert.equal(state.p1.action, 'crouch_walk');
  assert.ok(state.p1.vx > 0);

  // Release down, press up + right diagonal jump
  stepMatchSimulation(state, EMPTY_INPUT, EMPTY_INPUT);
  stepMatchSimulation(state, { ...EMPTY_INPUT, up: true, right: true }, EMPTY_INPUT);
  assert.equal(state.p1.grounded, false);
  assert.ok(state.p1.vx > 0 && state.p1.vy < 0);

  // Wait a few frames, then trigger Vexa double jump
  advanceTicks(state, 6, EMPTY_INPUT, EMPTY_INPUT);
  stepMatchSimulation(state, { ...EMPTY_INPUT, up: true }, EMPTY_INPUT);
  assert.equal(state.p1.action, 'double_jump');
  assert.equal(state.p1.airJumpsLeft, 0);
});

test('Light -> Light -> Medium -> Special combo chains validly to 4+ hits', () => {
  const state = createMatchState({
    mode: 'training',
    stage: 'orbital_arena',
    p1Id: 'kael',
    p2Id: 'vexa',
    trainingInfiniteEnergy: true,
  });
  advanceTicks(state, 70);

  state.p1.x = 600;
  state.p2.x = 670;

  stepMatchSimulation(state, { ...EMPTY_INPUT, light: true }, EMPTY_INPUT);
  advanceTicks(state, 8, EMPTY_INPUT, EMPTY_INPUT);
  stepMatchSimulation(state, { ...EMPTY_INPUT, light: true }, EMPTY_INPUT);
  advanceTicks(state, 8, EMPTY_INPUT, EMPTY_INPUT);
  stepMatchSimulation(state, { ...EMPTY_INPUT, medium: true }, EMPTY_INPUT);
  advanceTicks(state, 12, EMPTY_INPUT, EMPTY_INPUT);
  stepMatchSimulation(state, { ...EMPTY_INPUT, special: true }, EMPTY_INPUT);
  advanceTicks(state, 28, EMPTY_INPUT, EMPTY_INPUT);

  assert.ok(state.p1.maxComboReached >= 4, `Expected >= 4-hit combo, got ${state.p1.maxComboReached}`);
});

test('Perfect Guard blocks with 0 chip damage and builds energy; Counter Hit boosts damage', () => {
  const state = createMatchState({
    mode: 'local2p',
    stage: 'orbital_arena',
    p1Id: 'kael',
    p2Id: 'vexa',
  });
  advanceTicks(state, 70);

  state.p1.x = 600;
  state.p2.x = 685;

  // Start light attack, defender waits 2 frames then blocks so impact lands within <= 5 blockFrames
  stepMatchSimulation(state, { ...EMPTY_INPUT, light: true }, EMPTY_INPUT);
  advanceTicks(state, 2, EMPTY_INPUT, EMPTY_INPUT);
  const startEnergy = state.p2.energy;
  const events = advanceTicks(state, 6, EMPTY_INPUT, { ...EMPTY_INPUT, block: true });

  const perfectEvents = events.filter((e) => e.type === 'perfect_guard');
  assert.ok(perfectEvents.length > 0, 'Expected Perfect Guard event');
  assert.equal(state.p2.hp, state.p2.maxHp, 'Perfect Guard should deal 0 chip damage');
  assert.ok(state.p2.energy > startEnergy, 'Perfect Guard should grant bonus energy');

  // Counter Hit test
  advanceTicks(state, 30, EMPTY_INPUT, EMPTY_INPUT);
  const hpBeforeCounter = state.p2.hp;
  stepMatchSimulation(state, { ...EMPTY_INPUT, light: true }, { ...EMPTY_INPUT, heavy: true });
  const counterEvents = advanceTicks(state, 8, EMPTY_INPUT, EMPTY_INPUT);
  assert.ok(counterEvents.some((e) => e.type === 'counter_hit'), 'Expected Counter Hit during startup');
  assert.ok(hpBeforeCounter - state.p2.hp > 48, 'Counter Hit should deal boosted damage (> 48)');
});

test('Ligeiro + Defesa triggers Ataque Especial and Ligeiro + Pesado triggers Rasteira (-9%)', () => {
  const state = createMatchState({
    mode: 'local2p',
    stage: 'orbital_arena',
    p1Id: 'kael',
    p2Id: 'vexa',
  });
  advanceTicks(state, 70);

  state.p1.energy = 60;
  state.p1.x = 400;
  state.p2.x = 760;

  // Simultaneous Ligeiro + Defesa -> Special (Pulso Solar)
  const specEvents = stepMatchSimulation(
    state,
    { ...EMPTY_INPUT, light: true, block: true },
    EMPTY_INPUT
  );
  assert.equal(state.p1.action, 'special', 'Ligeiro + Defesa should trigger special action');
  assert.equal(state.p1.currentMove, 'special_pulse');
  assert.ok(specEvents.some((e) => e.type === 'special'));

  // Let special + projectile hitstop/wakeup finish and move close for Ligeiro + Pesado -> Rasteira
  advanceTicks(state, 90, EMPTY_INPUT, EMPTY_INPUT);
  state.p1.x = 600;
  state.p2.x = 685;
  const hpBeforeSweep = state.p2.hp;
  const expectedSweepDmg = Math.round(state.p2.maxHp * 0.09);

  stepMatchSimulation(state, { ...EMPTY_INPUT, light: true, heavy: true }, EMPTY_INPUT);
  assert.equal(state.p1.currentMove, 'crouch_medium_sweep', 'Ligeiro + Pesado should trigger Rasteira');
  advanceTicks(state, 16, EMPTY_INPUT, EMPTY_INPUT);
  assert.equal(hpBeforeSweep - state.p2.hp, expectedSweepDmg);
  assert.equal(state.p2.action, 'knockdown');
});

test('Charge input locks crossed-arms charge state, builds energy, and emits charge events', () => {
  const state = createMatchState({
    mode: 'local2p',
    stage: 'orbital_arena',
    p1Id: 'kael',
    p2Id: 'vexa',
  });
  advanceTicks(state, 70);

  const initialEnergy = state.p1.energy;
  const events = advanceTicks(state, 20, { ...EMPTY_INPUT, charge: true }, EMPTY_INPUT);

  assert.equal(state.p1.action, 'charge');
  assert.ok(state.p1.energy >= initialEnergy + 12, `Expected energy >= ${initialEnergy + 12}, got ${state.p1.energy}`);
  assert.ok(events.filter((e) => e.type === 'charge').length >= 3, 'Expected periodic charge events for + effects');
});


test('Zane heavy brawler stats, Impacto Sísmico special, and Erupção Carmesim ultimate work correctly', () => {
  const state = createMatchState({
    mode: 'local2p',
    stage: 'reactor_core',
    p1Id: 'zane',
    p2Id: 'nyx',
  });
  advanceTicks(state, 70);

  assert.equal(state.p1.maxHp, 1080);
  assert.equal(state.p2.maxHp, 950);

  state.p1.energy = 100;
  state.p1.x = 600;
  state.p2.x = 685;

  stepMatchSimulation(state, { ...EMPTY_INPUT, special: true }, EMPTY_INPUT);
  assert.equal(state.p1.currentMove, 'special_seismic');
  advanceTicks(state, 28, EMPTY_INPUT, EMPTY_INPUT);
  assert.ok(state.p2.hp < state.p2.maxHp, 'Zane Impacto Sísmico should deal heavy damage');
});

test('Nyx cryo ninja supports double jump and fires Lâmina Glacial projectile across Cyber Temple', () => {
  const state = createMatchState({
    mode: 'local2p',
    stage: 'cyber_temple',
    p1Id: 'nyx',
    p2Id: 'zane',
  });
  advanceTicks(state, 70);

  // Double jump test
  stepMatchSimulation(state, { ...EMPTY_INPUT, up: true }, EMPTY_INPUT);
  advanceTicks(state, 6, EMPTY_INPUT, EMPTY_INPUT);
  stepMatchSimulation(state, { ...EMPTY_INPUT, up: true }, EMPTY_INPUT);
  assert.equal(state.p1.action, 'double_jump');
  assert.equal(state.p1.airJumpsLeft, 0);

  // Land back down
  advanceTicks(state, 60, EMPTY_INPUT, EMPTY_INPUT);
  assert.equal(state.p1.grounded, true);

  // Fire Nyx Lâmina Glacial projectile across stage
  state.p1.energy = 60;
  state.p1.x = 260;
  state.p2.x = 840;
  stepMatchSimulation(state, { ...EMPTY_INPUT, special: true }, EMPTY_INPUT);
  assert.equal(state.p1.currentMove, 'special_glacial_blade');
  advanceTicks(state, 55, EMPTY_INPUT, EMPTY_INPUT);
  assert.ok(state.p2.hp < state.p2.maxHp, 'Nyx Lâmina Glacial projectile should hit across Cyber Temple');
});

test('Knockdown and KO never allow downed fighters to fall outside stage boundaries or below FLOOR_Y', () => {
  // Left corner knockdown via Rasteira
  const stateLeft = createMatchState({
    mode: 'local2p',
    stage: 'orbital_arena',
    p1Id: 'zane',
    p2Id: 'nyx',
  });
  advanceTicks(stateLeft, 70);

  stateLeft.p2.x = 120;
  stateLeft.p1.x = 210;
  stateLeft.p1.facing = -1;
  stateLeft.p2.facing = 1;

  stepMatchSimulation(stateLeft, { ...EMPTY_INPUT, down: true, medium: true }, EMPTY_INPUT);
  advanceTicks(stateLeft, 30, EMPTY_INPUT, EMPTY_INPUT);
  assert.ok(stateLeft.p2.x >= 86 + 96, `Downed P2 on left edge must stay >= ${86 + 96}, got ${stateLeft.p2.x}`);
  assert.ok(stateLeft.p2.y <= 590, `Downed P2 y must never drop below FLOOR_Y (590), got ${stateLeft.p2.y}`);

  // Right corner KO defeat knockback
  const stateRight = createMatchState({
    mode: 'local2p',
    stage: 'reactor_core',
    p1Id: 'kael',
    p2Id: 'vexa',
  });
  advanceTicks(stateRight, 70);

  stateRight.p1.x = 1040;
  stateRight.p2.x = 1135;
  stateRight.p2.hp = 10;
  stateRight.p1.energy = 100;

  stepMatchSimulation(stateRight, { ...EMPTY_INPUT, heavy: true, right: true }, EMPTY_INPUT);
  advanceTicks(stateRight, 75, EMPTY_INPUT, EMPTY_INPUT);
  assert.equal(stateRight.phase, 'ko');
  assert.equal(stateRight.p2.action, 'defeat');
  assert.ok(stateRight.p2.x <= 1194 - 96, `KO'd P2 on right edge must stay <= ${1194 - 96}, got ${stateRight.p2.x}`);
  assert.ok(stateRight.p2.y <= 590, `KO'd P2 y must never drop below FLOOR_Y (590), got ${stateRight.p2.y}`);
});

test('vs_cpu mode starts a full 99s match, counts down timer, and supports round victory', () => {
  const state = createMatchState({
    mode: 'vs_cpu',
    stage: 'orbital_arena',
    p1Id: 'kael',
    p2Id: 'vexa',
  });
  assert.equal(state.mode, 'vs_cpu');
  assert.equal(state.timerSeconds, 99);
  assert.equal(state.trainingInfiniteEnergy, false);

  advanceTicks(state, 70);
  assert.equal(state.phase, 'fighting');
  advanceTicks(state, 65);
  assert.equal(state.timerSeconds, 98);
});
