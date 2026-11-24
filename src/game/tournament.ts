import { FighterId, StageId } from './types';

export type TournamentSize = 4 | 8;

export interface TournamentParticipant {
  id: string;
  seed: number;
  name: string;
  fighterId: FighterId;
  isCpu: boolean;
}

export interface TournamentMatch {
  id: string;
  roundIndex: number;
  matchIndex: number;
  p1: TournamentParticipant | null;
  p2: TournamentParticipant | null;
  winnerId: string | null;
  p1Rounds: number;
  p2Rounds: number;
}

export interface TournamentState {
  size: TournamentSize;
  stage: StageId;
  participants: TournamentParticipant[];
  rounds: TournamentMatch[][];
  currentRoundIndex: number;
  currentMatchIndex: number;
  champion: TournamentParticipant | null;
}

const FIGHTER_ROTATION: FighterId[] = ['kael', 'vexa', 'zane', 'nyx'];

export function createDefaultTournamentParticipants(
  size: TournamentSize
): TournamentParticipant[] {
  return Array.from({ length: size }, (_, idx) => ({
    id: `t-p${idx + 1}`,
    seed: idx + 1,
    name: `Jogador ${idx + 1}`,
    fighterId: FIGHTER_ROTATION[idx % FIGHTER_ROTATION.length],
    isCpu: false,
  }));
}

export function resizeTournamentParticipants(
  existing: TournamentParticipant[],
  nextSize: TournamentSize
): TournamentParticipant[] {
  const defaults = createDefaultTournamentParticipants(nextSize);
  return defaults.map((def, idx) => {
    const prev = existing[idx];
    if (!prev) return def;
    return {
      ...prev,
      id: `t-p${idx + 1}`,
      seed: idx + 1,
    };
  });
}

export function shuffleTournamentParticipants(
  participants: TournamentParticipant[],
  rng: () => number = Math.random
): TournamentParticipant[] {
  const copy = participants.map((p) => ({ ...p }));
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy.map((p, idx) => ({
    ...p,
    seed: idx + 1,
  }));
}

export function getTournamentRoundLabel(
  size: TournamentSize,
  roundIndex: number
): string {
  const totalRounds = size === 8 ? 3 : 2;
  if (roundIndex >= totalRounds - 1) return 'GRANDE FINAL';
  if (roundIndex === totalRounds - 2) return 'MEIAS-FINAIS';
  return 'QUARTOS DE FINAL';
}

export function createTournamentBracket(
  participants: TournamentParticipant[],
  stage: StageId
): TournamentState {
  const size: TournamentSize = participants.length >= 8 ? 8 : 4;
  const normalized = participants.slice(0, size).map((p, idx) => ({
    ...p,
    name: p.name.trim() || `Jogador ${idx + 1}`,
    seed: idx + 1,
  }));

  const totalRounds = size === 8 ? 3 : 2;
  const rounds: TournamentMatch[][] = [];

  for (let r = 0; r < totalRounds; r++) {
    const matchCount = size / Math.pow(2, r + 1);
    const roundMatches: TournamentMatch[] = [];
    for (let m = 0; m < matchCount; m++) {
      roundMatches.push({
        id: `r${r}-m${m}`,
        roundIndex: r,
        matchIndex: m,
        p1: r === 0 ? normalized[m * 2] : null,
        p2: r === 0 ? normalized[m * 2 + 1] : null,
        winnerId: null,
        p1Rounds: 0,
        p2Rounds: 0,
      });
    }
    rounds.push(roundMatches);
  }

  return {
    size,
    stage,
    participants: normalized,
    rounds,
    currentRoundIndex: 0,
    currentMatchIndex: 0,
    champion: null,
  };
}

export function getCurrentTournamentMatch(
  state: TournamentState
): TournamentMatch | null {
  if (state.champion) return null;
  const round = state.rounds[state.currentRoundIndex];
  if (!round) return null;
  return round[state.currentMatchIndex] || null;
}

export function recordTournamentMatchWinner(
  state: TournamentState,
  winnerSlot: 1 | 2,
  p1Rounds: number,
  p2Rounds: number
): TournamentState {
  const rounds = state.rounds.map((r) => r.map((m) => ({ ...m })));
  const currentRound = rounds[state.currentRoundIndex];
  const currentMatch = currentRound?.[state.currentMatchIndex];
  if (!currentMatch || !currentMatch.p1 || !currentMatch.p2) {
    return state;
  }

  const winner = winnerSlot === 1 ? currentMatch.p1 : currentMatch.p2;
  currentMatch.winnerId = winner.id;
  currentMatch.p1Rounds = p1Rounds;
  currentMatch.p2Rounds = p2Rounds;

  const isFinal = state.currentRoundIndex >= rounds.length - 1;
  if (isFinal) {
    return {
      ...state,
      rounds,
      champion: winner,
    };
  }

  // Advance winner into next round
  const nextRoundIdx = state.currentRoundIndex + 1;
  const nextMatchIdx = Math.floor(state.currentMatchIndex / 2);
  const nextMatch = rounds[nextRoundIdx]?.[nextMatchIdx];
  if (nextMatch) {
    if (state.currentMatchIndex % 2 === 0) {
      nextMatch.p1 = winner;
    } else {
      nextMatch.p2 = winner;
    }
  }

  // Find next playable match
  let nextR = state.currentRoundIndex;
  let nextM = state.currentMatchIndex + 1;
  if (nextM >= currentRound.length) {
    nextR = nextRoundIdx;
    nextM = 0;
  }

  return {
    ...state,
    rounds,
    currentRoundIndex: nextR,
    currentMatchIndex: nextM,
    champion: null,
  };
}
