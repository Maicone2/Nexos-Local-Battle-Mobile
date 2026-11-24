import { ArrowLeft, Bot, Play, Shuffle, Trophy, User } from 'lucide-react';
import { FIGHTER_PROFILES, STAGES } from '../game/constants';
import {
  TournamentParticipant,
  TournamentSize,
} from '../game/tournament';
import { FighterId, StageId } from '../game/types';

interface TournamentSetupScreenProps {
  size: TournamentSize;
  participants: TournamentParticipant[];
  stage: StageId;
  onChangeSize: (size: TournamentSize) => void;
  onUpdateParticipant: (index: number, patch: Partial<TournamentParticipant>) => void;
  onShuffle: () => void;
  onSelectStage: (stage: StageId) => void;
  onStartTournament: () => void;
  onBack: () => void;
}

const FIGHTER_IDS: FighterId[] = ['kael', 'vexa', 'zane', 'nyx'];
const STAGE_IDS: StageId[] = ['orbital_arena', 'energy_dock', 'cyber_temple', 'reactor_core'];

export function TournamentSetupScreen({
  size,
  participants,
  stage,
  onChangeSize,
  onUpdateParticipant,
  onShuffle,
  onSelectStage,
  onStartTournament,
  onBack,
}: TournamentSetupScreenProps) {
  return (
    <main className="w-full h-full bg-[#07090D] flex flex-col justify-between px-4 py-2 sm:px-6 sm:py-3 md:px-10 md:py-4 overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-[#F5B700] shrink-0" />
          <div>
            <h1 className="font-display text-xl sm:text-3xl font-extrabold tracking-wide text-[#F4F7FB] leading-none">
              TORNEIO LOCAL · CHAVE ELIMINATÓRIA
            </h1>
            <p className="text-[11px] sm:text-xs text-[#94A3B8]">
              Configura 4 ou 8 jogadores locais (Humano ou CPU) e inicia a competição.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="flex items-center bg-[#10151F] border border-white/15 p-0.5">
            {([4, 8] as TournamentSize[]).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onChangeSize(opt)}
                className={`px-2.5 sm:px-3 py-1 text-xs font-display font-bold uppercase cursor-pointer whitespace-nowrap ${
                  size === opt
                    ? 'bg-[#F5B700] text-[#07090D]'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                {opt} Jogadores
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onShuffle}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#10151F] border border-white/15 hover:border-[#00A8FF] text-xs font-semibold text-[#F4F7FB] cursor-pointer whitespace-nowrap"
          >
            <Shuffle className="w-3.5 h-3.5 text-[#00E5FF]" />
            Sortear
          </button>

          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#10151F] border border-white/15 hover:border-[#00A8FF] text-xs sm:text-sm font-semibold text-[#F4F7FB] cursor-pointer whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar
          </button>
        </div>
      </div>

      {/* Roster Grid (Zero Scroll for both 4 and 8 players) */}
      <div
        className={`my-auto max-w-6xl w-full mx-auto grid gap-1.5 sm:gap-2.5 py-1 ${
          size === 4
            ? 'grid-cols-2 sm:grid-cols-4'
            : 'grid-cols-2 sm:grid-cols-4'
        }`}
      >
        {participants.slice(0, size).map((player, idx) => {
          const prof = FIGHTER_PROFILES[player.fighterId];
          return (
            <section
              key={player.id}
              data-testid={`tournament-slot-${idx + 1}`}
              className="bg-[#10151F] border border-white/15 p-2 sm:p-2.5 flex flex-col justify-between gap-1.5"
            >
              <div className="flex items-center justify-between gap-1.5">
                <span className="font-mono-tech text-[10px] font-bold text-[#F5B700] tabular-nums shrink-0">
                  #{idx + 1}
                </span>
                <input
                  type="text"
                  maxLength={14}
                  value={player.name}
                  aria-label={`Nome do Jogador ${idx + 1}`}
                  onChange={(e) => onUpdateParticipant(idx, { name: e.target.value })}
                  className="min-w-0 flex-1 bg-[#07090D] border border-white/15 focus:border-[#00A8FF] outline-none px-1.5 py-0.5 text-xs font-semibold text-[#F4F7FB]"
                />
                <button
                  type="button"
                  onClick={() => onUpdateParticipant(idx, { isCpu: !player.isCpu })}
                  aria-label={`Alternar controlo do Jogador ${idx + 1}`}
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 border text-[10px] font-mono-tech font-bold uppercase cursor-pointer shrink-0 ${
                    player.isCpu
                      ? 'bg-[#A855F7]/20 border-[#A855F7] text-[#C084FC]'
                      : 'bg-[#00A8FF]/15 border-[#00A8FF]/60 text-[#00E5FF]'
                  }`}
                >
                  {player.isCpu ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
                  {player.isCpu ? 'CPU' : 'HUM'}
                </button>
              </div>

              {/* Fighter Selection Row */}
              <div className="grid grid-cols-4 gap-1">
                {FIGHTER_IDS.map((fid) => {
                  const fProf = FIGHTER_PROFILES[fid];
                  const active = player.fighterId === fid;
                  return (
                    <button
                      key={fid}
                      type="button"
                      onClick={() => onUpdateParticipant(idx, { fighterId: fid })}
                      className={`py-1 px-1 text-[10px] sm:text-[11px] font-display font-bold uppercase border cursor-pointer truncate ${
                        active
                          ? 'bg-[#07090D] text-[#F4F7FB]'
                          : 'bg-[#07090D]/60 text-[#94A3B8] border-white/10 hover:text-white'
                      }`}
                      style={
                        active
                          ? { borderColor: fProf.primaryColor, color: fProf.primaryColor }
                          : undefined
                      }
                    >
                      {fProf.name}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-2 text-[10px] text-[#94A3B8] border-t border-white/10 pt-1">
                <span className="truncate min-w-0" style={{ color: prof.primaryColor }}>
                  {prof.name} · {prof.style}
                </span>
                <span className="font-mono-tech tabular-nums shrink-0">{prof.maxHp} HP</span>
              </div>
            </section>
          );
        })}
      </div>

      {/* Bottom Stage Selector + Launch Bracket CTA */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between gap-2 border-t border-white/10 pt-1.5">
        <div className="flex items-center gap-1 min-w-0 overflow-hidden">
          <span className="text-[10px] font-mono-tech text-[#94A3B8] uppercase mr-0.5 shrink-0">
            Arena:
          </span>
          {STAGE_IDS.map((sid) => {
            const st = STAGES[sid];
            const active = stage === sid;
            return (
              <button
                key={sid}
                type="button"
                onClick={() => onSelectStage(sid)}
                className={`px-1.5 lg:px-2.5 py-1 border text-[10px] lg:text-[11px] font-semibold cursor-pointer whitespace-nowrap truncate ${
                  active
                    ? 'bg-[#00A8FF] text-[#07090D] border-[#00A8FF]'
                    : 'bg-[#10151F] text-[#94A3B8] border-white/15 hover:text-white'
                }`}
              >
                {st.name}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onStartTournament}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 lg:px-6 py-1.5 lg:py-2 bg-[#F5B700] hover:bg-[#FACC15] text-[#07090D] font-display text-sm lg:text-lg font-extrabold uppercase tracking-wide cursor-pointer whitespace-nowrap shrink-0"
        >
          <Play className="w-3.5 h-3.5 lg:w-4 lg:h-4 fill-current shrink-0" />
          ENTRAR NO TORNEIO →
        </button>
      </div>
    </main>
  );
}
