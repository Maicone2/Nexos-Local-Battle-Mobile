import {
  CombatEvent,
  ComboTrialDef,
  ComboTrialDemoFrame,
  FighterId,
  InputState,
  MatchState,
} from './types';

const NEUTRAL_INPUT: InputState = {
  left: false,
  right: false,
  up: false,
  down: false,
  light: false,
  medium: false,
  heavy: false,
  special: false,
  block: false,
  charge: false,
};

export const COMBO_TRIALS: ComboTrialDef[] = [
  // ==================== KAEL ====================
  {
    id: 101,
    fighterId: 'kael',
    order: 1,
    title: 'Cadeia Solar Básica',
    difficulty: 'Básico',
    description: 'Encadeia dois golpes ligeiros num impacto médio sem deixar o alvo recuperar.',
    notation: 'Ligeiro (J) → Ligeiro II (J) → Médio (H)',
    steps: [
      { label: 'Golpe Ciano', command: 'J', moveIds: ['stand_light'] },
      { label: 'Solar Jab II', command: 'J', moveIds: ['solar_jab_2'] },
      { label: 'Impacto Solar', command: 'H', moveIds: ['stand_medium'] },
    ],
    demoScript: [
      { input: { light: true }, frames: 2 },
      { input: {}, frames: 6 },
      { input: { light: true }, frames: 2 },
      { input: {}, frames: 7 },
      { input: { medium: true }, frames: 2 },
    ],
  },
  {
    id: 102,
    fighterId: 'kael',
    order: 2,
    title: 'Cancelamento Pulso Solar',
    difficulty: 'Básico',
    description: 'Confirma Ligeiro em Médio e cancela diretamente no projétil Pulso Solar.',
    notation: 'Ligeiro (J) → Médio (H) → Especial (L)',
    steps: [
      { label: 'Golpe Ciano', command: 'J', moveIds: ['stand_light'] },
      { label: 'Impacto Solar', command: 'H', moveIds: ['stand_medium'] },
      { label: 'Pulso Solar', command: 'L', moveIds: ['special_pulse'] },
    ],
    demoScript: [
      { input: { light: true }, frames: 2 },
      { input: {}, frames: 6 },
      { input: { medium: true }, frames: 2 },
      { input: {}, frames: 12 },
      { input: { special: true }, frames: 2 },
    ],
  },
  {
    id: 103,
    fighterId: 'kael',
    order: 3,
    title: 'Investida Photon Breaker',
    difficulty: 'Intermédio',
    description: 'Avança com Photon Rush (→+H) e quebra a guarda com Energy Breaker (→+K).',
    notation: 'Ligeiro (J) → →+Médio (Photon Rush) → →+Pesado (Energy Breaker)',
    steps: [
      { label: 'Golpe Ciano', command: 'J', moveIds: ['stand_light'] },
      { label: 'Photon Rush', command: '→+H', moveIds: ['photon_rush'] },
      { label: 'Energy Breaker', command: '→+K', moveIds: ['energy_breaker'] },
    ],
    demoScript: [
      { input: { light: true }, frames: 2 },
      { input: {}, frames: 7 },
      { input: { right: true, medium: true }, frames: 2 },
      { input: {}, frames: 15 },
      { input: { right: true, heavy: true }, frames: 2 },
    ],
  },
  {
    id: 104,
    fighterId: 'kael',
    order: 4,
    title: 'Solar Upper & Combo Aéreo',
    difficulty: 'Avançado',
    description: 'Lança o alvo com Uppercut (-15% HP), executa Jump Cancel e acerta no ar.',
    notation: '↓+Ligeiro (Upper) → ↗ Salto → Ligeiro (Ar) → Pesado (Ar)',
    steps: [
      { label: 'Solar Upper', command: '↓+J', moveIds: ['crouch_uppercut'] },
      { label: 'Voadora Rápida', command: '↗ J', moveIds: ['air_light'] },
      { label: 'Chute Voador', command: 'K', moveIds: ['air_heavy'] },
    ],
    demoScript: [
      { input: { down: true, light: true }, frames: 2 },
      { input: {}, frames: 10 },
      { input: { up: true, right: true }, frames: 3 },
      { input: { right: true }, frames: 12 },
      { input: { light: true }, frames: 2 },
      { input: {}, frames: 7 },
      { input: { heavy: true }, frames: 2 },
    ],
  },
  {
    id: 105,
    fighterId: 'kael',
    order: 5,
    title: 'Explosão Solar Suprema',
    difficulty: 'Mestre',
    description: 'Combo completo de 4 fases terminando no Ultimate Solar Burst.',
    notation: 'Ligeiro (J) → Médio (H) → →+Médio (→+H) → Ultimate (↓+L)',
    steps: [
      { label: 'Golpe Ciano', command: 'J', moveIds: ['stand_light'] },
      { label: 'Impacto Solar', command: 'H', moveIds: ['stand_medium'] },
      { label: 'Photon Rush', command: '→+H', moveIds: ['photon_rush'] },
      { label: 'Solar Burst', command: '↓+L', moveIds: ['ultimate_solar_burst'] },
    ],
    demoScript: [
      { input: { light: true }, frames: 2 },
      { input: {}, frames: 7 },
      { input: { medium: true }, frames: 2 },
      { input: {}, frames: 12 },
      { input: { right: true, medium: true }, frames: 2 },
      { input: {}, frames: 15 },
      { input: { down: true, special: true }, frames: 2 },
    ],
  },

  // ==================== VEXA ====================
  {
    id: 201,
    fighterId: 'vexa',
    order: 1,
    title: 'Rajada Violeta Tripla',
    difficulty: 'Básico',
    description: 'Aproveita a velocidade de Vexa para ligar os 3 golpes ligeiros seguidos.',
    notation: 'Ligeiro (J) → Ligeiro II (J) → Ligeiro III (J)',
    steps: [
      { label: 'Corte Rápido', command: 'J', moveIds: ['stand_light'] },
      { label: 'Violet Strike II', command: 'J', moveIds: ['violet_strike_2'] },
      { label: 'Violet Strike III', command: 'J', moveIds: ['violet_strike_3'] },
    ],
    demoScript: [
      { input: { light: true }, frames: 2 },
      { input: {}, frames: 5 },
      { input: { light: true }, frames: 2 },
      { input: {}, frames: 6 },
      { input: { light: true }, frames: 2 },
    ],
  },
  {
    id: 202,
    fighterId: 'vexa',
    order: 2,
    title: 'Espiral & Vórtice Azul',
    difficulty: 'Básico',
    description: 'Liga o chute giratório Spiral Kick diretamente no especial Vórtice Azul.',
    notation: 'Ligeiro (J) → →+Médio (Spiral Kick) → Especial (L)',
    steps: [
      { label: 'Corte Rápido', command: 'J', moveIds: ['stand_light'] },
      { label: 'Spiral Kick', command: '→+H', moveIds: ['spiral_kick'] },
      { label: 'Vórtice Azul', command: 'L', moveIds: ['special_vortex'] },
    ],
    demoScript: [
      { input: { light: true }, frames: 2 },
      { input: {}, frames: 6 },
      { input: { right: true, medium: true }, frames: 2 },
      { input: {}, frames: 14 },
      { input: { special: true }, frames: 2 },
    ],
  },
  {
    id: 203,
    fighterId: 'vexa',
    order: 3,
    title: 'Tempestade & Vórtice',
    difficulty: 'Intermédio',
    description: 'Liga Ligeiro, Médio e Spiral Kick diretamente no Vórtice Azul.',
    notation: 'Ligeiro (J) → Médio (H) → →+Médio (Spiral) → Especial (L)',
    steps: [
      { label: 'Corte Rápido', command: 'J', moveIds: ['stand_light'] },
      { label: 'Chute Violeta', command: 'H', moveIds: ['stand_medium'] },
      { label: 'Spiral Kick', command: '→+H', moveIds: ['spiral_kick'] },
      { label: 'Vórtice Azul', command: 'L', moveIds: ['special_vortex'] },
    ],
    demoScript: [
      { input: { light: true }, frames: 2 },
      { input: {}, frames: 6 },
      { input: { medium: true }, frames: 2 },
      { input: {}, frames: 11 },
      { input: { right: true, medium: true }, frames: 2 },
      { input: {}, frames: 14 },
      { input: { special: true }, frames: 2 },
    ],
  },
  {
    id: 204,
    fighterId: 'vexa',
    order: 4,
    title: 'Combo Aéreo Cinético',
    difficulty: 'Avançado',
    description: 'Executa a cadeia aérea completa de 3 golpes após o Uppercut.',
    notation: '↓+J (Upper) → ↗ Salto → J (Ar) → H (Ar) → K (Ar)',
    steps: [
      { label: 'Vortex Upper', command: '↓+J', moveIds: ['crouch_uppercut'] },
      { label: 'Aerial Slice', command: '↗ J', moveIds: ['air_light'] },
      { label: 'Aerial Phantom', command: 'H', moveIds: ['air_medium'] },
      { label: 'Voadora Giratória', command: 'K', moveIds: ['air_heavy'] },
    ],
    demoScript: [
      { input: { down: true, light: true }, frames: 2 },
      { input: {}, frames: 9 },
      { input: { up: true, right: true }, frames: 3 },
      { input: { right: true }, frames: 11 },
      { input: { light: true }, frames: 2 },
      { input: {}, frames: 5 },
      { input: { medium: true }, frames: 2 },
      { input: {}, frames: 7 },
      { input: { heavy: true }, frames: 2 },
    ],
  },
  {
    id: 205,
    fighterId: 'vexa',
    order: 5,
    title: 'Vortex Blue Supremo',
    difficulty: 'Mestre',
    description: 'Encadeia Médio e Violet Rush (→+K) até à explosão Vortex Blue.',
    notation: 'Ligeiro (J) → Médio (H) → →+Pesado (→+K) → Ultimate (↓+L)',
    steps: [
      { label: 'Corte Rápido', command: 'J', moveIds: ['stand_light'] },
      { label: 'Chute Violeta', command: 'H', moveIds: ['stand_medium'] },
      { label: 'Violet Rush', command: '→+K', moveIds: ['violet_rush'] },
      { label: 'Vortex Blue', command: '↓+L', moveIds: ['ultimate_vortex_blue'] },
    ],
    demoScript: [
      { input: { light: true }, frames: 2 },
      { input: {}, frames: 6 },
      { input: { medium: true }, frames: 2 },
      { input: {}, frames: 11 },
      { input: { right: true, heavy: true }, frames: 2 },
      { input: {}, frames: 18 },
      { input: { down: true, special: true }, frames: 2 },
    ],
  },

  // ==================== ZANE ====================
  {
    id: 301,
    fighterId: 'zane',
    order: 1,
    title: 'Golpe de Titânio',
    difficulty: 'Básico',
    description: 'Aprende o ritmo pesado de Zane ligando Soco Blindado, Quebra-Guarda e Médio.',
    notation: 'Ligeiro (J) → Ligeiro II (J) → Médio (H)',
    steps: [
      { label: 'Soco Blindado', command: 'J', moveIds: ['stand_light'] },
      { label: 'Quebra-Guarda', command: 'J', moveIds: ['titan_smash_2'] },
      { label: 'Impacto de Titânio', command: 'H', moveIds: ['stand_medium'] },
    ],
    demoScript: [
      { input: { light: true }, frames: 2 },
      { input: {}, frames: 7 },
      { input: { light: true }, frames: 2 },
      { input: {}, frames: 8 },
      { input: { medium: true }, frames: 2 },
    ],
  },
  {
    id: 302,
    fighterId: 'zane',
    order: 2,
    title: 'Impacto Sísmico',
    difficulty: 'Básico',
    description: 'Cancela um ataque médio diretamente na investida Impacto Sísmico.',
    notation: 'Ligeiro (J) → Médio (H) → Especial (L)',
    steps: [
      { label: 'Soco Blindado', command: 'J', moveIds: ['stand_light'] },
      { label: 'Impacto de Titânio', command: 'H', moveIds: ['stand_medium'] },
      { label: 'Impacto Sísmico', command: 'L', moveIds: ['special_seismic'] },
    ],
    demoScript: [
      { input: { light: true }, frames: 2 },
      { input: {}, frames: 8 },
      { input: { medium: true }, frames: 2 },
      { input: {}, frames: 13 },
      { input: { special: true }, frames: 2 },
    ],
  },
  {
    id: 303,
    fighterId: 'zane',
    order: 3,
    title: 'Aríete Carmesim',
    difficulty: 'Intermédio',
    description: 'Avança com Aríete Sísmico (→+H) e esmaga contra a parede com →+K.',
    notation: 'Ligeiro (J) → →+Médio (Aríete) → →+Pesado (Esmagamento)',
    steps: [
      { label: 'Soco Blindado', command: 'J', moveIds: ['stand_light'] },
      { label: 'Aríete Sísmico', command: '→+H', moveIds: ['seismic_dash'] },
      { label: 'Esmagamento Carmesim', command: '→+K', moveIds: ['crimson_crush'] },
    ],
    demoScript: [
      { input: { light: true }, frames: 2 },
      { input: {}, frames: 8 },
      { input: { right: true, medium: true }, frames: 2 },
      { input: {}, frames: 16 },
      { input: { right: true, heavy: true }, frames: 2 },
    ],
  },
  {
    id: 304,
    fighterId: 'zane',
    order: 4,
    title: 'Vulcão Upper & Voadora',
    difficulty: 'Avançado',
    description: 'Lança o alvo com Vulcão Upper (-15% HP) e finaliza com Voadora Pesada.',
    notation: '↓+Pesado (Upper) → ↗ Salto → Ligeiro (Ar) → Pesado (Ar)',
    steps: [
      { label: 'Vulcão Upper', command: '↓+K', moveIds: ['crouch_uppercut'] },
      { label: 'Punho Aéreo', command: '↗ J', moveIds: ['air_light'] },
      { label: 'Voadora Pesada', command: 'K', moveIds: ['air_heavy'] },
    ],
    demoScript: [
      { input: { down: true, heavy: true }, frames: 2 },
      { input: {}, frames: 10 },
      { input: { up: true, right: true }, frames: 3 },
      { input: { right: true }, frames: 12 },
      { input: { light: true }, frames: 2 },
      { input: {}, frames: 7 },
      { input: { heavy: true }, frames: 2 },
    ],
  },
  {
    id: 305,
    fighterId: 'zane',
    order: 5,
    title: 'Erupção Carmesim Suprema',
    difficulty: 'Mestre',
    description: 'Combo de força máxima ligando Médio, Aríete Sísmico e Ultimate Erupção Carmesim.',
    notation: 'Ligeiro (J) → Médio (H) → →+Médio (→+H) → Ultimate (↓+L)',
    steps: [
      { label: 'Soco Blindado', command: 'J', moveIds: ['stand_light'] },
      { label: 'Impacto de Titânio', command: 'H', moveIds: ['stand_medium'] },
      { label: 'Aríete Sísmico', command: '→+H', moveIds: ['seismic_dash'] },
      { label: 'Erupção Carmesim', command: '↓+L', moveIds: ['ultimate_crimson_eruption'] },
    ],
    demoScript: [
      { input: { light: true }, frames: 2 },
      { input: {}, frames: 8 },
      { input: { medium: true }, frames: 2 },
      { input: {}, frames: 13 },
      { input: { right: true, medium: true }, frames: 2 },
      { input: {}, frames: 16 },
      { input: { down: true, special: true }, frames: 2 },
    ],
  },

  // ==================== NYX ====================
  {
    id: 401,
    fighterId: 'nyx',
    order: 1,
    title: 'Combo Ninja Triplo',
    difficulty: 'Básico',
    description: 'Executa os 3 cortes rápidos em sequência da escola criogénica.',
    notation: 'Ligeiro (J) → Ligeiro II (J) → Ligeiro III (J)',
    steps: [
      { label: 'Corte Glacial', command: 'J', moveIds: ['stand_light'] },
      { label: 'Lâmina Dupla', command: 'J', moveIds: ['frost_slash_2'] },
      { label: 'Estocada Zero', command: 'J', moveIds: ['frost_slash_3'] },
    ],
    demoScript: [
      { input: { light: true }, frames: 2 },
      { input: {}, frames: 5 },
      { input: { light: true }, frames: 2 },
      { input: {}, frames: 6 },
      { input: { light: true }, frames: 2 },
    ],
  },
  {
    id: 402,
    fighterId: 'nyx',
    order: 2,
    title: 'Passo & Lâmina Glacial',
    difficulty: 'Básico',
    description: 'Aproxima com Passo Glacial (→+H) e dispara o projétil Lâmina Glacial.',
    notation: 'Ligeiro (J) → →+Médio (Passo Glacial) → Especial (L)',
    steps: [
      { label: 'Corte Glacial', command: 'J', moveIds: ['stand_light'] },
      { label: 'Passo Glacial', command: '→+H', moveIds: ['frost_dash'] },
      { label: 'Lâmina Glacial', command: 'L', moveIds: ['special_glacial_blade'] },
    ],
    demoScript: [
      { input: { light: true }, frames: 2 },
      { input: {}, frames: 6 },
      { input: { right: true, medium: true }, frames: 2 },
      { input: {}, frames: 14 },
      { input: { special: true }, frames: 2 },
    ],
  },
  {
    id: 403,
    fighterId: 'nyx',
    order: 3,
    title: 'Quebra-Gelo Polar',
    difficulty: 'Intermédio',
    description: 'Liga Médio em Quebra-Gelo (→+K) e finaliza à distância com Lâmina Glacial.',
    notation: 'Ligeiro (J) → Médio (H) → →+Pesado (Quebra-Gelo) → Especial (L)',
    steps: [
      { label: 'Corte Glacial', command: 'J', moveIds: ['stand_light'] },
      { label: 'Chute Criogénico', command: 'H', moveIds: ['stand_medium'] },
      { label: 'Quebra-Gelo', command: '→+K', moveIds: ['glacier_break'] },
      { label: 'Lâmina Glacial', command: 'L', moveIds: ['special_glacial_blade'] },
    ],
    demoScript: [
      { input: { light: true }, frames: 2 },
      { input: {}, frames: 6 },
      { input: { medium: true }, frames: 2 },
      { input: {}, frames: 11 },
      { input: { right: true, heavy: true }, frames: 2 },
      { input: {}, frames: 16 },
      { input: { special: true }, frames: 2 },
    ],
  },
  {
    id: 404,
    fighterId: 'nyx',
    order: 4,
    title: 'Ascensão Polar Aérea',
    difficulty: 'Avançado',
    description: 'Lança com Ascensão Polar e encadeia 3 golpes aéreos antes de aterrar.',
    notation: '↓+J (Upper) → ↗ Salto → J (Ar) → H (Ar) → K (Ar)',
    steps: [
      { label: 'Ascensão Polar', command: '↓+J', moveIds: ['crouch_uppercut'] },
      { label: 'Kunai Aérea', command: '↗ J', moveIds: ['air_light'] },
      { label: 'Corte em Voo', command: 'H', moveIds: ['air_medium'] },
      { label: 'Voadora Ninja', command: 'K', moveIds: ['air_heavy'] },
    ],
    demoScript: [
      { input: { down: true, light: true }, frames: 2 },
      { input: {}, frames: 9 },
      { input: { up: true, right: true }, frames: 3 },
      { input: { right: true }, frames: 11 },
      { input: { light: true }, frames: 2 },
      { input: {}, frames: 5 },
      { input: { medium: true }, frames: 2 },
      { input: {}, frames: 7 },
      { input: { heavy: true }, frames: 2 },
    ],
  },
  {
    id: 405,
    fighterId: 'nyx',
    order: 5,
    title: 'Tempestade Zero Suprema',
    difficulty: 'Mestre',
    description: 'Domina o combo de 5 golpes de Nyx finalizando em Tempestade Zero.',
    notation: 'J → J → J → →+Médio (→+H) → Ultimate (↓+L)',
    steps: [
      { label: 'Corte Glacial', command: 'J', moveIds: ['stand_light'] },
      { label: 'Lâmina Dupla', command: 'J', moveIds: ['frost_slash_2'] },
      { label: 'Estocada Zero', command: 'J', moveIds: ['frost_slash_3'] },
      { label: 'Passo Glacial', command: '→+H', moveIds: ['frost_dash'] },
      { label: 'Tempestade Zero', command: '↓+L', moveIds: ['ultimate_zero_tempest'] },
    ],
    demoScript: [
      { input: { light: true }, frames: 2 },
      { input: {}, frames: 6 },
      { input: { light: true }, frames: 2 },
      { input: {}, frames: 7 },
      { input: { light: true }, frames: 2 },
      { input: {}, frames: 9 },
      { input: { right: true, medium: true }, frames: 2 },
      { input: {}, frames: 14 },
      { input: { down: true, special: true }, frames: 2 },
    ],
  },
];

