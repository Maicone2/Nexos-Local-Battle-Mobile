import { FIGHTER_PROFILES, FIXED_FPS } from './constants';
import { CombatEvent, InputHistoryEntry, InputState, MatchState } from './types';

export type CombatLogCategory = 'attack' | 'defense' | 'special' | 'system';

export interface CombatLogEntry {
  id: number;
  tick: number;
  roundNumber: number;
  timeLabel: string;
  actorSlot: 1 | 2;
  actorName: string;
  category: CombatLogCategory;
  badge: string;
  detail: string;
  color: string;
  damage?: number;
  combo?: number;
  eventType: CombatEvent['type'];
}

export interface PlayerPerformanceStats {
  hitsLanded: number;
  blocks: number;
  perfectGuards: number;
  counters: number;
  guardBreaksDealt: number;
  totalDamage: number;
  maxCombo: number;
}

export function formatDirectionSymbol(inp: InputState): string {
  if (inp.up && inp.left) return '↖';
  if (inp.up && inp.right) return '↗';
  if (inp.down && inp.left) return '↙';
  if (inp.down && inp.right) return '↘';
  if (inp.up) return '↑';
  if (inp.down) return '↓';
  if (inp.left) return '←';
  if (inp.right) return '→';
  return '•';
}

export function extractInputButtons(inp: InputState): string[] {
  const btns: string[] = [];
  if (inp.light) btns.push('L');
  if (inp.medium) btns.push('M');
  if (inp.heavy) btns.push('P');
  if (inp.special) btns.push('E');
  if (inp.block) btns.push('D');
  if (inp.charge) btns.push('+EN');
  return btns;
}

/**
 * Appends or increments the frame duration of the latest input entry in an immutable list.
 * Keeps up to `maxEntries` most recent entries (newest at index 0).
 */
export function appendInputHistory(
  history: InputHistoryEntry[],
  inp: InputState,
  slot: 1 | 2,
  tick: number,
  nextIdRef: { value: number },
  maxEntries = 18
): { history: InputHistoryEntry[]; changed: boolean } {
  const dirLabel = formatDirectionSymbol(inp);
  const buttons = extractInputButtons(inp);
  if (dirLabel === '•' && buttons.length === 0) {
    return { history, changed: false };
  }

  const sig = `${slot}|${dirLabel}|${buttons.join(',')}`;
  const head = history[0];
  if (head && head.sig === sig) {
    const updated = [...history];
    updated[0] = { ...head, frames: Math.min(999, head.frames + 1) };
    return { history: updated, changed: true };
  }

  const entry: InputHistoryEntry = {
    id: nextIdRef.value++,
    slot,
    dirLabel,
    buttons,
    tick,
    frames: 1,
    sig,
  };
  return {
    history: [entry, ...history.slice(0, maxEntries - 1)],
    changed: true,
  };
}

function getFighterDisplayName(state: MatchState, slot: 1 | 2): string {
  const f = slot === 1 ? state.p1 : state.p2;
  return FIGHTER_PROFILES[f.id].name;
}

