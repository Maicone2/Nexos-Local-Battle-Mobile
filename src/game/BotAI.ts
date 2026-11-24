import { EMPTY_INPUT, FIGHTER_PROFILES } from './constants';
import { InputState, MatchState, TrainingDummyMode } from './types';

export class BotAI {
  private decisionCooldown = 0;
  private comboStep: 0 | 1 | 2 = 0;
  private currentIntent: InputState = { ...EMPTY_INPUT };

  reset(): void {
    this.decisionCooldown = 0;
    this.comboStep = 0;
    this.currentIntent = { ...EMPTY_INPUT };
  }

  computeInput(
    state: MatchState,
    difficulty: 'easy' | 'normal',
    dummyMode: TrainingDummyMode = 'cpu'
  ): InputState {
    if (state.phase !== 'fighting') {
      return { ...EMPTY_INPUT };
    }

    if (state.mode === 'combo_trials') {
      return dummyMode === 'guard' ? { ...EMPTY_INPUT, block: true } : { ...EMPTY_INPUT };
    }

    if (state.mode === 'training') {
      if (dummyMode === 'standing') {
        return { ...EMPTY_INPUT };
      }
      if (dummyMode === 'guard') {
        return { ...EMPTY_INPUT, block: true };
      }
    }

    const bot = state.p2;
    const player = state.p1;
    const dx = player.x - bot.x;
    const dist = Math.abs(dx);
    const dirToPlayer = dx >= 0 ? 1 : -1;

    const next: InputState = { ...EMPTY_INPUT };

    if (this.decisionCooldown > 0) {
      this.decisionCooldown--;
      return {
        ...this.currentIntent,
        light: false,
        medium: false,
        heavy: false,
        special: false,
        up: false,
      };
    }

    const reactionTick = difficulty === 'easy' ? 16 : 9;
    const attackChance = difficulty === 'easy' ? 0.35 : 0.62;
    const blockChance = difficulty === 'easy' ? 0.25 : 0.55;

    const roll = ((state.tick * 1103515245 + 12345) >>> 16) % 100 / 100;

    const playerAttacking =
      player.action === 'light' ||
      player.action === 'medium' ||
      player.action === 'heavy' ||
      player.action === 'special' ||
      player.action === 'ultimate';

    if (playerAttacking && dist < 210 && roll < blockChance) {
      next.block = true;
      this.currentIntent = next;
      this.decisionCooldown = 14;
      return next;
    }

    if (bot.action === 'light' && bot.hasHitCurrentAttack && this.comboStep === 1) {
      next.medium = true;
      this.comboStep = 2;
      this.currentIntent = next;
      this.decisionCooldown = 6;
      return next;
    }

    if (
      (bot.action === 'medium' || bot.action === 'heavy') &&
      bot.hasHitCurrentAttack &&
      this.comboStep === 2 &&
      bot.energy >= 50
    ) {
      next.special = true;
      this.comboStep = 0;
      this.currentIntent = next;
      this.decisionCooldown = difficulty === 'easy' ? 42 : 24;
      return next;
    }

    if (dist > 250) {
      const botProfile = FIGHTER_PROFILES[bot.id];
      const hasProjectileSpecial = Boolean(botProfile.moves[botProfile.specialMoveId]?.isProjectile);
      if (bot.energy >= 50 && hasProjectileSpecial && roll < 0.22) {
        next.special = true;
        this.decisionCooldown = 44;
      } else {
        if (dirToPlayer > 0) next.right = true;
        else next.left = true;
        if (roll > 0.88) next.up = true;
        this.decisionCooldown = reactionTick;
      }
    } else if (dist > 145) {
      if (roll < attackChance) {
        if (bot.energy >= 50 && roll < 0.14) {
          next.special = true;
          this.decisionCooldown = 42;
        } else if (roll < 0.55) {
          next.medium = true;
          this.decisionCooldown = reactionTick;
        } else {
          next.heavy = true;
          this.decisionCooldown = reactionTick;
        }
      } else {
        if (dirToPlayer > 0) next.right = true;
        else next.left = true;
        this.decisionCooldown = reactionTick;
      }
    } else {
      if (roll < attackChance + 0.15) {
        next.light = true;
        this.comboStep = 1;
        this.decisionCooldown = 8;
      } else if (roll < 0.85) {
        if (dirToPlayer > 0) next.left = true;
        else next.right = true;
        this.decisionCooldown = 12;
      } else {
        next.down = true;
        next.medium = roll > 0.92; // Occasional Rasteira
        this.decisionCooldown = 14;
      }
    }

    this.currentIntent = next;
    return next;
  }
}
