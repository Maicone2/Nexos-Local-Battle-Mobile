export type FighterId = 'kael' | 'vexa' | 'zane' | 'nyx';

export type StageId = 'orbital_arena' | 'energy_dock' | 'cyber_temple' | 'reactor_core';

export type GameMode = 'vs_cpu' | 'local2p' | 'training' | 'combo_trials' | 'lan';

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
  | 'crouch_walk'
  | 'dash_fwd'
  | 'dash_back'
  | 'jump'
  | 'double_jump'
  | 'landing'
  | 'crouch'
  | 'air_recovery'
  | 'charge'
  | 'light'
  | 'medium'
  | 'heavy'
  | 'special'
  | 'ultimate'
  | 'block'
  | 'guard_break'
  | 'hitstun'
  | 'knockdown'
  | 'stunned'
  | 'victory'
  | 'defeat';

export type MoveId =
  | 'stand_light'
  | 'solar_jab_2'
  | 'violet_strike_2'
  | 'violet_strike_3'
  | 'titan_smash_2'
  | 'frost_slash_2'
  | 'frost_slash_3'
  | 'stand_medium'
  | 'photon_rush'
  | 'spiral_kick'
  | 'seismic_dash'
  | 'frost_dash'
  | 'stand_heavy'
  | 'energy_breaker'
  | 'violet_rush'
  | 'crimson_crush'
  | 'glacier_break'
  | 'crouch_medium_sweep'
  | 'crouch_uppercut'
  | 'air_light'
  | 'air_medium'
  | 'air_heavy'
  | 'sky_break'
  | 'special_pulse'
  | 'special_vortex'
  | 'special_seismic'
  | 'special_glacial_blade'
  | 'ultimate_solar_burst'
  | 'ultimate_vortex_blue'
  | 'ultimate_crimson_eruption'
  | 'ultimate_zero_tempest';

export type MoveCategory = 'light' | 'medium' | 'heavy' | 'special' | 'ultimate';

export type GraphicsQuality = 'high' | 'medium' | 'low';

export type TrainingDummyMode = 'standing' | 'guard' | 'cpu';

export type WeaponType =
  | 'fists'
  | 'sword'
  | 'axe'
  | 'spear'
  | 'hammer'
  | 'scythe'
  | 'daggers'
  | 'staff';

export type HeadgearStyle =
  | 'default'
  | 'spikes'
  | 'headband'
  | 'cyber_helm'
  | 'hood'
  | 'crown'
  | 'oni_horns'
  | 'none';

export type EyeStyle = 'default' | 'visor' | 'glowing_eyes' | 'mask' | 'cyclops';

export type BackGearStyle =
  | 'default'
  | 'double_sash'
  | 'cyber_wings'
  | 'cape'
  | 'flame_aura'
  | 'none';

export interface FighterAppearance {
  weapon: WeaponType;
  headgear: HeadgearStyle;
  eyeStyle: EyeStyle;
  backGear: BackGearStyle;
  primaryColor: string;
  secondaryColor: string;
  suitColor: string;
  skinColor: string;
  weaponColor: string;
}

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  light: boolean;
  medium: boolean;
  heavy: boolean;
  special: boolean;
  block: boolean;
  charge: boolean;
}

