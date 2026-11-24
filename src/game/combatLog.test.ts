import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendInputHistory,
  computeCombatStats,
  extractCombatLogEntries,
  formatDirectionSymbol,
} from './combatLog';
import { createMatchState, stepMatchSimulation } from './CombatSystem';
import { EMPTY_INPUT } from './constants';
import { InputHistoryEntry } from './types';

test('formatDirectionSymbol handles cardinals, diagonals, and neutral', () => {
  assert.equal(formatDirectionSymbol(EMPTY_INPUT), '•');
  assert.equal(formatDirectionSymbol({ ...EMPTY_INPUT, up: true, right: true }), '↗');
  assert.equal(formatDirectionSymbol({ ...EMPTY_INPUT, down: true, left: true }), '↙');
  assert.equal(formatDirectionSymbol({ ...EMPTY_INPUT, down: true, right: true }), '↘');
  assert.equal(formatDirectionSymbol({ ...EMPTY_INPUT, up: true, left: true }), '↖');
});

test('appendInputHistory tracks held frame duration without duplicating identical ticks', () => {
  const idRef = { value: 1 };
  let history: InputHistoryEntry[] = [];

  const r1 = appendInputHistory(history, { ...EMPTY_INPUT, down: true, right: true }, 1, 10, idRef);
  assert.equal(r1.changed, true);
  history = r1.history;
  assert.equal(history.length, 1);
  assert.equal(history[0].dirLabel, '↘');
  assert.equal(history[0].frames, 1);

  // Same input held next frame increments frames instead of adding duplicate row
  const r2 = appendInputHistory(history, { ...EMPTY_INPUT, down: true, right: true }, 1, 11, idRef);
  history = r2.history;
  assert.equal(history.length, 1);
  assert.equal(history[0].frames, 2);

  // Adding light button creates a new entry
  const r3 = appendInputHistory(history, { ...EMPTY_INPUT, down: true, light: true }, 1, 12, idRef);
  history = r3.history;
  assert.equal(history.length, 2);
  assert.equal(history[0].dirLabel, '↓');
  assert.deepEqual(history[0].buttons, ['L']);
});

test('extractCombatLogEntries converts simulation events with move labels and computes stats', () => {
  const state = createMatchState({
    mode: 'lan',
    stage: 'orbital_arena',
    p1Id: 'kael',
    p2Id: 'vexa',
  });
  for (let i = 0; i < 70; i++) stepMatchSimulation(state, EMPTY_INPUT, EMPTY_INPUT);

  state.p1.x = 600;
  state.p2.x = 675;

  const logIdRef = { value: 1 };
  const allEntries = [];

  // P1 executes Uppercut (down + light) -> hits Vexa with Solar Upper (-15%)
  allEntries.push(
    ...extractCombatLogEntries(
      state,
      stepMatchSimulation(state, { ...EMPTY_INPUT, down: true, light: true }, EMPTY_INPUT),
      logIdRef
    )
  );
  for (let i = 0; i < 14; i++) {
    allEntries.push(
      ...extractCombatLogEntries(state, stepMatchSimulation(state, EMPTY_INPUT, EMPTY_INPUT), logIdRef)
    );
  }

  const upperEntry = allEntries.find((e) => e.badge === 'PESADO' && e.detail.includes('Solar Upper'));
  assert.ok(upperEntry, 'Expected Solar Upper heavy hit entry in combat log');
  assert.equal(upperEntry.actorSlot, 1);
  assert.equal(upperEntry.actorName, 'KAEL');

  const firstAttackEntry = allEntries.find((e) => e.badge === 'PRIMEIRO GOLPE');
  assert.ok(firstAttackEntry, 'Expected PRIMEIRO GOLPE callout in combat log');

  const stats = computeCombatStats(allEntries, state);
  assert.equal(stats.p1.hitsLanded, 1);
  assert.ok(stats.p1.totalDamage > 100);
});
