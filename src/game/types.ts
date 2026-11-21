export type FighterId = 'kael' | 'vexa';

export type StageId = 'orbital_arena' | 'energy_dock';

export type GameMode = 'training' | 'local2p' | 'lan';

export type ScreenState =
  | 'title'
  | 'menu'
  | 'mode_select'
  | 'lan_menu'
  | 'lobby'
  | 'char_select'
  | 'stage_select'
  | 'combat'
  | 'settings'
  | 'about';

export type ActionState =
  | 'idle'
  | 'walk_fwd'
  | 'walk_back'
  | 'jump'
  | 'crouch'
  | 'light'
  | 'heavy'
  | 'special'
  | 'block'
  | 'hitstun'
  | 'stunned'
  | 'victory'
  | 'defeat';

export type GraphicsQuality = 'high' | 'medium' | 'low';

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  light: boolean;
  heavy: boolean;
  special: boolean;
  block: boolean;
}

export interface InputEdgeState {
  prev: InputState;
  bufferedAction: 'light' | 'heavy' | 'special' | 'jump' | null;
  bufferFrames: number;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AttackFrameData {
  name: string;
  startup: number;
  active: number;
  recovery: number;
  damage: number;
  chipDamage: number;
  hitstun: number;
  blockstun: number;
  knockbackX: number;
  knockbackY: number;
  stunBuild: number;
  energyGain: number;
  energyCost: number;
  hitboxOffsetX: number;
  hitboxOffsetY: number;
  hitboxWidth: number;
  hitboxHeight: number;
  isProjectile?: boolean;
  isDashStrike?: boolean;
  hitstopFrames: number;
}

export interface FighterProfile {
  id: FighterId;
  name: string;
  title: string;
  style: string;
  specialty: string;
  specialMoveName: string;
  specialMoveDesc: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  maxHp: number;
  walkSpeed: number;
  backWalkSpeed: number;
  jumpVelocity: number;
  gravity: number;
  hurtboxWidth: number;
  hurtboxHeight: number;
  crouchHeight: number;
  attacks: {
    light: AttackFrameData;
    heavy: AttackFrameData;
    special: AttackFrameData;
  };
}

export interface FighterState {
  slot: 1 | 2;
  id: FighterId;
  playerName: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  grounded: boolean;
  crouching: boolean;
  hp: number;
  trailHp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  stun: number;
  maxStun: number;
  action: ActionState;
  actionFrame: number;
  stunTimer: number;
  hitFlashFrames: number;
  hasHitCurrentAttack: boolean;
  comboCount: number;
  comboTimer: number;
  maxComboReached: number;
  totalDamageDealt: number;
  roundsWon: number;
  invulnFrames: number;
  edge: InputEdgeState;
}

export interface Projectile {
  id: number;
  ownerSlot: 1 | 2;
  fighterId: FighterId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  chipDamage: number;
  hitstun: number;
  blockstun: number;
  knockbackX: number;
  stunBuild: number;
  lifeFrames: number;
  maxLifeFrames: number;
}

export type RoundPhase = 'intro' | 'fighting' | 'ko' | 'round_over' | 'match_over';

export interface CombatEvent {
  type: 'hit' | 'heavy_hit' | 'block' | 'special' | 'jump' | 'ko' | 'stun' | 'round_start';
  x: number;
  y: number;
  slot: 1 | 2;
  fighterId: FighterId;
  damage?: number;
  combo?: number;
}

export interface MatchState {
  tick: number;
  mode: GameMode;
  stage: StageId;
  phase: RoundPhase;
  phaseTimer: number;
  roundNumber: number;
  timerSeconds: number;
  timerSubTicks: number;
  hitstopFrames: number;
  cameraShake: number;
  winnerSlot: 1 | 2 | null;
  p1: FighterState;
  p2: FighterState;
  projectiles: Projectile[];
  nextProjectileId: number;
  trainingInfiniteEnergy: boolean;
  trainingAutoRegen: boolean;
  trainingHpPercent: number;
  events: CombatEvent[];
}

export interface TouchControlLayout {
  enabled: boolean;
  scale: number; // 0.75 to 1.35
  leftOffsetX: number; // px offset
  leftOffsetY: number;
  rightOffsetX: number;
  rightOffsetY: number;
}

export interface SettingsConfig {
  graphicsQuality: GraphicsQuality;
  muted: boolean;
  volume: number;
  touchLayout: TouchControlLayout;
  trainingHpPercent: number;
  trainingInfiniteEnergy: boolean;
  trainingAutoRegen: boolean;
  botDifficulty: 'easy' | 'normal';
}

export interface LanRoomSummary {
  roomId: string;
  hostName: string;
  hostIp: string;
  port: number;
  playerCount: number;
  maxPlayers: number;
  status: 'waiting' | 'lobby' | 'in_match';
  stage: StageId;
}

export interface LobbyPlayer {
  slot: 1 | 2;
  name: string;
  fighter: FighterId;
  ready: boolean;
  connected: boolean;
}

export interface LobbyState {
  roomId: string;
  hostIps: string[];
  port: number;
  stage: StageId;
  players: [LobbyPlayer, LobbyPlayer];
  matchStarted: boolean;
}