export function extractCombatLogEntries(
  state: MatchState,
  events: CombatEvent[],
  nextIdRef: { value: number }
): CombatLogEntry[] {
  if (!events || events.length === 0) return [];
  const timeLabel = `${(state.tick / FIXED_FPS).toFixed(1)}s`;
  const entries: CombatLogEntry[] = [];

  for (const ev of events) {
    // Skip non-combat movement noise (jump/dash) since Input History already tracks them
    if (ev.type === 'jump' || ev.type === 'dash') continue;

    // For hit/block/guard_break/stun/wall_bounce, ev.slot is the defender; attacker is opposite slot
    const otherSlot: 1 | 2 = ev.slot === 1 ? 2 : 1;

    if (
      ev.type === 'hit' ||
      ev.type === 'medium_hit' ||
      ev.type === 'heavy_hit' ||
      ev.type === 'ultimate'
    ) {
      const attackerSlot = otherSlot;
      const moveLabel = ev.label || (ev.type === 'ultimate' ? 'Ultimate' : ev.type === 'heavy_hit' ? 'Golpe Pesado' : ev.type === 'medium_hit' ? 'Golpe Médio' : 'Golpe Ligeiro');
      const comboSuffix = ev.combo && ev.combo >= 2 ? ` (${ev.combo} Hits)` : '';
      const dmg = ev.damage ?? 0;
      const isUlt = ev.type === 'ultimate';
      entries.push({
        id: nextIdRef.value++,
        tick: state.tick,
        roundNumber: state.roundNumber,
        timeLabel,
        actorSlot: attackerSlot,
        actorName: getFighterDisplayName(state, attackerSlot),
        category: isUlt ? 'special' : 'attack',
        badge: isUlt ? 'ULTIMATE' : ev.type === 'heavy_hit' ? 'PESADO' : ev.type === 'medium_hit' ? 'MÉDIO' : 'LIGEIRO',
        detail: `${moveLabel} · -${dmg} HP${comboSuffix}`,
        color: isUlt ? '#A855F7' : ev.type === 'heavy_hit' ? '#F5B700' : ev.type === 'medium_hit' ? '#38BDF8' : '#00E5FF',
        damage: dmg,
        combo: ev.combo,
        eventType: ev.type,
      });
      continue;
    }

    if (ev.type === 'block') {
      const defenderSlot = ev.slot;
      const chip = ev.damage ?? 0;
      const movePart = ev.label ? `${ev.label} · ` : '';
      entries.push({
        id: nextIdRef.value++,
        tick: state.tick,
        roundNumber: state.roundNumber,
        timeLabel,
        actorSlot: defenderSlot,
        actorName: getFighterDisplayName(state, defenderSlot),
        category: 'defense',
        badge: 'BLOQUEIO',
        detail: `${movePart}-${chip} HP chip`,
        color: '#94A3B8',
        damage: chip,
        eventType: ev.type,
      });
      continue;
    }

    if (ev.type === 'perfect_guard') {
      const defenderSlot = ev.slot;
      const movePart = ev.label ? `${ev.label} · ` : '';
      entries.push({
        id: nextIdRef.value++,
        tick: state.tick,
        roundNumber: state.roundNumber,
        timeLabel,
        actorSlot: defenderSlot,
        actorName: getFighterDisplayName(state, defenderSlot),
        category: 'defense',
        badge: 'PERFECT GUARD',
        detail: `${movePart}0 dano · +14% Energia`,
        color: '#00E5FF',
        damage: 0,
        eventType: ev.type,
      });
      continue;
    }

    if (ev.type === 'guard_break') {
      const attackerSlot = otherSlot;
      entries.push({
        id: nextIdRef.value++,
        tick: state.tick,
        roundNumber: state.roundNumber,
        timeLabel,
        actorSlot: attackerSlot,
        actorName: getFighterDisplayName(state, attackerSlot),
        category: 'defense',
        badge: 'GUARD BREAK!',
        detail: `Quebrou defesa de ${getFighterDisplayName(state, ev.slot)}`,
        color: '#EF4444',
        eventType: ev.type,
      });
      continue;
    }

    if (ev.type === 'counter_hit' || ev.type === 'punish_counter') {
      const isPunish = ev.type === 'punish_counter';
      entries.push({
        id: nextIdRef.value++,
        tick: state.tick,
        roundNumber: state.roundNumber,
        timeLabel,
        actorSlot: ev.slot,
        actorName: getFighterDisplayName(state, ev.slot),
        category: 'attack',
        badge: isPunish ? 'PUNISH COUNTER' : 'CONTRA-GOLPE',
        detail: isPunish ? '+25% Dano · +6f Hitstun' : '+20% Dano · +4f Hitstun',
        color: isPunish ? '#FB7185' : '#F5B700',
        eventType: ev.type,
      });
      continue;
    }

    if (ev.type === 'wall_bounce') {
      const attackerSlot = otherSlot;
      entries.push({
        id: nextIdRef.value++,
        tick: state.tick,
        roundNumber: state.roundNumber,
        timeLabel,
        actorSlot: attackerSlot,
        actorName: getFighterDisplayName(state, attackerSlot),
        category: 'special',
        badge: 'WALL BOUNCE',
        detail: `${getFighterDisplayName(state, ev.slot)} ressaltou na parede`,
        color: '#38BDF8',
        eventType: ev.type,
      });
      continue;
    }

    if (ev.type === 'first_attack') {
      entries.push({
        id: nextIdRef.value++,
        tick: state.tick,
        roundNumber: state.roundNumber,
        timeLabel,
        actorSlot: ev.slot,
        actorName: getFighterDisplayName(state, ev.slot),
        category: 'system',
        badge: 'PRIMEIRO GOLPE',
        detail: '+10% Energia Bónus',
        color: '#F5B700',
        eventType: ev.type,
      });
      continue;
    }

    if (ev.type === 'stun') {
      const attackerSlot = otherSlot;
      entries.push({
        id: nextIdRef.value++,
        tick: state.tick,
        roundNumber: state.roundNumber,
        timeLabel,
        actorSlot: attackerSlot,
        actorName: getFighterDisplayName(state, attackerSlot),
        category: 'system',
        badge: 'ATORDOADO',
        detail: `${getFighterDisplayName(state, ev.slot)} ficou atordoado`,
        color: '#F5B700',
        eventType: ev.type,
      });
      continue;
    }

    if (ev.type === 'ko') {
      entries.push({
        id: nextIdRef.value++,
        tick: state.tick,
        roundNumber: state.roundNumber,
        timeLabel,
        actorSlot: ev.slot,
        actorName: getFighterDisplayName(state, ev.slot),
        category: 'system',
        badge: 'K.O.!',
        detail: `Venceu a Ronda ${state.roundNumber}`,
        color: '#EF4444',
        eventType: ev.type,
      });
      continue;
    }

    if (ev.type === 'special') {
      entries.push({
        id: nextIdRef.value++,
        tick: state.tick,
        roundNumber: state.roundNumber,
        timeLabel,
        actorSlot: ev.slot,
        actorName: getFighterDisplayName(state, ev.slot),
        category: 'special',
        badge: 'ESPECIAL',
        detail: FIGHTER_PROFILES[ev.fighterId].specialMoveName,
        color: '#A855F7',
        eventType: ev.type,
      });
    }
  }

  return entries;
}

