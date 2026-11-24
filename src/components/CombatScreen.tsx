import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Award,
  BookOpen,
  Check,
  ChevronRight,
  Eye,
  Film,
  Pause,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { audioManager } from '../game/AudioManager';
import { BotAI } from '../game/BotAI';
import {
  appendInputHistory,
  CombatLogEntry,
  computeCombatStats,
  extractCombatLogEntries,
} from '../game/combatLog';
import {
  advanceTrialProgress,
  buildDemoInputQueue,
  createTrialProgressState,
  getTrialById,
  getTrialsForFighter,
  loadCompletedTrials,
  saveCompletedTrials,
  TrialProgressState,
} from '../game/comboTrials';
import { createMatchState, resetRound, stepMatchSimulation } from '../game/CombatSystem';
import {
  DEFAULT_TOUCH_CONTROLS,
  EMPTY_INPUT,
  FIGHTER_PROFILES,
  FIXED_DT,
} from '../game/constants';
import { GameRenderer } from '../game/GameRenderer';
import { lanClient } from '../game/LanClient';
import {
  MatchRecorder,
  MatchReplay,
  ReplayPlayer,
  saveReplay,
} from '../game/replayStorage';
import {
  CombatEvent,
  ComboTrialDef,
  FighterId,
  GameMode,
  InputHistoryEntry,
  InputState,
  MatchState,
  SettingsConfig,
  StageId,
  TrainingDummyMode,
} from '../game/types';
import { CombatLogOverlay } from './CombatLogOverlay';
import { CustomHudModal } from './CustomHudModal';
import { MoveListModal } from './MoveListModal';
import { ResultModal } from './ResultModal';
import { DirectionalOutput, TouchJoystick } from './TouchJoystick';

interface CombatScreenProps {
  mode: GameMode;
  stage: StageId;
  p1Fighter: FighterId;
  p2Fighter: FighterId;
  lanInitialState?: MatchState | null;
  lanSlot?: 1 | 2;
  pingMs?: number;
  replayData?: MatchReplay | null;
  settings: SettingsConfig;
  isPortrait: boolean;
  onUpdateSettings: (next: SettingsConfig) => void;
  onToggleMute: () => void;
  onLocalMatchEnd?: (winnerSlot: 1 | 2) => void;
  onChangeCharacters: () => void;
  onExitToMenu: () => void;
}

interface HudSnapshot {
  p1Hp: number;
  p1TrailHp: number;
  p1MaxHp: number;
  p1Energy: number;
  p1Guard: number;
  p1Rounds: number;
  p1Combo: number;
  p1ComboDmg: number;
  p1DroppedCombo: number;
  p1Name: string;
  p2Hp: number;
  p2TrailHp: number;
  p2MaxHp: number;
  p2Energy: number;
  p2Guard: number;
  p2Rounds: number;
  p2Combo: number;
  p2ComboDmg: number;
  p2DroppedCombo: number;
  p2Name: string;
  timerSeconds: number;
  roundNumber: number;
  phase: MatchState['phase'];
  winnerSlot: 1 | 2 | null;
  p1MaxCombo: number;
  p1DamageDealt: number;
  p2MaxCombo: number;
  p2DamageDealt: number;
  elapsedSeconds: number;
  lastMoveName: string;
  lastMoveStartup: number;
  lastMoveActive: number;
  lastMoveRecovery: number;
}

function extractHud(s: MatchState): HudSnapshot {
  return {
    p1Hp: s.p1.hp,
    p1TrailHp: s.p1.trailHp,
    p1MaxHp: s.p1.maxHp,
    p1Energy: s.p1.energy,
    p1Guard: s.p1.guardMeter,
    p1Rounds: s.p1.roundsWon,
    p1Combo: s.p2.comboCount,
    p1ComboDmg: s.p2.comboDamage,
    p1DroppedCombo: s.p2.droppedComboTimer > 0 ? s.p2.lastComboCount : 0,
    p1Name: FIGHTER_PROFILES[s.p1.id].name,
    p2Hp: s.p2.hp,
    p2TrailHp: s.p2.trailHp,
    p2MaxHp: s.p2.maxHp,
    p2Energy: s.p2.energy,
    p2Guard: s.p2.guardMeter,
    p2Rounds: s.p2.roundsWon,
    p2Combo: s.p1.comboCount,
    p2ComboDmg: s.p1.comboDamage,
    p2DroppedCombo: s.p1.droppedComboTimer > 0 ? s.p1.lastComboCount : 0,
    p2Name: FIGHTER_PROFILES[s.p2.id].name,
    timerSeconds: s.timerSeconds,
    roundNumber: s.roundNumber,
    phase: s.phase,
    winnerSlot: s.winnerSlot,
    p1MaxCombo: s.p1.maxComboReached,
    p1DamageDealt: s.p1.totalDamageDealt,
    p2MaxCombo: s.p2.maxComboReached,
    p2DamageDealt: s.p2.totalDamageDealt,
    elapsedSeconds: Math.round(s.tick / 60),
    lastMoveName: s.p1.lastMoveName,
    lastMoveStartup: s.p1.lastMoveStartup,
    lastMoveActive: s.p1.lastMoveActive,
    lastMoveRecovery: s.p1.lastMoveRecovery,
  };
}

