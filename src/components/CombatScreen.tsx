import { useEffect, useRef, useState } from 'react';
import { Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { audioManager } from '../game/AudioManager';
import { BotAI } from '../game/BotAI';
import { createMatchState, resetRound, stepMatchSimulation } from '../game/CombatSystem';
import { EMPTY_INPUT, FIGHTER_PROFILES, FIXED_DT } from '../game/constants';
import { GameRenderer } from '../game/GameRenderer';
import { lanClient } from '../game/LanClient';
import {
  FighterId,
  GameMode,
  InputState,
  MatchState,
  SettingsConfig,
  StageId,
} from '../game/types';
import { ResultModal } from './ResultModal';

interface CombatScreenProps {
  mode: GameMode;
  stage: StageId;
  p1Fighter: FighterId;
  p2Fighter: FighterId;
  lanInitialState?: MatchState | null;
  lanSlot?: 1 | 2;
  pingMs?: number;
  settings: SettingsConfig;
  onToggleMute: () => void;
  onChangeCharacters: () => void;
  onExitToMenu: () => void;
}

interface HudSnapshot {
  p1Hp: number;
  p1TrailHp: number;
  p1MaxHp: number;
  p1Energy: number;
  p1Rounds: number;
  p1Combo: number;
  p1Name: string;
  p2Hp: number;
  p2TrailHp: number;
  p2MaxHp: number;
  p2Energy: number;
  p2Rounds: number;
  p2Combo: number;
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
}

function extractHud(s: MatchState): HudSnapshot {
  return {
    p1Hp: s.p1.hp,
    p1TrailHp: s.p1.trailHp,
    p1MaxHp: s.p1.maxHp,
    p1Energy: s.p1.energy,
    p1Rounds: s.p1.roundsWon,
    p1Combo: s.p2.comboCount,
    p1Name: FIGHTER_PROFILES[s.p1.id].name,
    p2Hp: s.p2.hp,
    p2TrailHp: s.p2.trailHp,
    p2MaxHp: s.p2.maxHp,
    p2Energy: s.p2.energy,
    p2Rounds: s.p2.roundsWon,
    p2Combo: s.p1.comboCount,
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
  settings,
  onToggleMute,
  onChangeCharacters,
  onExitToMenu,
}: CombatScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const matchRef = useRef<MatchState>(
    lanInitialState ||
      createMatchState({
        mode,
        stage,
        p1Id: p1Fighter,
        p2Id: p2Fighter,
        trainingHpPercent: settings.trainingHpPercent,
        trainingInfiniteEnergy: settings.trainingInfiniteEnergy,
        trainingAutoRegen: settings.trainingAutoRegen,
      })
  );

  const [hud, setHud] = useState<HudSnapshot>(() => extractHud(matchRef.current));
  const lastHudKeyRef = useRef('');
  const lastTrailRef = useRef({ p1: -1, p2: -1 });
  const p1TrailBarRef = useRef<HTMLDivElement | null>(null);
  const p2TrailBarRef = useRef<HTMLDivElement | null>(null);

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

    const key = `${Math.round(s.p1.hp)}|${Math.round(s.p1.energy)}|${s.p1.roundsWon}|${s.p2.comboCount}|${Math.round(s.p2.hp)}|${Math.round(s.p2.energy)}|${s.p2.roundsWon}|${s.p1.comboCount}|${s.timerSeconds}|${s.roundNumber}|${s.phase}`;
    if (key !== lastHudKeyRef.current) {
      lastHudKeyRef.current = key;
      setHud(extractHud(s));
    }
  };

  const keysHeldRef = useRef<Set<string>>(new Set());
  const touchInputRef = useRef<InputState>({ ...EMPTY_INPUT });
  const [activeTouchBtns, setActiveTouchBtns] = useState<Record<string, boolean>>({});

  // Sync incoming LAN authoritative state updates
  useEffect(() => {
    if (mode !== 'lan') return;
    lanClient.setCallbacks({
      onMatchState: (serverState) => {
        matchRef.current = serverState;
        audioManager.playCombatEvents(serverState.events);
        syncHudIfChanged(serverState);
        document.body.dataset.state =
          serverState.phase === 'match_over' ? 'gameover' : 'playing';
      },
      onOpponentDisconnected: () => {
        setPaused(true);
        pausedRef.current = true;
      },
    });
  }, [mode]);

  const togglePause = () => {
    if (matchRef.current.phase === 'match_over') return;
    const next = !pausedRef.current;
    pausedRef.current = next;
    setPaused(next);
    document.body.dataset.state = next ? 'paused' : 'playing';
  };

  const handleRestartMatch = () => {
    if (mode === 'lan') {
      lanClient.rematch();
      pausedRef.current = false;
      setPaused(false);
      document.body.dataset.state = 'playing';
      return;
    }
    const fresh = createMatchState({
      mode,
      stage,
      p1Id: p1Fighter,
      p2Id: p2Fighter,
      trainingHpPercent: settingsRef.current.trainingHpPercent,
      trainingInfiniteEnergy: settingsRef.current.trainingInfiniteEnergy,
      trainingAutoRegen: settingsRef.current.trainingAutoRegen,
    });
    matchRef.current = fresh;
    pausedRef.current = false;
    setPaused(false);
    lastHudKeyRef.current = '';
    syncHudIfChanged(fresh);
    document.body.dataset.state = 'playing';
  };

  const handleTrainingResetRound = () => {
    if (mode !== 'training') return;
    resetRound(matchRef.current);
    matchRef.current.p1.hp = matchRef.current.p1.maxHp;
    matchRef.current.p2.hp = matchRef.current.p2.maxHp;
    lastHudKeyRef.current = '';
    syncHudIfChanged(matchRef.current);
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
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysHeldRef.current.delete(e.code);
    };

    const clearAllInputs = () => {
      keysHeldRef.current.clear();
      touchInputRef.current = { ...EMPTY_INPUT };
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
      const k = keysHeldRef.current;
      const t = touchInputRef.current;
      return {
        left: k.has('KeyA') || (mode !== 'local2p' && k.has('ArrowLeft')) || t.left,
        right: k.has('KeyD') || (mode !== 'local2p' && k.has('ArrowRight')) || t.right,
        up: k.has('KeyW') || (mode !== 'local2p' && k.has('ArrowUp')) || t.up,
        down: k.has('KeyS') || (mode !== 'local2p' && k.has('ArrowDown')) || t.down,
        light: k.has('KeyJ') || t.light,
        heavy: k.has('KeyK') || t.heavy,
        special: k.has('KeyL') || k.has('Space') || t.special,
        block: k.has('KeyU') || k.has('ShiftLeft') || t.block,
      };
    };

    const readP2LocalInput = (): InputState => {
      const k = keysHeldRef.current;
      return {
        left: k.has('ArrowLeft'),
        right: k.has('ArrowRight'),
        up: k.has('ArrowUp'),
        down: k.has('ArrowDown'),
        light: k.has('Numpad1') || k.has('KeyI'),
        heavy: k.has('Numpad2') || k.has('KeyO'),
        special: k.has('Numpad3') || k.has('KeyP'),
        block: k.has('Numpad0') || k.has('Semicolon'),
      };
    };

    const frame = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      if (!pausedRef.current) {
        accumulator += dt;
        while (accumulator >= FIXED_DT) {
          const localIn = readP1Input();

          if (mode === 'lan') {
            lanClient.sendInput(localIn);
          } else {
            const p2In =
              mode === 'training'
                ? bot.computeInput(matchRef.current, settingsRef.current.botDifficulty)
                : readP2LocalInput();
            const events = stepMatchSimulation(matchRef.current, localIn, p2In);
            renderer.ingestEvents(events, settingsRef.current.graphicsQuality);
            audioManager.playCombatEvents(events);
          }
          accumulator -= FIXED_DT;
        }

        syncHudIfChanged(matchRef.current);
        if (matchRef.current.phase === 'match_over') {
          document.body.dataset.state = 'gameover';
        }
      }

      renderer.render(
        ctx,
        canvas.width,
        canvas.height,
        matchRef.current,
        now / 1000,
        settingsRef.current.graphicsQuality
      );

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [mode]);

  const setTouchButton = (key: keyof InputState, active: boolean) => {
    audioManager.unlock();
    touchInputRef.current[key] = active;
    setActiveTouchBtns((prev) => ({ ...prev, [key]: active }));
  };

  const p1Pct = Math.max(0, Math.min(100, (hud.p1Hp / hud.p1MaxHp) * 100));
  const p1TrailPct = Math.max(p1Pct, Math.min(100, (hud.p1TrailHp / hud.p1MaxHp) * 100));
  const p2Pct = Math.max(0, Math.min(100, (hud.p2Hp / hud.p2MaxHp) * 100));
  const p2TrailPct = Math.max(p2Pct, Math.min(100, (hud.p2TrailHp / hud.p2MaxHp) * 100));

  const touchScale = settings.touchLayout.scale;

  return (
    <main className="relative w-full h-full overflow-hidden bg-[#07090D]">
      {/* Isolated 60 FPS Canvas */}
      <canvas
        ref={canvasRef}
        data-testid="combat-canvas"
        className="absolute inset-0 w-full h-full block touch-surface"
      />

      {/* World-Matched Top Combat HUD (pointer-events: none) */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-5">
        <div className="w-full max-w-6xl mx-auto">
          <div className="grid grid-cols-11 items-center gap-2 sm:gap-3">
            {/* P1 Health & Identity */}
            <div className="col-span-5">
              <div className="flex items-center justify-between mb-1 px-1">
                <div className="flex items-center gap-2">
                  <span className="font-display text-lg sm:text-2xl font-extrabold tracking-wide text-[#F4F7FB]">
                    {hud.p1Name}
                  </span>
                  <span className="text-[11px] font-mono-tech text-[#00E5FF]">P1</span>
                </div>
                <div className="flex items-center gap-1.5" aria-label={`Rondas vencidas Jogador 1: ${hud.p1Rounds}`}>
                  {[0, 1].map((idx) => (
                    <span
                      key={idx}
                      className={`w-3.5 h-3.5 rotate-45 border ${
                        idx < hud.p1Rounds
                          ? 'bg-[#F5B700] border-[#F5B700]'
                          : 'bg-[#0D131D] border-white/30'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="h-5 sm:h-6 bg-[#0B0F18] border border-white/25 skew-hud-left overflow-hidden relative">
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
              <div className="flex items-center justify-between mt-1 px-1 text-[11px] font-mono-tech text-[#94A3B8]">
                <span>HP {Math.round(hud.p1Hp)}/{hud.p1MaxHp}</span>
                {hud.p1Combo >= 2 && (
                  <span className="font-display text-lg font-extrabold text-[#F5B700]">
                    {hud.p1Combo} HITS!
                  </span>
                )}
              </div>
            </div>

            {/* Center 99s Timer */}
            <div className="col-span-1 flex flex-col items-center justify-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#0B0F18] border-2 border-[#00A8FF] flex flex-col items-center justify-center">
                <span className="font-display text-3xl sm:text-4xl font-extrabold tabular-nums text-[#F4F7FB] leading-none">
                  {mode === 'training' ? '∞' : String(hud.timerSeconds).padStart(2, '0')}
                </span>
                <span className="text-[10px] font-mono-tech text-[#00A8FF]">
                  R{hud.roundNumber}
                </span>
              </div>
              {mode === 'lan' && (
                <span className="mt-1 text-[10px] font-mono-tech text-[#94A3B8] tabular-nums">
                  {pingMs}ms
                </span>
              )}
            </div>

            {/* P2 Health & Identity */}
            <div className="col-span-5">
              <div className="flex items-center justify-between mb-1 px-1">
                <div className="flex items-center gap-1.5" aria-label={`Rondas vencidas Jogador 2: ${hud.p2Rounds}`}>
                  {[0, 1].map((idx) => (
                    <span
                      key={idx}
                      className={`w-3.5 h-3.5 rotate-45 border ${
                        idx < hud.p2Rounds
                          ? 'bg-[#F5B700] border-[#F5B700]'
                          : 'bg-[#0D131D] border-white/30'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono-tech text-[#A855F7]">
                    {mode === 'training' ? 'CPU' : 'P2'}
                  </span>
                  <span className="font-display text-lg sm:text-2xl font-extrabold tracking-wide text-[#F4F7FB]">
                    {hud.p2Name}
                  </span>
                </div>
              </div>
              <div className="h-5 sm:h-6 bg-[#0B0F18] border border-white/25 skew-hud-right overflow-hidden relative">
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
              <div className="flex items-center justify-between mt-1 px-1 text-[11px] font-mono-tech text-[#94A3B8]">
                {hud.p2Combo >= 2 ? (
                  <span className="font-display text-lg font-extrabold text-[#F5B700]">
                    {hud.p2Combo} HITS!
                  </span>
                ) : (
                  <span />
                )}
                <span>HP {Math.round(hud.p2Hp)}/{hud.p2MaxHp}</span>
              </div>
            </div>
          </div>

          {/* Top-right Compact Utility Buttons (Mute / Training Reset / Pause) */}
          <div className="flex justify-end gap-2 mt-2 pointer-events-auto">
            {mode === 'training' && (
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  handleTrainingResetRound();
                }}
                aria-label="Reiniciar posição e vida de treino"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#10151F]/90 border border-white/15 hover:border-[#00A8FF] text-xs font-semibold text-[#F4F7FB] cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reiniciar
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
              <Pause className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bottom Special Energy Bars + Customizable Mobile Touch Controls */}
        <div className="w-full flex flex-col gap-3">
          {settings.touchLayout.enabled && (
            <div className="w-full flex items-end justify-between px-1 sm:px-4 pb-1 pointer-events-none">
              {/* Left Cluster: Directional Pad */}
              <div
                className="pointer-events-auto touch-surface grid grid-cols-3 gap-1.5 origin-bottom-left"
                style={{
                  transform: `translate(${settings.touchLayout.leftOffsetX}px, ${settings.touchLayout.leftOffsetY}px) scale(${touchScale})`,
                }}
              >
                <div />
                <button
                  type="button"
                  aria-label="Saltar"
                  onPointerDown={() => setTouchButton('up', true)}
                  onPointerUp={() => setTouchButton('up', false)}
                  onPointerCancel={() => setTouchButton('up', false)}
                  onPointerLeave={() => setTouchButton('up', false)}
                  className={`w-12 h-12 sm:w-14 sm:h-14 border text-sm font-bold transition-transform ${
                    activeTouchBtns.up
                      ? 'bg-[#00A8FF] text-[#07090D] border-white scale-95'
                      : 'bg-[#10151F]/80 text-[#F4F7FB] border-white/25'
                  }`}
                >
                  ↑
                </button>
                <div />

                <button
                  type="button"
                  aria-label="Mover para a esquerda"
                  onPointerDown={() => setTouchButton('left', true)}
                  onPointerUp={() => setTouchButton('left', false)}
                  onPointerCancel={() => setTouchButton('left', false)}
                  onPointerLeave={() => setTouchButton('left', false)}
                  className={`w-12 h-12 sm:w-14 sm:h-14 border text-sm font-bold transition-transform ${
                    activeTouchBtns.left
                      ? 'bg-[#00A8FF] text-[#07090D] border-white scale-95'
                      : 'bg-[#10151F]/80 text-[#F4F7FB] border-white/25'
                  }`}
                >
                  ←
                </button>
                <button
                  type="button"
                  aria-label="Agachar"
                  onPointerDown={() => setTouchButton('down', true)}
                  onPointerUp={() => setTouchButton('down', false)}
                  onPointerCancel={() => setTouchButton('down', false)}
                  onPointerLeave={() => setTouchButton('down', false)}
                  className={`w-12 h-12 sm:w-14 sm:h-14 border text-sm font-bold transition-transform ${
                    activeTouchBtns.down
                      ? 'bg-[#00A8FF] text-[#07090D] border-white scale-95'
                      : 'bg-[#10151F]/80 text-[#F4F7FB] border-white/25'
                  }`}
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label="Mover para a direita"
                  onPointerDown={() => setTouchButton('right', true)}
                  onPointerUp={() => setTouchButton('right', false)}
                  onPointerCancel={() => setTouchButton('right', false)}
                  onPointerLeave={() => setTouchButton('right', false)}
                  className={`w-12 h-12 sm:w-14 sm:h-14 border text-sm font-bold transition-transform ${
                    activeTouchBtns.right
                      ? 'bg-[#00A8FF] text-[#07090D] border-white scale-95'
                      : 'bg-[#10151F]/80 text-[#F4F7FB] border-white/25'
                  }`}
                >
                  →
                </button>
              </div>

              {/* Right Cluster: Light, Heavy, Special, Block */}
              <div
                className="pointer-events-auto touch-surface grid grid-cols-2 gap-2 origin-bottom-right"
                style={{
                  transform: `translate(${settings.touchLayout.rightOffsetX}px, ${settings.touchLayout.rightOffsetY}px) scale(${touchScale})`,
                }}
              >
                <button
                  type="button"
                  aria-label="Ataque Ligeiro"
                  onPointerDown={() => setTouchButton('light', true)}
                  onPointerUp={() => setTouchButton('light', false)}
                  onPointerCancel={() => setTouchButton('light', false)}
                  onPointerLeave={() => setTouchButton('light', false)}
                  className={`w-14 h-12 sm:w-16 sm:h-13 border text-xs font-display font-bold uppercase transition-transform ${
                    activeTouchBtns.light
                      ? 'bg-[#00E5FF] text-[#07090D] border-white scale-95'
                      : 'bg-[#10151F]/80 text-[#00E5FF] border-[#00E5FF]/50'
                  }`}
                >
                  LIGEIRO
                </button>
                <button
                  type="button"
                  aria-label="Ataque Pesado"
                  onPointerDown={() => setTouchButton('heavy', true)}
                  onPointerUp={() => setTouchButton('heavy', false)}
                  onPointerCancel={() => setTouchButton('heavy', false)}
                  onPointerLeave={() => setTouchButton('heavy', false)}
                  className={`w-14 h-12 sm:w-16 sm:h-13 border text-xs font-display font-bold uppercase transition-transform ${
                    activeTouchBtns.heavy
                      ? 'bg-[#F5B700] text-[#07090D] border-white scale-95'
                      : 'bg-[#10151F]/80 text-[#F5B700] border-[#F5B700]/50'
                  }`}
                >
                  PESADO
                </button>
                <button
                  type="button"
                  aria-label="Defender"
                  onPointerDown={() => setTouchButton('block', true)}
                  onPointerUp={() => setTouchButton('block', false)}
                  onPointerCancel={() => setTouchButton('block', false)}
                  onPointerLeave={() => setTouchButton('block', false)}
                  className={`w-14 h-12 sm:w-16 sm:h-13 border text-xs font-display font-bold uppercase transition-transform ${
                    activeTouchBtns.block
                      ? 'bg-[#00A8FF] text-[#07090D] border-white scale-95'
                      : 'bg-[#10151F]/80 text-[#F4F7FB] border-white/30'
                  }`}
                >
                  DEFESA
                </button>
                <button
                  type="button"
                  aria-label="Ataque Especial"
                  onPointerDown={() => setTouchButton('special', true)}
                  onPointerUp={() => setTouchButton('special', false)}
                  onPointerCancel={() => setTouchButton('special', false)}
                  onPointerLeave={() => setTouchButton('special', false)}
                  className={`w-14 h-12 sm:w-16 sm:h-13 border text-xs font-display font-bold uppercase transition-transform ${
                    activeTouchBtns.special
                      ? 'bg-[#A855F7] text-white border-white scale-95'
                      : 'bg-[#10151F]/80 text-[#A855F7] border-[#A855F7]/60'
                  }`}
                >
                  ESPECIAL
                </button>
              </div>
            </div>
          )}

          {/* Bottom Energy Meters */}
          <div className="w-full max-w-6xl mx-auto flex items-center justify-between gap-6">
            <div className="w-48 sm:w-72">
              <div className="flex justify-between text-[11px] font-mono-tech text-[#00E5FF] mb-1">
                <span>ENERGIA ESPECIAL</span>
                <span>{Math.round(hud.p1Energy)}%</span>
              </div>
              <div className="h-2.5 bg-[#0B0F18] border border-white/20 overflow-hidden">
                <div
                  className="h-full bg-[#00E5FF]"
                  style={{ width: `${Math.min(100, hud.p1Energy)}%` }}
                />
              </div>
            </div>

            <div className="hidden lg:block text-[11px] text-[#94A3B8] tracking-wide whitespace-nowrap">
              {mode === 'lan'
                ? `Sala LAN · Jogador ${lanSlot}`
                : 'A/D Mover · W Saltar · S Agachar · J/K/L Ataques · U Defesa'}
            </div>

            <div className="w-48 sm:w-72">
              <div className="flex justify-between text-[11px] font-mono-tech text-[#A855F7] mb-1">
                <span>{Math.round(hud.p2Energy)}%</span>
                <span>ENERGIA ESPECIAL</span>
              </div>
              <div className="h-2.5 bg-[#0B0F18] border border-white/20 overflow-hidden flex justify-end">
                <div
                  className="h-full bg-[#A855F7]"
                  style={{ width: `${Math.min(100, hud.p2Energy)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pause Modal */}
      {paused && hud.phase !== 'match_over' && (
        <div className="absolute inset-0 z-30 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#10151F] border border-[#00A8FF] p-6 space-y-4">
            <h2 className="font-display text-3xl font-extrabold text-[#F4F7FB] text-center">
              COMBATE EM PAUSA
            </h2>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={togglePause}
                className="w-full py-3 bg-[#00A8FF] hover:bg-[#33B9FF] text-[#07090D] font-display text-xl font-bold uppercase cursor-pointer"
              >
                CONTINUAR
              </button>
              <button
                type="button"
                onClick={handleRestartMatch}
                className="w-full py-3 bg-[#192233] hover:bg-[#222E45] text-[#F4F7FB] font-display text-xl font-bold uppercase cursor-pointer"
              >
                REINICIAR COMBATE
              </button>
              <button
                type="button"
                onClick={onExitToMenu}
                className="w-full py-3 bg-[#07090D] border border-white/15 hover:border-[#EF4444] text-[#F4F7FB] font-display text-xl font-bold uppercase cursor-pointer"
              >
                SAIR PARA O MENU
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Match Over / Victory & Defeat Modal */}
      {hud.phase === 'match_over' && (
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
          onRematch={handleRestartMatch}
          onChangeCharacters={onChangeCharacters}
          onExitMenu={onExitToMenu}
        />
      )}
    </main>
  );
}