export function getTrialsForFighter(fighterId: FighterId): ComboTrialDef[] {
  return COMBO_TRIALS.filter((t) => t.fighterId === fighterId).sort((a, b) => a.order - b.order);
}

export function getTrialById(trialId: number): ComboTrialDef | undefined {
  return COMBO_TRIALS.find((t) => t.id === trialId);
}

export function buildDemoInputQueue(trial: ComboTrialDef): InputState[] {
  const frames: InputState[] = [];
  for (const seg of trial.demoScript) {
    for (let i = 0; i < seg.frames; i++) {
      frames.push({ ...NEUTRAL_INPUT, ...seg.input });
    }
  }
  return frames;
}

export interface TrialProgressState {
  stepIndex: number;
  completed: boolean;
}

export function createTrialProgressState(): TrialProgressState {
  return { stepIndex: 0, completed: false };
}

export function advanceTrialProgress(
  prev: TrialProgressState,
  trial: ComboTrialDef,
  state: MatchState,
  events: CombatEvent[]
): { next: TrialProgressState; justCompleted: boolean } {
  const hitEvents = events.filter(
    (e) =>
      e.slot === 2 &&
      (e.type === 'hit' ||
        e.type === 'medium_hit' ||
        e.type === 'heavy_hit' ||
        e.type === 'ultimate') &&
      Boolean(e.moveId)
  );

  let stepIndex = prev.stepIndex;

  if (hitEvents.length === 0) {
    if (state.p2.comboCount === 0 && stepIndex > 0) {
      return { next: { stepIndex: 0, completed: false }, justCompleted: false };
    }
    return { next: prev, justCompleted: false };
  }

  let justCompleted = false;
  let completed = false;

  for (const ev of hitEvents) {
    const moveId = ev.moveId!;
    if (ev.combo === 1) {
      stepIndex = 0;
    }

    const expectedStep = trial.steps[stepIndex];
    if (expectedStep && expectedStep.moveIds.includes(moveId)) {
      stepIndex++;
      if (stepIndex >= trial.steps.length) {
        completed = true;
        justCompleted = true;
        stepIndex = trial.steps.length;
      }
    } else {
      // Mismatched hit breaks sequence; allow immediate restart if it's a fresh 1-hit combo starter
      stepIndex = ev.combo === 1 && trial.steps[0]?.moveIds.includes(moveId) ? 1 : 0;
    }
  }

  return {
    next: { stepIndex, completed },
    justCompleted,
  };
}

const TRIALS_STORAGE_KEY = 'neon_clash_combo_trials_v1';

export function loadCompletedTrials(): Record<number, boolean> {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(TRIALS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveCompletedTrials(map: Record<number, boolean>): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(TRIALS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore storage quota errors
  }
}
