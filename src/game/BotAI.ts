import { EMPTY_INPUT } from './constants';
import { InputState, MatchState } from './types';

export class BotAI {
  private decisionCooldown = 0;
  private comboStep: 0 | 1 | 2 = 0;
  private currentIntent: InputState = { ...EMPTY_INPUT };

  reset(): void {
    this.decisionCooldown = 0;
    this.comboStep = 0;
    this.currentIntent = { ...EMPTY_INPUT };
  }

  computeInput(state: MatchState, difficulty: 'easy' | 'normal'): InputState {
    if (state.phase !== 'fighting') {
      return { ...EMPTY_INPUT };
    }

    const bot = state.p2;
    const player = state.p1;
    const dx = player.x - bot.x;
    const dist = Math.abs(dx);
    const dirToPlayer = dx >= 0 ? 1 : -1;

    // One-shot buttons should pulse for 1-2 ticks and release so edge detection triggers cleanly
    const next: InputState = {
      left: false,
      right: false,
      up: false,
      down: false,
      light: false,
      heavy: false,
      special: false,
      block: false,
    };

    if (this.decisionCooldown > 0) {
      this.decisionCooldown--;
      return {
        ...this.currentIntent,
        light: false,
        heavy: false,
        special: false,
        up: false,
      };
    }

    const reactionTick = difficulty === 'easy' ? 16 : 9;
    const attackChance = difficulty === 'easy' ? 0.35 : 0.62;
    const blockChance = difficulty === 'easy' ? 0.25 : 0.55;

    // Deterministic pseudo-random roll based on state tick so AI behavior is lively yet predictable
    const roll = ((state.tick * 1103515245 + 12345) >>> 16) % 100 / 100;

    // Defend if player is attacking close
    const playerAttacking =
      player.action === 'light' || player.action === 'heavy' || player.action === 'special';
    if (playerAttacking && dist < 210 && roll < blockChance) {
      next.block = true;
      this.currentIntent = next;
      this.decisionCooldown = 14;
      return next;
    }

    // Chain combo if already in light/heavy attack
    if (bot.action === 'light' && bot.hasHitCurrentAttack && this.comboStep === 1) {
      next.heavy = true;
      this.comboStep = 2;
      this.currentIntent = next;
      this.decisionCooldown = 6;
      return next;
    }

    if (bot.action === 'heavy' && bot.hasHitCurrentAttack && this.comboStep === 2 && bot.energy >= 50) {
      next.special = true;
      this.comboStep = 0;
      this.currentIntent = next;
      this.decisionCooldown = difficulty === 'easy' ? 42 : 24;
      return next;
    }

    // Spacing & attacks
    if (dist > 250) {
      if (bot.energy >= 50 && bot.id === 'kael' && roll < 0.22) {
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
      // Close range
      if (roll < attackChance + 0.15) {
        next.light = true;
        this.comboStep = 1;
        this.decisionCooldown = 8;
      } else if (roll < 0.85) {
        // Brief step back or crouch
        if (dirToPlayer > 0) next.left = true;
        else next.right = true;
        this.decisionCooldown = 12;
      } else {
        next.down = true;
        this.decisionCooldown = 14;
      }
    }

    this.currentIntent = next;
    return next;
  }
}