export function CombatScreen({
  mode,
  stage,
  p1Fighter,
  p2Fighter,
  lanInitialState,
  lanSlot = 1,
  pingMs = 0,
  replayData = null,
  settings,
  isPortrait,
  onUpdateSettings,
  onToggleMute,
  onLocalMatchEnd,
  onChangeCharacters,
  onExitToMenu,
}: CombatScreenProps) {
  const isReplay = Boolean(replayData);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const [showCustomHud, setShowCustomHud] = useState(false);
  const [showMoveList, setShowMoveList] = useState(false);
  const [showTrainingDrawer, setShowTrainingDrawer] = useState(false);
  const [showCombatLogPanel, setShowCombatLogPanel] = useState(false);
  const [compactHeight, setCompactHeight] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight < 480 : false
  );
  useEffect(() => {
    const onResize = () => setCompactHeight(window.innerHeight < 480);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const [trialFighter, setTrialFighter] = useState<FighterId>(p1Fighter);
  const fighterTrials = useMemo(() => getTrialsForFighter(trialFighter), [trialFighter]);
  const [selectedTrialId, setSelectedTrialId] = useState<number>(
    () => getTrialsForFighter(p1Fighter)[0]?.id ?? 101
  );
  const activeTrial: ComboTrialDef = useMemo(
    () => getTrialById(selectedTrialId) || fighterTrials[0],
    [selectedTrialId, fighterTrials]
  );
  const activeTrialRef = useRef<ComboTrialDef>(activeTrial);
  activeTrialRef.current = activeTrial;

  const [completedTrials, setCompletedTrials] = useState<Record<number, boolean>>(() =>
    loadCompletedTrials()
  );
  const [trialProgress, setTrialProgress] = useState<TrialProgressState>(
    createTrialProgressState
  );
  const trialTrackerRef = useRef<TrialProgressState>(createTrialProgressState());

  const [inputHistory, setInputHistory] = useState<InputHistoryEntry[]>([]);
  const [p2InputHistory, setP2InputHistory] = useState<InputHistoryEntry[]>([]);
  const [combatLog, setCombatLog] = useState<CombatLogEntry[]>([]);
  const [replaySaved, setReplaySaved] = useState(false);
  const recordedResultRef = useRef(false);
  const onLocalMatchEndRef = useRef(onLocalMatchEnd);
  onLocalMatchEndRef.current = onLocalMatchEnd;

  const recorderRef = useRef<MatchRecorder>(new MatchRecorder());
  const replayPlayerRef = useRef<ReplayPlayer | null>(
    replayData ? new ReplayPlayer(replayData) : null
  );
  const [replayPlaying, setReplayPlaying] = useState(true);
  const replayPlayingRef = useRef(true);
  const [replaySpeed, setReplaySpeed] = useState<0.5 | 1 | 1.5>(1);
  const replaySpeedRef = useRef<0.5 | 1 | 1.5>(1);
  const [replayProgress, setReplayProgress] = useState(() => ({
    tick: 0,
    total: replayData?.totalTicks || 0,
  }));

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const matchRef = useRef<MatchState>(
    (() => {
      if (replayPlayerRef.current) return replayPlayerRef.current.state;
      if (lanInitialState) return lanInitialState;
      const created = createMatchState({
        mode,
        stage,
        p1Id: p1Fighter,
        p2Id: p2Fighter,
        trainingHpPercent: settings.trainingHpPercent,
        trainingInfiniteEnergy:
          mode === 'combo_trials' ? true : settings.trainingInfiniteEnergy,
        trainingAutoRegen: mode === 'combo_trials' ? true : settings.trainingAutoRegen,
      });
      if (mode === 'combo_trials') {
        created.phase = 'fighting';
        created.phaseTimer = 0;
        created.p1.x = 520;
        created.p2.x = 640;
        created.p1.energy = created.p1.maxEnergy;
      }
      return created;
    })()
  );

  const [hud, setHud] = useState<HudSnapshot>(() => extractHud(matchRef.current));
  const lastHudKeyRef = useRef('');
  const lastTrailRef = useRef({ p1: -1, p2: -1 });
  const p1TrailBarRef = useRef<HTMLDivElement | null>(null);
  const p2TrailBarRef = useRef<HTMLDivElement | null>(null);

  const keysHeldRef = useRef<Set<string>>(new Set());
  const latchedKeysRef = useRef<Set<string>>(new Set());
  const touchInputRef = useRef<InputState>({ ...EMPTY_INPUT });
  const touchSweepRef = useRef(false);
  const [activeTouchBtns, setActiveTouchBtns] = useState<Record<string, boolean>>({});
  const [touchDir, setTouchDir] = useState<DirectionalOutput>({
    left: false,
    right: false,
    up: false,
    down: false,
  });

  // Demo script playback for Combo Trials & Log tracking refs
  const demoQueueRef = useRef<InputState[]>([]);
  const demoMoveIndexRef = useRef(0);
  const inputIdRef = useRef({ value: 1 });
  const combatLogIdRef = useRef({ value: 1 });
  const lastLoggedLanTickRef = useRef(-1);
  const inputHistoryRef = useRef<InputHistoryEntry[]>([]);
  const p2InputHistoryRef = useRef<InputHistoryEntry[]>([]);

  const syncHudIfChanged = (s: MatchState) => {
    const p1TrailPct = Math.round(Math.max(0, Math.min(100, (s.p1.trailHp / s.p1.maxHp) * 100)) * 10) / 10;
    const p2TrailPct = Math.round(Math.max(0, Math.min(100, (s.p2.trailHp / s.p2.maxHp) * 100)) * 10) / 10;
    if (p1TrailBarRef.current && lastTrailRef.current.p1 !== p1TrailPct) {
      lastTrailRef.current.p1 = p1TrailPct;
      p1TrailBarRef.current.style.width = `${p1TrailPct}%`;
    }
    if (p2TrailBarRef.current && lastTrailRef.current.p2 !== p2TrailPct) {
      lastTrailRef.current.p2 = p2TrailPct;
      p2TrailBarRef.current.style.width = `${p2TrailPct}%`;
    }

    const key = `${Math.round(s.p1.hp)}|${Math.round(s.p1.energy)}|${Math.round(s.p1.guardMeter)}|${s.p1.roundsWon}|${s.p2.comboCount}|${s.p2.comboDamage}|${s.p2.droppedComboTimer > 0 ? 1 : 0}|${Math.round(s.p2.hp)}|${Math.round(s.p2.energy)}|${Math.round(s.p2.guardMeter)}|${s.p2.roundsWon}|${s.p1.comboCount}|${s.p1.comboDamage}|${s.timerSeconds}|${s.roundNumber}|${s.phase}|${s.p1.lastMoveName}`;
    if (key !== lastHudKeyRef.current) {
      lastHudKeyRef.current = key;
      setHud(extractHud(s));
    }
  };

  // Sync incoming LAN authoritative state updates
  useEffect(() => {
    if (mode !== 'lan' || isReplay) return;
    lanClient.setCallbacks({
      onMatchState: (serverState) => {
        matchRef.current = serverState;
        audioManager.playCombatEvents(serverState.events);
        if (serverState.tick > lastLoggedLanTickRef.current) {
          lastLoggedLanTickRef.current = serverState.tick;
          if (serverState.lastInputs) {
            recorderRef.current.recordTick(
              serverState.lastInputs[0],
              serverState.lastInputs[1]
            );
          }
          if (serverState.events.length > 0) {
            const entries = extractCombatLogEntries(
              serverState,
              serverState.events,
              combatLogIdRef.current
            );
            if (entries.length > 0) {
              recorderRef.current.recordLogEntries(entries);
              setCombatLog((prev) => [...entries.reverse(), ...prev].slice(0, 60));
            }
          }
        }
        syncHudIfChanged(serverState);
        document.body.dataset.state =
          serverState.phase === 'match_over' ? 'gameover' : 'playing';
      },
      onOpponentDisconnected: () => {
        setPaused(true);
        pausedRef.current = true;
      },
    });
  }, [mode, isReplay]);

  const togglePause = () => {
    if (isReplay) {
      const next = !replayPlayingRef.current;
      replayPlayingRef.current = next;
      setReplayPlaying(next);
      return;
    }
    if (matchRef.current.phase === 'match_over') return;
    const next = !pausedRef.current;
    pausedRef.current = next;
    setPaused(next);
    if (!next) {
      setShowCustomHud(false);
      setShowMoveList(false);
    }
    document.body.dataset.state = next ? 'paused' : 'playing';
  };

  const openCustomHudEditor = () => {
    if (!pausedRef.current && matchRef.current.phase !== 'match_over') {
      pausedRef.current = true;
      setPaused(true);
      document.body.dataset.state = 'paused';
    }
    setShowMoveList(false);
    setShowCustomHud(true);
  };

  const closeCustomHudEditor = () => {
    setShowCustomHud(false);
    if (pausedRef.current && matchRef.current.phase !== 'match_over') {
      pausedRef.current = false;
      setPaused(false);
      document.body.dataset.state = 'playing';
    }
  };

  const handleSaveReplay = () => {
    if (isReplay || recorderRef.current.getTickCount() === 0) return;
    const built = recorderRef.current.buildReplay(matchRef.current);
    saveReplay(built);
    setReplaySaved(true);
  };

  const handleRestartReplay = () => {
    if (!replayPlayerRef.current) return;
    replayPlayerRef.current.reset();
    matchRef.current = replayPlayerRef.current.state;
    replayPlayingRef.current = true;
    setReplayPlaying(true);
    lastHudKeyRef.current = '';
    inputHistoryRef.current = [];
    p2InputHistoryRef.current = [];
    setInputHistory([]);
    setP2InputHistory([]);
    setCombatLog([]);
    setReplayProgress({ tick: 0, total: replayPlayerRef.current.getTotalTicks() });
    syncHudIfChanged(matchRef.current);
  };

  const handleRestartMatch = () => {
    if (isReplay) {
      handleRestartReplay();
      return;
    }
    if (mode === 'lan') {
      lanClient.rematch();
      pausedRef.current = false;
      setPaused(false);
      setReplaySaved(false);
      recorderRef.current.reset();
      document.body.dataset.state = 'playing';
      return;
    }
    const fresh = createMatchState({
      mode,
      stage,
      p1Id: mode === 'combo_trials' ? trialFighter : p1Fighter,
      p2Id: p2Fighter,
      trainingHpPercent: settingsRef.current.trainingHpPercent,
      trainingInfiniteEnergy:
        mode === 'combo_trials' ? true : settingsRef.current.trainingInfiniteEnergy,
      trainingAutoRegen:
        mode === 'combo_trials' ? true : settingsRef.current.trainingAutoRegen,
    });
    if (mode === 'combo_trials') {
      fresh.phase = 'fighting';
      fresh.phaseTimer = 0;
      fresh.p1.x = 520;
      fresh.p2.x = 640;
      fresh.p1.energy = fresh.p1.maxEnergy;
    }
    matchRef.current = fresh;
    recordedResultRef.current = false;
    pausedRef.current = false;
    setPaused(false);
    setReplaySaved(false);
    recorderRef.current.reset();
    demoQueueRef.current = [];
    demoMoveIndexRef.current = 0;
    const resetProg = createTrialProgressState();
    trialTrackerRef.current = resetProg;
    setTrialProgress(resetProg);
    lastHudKeyRef.current = '';
    lastLoggedLanTickRef.current = -1;
    inputHistoryRef.current = [];
    p2InputHistoryRef.current = [];
    setInputHistory([]);
    setP2InputHistory([]);
    setCombatLog([]);
    syncHudIfChanged(fresh);
    document.body.dataset.state = 'playing';
  };

  const handleTrainingResetRound = () => {
    if (mode !== 'training' && mode !== 'combo_trials') return;
    resetRound(matchRef.current);
    matchRef.current.phase = 'fighting';
    matchRef.current.phaseTimer = 0;
    matchRef.current.p1.x = 520;
    matchRef.current.p2.x = 640;
    matchRef.current.p1.hp = matchRef.current.p1.maxHp;
    matchRef.current.p2.hp = matchRef.current.p2.maxHp;
    matchRef.current.p1.energy = matchRef.current.p1.maxEnergy;
    const resetProg = createTrialProgressState();
    trialTrackerRef.current = resetProg;
    setTrialProgress(resetProg);
    lastHudKeyRef.current = '';
    syncHudIfChanged(matchRef.current);
  };

  const handleSelectTrial = (trialId: number) => {
    setSelectedTrialId(trialId);
    handleTrainingResetRound();
  };

  const handleSwitchTrialFighter = (fid: FighterId) => {
    setTrialFighter(fid);
    const nextTrials = getTrialsForFighter(fid);
    const firstId = nextTrials[0]?.id ?? 101;
    setSelectedTrialId(firstId);
    const fresh = createMatchState({
      mode: 'combo_trials',
      stage,
      p1Id: fid,
      p2Id: p2Fighter === fid ? (fid === 'kael' ? 'vexa' : 'kael') : p2Fighter,
      trainingHpPercent: 100,
      trainingInfiniteEnergy: true,
      trainingAutoRegen: true,
    });
    fresh.phase = 'fighting';
    fresh.phaseTimer = 0;
    fresh.p1.x = 520;
    fresh.p2.x = 640;
    fresh.p1.energy = fresh.p1.maxEnergy;
    matchRef.current = fresh;
    demoQueueRef.current = [];
    demoMoveIndexRef.current = 0;
    const resetProg = createTrialProgressState();
    trialTrackerRef.current = resetProg;
    setTrialProgress(resetProg);
    lastHudKeyRef.current = '';
    syncHudIfChanged(fresh);
  };

  const handleNextTrial = () => {
    const idx = fighterTrials.findIndex((t) => t.id === activeTrial.id);
    if (idx >= 0 && idx < fighterTrials.length - 1) {
      handleSelectTrial(fighterTrials[idx + 1].id);
      return;
    }
    const order: FighterId[] = ['kael', 'vexa', 'zane', 'nyx'];
    const nextFighter = order[(order.indexOf(trialFighter) + 1) % order.length];
    handleSwitchTrialFighter(nextFighter);
  };

  const runComboDemo = (trialId: number) => {
    if (mode !== 'training' && mode !== 'combo_trials') return;
    const trial = getTrialById(trialId);
    if (!trial) return;
    setSelectedTrialId(trialId);
    handleTrainingResetRound();
    demoQueueRef.current = buildDemoInputQueue(trial);
    demoMoveIndexRef.current = 0;
    setShowTrainingDrawer(false);
  };

  // Keyboard listeners + focus-loss hygiene
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        togglePause();
        return;
      }
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        onToggleMute();
        return;
      }
      keysHeldRef.current.add(e.code);
      latchedKeysRef.current.add(e.code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysHeldRef.current.delete(e.code);
    };

    const clearAllInputs = () => {
      keysHeldRef.current.clear();
      latchedKeysRef.current.clear();
      touchInputRef.current = { ...EMPTY_INPUT };
      setTouchDir({ left: false, right: false, up: false, down: false });
      setActiveTouchBtns({});
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearAllInputs);
    document.addEventListener('visibilitychange', clearAllInputs);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearAllInputs);
      document.removeEventListener('visibilitychange', clearAllInputs);
    };
  }, [onToggleMute]);

  // Isolated 60 FPS Simulation + Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderer = new GameRenderer();
    const bot = new BotAI();
    let rafId = 0;
    let lastTime = performance.now();
    let accumulator = 0;

    const resize = () => {
      const maxDpr = settingsRef.current.graphicsQuality === 'high' ? 1.5 : 1;
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    window.addEventListener('resize', resize);

    const readP1Input = (): InputState => {
      if (demoQueueRef.current.length > demoMoveIndexRef.current) {
        const frameIn = demoQueueRef.current[demoMoveIndexRef.current];
        demoMoveIndexRef.current++;
        return frameIn;
      }

      const k = keysHeldRef.current;
      const latch = latchedKeysRef.current;
      const hasKey = (code: string) => k.has(code) || latch.has(code);
      const t = touchInputRef.current;

      // Diagonal keys support: Q (↖), E (↗), Z (↙), C (↘) + WASD / Arrow combinations
      const diagUpLeft = hasKey('KeyQ');
      const diagUpRight = hasKey('KeyE');
      const diagDownLeft = hasKey('KeyZ');
      const diagDownRight = hasKey('KeyC');

      const left =
        hasKey('KeyA') ||
        (mode !== 'local2p' && hasKey('ArrowLeft')) ||
        diagUpLeft ||
        diagDownLeft ||
        t.left;
      const right =
        hasKey('KeyD') ||
        (mode !== 'local2p' && hasKey('ArrowRight')) ||
        diagUpRight ||
        diagDownRight ||
        t.right;
      const up =
        hasKey('KeyW') ||
        (mode !== 'local2p' && hasKey('ArrowUp')) ||
        diagUpLeft ||
        diagUpRight ||
        t.up;
      const down =
        hasKey('KeyS') ||
        (mode !== 'local2p' && hasKey('ArrowDown')) ||
        diagDownLeft ||
        diagDownRight ||
        t.down ||
        touchSweepRef.current;

      return {
        left,
        right,
        up,
        down,
        light: hasKey('KeyJ') || t.light,
        medium: hasKey('KeyH') || t.medium || touchSweepRef.current,
        heavy: hasKey('KeyK') || t.heavy,
        special: hasKey('KeyL') || hasKey('Space') || t.special,
        block: hasKey('KeyU') || hasKey('ShiftLeft') || t.block,
        charge: hasKey('KeyR') || t.charge,
      };
    };

    const readP2LocalInput = (): InputState => {
      const k = keysHeldRef.current;
      const latch = latchedKeysRef.current;
      const hasKey = (code: string) => k.has(code) || latch.has(code);
      return {
        left: hasKey('ArrowLeft'),
        right: hasKey('ArrowRight'),
        up: hasKey('ArrowUp'),
        down: hasKey('ArrowDown'),
        light: hasKey('Numpad1') || hasKey('KeyI'),
        medium: hasKey('Numpad2') || hasKey('KeyO'),
        heavy: hasKey('Numpad3') || hasKey('KeyP'),
        special: hasKey('Numpad0') || hasKey('BracketLeft'),
        block: hasKey('Semicolon') || hasKey('Slash'),
        charge: hasKey('BracketRight'),
      };
    };

    const recordCommandHistory = (inp: InputState, slot: 1 | 2, tick: number) => {
      if (!settingsRef.current.hudConfig.showInputHistory) return;
      if (slot === 1 || mode === 'lan') {
        const res = appendInputHistory(
          inputHistoryRef.current,
          inp,
          slot,
          tick,
          inputIdRef.current
        );
        if (res.changed) {
          inputHistoryRef.current = res.history;
          setInputHistory(res.history);
        }
      } else if (mode === 'local2p' || isReplay) {
        const res = appendInputHistory(
          p2InputHistoryRef.current,
          inp,
          2,
          tick,
          inputIdRef.current
        );
        if (res.changed) {
          p2InputHistoryRef.current = res.history;
          setP2InputHistory(res.history);
        }
      }
    };

    const updateTrialProgress = (s: MatchState, events: CombatEvent[]) => {
      if ((mode !== 'training' && mode !== 'combo_trials') || isReplay) return;
      const trial = activeTrialRef.current;
      if (!trial) return;

      const prev = trialTrackerRef.current;
      const res = advanceTrialProgress(prev, trial, s, events);
      if (
        res.next.stepIndex !== prev.stepIndex ||
        res.next.completed !== prev.completed
      ) {
        trialTrackerRef.current = res.next;
        setTrialProgress(res.next);
      }

      if (res.justCompleted) {
        setCompletedTrials((prevMap) => {
          if (prevMap[trial.id]) return prevMap;
          const nextMap = { ...prevMap, [trial.id]: true };
          saveCompletedTrials(nextMap);
          return nextMap;
        });
      }
    };

    const frame = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      if (isReplay && replayPlayerRef.current) {
        const player = replayPlayerRef.current;
        if (replayPlayingRef.current && !player.isFinished()) {
          const stepDt = FIXED_DT / replaySpeedRef.current;
          accumulator += dt;
          while (accumulator >= stepDt && !player.isFinished()) {
            const res = player.step({
              inputBufferFrames: settingsRef.current.inputBufferFrames,
              cameraShakeLevel: settingsRef.current.cameraShakeLevel,
            });
            matchRef.current = player.state;
            recordCommandHistory(res.p1Input, 1, player.state.tick);
            recordCommandHistory(res.p2Input, 2, player.state.tick);
            if (res.events.length > 0) {
              const newEntries = extractCombatLogEntries(
                player.state,
                res.events,
                combatLogIdRef.current
              );
              if (newEntries.length > 0) {
                setCombatLog((prev) => [...newEntries.reverse(), ...prev].slice(0, 60));
              }
            }
            renderer.ingestEvents(res.events, settingsRef.current.graphicsQuality);
            audioManager.playCombatEvents(res.events);
            accumulator -= stepDt;
          }
          setReplayProgress({ tick: player.getTick(), total: player.getTotalTicks() });
          if (player.isFinished()) {
            replayPlayingRef.current = false;
            setReplayPlaying(false);
          }
        }
        syncHudIfChanged(matchRef.current);
      } else if (!pausedRef.current) {
        accumulator += dt;
        while (accumulator >= FIXED_DT) {
          const localIn = readP1Input();
          recordCommandHistory(localIn, mode === 'lan' ? lanSlot : 1, matchRef.current.tick);

          if (mode === 'lan') {
            lanClient.sendInput(localIn);
          } else {
            const p2In =
              mode === 'combo_trials'
                ? bot.computeInput(
                    matchRef.current,
                    settingsRef.current.botDifficulty,
                    'standing'
                  )
                : mode === 'vs_cpu'
                ? bot.computeInput(
                    matchRef.current,
                    settingsRef.current.botDifficulty,
                    'cpu'
                  )
                : mode === 'training'
                ? bot.computeInput(
                    matchRef.current,
                    settingsRef.current.botDifficulty,
                    settingsRef.current.trainingDummyMode
                  )
                : readP2LocalInput();
            if (mode === 'local2p') {
              recordCommandHistory(p2In, 2, matchRef.current.tick);
            }
            recorderRef.current.recordTick(localIn, p2In);
            const events = stepMatchSimulation(matchRef.current, localIn, p2In, {
              inputBufferFrames: settingsRef.current.inputBufferFrames,
              cameraShakeLevel: settingsRef.current.cameraShakeLevel,
            });
            if (events.length > 0) {
              const newEntries = extractCombatLogEntries(
                matchRef.current,
                events,
                combatLogIdRef.current
              );
              if (newEntries.length > 0) {
                recorderRef.current.recordLogEntries(newEntries);
                setCombatLog((prev) => [...newEntries.reverse(), ...prev].slice(0, 60));
              }
            }
            renderer.ingestEvents(events, settingsRef.current.graphicsQuality);
            audioManager.playCombatEvents(events);
            updateTrialProgress(matchRef.current, events);
          }
          latchedKeysRef.current.clear();
          accumulator -= FIXED_DT;
        }

        syncHudIfChanged(matchRef.current);
        if (matchRef.current.phase === 'match_over') {
          document.body.dataset.state = 'gameover';
          if (
            mode === 'local2p' &&
            !recordedResultRef.current &&
            (matchRef.current.winnerSlot === 1 || matchRef.current.winnerSlot === 2)
          ) {
            recordedResultRef.current = true;
            onLocalMatchEndRef.current?.(matchRef.current.winnerSlot);
          }
        }
      }

      renderer.render(
        ctx,
        canvas.width,
        canvas.height,
        matchRef.current,
        now / 1000,
        settingsRef.current.graphicsQuality,
        settingsRef.current.hudConfig.showHitboxes,
        settingsRef.current.fighterCustomizations
      );

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [mode, isReplay]);

  const setTouchButton = (key: keyof InputState, active: boolean) => {
    audioManager.unlock();
    touchInputRef.current[key] = active;
    setActiveTouchBtns((prev) => ({ ...prev, [key]: active }));
  };

  const setTouchSweepButton = (active: boolean) => {
    audioManager.unlock();
    touchSweepRef.current = active;
    setActiveTouchBtns((prev) => ({ ...prev, sweep: active }));
  };

  const handleJoystickDirection = (dir: DirectionalOutput) => {
    audioManager.unlock();
    touchInputRef.current.left = dir.left;
    touchInputRef.current.right = dir.right;
    touchInputRef.current.up = dir.up;
    touchInputRef.current.down = dir.down;
    setTouchDir(dir);
  };

  const p1Pct = Math.max(0, Math.min(100, (hud.p1Hp / hud.p1MaxHp) * 100));
  const p1TrailPct = Math.max(p1Pct, Math.min(100, (hud.p1TrailHp / hud.p1MaxHp) * 100));
  const p2Pct = Math.max(0, Math.min(100, (hud.p2Hp / hud.p2MaxHp) * 100));
  const p2TrailPct = Math.max(p2Pct, Math.min(100, (hud.p2TrailHp / hud.p2MaxHp) * 100));

  const touchControls = settings.touchLayout.controls || DEFAULT_TOUCH_CONTROLS;
  const touchScaleFactor = compactHeight ? 0.8 : 1;
  const hudScale = settings.hudConfig.hudScale;
  const hudOpacity = settings.hudConfig.hudOpacity;
  const combatStats = useMemo(
    () => computeCombatStats(combatLog, matchRef.current),
    [combatLog, hud.p1DamageDealt, hud.p2DamageDealt, hud.p1MaxCombo, hud.p2MaxCombo]
  );

  return (
    <main className="relative w-full h-full overflow-hidden bg-[#07090D]">
      <canvas
        ref={canvasRef}
        data-testid="combat-canvas"
        className="absolute inset-0 w-full h-full block touch-surface"
      />

      {/* World-Matched Top & Bottom Combat HUD */}
      <div
        className="absolute inset-0 pointer-events-none flex flex-col justify-between p-1.5 sm:p-2.5 md:p-4"
        style={{ opacity: hudOpacity }}
      >
        <div
          className="w-full max-w-6xl mx-auto origin-top"
          style={{ transform: `scale(${hudScale})` }}
        >
          <div className="grid grid-cols-11 items-center gap-1.5 sm:gap-3">
            {/* P1 Health + Guard Meter */}
            <div className="col-span-5">
              <div className="flex items-center justify-between mb-0.5 px-1">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="font-display text-base sm:text-lg md:text-2xl font-extrabold tracking-wide text-[#F4F7FB] leading-none">
                    {hud.p1Name}
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-mono-tech text-[#00E5FF]">P1</span>
                </div>
                <div className="flex items-center gap-1" aria-label={`Rondas vencidas Jogador 1: ${hud.p1Rounds}`}>
                  {[0, 1].map((idx) => (
                    <span
                      key={idx}
                      className={`w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rotate-45 border ${
                        idx < hud.p1Rounds
                          ? 'bg-[#F5B700] border-[#F5B700]'
                          : 'bg-[#0D131D] border-white/30'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="h-4 sm:h-5 md:h-6 bg-[#0B0F18] border border-white/25 skew-hud-left overflow-hidden relative">
                <div
                  ref={p1TrailBarRef}
                  className="absolute inset-y-0 right-0 bg-[#EF4444]/85 transition-none"
                  style={{ width: `${p1TrailPct}%` }}
                />
                <div
                  className="absolute inset-y-0 right-0 bg-[#00A8FF]"
                  style={{ width: `${p1Pct}%` }}
                />
              </div>
              {/* Guard Meter */}
              <div className="h-1 bg-[#0B0F18] mt-0.5 overflow-hidden flex justify-end">
                <div
                  className="h-full bg-[#38BDF8]/80"
                  style={{ width: `${Math.max(0, Math.min(100, hud.p1Guard))}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-0.5 px-1 text-[10px] sm:text-[11px] font-mono-tech text-[#94A3B8]">
                <span>HP {Math.round(hud.p1Hp)}/{hud.p1MaxHp}</span>
                {settings.hudConfig.showComboMeter && hud.p1Combo >= 2 && (
                  <span className="font-display text-sm sm:text-lg font-extrabold text-[#F5B700] leading-none">
                    {hud.p1Combo} HITS · {hud.p1ComboDmg} DANO
                  </span>
                )}
              </div>
            </div>

            {/* Center 99s Timer */}
            <div className="col-span-1 flex flex-col items-center justify-center">
              <div className="w-11 h-11 sm:w-13 sm:h-13 md:w-16 md:h-16 bg-[#0B0F18] border-2 border-[#00A8FF] flex flex-col items-center justify-center">
                <span className="font-display text-xl sm:text-2xl md:text-4xl font-extrabold tabular-nums text-[#F4F7FB] leading-none">
                  {mode === 'training' || mode === 'combo_trials' ? '∞' : String(hud.timerSeconds).padStart(2, '0')}
                </span>
                <span className="text-[9px] sm:text-[10px] font-mono-tech text-[#00A8FF]">
                  R{hud.roundNumber}
                </span>
              </div>
              {mode === 'lan' && (
                <span className="mt-0.5 text-[9px] sm:text-[10px] font-mono-tech text-[#94A3B8] tabular-nums">
                  {pingMs}ms
                </span>
              )}
            </div>

            {/* P2 Health + Guard Meter */}
            <div className="col-span-5">
              <div className="flex items-center justify-between mb-0.5 px-1">
                <div className="flex items-center gap-1" aria-label={`Rondas vencidas Jogador 2: ${hud.p2Rounds}`}>
                  {[0, 1].map((idx) => (
                    <span
                      key={idx}
                      className={`w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rotate-45 border ${
                        idx < hud.p2Rounds
                          ? 'bg-[#F5B700] border-[#F5B700]'
                          : 'bg-[#0D131D] border-white/30'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-[10px] sm:text-[11px] font-mono-tech text-[#A855F7]">
                    {mode === 'combo_trials' ? 'DUMMY' : mode === 'training' || mode === 'vs_cpu' ? 'CPU' : 'P2'}
                  </span>
                  <span className="font-display text-base sm:text-lg md:text-2xl font-extrabold tracking-wide text-[#F4F7FB] leading-none">
                    {hud.p2Name}
                  </span>
                </div>
              </div>
              <div className="h-4 sm:h-5 md:h-6 bg-[#0B0F18] border border-white/25 skew-hud-right overflow-hidden relative">
                <div
                  ref={p2TrailBarRef}
                  className="absolute inset-y-0 left-0 bg-[#EF4444]/85 transition-none"
                  style={{ width: `${p2TrailPct}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 bg-[#A855F7]"
                  style={{ width: `${p2Pct}%` }}
                />
              </div>
              {/* Guard Meter */}
              <div className="h-1 bg-[#0B0F18] mt-0.5 overflow-hidden">
                <div
                  className="h-full bg-[#A855F7]/80"
                  style={{ width: `${Math.max(0, Math.min(100, hud.p2Guard))}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-0.5 px-1 text-[10px] sm:text-[11px] font-mono-tech text-[#94A3B8]">
                {settings.hudConfig.showComboMeter && hud.p2Combo >= 2 ? (
                  <span className="font-display text-sm sm:text-lg font-extrabold text-[#F5B700] leading-none">
                    {hud.p2Combo} HITS · {hud.p2ComboDmg} DANO
                  </span>
                ) : settings.hudConfig.showComboMeter && hud.p2DroppedCombo >= 2 ? (
                  <span className="text-[10px] sm:text-[11px] font-mono-tech text-[#94A3B8]">
                    COMBO {hud.p2DroppedCombo} INTERROMPIDO
                  </span>
                ) : (
                  <span />
                )}
                <span>HP {Math.round(hud.p2Hp)}/{hud.p2MaxHp}</span>
              </div>
            </div>
          </div>

          {/* Top Utility Row + Frame Data / Training Controls */}
          <div className="flex items-start justify-between mt-1 gap-2">
            {/* Left: Frame Data */}
            <div className="flex flex-col gap-1">
              {settings.hudConfig.showFrameData && (
                <div className="px-2 py-0.5 bg-[#0B0F18]/80 border border-white/10 text-[10px] font-mono-tech text-[#94A3B8]">
                  <span className="text-[#00E5FF] font-bold">{hud.lastMoveName}</span>
                  {' · '}S:{hud.lastMoveStartup} A:{hud.lastMoveActive} R:{hud.lastMoveRecovery}
                </div>
              )}
            </div>

            {/* Right: Training, Log, Golpes, Custom HUD, Mute, Pause */}
            <div className="flex items-center gap-1.5 pointer-events-auto">
              {mode === 'training' && !isReplay && (
                <>
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      setShowCombatLogPanel(false);
                      setShowTrainingDrawer((v) => !v);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#10151F]/90 border border-white/15 hover:border-[#F5B700] text-xs font-semibold text-[#F5B700] cursor-pointer"
                  >
                    <Award className="w-3.5 h-3.5" />
                    Trials
                  </button>
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onUpdateSettings({
                        ...settings,
                        hudConfig: {
                          ...settings.hudConfig,
                          showHitboxes: !settings.hudConfig.showHitboxes,
                        },
                      });
                    }}
                    aria-label="Alternar hitboxes"
                    className={`inline-flex items-center gap-1 px-2 py-1.5 border text-xs font-semibold cursor-pointer ${
                      settings.hudConfig.showHitboxes
                        ? 'bg-[#00A8FF] text-[#07090D] border-[#00A8FF]'
                        : 'bg-[#10151F]/90 text-[#F4F7FB] border-white/15'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Boxes
                  </button>
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      handleTrainingResetRound();
                    }}
                    aria-label="Reiniciar posição e vida de treino"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#10151F]/90 border border-white/15 hover:border-[#00A8FF] text-xs font-semibold text-[#F4F7FB] cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reiniciar
                  </button>
                </>
              )}
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  setShowTrainingDrawer(false);
                  setShowCombatLogPanel((v) => !v);
                }}
                aria-label="Combat Log e Histórico"
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 border text-xs font-semibold cursor-pointer ${
                  showCombatLogPanel
                    ? 'bg-[#00A8FF] text-[#07090D] border-[#00A8FF]'
                    : 'bg-[#10151F]/90 text-[#F4F7FB] border-white/15 hover:border-[#00A8FF]'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                Log
              </button>
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  setShowMoveList(true);
                }}
                aria-label="Lista de Ataques"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#10151F]/90 border border-white/15 hover:border-[#A855F7] text-xs font-semibold text-[#F4F7FB] cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-[#A855F7]" />
                Golpes
              </button>
              {!isReplay && (
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    openCustomHudEditor();
                  }}
                  aria-label="Personalizar HUD"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#10151F]/90 border border-white/15 hover:border-[#00A8FF] text-xs font-semibold text-[#F4F7FB] cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  HUD
                </button>
              )}
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onToggleMute();
                }}
                aria-label={settings.muted ? 'Ativar som [M]' : 'Silenciar som [M]'}
                className="p-2 bg-[#10151F]/90 border border-white/15 hover:border-[#00A8FF] text-[#F4F7FB] cursor-pointer"
              >
                {settings.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  togglePause();
                }}
                aria-label="Pausar combate [Esc]"
                className="p-2 bg-[#10151F]/90 border border-white/15 hover:border-[#00A8FF] text-[#F4F7FB] cursor-pointer"
              >
                {isReplay && !replayPlaying ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Visual Combat Log & Input History Overlay */}
          <CombatLogOverlay
            mode={mode}
            lanSlot={lanSlot}
            p1Name={hud.p1Name}
            p2Name={hud.p2Name}
            showInputHistory={settings.hudConfig.showInputHistory}
            showCombatLog={settings.hudConfig.showCombatLog}
            isExpanded={showCombatLogPanel}
            inputHistory={inputHistory}
            p2InputHistory={p2InputHistory}
            combatLog={combatLog}
            stats={combatStats}
            onCloseExpanded={() => setShowCombatLogPanel(false)}
            onClearLogs={() => {
              inputHistoryRef.current = [];
              p2InputHistoryRef.current = [];
              setInputHistory([]);
              setP2InputHistory([]);
              setCombatLog([]);
            }}
          />
          {/* Dedicated Combo Trials Challenge Panel (Zero Scroll) */}
          {mode === 'combo_trials' && !isReplay && !showCustomHud && activeTrial && (
            <section
              data-testid="combo-trials-panel"
              className={`pointer-events-auto mt-1 mx-auto bg-[#0B101A]/95 border border-[#10B981]/70 ${
                compactHeight
                  ? 'max-w-[490px] px-2 py-1 space-y-0.5'
                  : 'max-w-[520px] lg:max-w-3xl px-2.5 py-1.5 space-y-1'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-1">
                {/* Fighter Selector Pills */}
                <div className="flex items-center gap-1">
                  {(['kael', 'vexa', 'zane', 'nyx'] as FighterId[]).map((fid) => (
                    <button
                      key={fid}
                      type="button"
                      tabIndex={-1}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        handleSwitchTrialFighter(fid);
                      }}
                      className={`px-1.5 py-0.5 text-[10px] font-display font-bold uppercase border cursor-pointer ${
                        trialFighter === fid
                          ? 'bg-[#00A8FF] text-[#07090D] border-[#00A8FF]'
                          : 'bg-[#10151F] text-[#94A3B8] border-white/15 hover:text-white'
                      }`}
                    >
                      {FIGHTER_PROFILES[fid].name}
                    </button>
                  ))}
                </div>

                {/* 1..5 Trial Tabs */}
                <div className="flex items-center gap-1">
                  {fighterTrials.map((tr) => {
                    const done = Boolean(completedTrials[tr.id]);
                    const isAct = activeTrial.id === tr.id;
                    return (
                      <button
                        key={tr.id}
                        type="button"
                        tabIndex={-1}
                        onClick={(e) => {
                          e.currentTarget.blur();
                          handleSelectTrial(tr.id);
                        }}
                        className={`px-1.5 py-0.5 text-[10px] font-mono-tech font-bold border cursor-pointer ${
                          isAct
                            ? 'bg-[#10B981] text-[#07090D] border-[#10B981]'
                            : done
                            ? 'bg-[#10B981]/15 text-[#4ADE80] border-[#10B981]/50'
                            : 'bg-[#07090D] text-[#94A3B8] border-white/15 hover:text-white'
                        }`}
                      >
                        {done ? '✓ ' : ''}#{tr.order}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      runComboDemo(activeTrial.id);
                    }}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#00A8FF] hover:bg-[#33B9FF] text-[#07090D] text-[10px] font-bold uppercase cursor-pointer whitespace-nowrap"
                  >
                    <Play className="w-2.5 h-2.5" />
                    Demo
                  </button>
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      handleTrainingResetRound();
                    }}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#10151F] border border-white/15 hover:border-[#00A8FF] text-[10px] font-bold text-[#F4F7FB] uppercase cursor-pointer whitespace-nowrap"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    Repor
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-1.5 border-t border-white/10 pt-0.5">
                <div className="min-w-0 flex items-center gap-1.5">
                  <span className="font-display text-xs lg:text-base font-extrabold text-[#F4F7FB] leading-none whitespace-nowrap">
                    TRIAL #{activeTrial.order} — {activeTrial.title}
                  </span>
                  <span className="px-1.5 py-0.5 bg-[#192233] text-[9px] font-mono-tech text-[#F5B700] uppercase shrink-0">
                    {activeTrial.difficulty}
                  </span>
                  {!compactHeight && (
                    <span className="hidden lg:inline text-[11px] text-[#94A3B8] truncate">{activeTrial.description}</span>
                  )}
                </div>

                {(trialProgress.completed || completedTrials[activeTrial.id]) && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {trialProgress.completed && (
                      <span
                        data-testid="trial-completed-badge"
                        className="px-2 py-0.5 bg-[#10B981]/20 border border-[#10B981] text-[#4ADE80] font-display text-xs font-extrabold uppercase"
                      >
                        ✓ TRIAL COMPLETO!
                      </span>
                    )}
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        handleNextTrial();
                      }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F5B700] hover:bg-[#FACC15] text-[#07090D] font-display text-xs font-extrabold uppercase cursor-pointer"
                    >
                      PRÓXIMO TRIAL
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Live Step-by-Step Sequence Chips */}
              <div className="flex flex-wrap items-center gap-1">
                {activeTrial.steps.map((st, idx) => {
                  const stepDone = trialProgress.completed || idx < trialProgress.stepIndex;
                  const stepActive = !trialProgress.completed && idx === trialProgress.stepIndex;
                  return (
                    <div
                      key={`${activeTrial.id}-${idx}`}
                      className={`px-1.5 py-0.5 border text-[10px] sm:text-[11px] flex items-center gap-1 ${
                        stepDone
                          ? 'bg-[#10B981]/20 border-[#10B981] text-[#4ADE80]'
                          : stepActive
                          ? 'bg-[#00A8FF]/20 border-[#00E5FF] text-[#F4F7FB]'
                          : 'bg-[#07090D] border-white/10 text-[#94A3B8]'
                      }`}
                    >
                      <span className="font-mono-tech font-bold text-[9px] sm:text-[10px]">
                        {stepDone ? '✓' : `${idx + 1}.`}
                      </span>
                      <span className="font-semibold">{st.label}</span>
                      <span className="px-1 bg-black/40 font-mono-tech text-[9px] sm:text-[10px] text-[#00E5FF]">
                        {st.command}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* Collapsible Training & Combo Trials Drawer */}
        {mode === 'training' && showTrainingDrawer && (
          <div className="pointer-events-auto self-end w-full max-w-md bg-[#10151F]/95 border border-[#00A8FF] p-3 space-y-2.5 text-xs my-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
              <span className="font-display text-lg font-extrabold text-[#F4F7FB]">
                TREINO · TRIALS DE {FIGHTER_PROFILES[p1Fighter].name}
              </span>
              <button
                type="button"
                onClick={() => setShowTrainingDrawer(false)}
                className="text-[#94A3B8] hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {([
                { id: 'standing', label: 'Dummy Parado' },
                { id: 'guard', label: 'Dummy Defesa' },
                { id: 'cpu', label: 'CPU Ativa' },
              ] as { id: TrainingDummyMode; label: string }[]).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, trainingDummyMode: m.id })}
                  className={`py-1.5 border font-semibold cursor-pointer ${
                    settings.trainingDummyMode === m.id
                      ? 'bg-[#00A8FF] text-[#07090D] border-[#00A8FF]'
                      : 'bg-[#07090D] text-[#F4F7FB] border-white/15'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              {getTrialsForFighter(p1Fighter).map((trial) => {
                const done = Boolean(completedTrials[trial.id]);
                const active = selectedTrialId === trial.id;
                return (
                  <div
                    key={trial.id}
                    className={`p-2 border ${
                      done
                        ? 'border-[#10B981] bg-[#10B981]/10'
                        : active
                        ? 'border-[#00A8FF] bg-[#07090D]'
                        : 'border-white/10 bg-[#07090D]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedTrialId(trial.id)}
                        className="text-left font-bold text-[#F4F7FB] cursor-pointer"
                      >
                        {done ? '✓ ' : ''}#{trial.order} {trial.title}
                      </button>
                      <button
                        type="button"
                        onClick={() => runComboDemo(trial.id)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#00A8FF] text-[#07090D] font-bold cursor-pointer shrink-0"
                      >
                        <Play className="w-3 h-3" />
                        Demo
                      </button>
                    </div>
                    <div className="font-mono-tech text-[11px] text-[#00E5FF] mt-0.5">
                      {trial.notation}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom Energy Meters & Replay Playback Bar */}
        <div className="w-full flex flex-col gap-2">
          {isReplay && (
            <div className="pointer-events-auto w-full max-w-2xl mx-auto bg-[#0B101A]/95 border border-[#00A8FF] px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-[#00A8FF] text-[#07090D] font-mono-tech font-bold">
                  REPLAY
                </span>
                <button
                  type="button"
                  onClick={togglePause}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#161E2E] border border-white/15 hover:border-[#00A8FF] text-[#F4F7FB] font-bold cursor-pointer"
                >
                  {replayPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {replayPlaying ? 'Pausar' : 'Continuar'}
                </button>
                <button
                  type="button"
                  onClick={handleRestartReplay}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#161E2E] border border-white/15 hover:border-[#00A8FF] text-[#F4F7FB] font-bold cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Início
                </button>
              </div>

              <div className="flex items-center gap-1">
                {([0.5, 1, 1.5] as const).map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => {
                      replaySpeedRef.current = spd;
                      setReplaySpeed(spd);
                    }}
                    className={`px-2 py-1 border font-mono-tech font-bold cursor-pointer ${
                      replaySpeed === spd
                        ? 'bg-[#00A8FF] text-[#07090D] border-[#00A8FF]'
                        : 'bg-[#07090D] text-[#94A3B8] border-white/15'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="font-mono-tech text-[#94A3B8] tabular-nums">
                  {Math.round(replayProgress.tick / 60)}s / {Math.round(replayProgress.total / 60)}s
                </span>
                <button
                  type="button"
                  onClick={onExitToMenu}
                  className="px-2.5 py-1 bg-[#07090D] border border-white/15 hover:border-[#EF4444] text-[#F4F7FB] font-bold cursor-pointer"
                >
                  Sair
                </button>
              </div>
            </div>
          )}

          {/* Bottom Energy Meters */}
          <div className="w-full max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div className="w-40 sm:w-52 md:w-68">
              <div className="flex justify-between text-[10px] sm:text-[11px] font-mono-tech text-[#00E5FF] mb-0.5">
                <span>ENERGIA ESPECIAL</span>
                <span>{Math.round(hud.p1Energy)}%</span>
              </div>
              <div className="h-2 sm:h-2.5 bg-[#0B0F18] border border-white/20 overflow-hidden">
                <div
                  className="h-full bg-[#00E5FF]"
                  style={{ width: `${Math.min(100, hud.p1Energy)}%` }}
                />
              </div>
            </div>

            <div className="hidden lg:block text-[11px] text-[#94A3B8] tracking-wide whitespace-nowrap">
              {isReplay
                ? 'Modo Replay · A reproduzir comandos gravados a 60 FPS'
                : mode === 'lan'
                ? `Sala LAN · Jogador ${lanSlot}`
                : 'WASD/QEZC · J Ligeiro · H Médio · K Pesado · L Especial · U Defesa · R +Energia · J+U Especial'}
            </div>

            <div className="w-40 sm:w-52 md:w-68">
              <div className="flex justify-between text-[10px] sm:text-[11px] font-mono-tech text-[#A855F7] mb-0.5">
                <span>{Math.round(hud.p2Energy)}%</span>
                <span>ENERGIA ESPECIAL</span>
              </div>
              <div className="h-2 sm:h-2.5 bg-[#0B0F18] border border-white/20 overflow-hidden flex justify-end">
                <div
                  className="h-full bg-[#A855F7]"
                  style={{ width: `${Math.min(100, hud.p2Energy)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Free Fire Customizable Positioned Touch Controls Layer */}
      {settings.touchLayout.enabled && !isReplay && !showCustomHud && (
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
          {touchControls.joystick.visible && (
            <div
              className="absolute pointer-events-auto"
              style={{
                left: `${touchControls.joystick.xPct}%`,
                top: `${touchControls.joystick.yPct}%`,
                transform: `translate(-50%, -50%) scale(${touchControls.joystick.scale * touchScaleFactor})`,
                opacity: touchControls.joystick.opacity,
              }}
            >
              <TouchJoystick
                styleMode={settings.touchLayout.controlStyle}
                isRotated={isPortrait}
                activeDir={touchDir}
                onDirectionChange={handleJoystickDirection}
              />
            </div>
          )}

          {touchControls.light.visible && (
            <button
              type="button"
              aria-label="Ataque Ligeiro"
              onPointerDown={() => setTouchButton('light', true)}
              onPointerUp={() => setTouchButton('light', false)}
              onPointerCancel={() => setTouchButton('light', false)}
              onPointerLeave={() => setTouchButton('light', false)}
              style={{
                left: `${touchControls.light.xPct}%`,
                top: `${touchControls.light.yPct}%`,
                transform: `translate(-50%, -50%) scale(${touchControls.light.scale * touchScaleFactor * (activeTouchBtns.light ? 0.94 : 1)})`,
                opacity: touchControls.light.opacity,
              }}
              className={`absolute pointer-events-auto touch-surface w-14 h-10 sm:w-16 sm:h-12 border text-[10px] sm:text-[11px] font-display font-bold uppercase ${
                activeTouchBtns.light
                  ? 'bg-[#00E5FF] text-[#07090D] border-white'
                  : 'bg-[#10151F]/85 text-[#00E5FF] border-[#00E5FF]/55'
              }`}
            >
              LIGEIRO
            </button>
          )}

          {touchControls.medium.visible && (
            <button
              type="button"
              aria-label="Ataque Médio"
              onPointerDown={() => setTouchButton('medium', true)}
              onPointerUp={() => setTouchButton('medium', false)}
              onPointerCancel={() => setTouchButton('medium', false)}
              onPointerLeave={() => setTouchButton('medium', false)}
              style={{
                left: `${touchControls.medium.xPct}%`,
                top: `${touchControls.medium.yPct}%`,
                transform: `translate(-50%, -50%) scale(${touchControls.medium.scale * touchScaleFactor * (activeTouchBtns.medium ? 0.94 : 1)})`,
                opacity: touchControls.medium.opacity,
              }}
              className={`absolute pointer-events-auto touch-surface w-14 h-10 sm:w-16 sm:h-12 border text-[10px] sm:text-[11px] font-display font-bold uppercase ${
                activeTouchBtns.medium
                  ? 'bg-[#38BDF8] text-[#07090D] border-white'
                  : 'bg-[#10151F]/85 text-[#38BDF8] border-[#38BDF8]/55'
              }`}
            >
              MÉDIO
            </button>
          )}

          {touchControls.heavy.visible && (
            <button
              type="button"
              aria-label="Ataque Pesado"
              onPointerDown={() => setTouchButton('heavy', true)}
              onPointerUp={() => setTouchButton('heavy', false)}
              onPointerCancel={() => setTouchButton('heavy', false)}
              onPointerLeave={() => setTouchButton('heavy', false)}
              style={{
                left: `${touchControls.heavy.xPct}%`,
                top: `${touchControls.heavy.yPct}%`,
                transform: `translate(-50%, -50%) scale(${touchControls.heavy.scale * touchScaleFactor * (activeTouchBtns.heavy ? 0.94 : 1)})`,
                opacity: touchControls.heavy.opacity,
              }}
              className={`absolute pointer-events-auto touch-surface w-14 h-10 sm:w-16 sm:h-12 border text-[10px] sm:text-[11px] font-display font-bold uppercase ${
                activeTouchBtns.heavy
                  ? 'bg-[#F5B700] text-[#07090D] border-white'
                  : 'bg-[#10151F]/85 text-[#F5B700] border-[#F5B700]/55'
              }`}
            >
              PESADO
            </button>
          )}

          {touchControls.block.visible && (
            <button
              type="button"
              aria-label="Defender"
              onPointerDown={() => setTouchButton('block', true)}
              onPointerUp={() => setTouchButton('block', false)}
              onPointerCancel={() => setTouchButton('block', false)}
              onPointerLeave={() => setTouchButton('block', false)}
              style={{
                left: `${touchControls.block.xPct}%`,
                top: `${touchControls.block.yPct}%`,
                transform: `translate(-50%, -50%) scale(${touchControls.block.scale * touchScaleFactor * (activeTouchBtns.block ? 0.94 : 1)})`,
                opacity: touchControls.block.opacity,
              }}
              className={`absolute pointer-events-auto touch-surface w-14 h-10 sm:w-16 sm:h-12 border text-[10px] sm:text-[11px] font-display font-bold uppercase ${
                activeTouchBtns.block
                  ? 'bg-[#00A8FF] text-[#07090D] border-white'
                  : 'bg-[#10151F]/85 text-[#F4F7FB] border-white/35'
              }`}
            >
              DEFESA
            </button>
          )}

          {touchControls.sweep.visible && (
            <button
              type="button"
              aria-label="Rasteira (-9% HP)"
              onPointerDown={() => setTouchSweepButton(true)}
              onPointerUp={() => setTouchSweepButton(false)}
              onPointerCancel={() => setTouchSweepButton(false)}
              onPointerLeave={() => setTouchSweepButton(false)}
              style={{
                left: `${touchControls.sweep.xPct}%`,
                top: `${touchControls.sweep.yPct}%`,
                transform: `translate(-50%, -50%) scale(${touchControls.sweep.scale * touchScaleFactor * (activeTouchBtns.sweep ? 0.94 : 1)})`,
                opacity: touchControls.sweep.opacity,
              }}
              className={`absolute pointer-events-auto touch-surface w-14 h-10 sm:w-16 sm:h-12 border text-[10px] sm:text-[11px] font-display font-bold uppercase ${
                activeTouchBtns.sweep
                  ? 'bg-[#FB7185] text-[#07090D] border-white'
                  : 'bg-[#10151F]/85 text-[#FB7185] border-[#FB7185]/55'
              }`}
            >
              RASTEIRA
            </button>
          )}

          {touchControls.charge.visible && (
            <button
              type="button"
              aria-label="Carregar Energia (+EN)"
              onPointerDown={() => setTouchButton('charge', true)}
              onPointerUp={() => setTouchButton('charge', false)}
              onPointerCancel={() => setTouchButton('charge', false)}
              onPointerLeave={() => setTouchButton('charge', false)}
              style={{
                left: `${touchControls.charge.xPct}%`,
                top: `${touchControls.charge.yPct}%`,
                transform: `translate(-50%, -50%) scale(${touchControls.charge.scale * touchScaleFactor * (activeTouchBtns.charge ? 0.94 : 1)})`,
                opacity: touchControls.charge.opacity,
              }}
              className={`absolute pointer-events-auto touch-surface w-14 h-10 sm:w-16 sm:h-12 border text-[10px] sm:text-[11px] font-display font-bold uppercase ${
                activeTouchBtns.charge
                  ? 'bg-[#4ADE80] text-[#07090D] border-white'
                  : 'bg-[#10151F]/85 text-[#4ADE80] border-[#4ADE80]/55'
              }`}
            >
              +ENERGIA
            </button>
          )}

          {touchControls.special.visible && (
            <button
              type="button"
              aria-label="Ataque Especial"
              onPointerDown={() => setTouchButton('special', true)}
              onPointerUp={() => setTouchButton('special', false)}
              onPointerCancel={() => setTouchButton('special', false)}
              onPointerLeave={() => setTouchButton('special', false)}
              style={{
                left: `${touchControls.special.xPct}%`,
                top: `${touchControls.special.yPct}%`,
                transform: `translate(-50%, -50%) scale(${touchControls.special.scale * touchScaleFactor * (activeTouchBtns.special ? 0.94 : 1)})`,
                opacity: touchControls.special.opacity,
              }}
              className={`absolute pointer-events-auto touch-surface w-24 h-10 sm:w-28 sm:h-12 border text-[10px] sm:text-[11px] font-display font-bold uppercase ${
                activeTouchBtns.special
                  ? 'bg-[#A855F7] text-white border-white'
                  : 'bg-[#10151F]/85 text-[#A855F7] border-[#A855F7]/65'
              }`}
            >
              ESPECIAL
            </button>
          )}
        </div>
      )}

      {/* Pause Modal */}
      {paused && !showCustomHud && !showMoveList && hud.phase !== 'match_over' && !isReplay && (
        <div className="absolute inset-0 z-30 bg-black/70 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
          <div className="w-full max-w-sm max-h-[95dvh] overflow-hidden bg-[#10151F] border border-[#00A8FF] p-3.5 sm:p-5 space-y-2 sm:space-y-3">
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#F4F7FB] text-center leading-none">
              COMBATE EM PAUSA
            </h2>
            <div className="space-y-1.5 sm:space-y-2">
              <button
                type="button"
                onClick={togglePause}
                className="w-full py-2 sm:py-2.5 bg-[#00A8FF] hover:bg-[#33B9FF] text-[#07090D] font-display text-lg sm:text-xl font-bold uppercase cursor-pointer"
              >
                CONTINUAR
              </button>
              <button
                type="button"
                onClick={() => setShowMoveList(true)}
                className="w-full py-1.5 sm:py-2 bg-[#192233] hover:bg-[#222E45] text-[#F4F7FB] font-display text-base sm:text-lg font-bold uppercase cursor-pointer"
              >
                LISTA DE ATAQUES
              </button>
              <button
                type="button"
                onClick={() => setShowCustomHud(true)}
                className="w-full py-1.5 sm:py-2 bg-[#192233] hover:bg-[#222E45] text-[#F4F7FB] font-display text-base sm:text-lg font-bold uppercase cursor-pointer"
              >
                PERSONALIZAR HUD (GRELHA)
              </button>
              {recorderRef.current.getTickCount() > 0 && (
                <button
                  type="button"
                  onClick={handleSaveReplay}
                  disabled={replaySaved}
                  className={`w-full py-1.5 sm:py-2 inline-flex items-center justify-center gap-2 border font-display text-base sm:text-lg font-bold uppercase cursor-pointer ${
                    replaySaved
                      ? 'bg-[#10B981]/20 border-[#10B981] text-[#4ADE80]'
                      : 'bg-[#192233] border-[#00E5FF]/40 hover:border-[#00E5FF] text-[#00E5FF]'
                  }`}
                >
                  {replaySaved ? <Check className="w-4 h-4" /> : <Film className="w-4 h-4" />}
                  {replaySaved ? 'REPLAY GUARDADO' : 'GUARDAR REPLAY'}
                </button>
              )}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={handleRestartMatch}
                  className="w-full py-1.5 sm:py-2 bg-[#192233] hover:bg-[#222E45] text-[#F4F7FB] font-display text-sm sm:text-base font-bold uppercase cursor-pointer"
                >
                  REINICIAR
                </button>
                <button
                  type="button"
                  onClick={onExitToMenu}
                  className="w-full py-1.5 sm:py-2 bg-[#07090D] border border-white/15 hover:border-[#EF4444] text-[#F4F7FB] font-display text-sm sm:text-base font-bold uppercase cursor-pointer"
                >
                  SAIR MENU
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Move List Modal */}
      {showMoveList && (
        <MoveListModal
          initialFighter={p1Fighter}
          onClose={() => setShowMoveList(false)}
        />
      )}

      {/* Live Free Fire Custom HUD Editor */}
      {showCustomHud && (
        <CustomHudModal
          settings={settings}
          isPortrait={isPortrait}
          onUpdate={onUpdateSettings}
          onClose={closeCustomHudEditor}
        />
      )}

      {/* Match Over / Victory & Defeat Modal */}
      {hud.phase === 'match_over' && !isReplay && (
        <ResultModal
          winnerSlot={hud.winnerSlot || 1}
          localSlot={mode === 'lan' ? lanSlot : 1}
          p1Name={hud.p1Name}
          p2Name={hud.p2Name}
          p1Rounds={hud.p1Rounds}
          p2Rounds={hud.p2Rounds}
          maxCombo={Math.max(hud.p1MaxCombo, hud.p2MaxCombo)}
          damageDealt={hud.winnerSlot === 2 ? hud.p2DamageDealt : hud.p1DamageDealt}
          elapsedSeconds={hud.elapsedSeconds}
          isLan={mode === 'lan'}
          canSaveReplay={recorderRef.current.getTickCount() > 0}
          replaySaved={replaySaved}
          onSaveReplay={handleSaveReplay}
          onRematch={handleRestartMatch}
          onChangeCharacters={onChangeCharacters}
          onExitMenu={onExitToMenu}
        />
      )}
    </main>
  );
}
