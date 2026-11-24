import {
  ArrowLeft,
  Award,
  BookOpen,
  Dumbbell,
  Film,
  Info,
  Paintbrush,
  RotateCcw,
  Settings,
  Swords,
  Trophy,
  Wifi,
} from 'lucide-react';
import { COMBO_TRIALS, loadCompletedTrials } from '../game/comboTrials';
import { DEFAULT_LOCAL_SESSION_STATS, LocalSessionRecord } from '../game/sessionStats';

interface MainMenuProps {
  onPlay: () => void;
  onLan: () => void;
  onTraining: () => void;
  onComboTrials: () => void;
  onCustomize: () => void;
  onReplays: () => void;
  onMoveList: () => void;
  replayCount?: number;
  localSessionStats?: LocalSessionRecord;
  onResetLocalSession?: () => void;
  onSettings: () => void;
  onAbout: () => void;
  onBackTitle: () => void;
}

export function MainMenu({
  onPlay,
  onLan,
  onTraining,
  onComboTrials,
  onCustomize,
  onReplays,
  onMoveList,
  replayCount = 0,
  localSessionStats = DEFAULT_LOCAL_SESSION_STATS,
  onResetLocalSession,
  onSettings,
  onAbout,
  onBackTitle,
}: MainMenuProps) {
  const completedMap = loadCompletedTrials();
  const completedTrialsCount = COMBO_TRIALS.filter((t) => completedMap[t.id]).length;

  return (
    <main className="relative w-full h-full bg-[#07090D] flex flex-col justify-between px-4 py-2 sm:px-6 sm:py-3 md:px-10 md:py-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold italic tracking-wider text-[#F4F7FB] leading-none">
            NEON CLASH <span className="text-[#00A8FF]">ARENA LAN</span>
          </h1>
          <p className="text-[11px] sm:text-xs text-[#94A3B8]">Seleciona o modo de combate</p>
        </div>
        <button
          type="button"
          onClick={onBackTitle}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#10151F] border border-white/15 hover:border-[#00A8FF] text-xs sm:text-sm font-semibold text-[#F4F7FB] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Início
        </button>
      </div>

      <div className="my-auto py-1 grid grid-cols-1 sm:grid-cols-12 gap-2.5 md:gap-4 items-stretch max-w-6xl w-full mx-auto">
        {/* Primary Menu Stack */}
        <div className="sm:col-span-7 flex flex-col justify-between gap-2">
          <button
            type="button"
            onClick={onPlay}
            className="group flex items-center justify-between px-4 py-2.5 md:px-5 md:py-3.5 bg-[#00A8FF] hover:bg-[#29B6FF] text-[#07090D] transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <Swords className="w-6 h-6 shrink-0" />
              <div>
                <div className="font-display text-2xl md:text-3xl font-extrabold tracking-wide leading-none">
                  JOGAR
                </div>
                <div className="text-[11px] font-semibold opacity-80 mt-0.5">
                  1v1 vs CPU, 1v1 Local, Combo Trials e Treino
                </div>
              </div>
            </div>
            <span className="font-display text-lg md:text-xl font-bold tracking-wider">ENTRAR →</span>
          </button>

          <button
            type="button"
            onClick={onLan}
            className="flex items-center justify-between px-4 py-2 md:px-5 md:py-3 bg-[#10151F] hover:bg-[#161E2E] border border-white/10 hover:border-[#00A8FF] text-[#F4F7FB] transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <Wifi className="w-5 h-5 text-[#00A8FF] shrink-0" />
              <div>
                <div className="font-display text-xl md:text-2xl font-bold tracking-wide leading-none">
                  MULTIPLAYER LAN
                </div>
                <div className="text-[11px] text-[#94A3B8] mt-0.5">
                  Criar ou entrar numa sala local Wi-Fi / Hotspot
                </div>
              </div>
            </div>
            <span className="text-[11px] font-mono-tech text-[#00A8FF] shrink-0">REDE LOCAL</span>
          </button>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={onComboTrials}
              className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-3 bg-[#10151F] hover:bg-[#161E2E] border border-[#10B981]/50 hover:border-[#10B981] text-[#F4F7FB] transition-colors cursor-pointer text-left"
            >
              <Award className="w-4 h-4 md:w-5 md:h-5 text-[#10B981] shrink-0" />
              <div className="min-w-0">
                <div className="font-display text-base md:text-xl font-bold tracking-wide leading-none text-[#10B981] truncate">
                  COMBO TRIALS
                </div>
                <div className="text-[10px] font-mono-tech text-[#94A3B8] mt-0.5">
                  {completedTrialsCount}/{COMBO_TRIALS.length} Trials
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={onTraining}
              className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-3 bg-[#10151F] hover:bg-[#161E2E] border border-white/10 hover:border-[#F5B700] text-[#F4F7FB] transition-colors cursor-pointer text-left"
            >
              <Dumbbell className="w-4 h-4 md:w-5 md:h-5 text-[#F5B700] shrink-0" />
              <div className="min-w-0">
                <div className="font-display text-base md:text-xl font-bold tracking-wide leading-none truncate">
                  TREINO
                </div>
                <div className="text-[10px] text-[#94A3B8] mt-0.5 truncate">Livre vs CPU</div>
              </div>
            </button>

            <button
              type="button"
              onClick={onCustomize}
              className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-3 bg-[#10151F] hover:bg-[#161E2E] border border-[#00A8FF]/45 hover:border-[#00E5FF] text-[#F4F7FB] transition-colors cursor-pointer text-left"
            >
              <Paintbrush className="w-4 h-4 md:w-5 md:h-5 text-[#00E5FF] shrink-0" />
              <div className="min-w-0">
                <div className="font-display text-base md:text-xl font-bold tracking-wide leading-none text-[#00E5FF] truncate">
                  PERSONALIZAR
                </div>
                <div className="text-[10px] text-[#94A3B8] mt-0.5 truncate">Supreme Duelist</div>
              </div>
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={onReplays}
              className="flex items-center justify-center sm:justify-start gap-1.5 px-2.5 py-2 bg-[#10151F] hover:bg-[#161E2E] border border-white/10 hover:border-[#00A8FF] text-[#F4F7FB] transition-colors cursor-pointer"
            >
              <Film className="w-3.5 h-3.5 text-[#00E5FF] shrink-0" />
              <span className="font-display text-sm md:text-lg font-bold tracking-wide truncate">
                REPLAYS{replayCount > 0 ? ` (${replayCount})` : ''}
              </span>
            </button>

            <button
              type="button"
              onClick={onMoveList}
              className="flex items-center justify-center sm:justify-start gap-1.5 px-2.5 py-2 bg-[#10151F] hover:bg-[#161E2E] border border-white/10 hover:border-[#00A8FF] text-[#F4F7FB] transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#A855F7] shrink-0" />
              <span className="font-display text-sm md:text-lg font-bold tracking-wide truncate">GOLPES</span>
            </button>

            <button
              type="button"
              onClick={onSettings}
              className="flex items-center justify-center sm:justify-start gap-1.5 px-2.5 py-2 bg-[#10151F] hover:bg-[#161E2E] border border-white/10 hover:border-[#00A8FF] text-[#F4F7FB] transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
              <span className="font-display text-sm md:text-lg font-bold tracking-wide truncate">DEFINIÇÕES</span>
            </button>

            <button
              type="button"
              onClick={onAbout}
              className="flex items-center justify-center sm:justify-start gap-1.5 px-2.5 py-2 bg-[#10151F] hover:bg-[#161E2E] border border-white/10 hover:border-[#00A8FF] text-[#F4F7FB] transition-colors cursor-pointer"
            >
              <Info className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
              <span className="font-display text-sm md:text-lg font-bold tracking-wide truncate">SOBRE</span>
            </button>
          </div>
        </div>

        {/* Right Column: Local 1v1 Session Counter + Roster */}
        <aside className="sm:col-span-5 bg-[#10151F] border border-white/10 p-2.5 md:p-4 flex flex-col justify-between gap-2">
          {/* Persistent Local 1v1 Session Win/Loss Counter */}
          <div
            data-testid="local-session-counter"
            className="bg-[#07090D] border border-white/10 p-2 md:p-3 space-y-1.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-mono-tech text-[#F5B700] uppercase">
                <Trophy className="w-3.5 h-3.5" />
                <span>PLACAR DA SESSÃO (1V1 LOCAL)</span>
              </div>
              {localSessionStats.matchesPlayed > 0 && onResetLocalSession && (
                <button
                  type="button"
                  onClick={onResetLocalSession}
                  aria-label="Repor placar da sessão"
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#10151F] border border-white/15 hover:border-[#EF4444] text-[10px] font-mono-tech text-[#94A3B8] hover:text-[#F4F7FB] cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Repor
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-[#10151F] border border-[#00E5FF]/35 px-2 py-1.5 flex items-center justify-between">
                <div>
                  <div className="text-[9px] font-mono-tech text-[#00E5FF]">JOGADOR 1</div>
                  <div className="font-display text-lg md:text-xl font-extrabold text-[#F4F7FB] tabular-nums leading-tight">
                    {localSessionStats.p1Wins}V · {localSessionStats.p1Losses}D
                  </div>
                </div>
                <span className="text-[9px] font-mono-tech text-[#64748B]">P1</span>
              </div>

              <div className="bg-[#10151F] border border-[#A855F7]/35 px-2 py-1.5 flex items-center justify-between">
                <div>
                  <div className="text-[9px] font-mono-tech text-[#A855F7]">JOGADOR 2</div>
                  <div className="font-display text-lg md:text-xl font-extrabold text-[#F4F7FB] tabular-nums leading-tight">
                    {localSessionStats.p2Wins}V · {localSessionStats.p2Losses}D
                  </div>
                </div>
                <span className="text-[9px] font-mono-tech text-[#64748B]">P2</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono-tech text-[#94A3B8]">
              <span>Partidas Locais na Sessão</span>
              <span className="text-[#F4F7FB] font-bold tabular-nums">
                {localSessionStats.matchesPlayed}
              </span>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-mono-tech text-[#00A8FF] tracking-wider uppercase">
              4 Lutadores · Armas Supreme Duelist
            </p>
            <h2 className="font-display text-lg md:text-2xl font-bold text-[#F4F7FB] leading-tight">
              KAEL · VEXA · ZANE · NYX
            </h2>
          </div>

          <div className="space-y-1 border-t border-white/10 pt-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#00E5FF]">KAEL · Energia</span>
              <span className="text-[#94A3B8]">Pulso Solar · 5 Trials</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#A855F7]">VEXA · Agilidade</span>
              <span className="text-[#94A3B8]">Vórtice Azul · 5 Trials</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#EF4444]">ZANE · Titã Pesado</span>
              <span className="text-[#94A3B8]">Impacto Sísmico · 5 Trials</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#10B981]">NYX · Ninja Criogénica</span>
              <span className="text-[#94A3B8]">Lâmina Glacial · 5 Trials</span>
            </div>
          </div>
        </aside>
      </div>

      <div className="text-[11px] text-[#64748B] flex items-center justify-between">
        <span>NEON CLASH: ARENA LAN · Motor 2.5D a 60 FPS</span>
        <span className="font-mono-tech text-[#10B981]">
          Combo Trials: {completedTrialsCount}/{COMBO_TRIALS.length} completos
        </span>
      </div>
    </main>
  );
}
