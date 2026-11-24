import { ArrowLeft, Play, RotateCcw, Settings2, Trophy } from 'lucide-react';
import { FIGHTER_PROFILES, STAGES } from '../game/constants';
import {
  getCurrentTournamentMatch,
  getTournamentRoundLabel,
  TournamentMatch,
  TournamentParticipant,
  TournamentState,
} from '../game/tournament';

interface TournamentBracketScreenProps {
  tournament: TournamentState;
  onStartNextMatch: () => void;
  onRestartSamePlayers: () => void;
  onEditSetup: () => void;
  onExitMenu: () => void;
}

function ParticipantRow({
  participant,
  rounds,
  isWinner,
  hasWinner,
  fallbackText,
  compact,
}: {
  participant: TournamentParticipant | null;
  rounds: number;
  isWinner: boolean;
  hasWinner: boolean;
  fallbackText: string;
  compact: boolean;
}) {
  if (!participant) {
    return (
      <div
        className={`flex items-center justify-between px-1.5 bg-[#07090D]/60 border border-white/5 text-[#64748B] ${
          compact ? 'py-0.5 text-[10px]' : 'py-1 text-[11px]'
        }`}
      >
        <span className="truncate">{fallbackText}</span>
        <span className="font-mono-tech tabular-nums">-</span>
      </div>
    );
  }

  const prof = FIGHTER_PROFILES[participant.fighterId];
  const dimmed = hasWinner && !isWinner;

  return (
    <div
      className={`flex items-center justify-between gap-1 px-1.5 border ${
        compact ? 'py-0.5 text-[10px]' : 'py-1 text-[11px]'
      } ${
        isWinner
          ? 'bg-[#10B981]/15 border-[#10B981] text-[#F4F7FB]'
          : dimmed
          ? 'bg-[#07090D]/50 border-white/5 text-[#64748B]'
          : 'bg-[#07090D] border-white/10 text-[#F4F7FB]'
      }`}
    >
      <div className="min-w-0 flex items-center gap-1">
        <span
          className="w-1.5 h-2.5 shrink-0"
          style={{ backgroundColor: prof.primaryColor }}
        />
        <span className="font-semibold truncate">{participant.name}</span>
        <span
          className="text-[9px] lg:text-[10px] font-mono-tech uppercase shrink-0"
          style={{ color: prof.primaryColor }}
        >
          {prof.name}
        </span>
        {participant.isCpu && (
          <span className="text-[9px] font-mono-tech text-[#C084FC] shrink-0">CPU</span>
        )}
      </div>
      <span className="font-mono-tech font-bold tabular-nums shrink-0">
        {hasWinner ? rounds : isWinner ? '✓' : '·'}
      </span>
    </div>
  );
}

