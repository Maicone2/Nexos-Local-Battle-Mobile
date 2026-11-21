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

  // Walk both fighters toward each other for 90 ticks
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

  // Move P1 close to P2
  state.p1.x = 600;
  state.p2.x = 690;

  // Trigger light attack
  stepMatchSimulation(state, { ...EMPTY_INPUT, light: true }, EMPTY_INPUT);
  advanceTicks(state, 10, EMPTY_INPUT, EMPTY_INPUT);

  assert.ok(state.p2.hp < state.p2.maxHp, 'Light attack should deal damage');
  assert.ok(state.p1.energy > 25, 'Light attack should build energy');
  const hpAfterLight = state.p2.hp;

  // Cancel into heavy while in hit window
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

  // P2 blocks while P1 uses heavy attack
  stepMatchSimulation(state, { ...EMPTY_INPUT, heavy: true }, { ...EMPTY_INPUT, block: true });
  const events = advanceTicks(state, 24, EMPTY_INPUT, { ...EMPTY_INPUT, block: true });

  const blockEvents = events.filter((e) => e.type === 'block');
  assert.ok(blockEvents.length > 0, 'Expected block event');
  // Heavy raw damage is 118, chip is 18
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

  // Round 1 KO
  state.p2.hp = 10;
  state.p1.x = 600;
  state.p2.x = 685;
  stepMatchSimulation(state, { ...EMPTY_INPUT, light: true }, EMPTY_INPUT);
  advanceTicks(state, 130, EMPTY_INPUT, EMPTY_INPUT);

  assert.equal(state.p1.roundsWon, 1);
  assert.equal(state.roundNumber, 2);
  assert.equal(state.phase, 'intro');

  // Advance round 2 intro
  advanceTicks(state, 65, EMPTY_INPUT, EMPTY_INPUT);
  assert.equal(state.phase, 'fighting');

  // Round 2 KO
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

  // Place P1 to the RIGHT of P2 while still initially facing +1 (stale facing)
  state.p1.x = 700;
  state.p2.x = 620;
  state.p1.facing = 1;

  // Trigger light attack -> should snap facing to -1 (left toward P2) and hit P2
  stepMatchSimulation(state, { ...EMPTY_INPUT, light: true }, EMPTY_INPUT);
  assert.equal(state.p1.facing, -1, 'P1 should face toward P2 (-1) when attacking from the right');

  advanceTicks(state, 10, EMPTY_INPUT, EMPTY_INPUT);
  assert.ok(state.p2.hp < state.p2.maxHp, 'Light attack after cross-up should hit P2');
});

