import { CombatLogEntry } from './combatLog';
import { createMatchState, stepMatchSimulation } from './CombatSystem';
import { EMPTY_INPUT } from './constants';
import {
  CombatEvent,
  FighterId,
  GameMode,
  InputState,
  MatchState,
  StageId,
} from './types';

export interface ReplayInputRun {
  count: number;
  p1: InputState;
  p2: InputState;
}

export interface MatchReplay {
  id: string;
  createdAt: string;
  mode: GameMode;
  stage: StageId;
  p1Id: FighterId;
  p2Id: FighterId;
  p1Name: string;
  p2Name: string;
  winnerSlot: 1 | 2 | null;
  p1Rounds: number;
  p2Rounds: number;
  maxCombo: number;
  totalDamage: number;
  durationSeconds: number;
  totalTicks: number;
  trainingHpPercent?: number;
  trainingInfiniteEnergy?: boolean;
  trainingAutoRegen?: boolean;
  runs: ReplayInputRun[];
  highlights: CombatLogEntry[];
}

const REPLAY_STORAGE_KEY = 'neon_clash_replays_v1';
const MAX_STORED_REPLAYS = 15;

export function sameInputState(a: InputState, b: InputState): boolean {
  return (
    a.left === b.left &&
    a.right === b.right &&
    a.up === b.up &&
    a.down === b.down &&
    a.light === b.light &&
    a.medium === b.medium &&
    a.heavy === b.heavy &&
    a.special === b.special &&
    a.block === b.block &&
    a.charge === b.charge
  );
}

export class MatchRecorder {
  private runs: ReplayInputRun[] = [];
  private highlights: CombatLogEntry[] = [];
  private totalTicks = 0;

  reset(): void {
    this.runs = [];
    this.highlights = [];
    this.totalTicks = 0;
  }

  recordTick(p1Input: InputState, p2Input: InputState): void {
    this.totalTicks++;
    const last = this.runs[this.runs.length - 1];
    if (
      last &&
      sameInputState(last.p1, p1Input) &&
      sameInputState(last.p2, p2Input)
    ) {
      last.count++;
      return;
    }
    this.runs.push({
      count: 1,
      p1: { ...p1Input },
      p2: { ...p2Input },
    });
  }

  recordLogEntries(entries: CombatLogEntry[]): void {
    if (entries.length === 0) return;
    for (const entry of entries) {
      if (this.highlights.length >= 120) {
        this.highlights.shift();
      }
      this.highlights.push(entry);
    }
  }

  getTickCount(): number {
    return this.totalTicks;
  }

  buildReplay(state: MatchState): MatchReplay {
    const now = new Date();
    const id = `rpl_${now.getTime()}_${Math.random().toString(36).slice(2, 6)}`;
    return {
      id,
      createdAt: now.toISOString(),
      mode: state.mode,
      stage: state.stage,
      p1Id: state.p1.id,
      p2Id: state.p2.id,
      p1Name: state.p1.playerName || state.p1.id.toUpperCase(),
      p2Name: state.p2.playerName || state.p2.id.toUpperCase(),
      winnerSlot: state.winnerSlot,
      p1Rounds: state.p1.roundsWon,
      p2Rounds: state.p2.roundsWon,
      maxCombo: Math.max(state.p1.maxComboReached, state.p2.maxComboReached),
      totalDamage: Math.round(state.p1.totalDamageDealt + state.p2.totalDamageDealt),
      durationSeconds: Math.max(1, Math.round(this.totalTicks / 60)),
      totalTicks: this.totalTicks,
      trainingHpPercent: state.trainingHpPercent,
      trainingInfiniteEnergy: state.trainingInfiniteEnergy,
      trainingAutoRegen: state.trainingAutoRegen,
      runs: this.runs.map((r) => ({
        count: r.count,
        p1: { ...r.p1 },
        p2: { ...r.p2 },
      })),
      highlights: [...this.highlights],
    };
  }
}

export class ReplayPlayer {
  private readonly replay: MatchReplay;
  private runIndex = 0;
  private runOffset = 0;
  private currentTick = 0;
  public state: MatchState;

  constructor(replay: MatchReplay) {
    this.replay = replay;
    this.state = this.createInitialState();
  }

  private createInitialState(): MatchState {
    return createMatchState({
      mode: this.replay.mode,
      stage: this.replay.stage,
      p1Id: this.replay.p1Id,
      p2Id: this.replay.p2Id,
      p1Name: this.replay.p1Name,
      p2Name: this.replay.p2Name,
      trainingHpPercent: this.replay.trainingHpPercent,
      trainingInfiniteEnergy: this.replay.trainingInfiniteEnergy,
      trainingAutoRegen: this.replay.trainingAutoRegen,
    });
  }

  reset(): void {
    this.runIndex = 0;
    this.runOffset = 0;
    this.currentTick = 0;
    this.state = this.createInitialState();
  }

  isFinished(): boolean {
    return this.runIndex >= this.replay.runs.length;
  }

  getTick(): number {
    return this.currentTick;
  }

  getTotalTicks(): number {
    return this.replay.totalTicks;
  }

  getCurrentInputs(): { p1: InputState; p2: InputState } {
    if (this.runIndex >= this.replay.runs.length) {
      return { p1: EMPTY_INPUT, p2: EMPTY_INPUT };
    }
    const run = this.replay.runs[this.runIndex];
    return { p1: run.p1, p2: run.p2 };
  }

  step(options?: { inputBufferFrames?: number; cameraShakeLevel?: number }): {
    events: CombatEvent[];
    p1Input: InputState;
    p2Input: InputState;
  } {
    if (this.isFinished()) {
      return { events: [], p1Input: EMPTY_INPUT, p2Input: EMPTY_INPUT };
    }
    const run = this.replay.runs[this.runIndex];
    const p1Input = run.p1;
    const p2Input = run.p2;
    const events = stepMatchSimulation(this.state, p1Input, p2Input, options);

    this.currentTick++;
    this.runOffset++;
    if (this.runOffset >= run.count) {
      this.runIndex++;
      this.runOffset = 0;
    }

    return { events, p1Input, p2Input };
  }
}

export function loadReplays(): MatchReplay[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(REPLAY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is MatchReplay =>
        Boolean(r && typeof r.id === 'string' && Array.isArray(r.runs) && r.p1Id && r.p2Id && r.stage)
    );
  } catch {
    return [];
  }
}

export function saveReplay(replay: MatchReplay): MatchReplay[] {
  const existing = loadReplays().filter((r) => r.id !== replay.id);
  const next = [replay, ...existing].slice(0, MAX_STORED_REPLAYS);
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(REPLAY_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Fallback: trim oldest replays if storage quota is tight
      const trimmed = next.slice(0, 5);
      try {
        localStorage.setItem(REPLAY_STORAGE_KEY, JSON.stringify(trimmed));
        return trimmed;
      } catch {
        // ignore
      }
    }
  }
  return next;
}

export function deleteReplay(id: string): MatchReplay[] {
  const next = loadReplays().filter((r) => r.id !== id);
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(REPLAY_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }
  return next;
}