export function TournamentBracketScreen({
  tournament,
  onStartNextMatch,
  onRestartSamePlayers,
  onEditSetup,
  onExitMenu,
}: TournamentBracketScreenProps) {
  const nextMatch = getCurrentTournamentMatch(tournament);
  const nextRoundLabel = getTournamentRoundLabel(
    tournament.size,
    tournament.currentRoundIndex
  );
  const stageName = STAGES[tournament.stage].name;
  const isEightPlayer = tournament.size === 8;

  return (
    <main className="w-full h-full bg-[#07090D] flex flex-col justify-between gap-1.5 px-4 py-1.5 sm:px-6 sm:py-2 md:px-10 md:py-3 overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Trophy className="w-5 h-5 text-[#F5B700] shrink-0" />
          <div className="min-w-0">
            <h1 className="font-display text-lg sm:text-2xl lg:text-3xl font-extrabold tracking-wide text-[#F4F7FB] leading-none truncate">
              CHAVE DO TORNEIO · {tournament.size} JOGADORES
            </h1>
            <p className="text-[10px] sm:text-xs text-[#94A3B8] truncate">
              Arena: {stageName} ·{' '}
              {tournament.champion
                ? `Campeão: ${tournament.champion.name}`
                : `${nextRoundLabel} · Combate ${tournament.currentMatchIndex + 1}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onEditSetup}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#10151F] border border-white/15 hover:border-[#00A8FF] text-xs font-semibold text-[#F4F7FB] cursor-pointer whitespace-nowrap"
          >
            <Settings2 className="w-3.5 h-3.5" />
            Jogadores
          </button>
          <button
            type="button"
            onClick={onExitMenu}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#10151F] border border-white/15 hover:border-[#EF4444] text-xs font-semibold text-[#F4F7FB] cursor-pointer whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Menu
          </button>
        </div>
      </div>

      {/* Bracket Columns (flex-1 min-h-0 guarantees zero bottom-bar clipping on 390px height) */}
      <div
        data-testid="tournament-bracket-grid"
        className={`flex-1 min-h-0 max-w-6xl w-full mx-auto grid gap-2 sm:gap-3 items-stretch ${
          tournament.rounds.length === 3 ? 'grid-cols-3' : 'grid-cols-2'
        }`}
      >
        {tournament.rounds.map((roundMatches: TournamentMatch[], rIdx: number) => {
          const rLabel = getTournamentRoundLabel(tournament.size, rIdx);
          return (
            <section
              key={rIdx}
              className="min-h-0 flex flex-col justify-between bg-[#0B0F18] border border-white/10 p-1.5 sm:p-2"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-0.5 mb-1 shrink-0">
                <h2 className="font-display text-xs sm:text-sm lg:text-base font-extrabold text-[#F5B700] tracking-wide truncate">
                  {rLabel}
                </h2>
                <span className="text-[10px] font-mono-tech text-[#94A3B8] tabular-nums shrink-0">
                  {roundMatches.filter((m) => Boolean(m.winnerId)).length}/{roundMatches.length}
                </span>
              </div>

              <div className="flex-1 min-h-0 flex flex-col justify-around gap-1">
                {roundMatches.map((m, mIdx) => {
                  const isCurrent =
                    !tournament.champion &&
                    rIdx === tournament.currentRoundIndex &&
                    mIdx === tournament.currentMatchIndex;
                  const hasWinner = Boolean(m.winnerId);

                  return (
                    <div
                      key={m.id}
                      data-testid={`bracket-match-${m.id}`}
                      className={`p-1 space-y-0.5 border ${
                        isCurrent
                          ? 'bg-[#10151F] border-[#00E5FF]'
                          : hasWinner
                          ? 'bg-[#10151F]/70 border-[#10B981]/40'
                          : 'bg-[#10151F]/40 border-white/10'
                      }`}
                    >
                      {(!isEightPlayer || rIdx > 0 || isCurrent || hasWinner) && (
                        <div className="hidden lg:flex items-center justify-between text-[9px] font-mono-tech uppercase">
                          <span className={isCurrent ? 'text-[#00E5FF] font-bold' : 'text-[#64748B]'}>
                            Combate {mIdx + 1}
                          </span>
                          <span className={isCurrent ? 'text-[#F5B700] font-bold' : hasWinner ? 'text-[#4ADE80]' : 'text-[#64748B]'}>
                            {isCurrent ? 'A SEGUIR' : hasWinner ? 'CONCLUÍDO' : 'AGUARDA'}
                          </span>
                        </div>
                      )}

                      <ParticipantRow
                        participant={m.p1}
                        rounds={m.p1Rounds}
                        isWinner={Boolean(m.winnerId && m.p1 && m.winnerId === m.p1.id)}
                        hasWinner={hasWinner}
                        fallbackText="Vencedor anterior"
                        compact={isEightPlayer}
                      />
                      <ParticipantRow
                        participant={m.p2}
                        rounds={m.p2Rounds}
                        isWinner={Boolean(m.winnerId && m.p2 && m.winnerId === m.p2.id)}
                        hasWinner={hasWinner}
                        fallbackText="Vencedor anterior"
                        compact={isEightPlayer}
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* Bottom Next Match / Champion Banner */}
      {tournament.champion ? (
        <div
          data-testid="tournament-champion-banner"
          className="max-w-6xl w-full mx-auto bg-[#10151F] border border-[#F5B700] px-3 py-1.5 flex items-center justify-between gap-2 shrink-0"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-[#F5B700] shrink-0" />
            <div className="min-w-0">
              <div className="text-[9px] sm:text-[10px] font-mono-tech uppercase text-[#F5B700]">
                Campeão do Torneio
              </div>
              <div className="font-display text-base sm:text-xl font-extrabold text-[#F4F7FB] leading-none truncate">
                {tournament.champion.name} · {FIGHTER_PROFILES[tournament.champion.fighterId].name}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onRestartSamePlayers}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#F5B700] hover:bg-[#FACC15] text-[#07090D] font-display text-xs sm:text-sm font-extrabold uppercase cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              NOVO TORNEIO
            </button>
            <button
              type="button"
              onClick={onExitMenu}
              className="px-3 py-1.5 bg-[#07090D] border border-white/20 hover:border-[#00A8FF] text-[#F4F7FB] font-display text-xs sm:text-sm font-bold uppercase cursor-pointer whitespace-nowrap"
            >
              MENU PRINCIPAL
            </button>
          </div>
        </div>
      ) : nextMatch && nextMatch.p1 && nextMatch.p2 ? (
        <div className="max-w-6xl w-full mx-auto bg-[#10151F] border border-[#00A8FF]/70 px-3 py-1.5 flex items-center justify-between gap-2 shrink-0">
          <div className="min-w-0">
            <div className="text-[9px] sm:text-[10px] font-mono-tech text-[#00E5FF] uppercase leading-none">
              Próximo Combate · {nextRoundLabel}
            </div>
            <div className="font-display text-sm sm:text-lg font-extrabold text-[#F4F7FB] leading-tight truncate mt-0.5">
              <span style={{ color: FIGHTER_PROFILES[nextMatch.p1.fighterId].primaryColor }}>
                {nextMatch.p1.name} ({FIGHTER_PROFILES[nextMatch.p1.fighterId].name})
              </span>
              <span className="text-[#94A3B8] mx-1.5">VS</span>
              <span style={{ color: FIGHTER_PROFILES[nextMatch.p2.fighterId].primaryColor }}>
                {nextMatch.p2.name} ({FIGHTER_PROFILES[nextMatch.p2.fighterId].name})
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onStartNextMatch}
            className="inline-flex items-center gap-1.5 px-3.5 sm:px-5 py-1.5 bg-[#00A8FF] hover:bg-[#33B9FF] text-[#07090D] font-display text-sm sm:text-base font-extrabold uppercase tracking-wide cursor-pointer whitespace-nowrap shrink-0"
          >
            <Play className="w-3.5 h-3.5 fill-current shrink-0" />
            ENTRAR NA PARTIDA →
          </button>
        </div>
      ) : null}
    </main>
  );
}
