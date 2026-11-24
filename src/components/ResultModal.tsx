import { Film, Check } from 'lucide-react';

interface ResultModalProps {
  winnerSlot: 1 | 2;
  localSlot: 1 | 2;
  p1Name: string;
  p2Name: string;
  p1Rounds: number;
  p2Rounds: number;
  maxCombo: number;
  damageDealt: number;
  elapsedSeconds: number;
  isLan: boolean;
  tournamentRoundLabel?: string;
  onAdvanceTournament?: () => void;
  canSaveReplay?: boolean;
  replaySaved?: boolean;
  onSaveReplay?: () => void;
  onRematch: () => void;
  onChangeCharacters: () => void;
  onExitMenu: () => void;
}

export function ResultModal({
  winnerSlot,
  localSlot,
  p1Name,
  p2Name,
  p1Rounds,
  p2Rounds,
  maxCombo,
  damageDealt,
  elapsedSeconds,
  isLan,
  tournamentRoundLabel,
  onAdvanceTournament,
  canSaveReplay = false,
  replaySaved = false,
  onSaveReplay,
  onRematch,
  onChangeCharacters,
  onExitMenu,
}: ResultModalProps) {
  const isTournament = Boolean(onAdvanceTournament);
  const won = winnerSlot === localSlot;
  const winnerName = winnerSlot === 1 ? p1Name : p2Name;

  return (
    <div className="absolute inset-0 z-40 bg-black/75 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      <section className="w-full max-w-md max-h-[95dvh] overflow-hidden bg-[#10151F] border-2 border-[#00A8FF] p-3.5 sm:p-5 space-y-2.5 sm:space-y-4">
        <div className="text-center">
          <p className="text-[10px] sm:text-xs font-mono-tech uppercase tracking-widest text-[#00A8FF]">
            {tournamentRoundLabel ? `Torneio · ${tournamentRoundLabel}` : 'Resultado da Partida'}
          </p>
          <h2
            className={`font-display text-3xl sm:text-5xl font-extrabold leading-none mt-0.5 ${
              isTournament || won ? 'text-[#F5B700]' : 'text-[#EF4444]'
            }`}
          >
            {isTournament ? `${winnerName} AVANÇA!` : won ? 'VITÓRIA!' : 'DERROTA'}
          </h2>
          <p className="text-xs sm:text-sm text-[#94A3B8] mt-1">
            Vencedor: <span className="text-[#F4F7FB] font-bold">{winnerName}</span> ({p1Rounds} - {p2Rounds})
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3 bg-[#07090D] border border-white/10 p-2 sm:p-3 text-center">
          <div>
            <div className="text-[10px] sm:text-[11px] text-[#94A3B8] uppercase">Combo Máx</div>
            <div className="font-display text-xl sm:text-2xl font-bold tabular-nums text-[#F4F7FB]">
              {maxCombo}
            </div>
          </div>
          <div>
            <div className="text-[10px] sm:text-[11px] text-[#94A3B8] uppercase">Dano</div>
            <div className="font-display text-xl sm:text-2xl font-bold tabular-nums text-[#00E5FF]">
              {Math.round(damageDealt)}
            </div>
          </div>
          <div>
            <div className="text-[10px] sm:text-[11px] text-[#94A3B8] uppercase">Duração</div>
            <div className="font-display text-xl sm:text-2xl font-bold tabular-nums text-[#F4F7FB]">
              {elapsedSeconds}s
            </div>
          </div>
        </div>

        <div className="space-y-1.5 sm:space-y-2">
          {canSaveReplay && onSaveReplay && (
            <button
              type="button"
              onClick={onSaveReplay}
              disabled={replaySaved}
              className={`w-full py-2 sm:py-2.5 inline-flex items-center justify-center gap-2 border font-display text-base sm:text-xl font-bold uppercase cursor-pointer ${
                replaySaved
                  ? 'bg-[#10B981]/20 border-[#10B981] text-[#4ADE80] cursor-default'
                  : 'bg-[#192233] border-[#00E5FF]/50 hover:border-[#00E5FF] text-[#00E5FF]'
              }`}
            >
              {replaySaved ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : <Film className="w-4 h-4 sm:w-5 sm:h-5" />}
              {replaySaved ? 'REPLAY GUARDADO' : 'GUARDAR REPLAY'}
            </button>
          )}
          {isTournament && onAdvanceTournament ? (
            <button
              type="button"
              data-start="true"
              onClick={onAdvanceTournament}
              className="w-full py-2 sm:py-3 bg-[#F5B700] hover:bg-[#FACC15] text-[#07090D] font-display text-lg sm:text-2xl font-extrabold uppercase cursor-pointer"
            >
              AVANÇAR NA CHAVE →
            </button>
          ) : (
            <button
              type="button"
              data-start="true"
              onClick={onRematch}
              className="w-full py-2 sm:py-3 bg-[#00A8FF] hover:bg-[#33B9FF] text-[#07090D] font-display text-lg sm:text-2xl font-extrabold uppercase cursor-pointer"
            >
              JOGAR NOVAMENTE
            </button>
          )}
          <div className={isLan || isTournament ? '' : 'grid grid-cols-2 gap-2'}>
            {!isLan && !isTournament && (
              <button
                type="button"
                onClick={onChangeCharacters}
                className="w-full py-2 sm:py-2.5 bg-[#192233] hover:bg-[#222E45] text-[#F4F7FB] font-display text-sm sm:text-lg font-bold uppercase cursor-pointer"
              >
                TROCAR LUTADOR
              </button>
            )}
            <button
              type="button"
              onClick={onExitMenu}
              className="w-full py-2 sm:py-2.5 bg-[#07090D] border border-white/15 hover:border-[#00A8FF] text-[#F4F7FB] font-display text-sm sm:text-lg font-bold uppercase cursor-pointer"
            >
              {isTournament ? 'SAIR DO TORNEIO' : 'MENU PRINCIPAL'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
