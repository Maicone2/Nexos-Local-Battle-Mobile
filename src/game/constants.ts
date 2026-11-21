import { FighterId, FighterProfile, InputState, SettingsConfig, StageId } from './types';

export const FIXED_FPS = 60;
export const FIXED_DT = 1 / FIXED_FPS;

export const ARENA_WIDTH = 1280;
export const ARENA_HEIGHT = 720;
export const FLOOR_Y = 590;
export const STAGE_LEFT = 86;
export const STAGE_RIGHT = 1194;

export const ROUND_TIME_SECONDS = 99;
export const ROUNDS_TO_WIN = 2;
export const INPUT_BUFFER_WINDOW = 9; // frames

export const EMPTY_INPUT: InputState = {
  left: false,
  right: false,
  up: false,
  down: false,
  light: false,
  heavy: false,
  special: false,
  block: false,
};

export const FIGHTER_PROFILES: Record<FighterId, FighterProfile> = {
  kael: {
    id: 'kael',
    name: 'KAEL',
    title: 'Guardião do Núcleo Solar',
    style: 'Combate Energético',
    specialty: 'Ataques de Energia',
    specialMoveName: 'Pulso Solar',
    specialMoveDesc: 'Projeta uma onda concentrada de energia solar ciano-dourada que atravessa a arena.',
    primaryColor: '#00E5FF',
    secondaryColor: '#F5B700',
    accentColor: '#0D131D',
    maxHp: 1000,
    walkSpeed: 5.4,
    backWalkSpeed: 4.3,
    jumpVelocity: -18.8,
    gravity: 0.92,
    hurtboxWidth: 74,
    hurtboxHeight: 174,
    crouchHeight: 112,
    attacks: {
      light: {
        name: 'Golpe Ciano',
        startup: 5,
        active: 4,
        recovery: 9,
        damage: 58,
        chipDamage: 8,
        hitstun: 14,
        blockstun: 10,
        knockbackX: 5.2,
        knockbackY: 0,
        stunBuild: 9,
        energyGain: 10,
        energyCost: 0,
        hitboxOffsetX: 34,
        hitboxOffsetY: -128,
        hitboxWidth: 82,
        hitboxHeight: 38,
        hitstopFrames: 3,
      },
      heavy: {
        name: 'Impacto Dourado',
        startup: 11,
        active: 6,
        recovery: 18,
        damage: 118,
        chipDamage: 18,
        hitstun: 22,
        blockstun: 14,
        knockbackX: 11.5,
        knockbackY: -4.2,
        stunBuild: 20,
        energyGain: 16,
        energyCost: 0,
        hitboxOffsetX: 40,
        hitboxOffsetY: -136,
        hitboxWidth: 106,
        hitboxHeight: 54,
        hitstopFrames: 6,
      },
      special: {
        name: 'Pulso Solar',
        startup: 13,
        active: 8,
        recovery: 22,
        damage: 175,
        chipDamage: 32,
        hitstun: 28,
        blockstun: 18,
        knockbackX: 14.5,
        knockbackY: -6.5,
        stunBuild: 28,
        energyGain: 0,
        energyCost: 50,
        hitboxOffsetX: 56,
        hitboxOffsetY: -124,
        hitboxWidth: 96,
        hitboxHeight: 68,
        isProjectile: true,
        hitstopFrames: 8,
      },
    },
  },
  vexa: {
    id: 'vexa',
    name: 'VEXA',
    title: 'Lâmina Cinética Sombria',
    style: 'Combate Ágil',
    specialty: 'Ataques Rápidos',
    specialMoveName: 'Vórtice Azul',
    specialMoveDesc: 'Avanço relâmpago envolto num ciclone elétrico violeta-azul com múltiplos impactos.',
    primaryColor: '#A855F7',
    secondaryColor: '#38BDF8',
    accentColor: '#0E0B1A',
    maxHp: 940,
    walkSpeed: 6.4,
    backWalkSpeed: 5.2,
    jumpVelocity: -19.6,
    gravity: 0.94,
    hurtboxWidth: 68,
    hurtboxHeight: 168,
    crouchHeight: 106,
    attacks: {
      light: {
        name: 'Corte Rápido',
        startup: 4,
        active: 4,
        recovery: 7,
        damage: 50,
        chipDamage: 7,
        hitstun: 13,
        blockstun: 9,
        knockbackX: 4.5,
        knockbackY: 0,
        stunBuild: 8,
        energyGain: 11,
        energyCost: 0,
        hitboxOffsetX: 30,
        hitboxOffsetY: -122,
        hitboxWidth: 84,
        hitboxHeight: 34,
        hitstopFrames: 3,
      },
      heavy: {
        name: 'Chute Espiral',
        startup: 9,
        active: 6,
        recovery: 15,
        damage: 106,
        chipDamage: 16,
        hitstun: 21,
        blockstun: 13,
        knockbackX: 10.2,
        knockbackY: -4.8,
        stunBuild: 18,
        energyGain: 17,
        energyCost: 0,
        hitboxOffsetX: 36,
        hitboxOffsetY: -134,
        hitboxWidth: 108,
        hitboxHeight: 52,
        hitstopFrames: 6,
      },
      special: {
        name: 'Vórtice Azul',
        startup: 10,
        active: 14,
        recovery: 19,
        damage: 168,
        chipDamage: 28,
        hitstun: 30,
        blockstun: 17,
        knockbackX: 15.0,
        knockbackY: -7.0,
        stunBuild: 26,
        energyGain: 0,
        energyCost: 50,
        hitboxOffsetX: 24,
        hitboxOffsetY: -146,
        hitboxWidth: 122,
        hitboxHeight: 104,
        isDashStrike: true,
        hitstopFrames: 8,
      },
    },
  },
};

export interface StageMeta {
  id: StageId;
  name: string;
  subtitle: string;
  imagePath: string;
  ambientHue: string;
  floorGlow: string;
}

export const STAGES: Record<StageId, StageMeta> = {
  orbital_arena: {
    id: 'orbital_arena',
    name: 'Arena Néon Orbital',
    subtitle: 'Anfiteatro de Combate Metropolitano',
    imagePath: '/src/assets/images/stage_orbital_arena_1795281704662.jpg',
    ambientHue: '#00A8FF',
    floorGlow: 'rgba(0, 168, 255, 0.35)',
  },
  energy_dock: {
    id: 'energy_dock',
    name: 'Cais Subterrâneo de Energia',
    subtitle: 'Setor de Turbinas de Alta Tensão',
    imagePath: '/src/assets/images/stage_energy_dock_1795281704619.jpg',
    ambientHue: '#8B5CF6',
    floorGlow: 'rgba(139, 92, 246, 0.35)',
  },
};

export const DEFAULT_SETTINGS: SettingsConfig = {
  graphicsQuality: 'high',
  muted: false,
  volume: 0.7,
  touchLayout: {
    enabled: true,
    scale: 1,
    leftOffsetX: 0,
    leftOffsetY: 0,
    rightOffsetX: 0,
    rightOffsetY: 0,
  },
  trainingHpPercent: 100,
  trainingInfiniteEnergy: true,
  trainingAutoRegen: true,
  botDifficulty: 'easy',
};
