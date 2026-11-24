import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceTrialProgress,
  buildDemoInputQueue,
  COMBO_TRIALS,
  createTrialProgressState,
  getTrialsForFighter,
} from './comboTrials';
import { createMatchState, stepMatchSimulation } from './CombatSystem';
import { EMPTY_INPUT } from './constants';
import { FighterId } from './types';

test('every fighter has 5 progressive combo trials', () => {
  const fighters: FighterId[] = ['kael', 'vexa', 'zane', 'nyx'];
  for (const id of fighters) {
    const trials = getTrialsForFighter(id);
    assert.equal(trials.length, 5, `${id} should have 5 combo trials`);
    assert.deepEqual(
      trials.map((t) => t.order),
      [1, 2, 3, 4, 5]
    );
  }
});

test('trial sequence advances step-by-step and resets when combo drops or mismatches', () => {
  const trial = getTrialsForFighter('kael')[0]; // stand_light -> solar_jab_2 -> stand_medium
  const state = createMatchState({
    mode: 'combo_trials',
    stage: 'orbital_arena',
    p1Id: 'kael',
    p2Id: 'vexa',
  });
  state.phase = 'fighting';
  state.p2.comboCount = 1;

  let tracker = createTrialProgressState();

  // Step 1 matches
  let res = advanceTrialProgress(tracker, trial, state, [
    { type: 'hit', x: 500, y: 400, slot: 2, fighterId: 'vexa', combo: 1, moveId: 'stand_light' },
  ]);
  assert.equal(res.next.stepIndex, 1);
  assert.equal(res.justCompleted, false);
  tracker = res.next;

  // Mismatched hit resets progress
  state.p2.comboCount = 2;
  res = advanceTrialProgress(tracker, trial, state, [
    { type: 'heavy_hit', x: 500, y: 400, slot: 2, fighterId: 'vexa', combo: 2, moveId: 'stand_heavy' },
  ]);
  assert.equal(res.next.stepIndex, 0);
  tracker = res.next;

  // Combo drop also resets
  tracker = { stepIndex: 2, completed: false };
  state.p2.comboCount = 0;
  res = advanceTrialProgress(tracker, trial, state, []);
  assert.equal(res.next.stepIndex, 0);
});

test('all 20 fighter combo trials complete cleanly in real simulation using their demo scripts', async (t) => {
  for (const trial of COMBO_TRIALS) {
    await t.test(`Trial ${trial.id} (${trial.fighterId} #${trial.order}: ${trial.title})`, () => {
      const state = createMatchState({
        mode: 'combo_trials',
        stage: 'orbital_arena',
        p1Id: trial.fighterId,
        p2Id: trial.fighterId === 'vexa' ? 'kael' : 'vexa',
        trainingInfiniteEnergy: true,
        trainingAutoRegen: true,
      });
      state.phase = 'fighting';
      state.p1.x = 520;
      state.p2.x = 640;
      state.p1.energy = 100;

      const queue = buildDemoInputQueue(trial);
      let tracker = createTrialProgressState();
      let completedEver = false;
      const landedMoves: string[] = [];

      const totalTicks = queue.length + 90;
      for (let i = 0; i < totalTicks; i++) {
        const p1In = i < queue.length ? queue[i] : EMPTY_INPUT;
        const events = stepMatchSimulation(state, p1In, EMPTY_INPUT, {
          inputBufferFrames: 10,
          cameraShakeLevel: 0,
        });
        for (const ev of events) {
          if (ev.slot === 2 && ev.moveId) landedMoves.push(`${ev.moveId}(c${ev.combo})`);
        }
        const stepRes = advanceTrialProgress(tracker, trial, state, events);
        tracker = stepRes.next;
        if (stepRes.justCompleted) {
          completedEver = true;
          break;
        }
      }

      assert.equal(
        completedEver,
        true,
        `Trial ${trial.id} stuck at step ${tracker.stepIndex}/${trial.steps.length}; landed: [${landedMoves.join(', ')}]`
      );
    });
  }
});