export interface InputEdgeState {
  prev: InputState;
  bufferedAction:
    | 'light'
    | 'medium'
    | 'heavy'
    | 'special'
    | 'sweep'
    | 'ultimate'
    | 'jump'
    | 'dash_fwd'
    | 'dash_back'
    | null;
  bufferFrames: number;
  lastTapLeftTick: number;
  lastTapRightTick: number;
  chordGuardTicks: number;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AttackFrameData {
  id: MoveId;
  name: string;
  category: MoveCategory;
  startup: number;
  active: number;
  recovery: number;
  damage: number;
  hpPercentDamage?: number; // e.g. 0.09 for rasteira, 0.15 for uppercut, 0.10 for voadora
  chipDamage: number;
  hitstun: number;
  blockstun: number;
  knockbackX: number;
  knockbackY: number;
  stunBuild: number;
  guardDamage: number;
  energyGain: number;
  energyCost: number;
  hitboxOffsetX: number;
  hitboxOffsetY: number;
  hitboxWidth: number;
  hitboxHeight: number;
  isProjectile?: boolean;
  isDashStrike?: boolean;
  isLow?: boolean;
  isOverhead?: boolean;
  isLauncher?: boolean;
  causesKnockdown?: boolean;
  causesWallBounce?: boolean;
  diveSpeedY?: number;
  advanceVx?: number;
  hitstopFrames: number;
  cancelInto: MoveId[];
  canJumpCancel?: boolean;
}

export interface FighterProfile {
  id: FighterId;
  name: string;
  title: string;
  style: string;
  specialty: string;
  specialMoveName: string;
  specialMoveDesc: string;
  ultimateMoveName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  maxHp: number;
  walkSpeed: number;
  backWalkSpeed: number;
  crouchWalkSpeed: number;
  dashSpeed: number;
  dashDuration: number;
  jumpVelocity: number;
  gravity: number;
  airAccel: number;
  canDoubleJump: boolean;
  hurtboxWidth: number;
  hurtboxHeight: number;
  crouchHeight: number;
  bodyBuild: 'balanced' | 'agile' | 'heavy' | 'ninja';
  chainLight2Id: MoveId;
  chainLight3Id?: MoveId;
  forwardMediumId: MoveId;
  forwardHeavyId: MoveId;
  specialMoveId: MoveId;
  ultimateMoveId: MoveId;
  moves: Partial<Record<MoveId, AttackFrameData>>;
}

export interface AfterimageGhost {
  x: number;
  y: number;
  facing: 1 | -1;
  alpha: number;
  action: ActionState;
  moveId: MoveId | null;
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
  guardMeter: number;
  maxGuardMeter: number;
  action: ActionState;
  currentMove: MoveId | null;
  actionFrame: number;
  blockFrames: number;
  stunTimer: number;
  knockdownTimer: number;
  hitFlashFrames: number;
  hasHitCurrentAttack: boolean;
  airJumpsLeft: number;
  airComboCount: number;
  wallBouncedThisCombo: boolean;
  comboCount: number;
  comboDamage: number;
  comboTimer: number;
  lastComboCount: number;
  droppedComboTimer: number;
  maxComboReached: number;
  totalDamageDealt: number;
  roundsWon: number;
  invulnFrames: number;
  dashCooldown: number;
  lastMoveStartup: number;
  lastMoveActive: number;
  lastMoveRecovery: number;
  lastMoveName: string;
  afterimages: AfterimageGhost[];
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
  guardDamage: number;
  lifeFrames: number;
  maxLifeFrames: number;
  moveId?: MoveId;
  label?: string;
}

export type RoundPhase = 'intro' | 'fighting' | 'ko' | 'round_over' | 'match_over';

export interface CombatEvent {
  type:
    | 'hit'
    | 'medium_hit'
    | 'heavy_hit'
    | 'block'
    | 'perfect_guard'
    | 'guard_break'
    | 'counter_hit'
    | 'punish_counter'
    | 'first_attack'
    | 'wall_bounce'
    | 'dash'
    | 'special'
    | 'ultimate'
    | 'charge'
    | 'jump'
    | 'ko'
    | 'stun'
    | 'round_start';
  x: number;
  y: number;
  slot: 1 | 2;
  fighterId: FighterId;
  damage?: number;
  combo?: number;
  moveId?: MoveId;
  label?: string;
}

export interface CombatCallout {
  id: number;
  slot: 1 | 2;
  text: string;
  color: string;
  framesLeft: number;
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
  firstAttackAwarded: boolean;
  winnerSlot: 1 | 2 | null;
  p1: FighterState;
  p2: FighterState;
  projectiles: Projectile[];
  nextProjectileId: number;
  callouts: CombatCallout[];
  nextCalloutId: number;
  trainingInfiniteEnergy: boolean;
  trainingAutoRegen: boolean;
  trainingHpPercent: number;
  events: CombatEvent[];
  lastInputs?: [InputState, InputState];
}

export type TouchControlId =
  | 'joystick'
  | 'light'
  | 'medium'
  | 'heavy'
  | 'block'
  | 'special'
  | 'charge'
  | 'sweep';

export interface TouchButtonConfig {
  xPct: number;
  yPct: number;
  scale: number;
  opacity: number;
  visible: boolean;
}

export interface TouchControlLayout {
  enabled: boolean;
  controlStyle: 'joystick' | 'dpad8';
  scale: number; // 0.75 to 1.35
  opacity: number; // 0.35 to 1.0
  leftOffsetX: number; // px offset
  leftOffsetY: number;
  rightOffsetX: number;
  rightOffsetY: number;
  controls: Record<TouchControlId, TouchButtonConfig>;
}

export interface CustomHudConfig {
  hudScale: number; // 0.8 to 1.2
  hudOpacity: number; // 0.5 to 1.0
  showInputHistory: boolean;
  showCombatLog: boolean;
  showFrameData: boolean;
  showHitboxes: boolean;
  showComboMeter: boolean;
}

export interface SettingsConfig {
  graphicsQuality: GraphicsQuality;
  muted: boolean;
  volume: number;
  cameraShakeLevel: number; // 0 to 1.5
  inputBufferFrames: number; // 4 to 16
  touchLayout: TouchControlLayout;
  hudConfig: CustomHudConfig;
  fighterCustomizations: {
    p1: FighterAppearance;
    p2: FighterAppearance;
  };
  trainingHpPercent: number;
  trainingInfiniteEnergy: boolean;
  trainingAutoRegen: boolean;
  trainingDummyMode: TrainingDummyMode;
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

export interface ComboTrialStep {
  label: string;
  command: string;
  moveIds: MoveId[];
}

export interface ComboTrialDemoFrame {
  input: Partial<InputState>;
  frames: number;
}

export interface ComboTrialDef {
  id: number;
  fighterId: FighterId;
  order: number;
  title: string;
  difficulty: 'Básico' | 'Intermédio' | 'Avançado' | 'Mestre';
  description: string;
  notation: string;
  steps: ComboTrialStep[];
  demoScript: ComboTrialDemoFrame[];
}

export interface InputHistoryEntry {
  id: number;
  slot: 1 | 2;
  dirLabel: string;
  buttons: string[];
  tick: number;
  frames: number;
  sig: string;
}