export function computeCombatStats(
  entries: CombatLogEntry[],
  state: MatchState
): { p1: PlayerPerformanceStats; p2: PlayerPerformanceStats } {
  const init = (): PlayerPerformanceStats => ({
    hitsLanded: 0,
    blocks: 0,
    perfectGuards: 0,
    counters: 0,
    guardBreaksDealt: 0,
    totalDamage: 0,
    maxCombo: 0,
  });
  const p1 = init();
  const p2 = init();

  for (const e of entries) {
    const s = e.actorSlot === 1 ? p1 : p2;
    if (
      e.eventType === 'hit' ||
      e.eventType === 'medium_hit' ||
      e.eventType === 'heavy_hit' ||
      e.eventType === 'ultimate'
    ) {
      s.hitsLanded++;
    } else if (e.eventType === 'block') {
      s.blocks++;
    } else if (e.eventType === 'perfect_guard') {
      s.perfectGuards++;
    } else if (e.eventType === 'counter_hit' || e.eventType === 'punish_counter') {
      s.counters++;
    } else if (e.eventType === 'guard_break') {
      s.guardBreaksDealt++;
    }
  }

  p1.totalDamage = state.p1.totalDamageDealt;
  p1.maxCombo = state.p1.maxComboReached;
  p2.totalDamage = state.p2.totalDamageDealt;
  p2.maxCombo = state.p2.maxComboReached;

  return { p1, p2 };
}
