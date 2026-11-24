import test from 'node:test';
import assert from 'node:assert/strict';
import { createMatchState, stepMatchSimulation } from './CombatSystem';
import { EMPTY_INPUT } from './constants';
import { MatchRecorder, ReplayPlayer } from './replayStorage';
import { InputState } from './types';

test('MatchRecorder compresses RLE input runs and ReplayPlayer reproduces exact simulation state', () => {
  const original = createMatchState({
    mode: 'local2p',
    stage: 'orbital_arena',
    p1Id: 'kael',
    p2Id: 'vexa',
  });
  const recorder = new MatchRecorder();

  const stepAndRecord = (p1In: InputState, p2In: InputState, count = 1) => {
    for (let i = 0; i < count; i++) {
      recorder.recordTick(p1In, p2In);
      stepMatchSimulation(original, p1In, p2In);
    }
  };

  stepAndRecord(EMPTY_INPUT, EMPTY_INPUT, 70);
  stepAndRecord({ ...EMPTY_INPUT, right: true }, { ...EMPTY_INPUT, left: true }, 45);
  stepAndRecord({ ...EMPTY_INPUT, charge: true }, EMPTY_INPUT, 20);
  stepAndRecord({ ...EMPTY_INPUT, light: true }, EMPTY_INPUT, 2);
  stepAndRecord(EMPTY_INPUT, EMPTY_INPUT, 12);
  stepAndRecord({ ...EMPTY_INPUT, down: true, medium: true }, EMPTY_INPUT, 2);
  stepAndRecord(EMPTY_INPUT, EMPTY_INPUT, 25);

  const replay = recorder.buildReplay(original);
  assert.equal(replay.totalTicks, 176);
  assert.ok(replay.runs.length <= 7, `Expected RLE compression <= 7 runs, got ${replay.runs.length}`);

  const player = new ReplayPlayer(replay);
  while (!player.isFinished()) {
    player.step();
  }

  assert.equal(player.state.tick, original.tick);
  assert.equal(player.state.p1.x, original.p1.x);
  assert.equal(player.state.p2.x, original.p2.x);
  assert.equal(player.state.p1.hp, original.p1.hp);
  assert.equal(player.state.p2.hp, original.p2.hp);
  assert.equal(player.state.p1.energy, original.p1.energy);
  assert.equal(player.state.p1.totalDamageDealt, original.p1.totalDamageDealt);
  assert.equal(player.state.p1.maxComboReached, original.p1.maxComboReached);
});
