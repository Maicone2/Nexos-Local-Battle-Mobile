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
  onRematch,
  onChangeCharacters,
  onExitMenu,
}: ResultModalProps) {
  const won = winnerSlot === localSlot;
  const winnerName = winnerSlot === 1 ? p1Name : p2Name;

  return (
    <div className="absolute inset-0 z-40 bg-black/75 flex items-center justify-center p-4">
      <section className="w-full max-w-md bg-[#10151F] border-2 border-[#00A8FF] p-6 space-y-5">
        <div className="text-center">
          <p className="text-xs font-mono-tech uppercase tracking-widest text-[#00A8FF]">
            Resultado da Partida
          </p>
          <h2
            className={`font-display text-5xl font-extrabold mt-1 ${
              won ? 'text-[#F5B700]' : 'text-[#EF4444]'
            }`}
          >
            {won ? 'VITÓRIA!' : 'DERROTA'}
          </h2>
          <p className="text-sm text-[#94A3B8] mt-1">
            Vencedor: <span className="text-[#F4F7FB] font-bold">{winnerName}</span> ({p1Rounds} - {p2Rounds})
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 bg-[#07090D] border border-white/10 p-3 text-center">
          <div>
            <div className="text-[11px] text-[#94A3B8] uppercase">Combo Máx</div>
            <div className="font-display text-2xl font-bold tabular-nums text-[#F4F7FB]">
              {maxCombo}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#94A3B8] uppercase">Dano</div>
            <div className="font-display text-2xl font-bold tabular-nums text-[#00E5FF]">
              {Math.round(damageDealt)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#94A3B8] uppercase">Duração</div>
            <div className="font-display text-2xl font-bold tabular-nums text-[#F4F7FB]">
              {elapsedSeconds}s
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            data-start="true"
            onClick={onRematch}
            className="w-full py-3.5 bg-[#00A8FF] hover:bg-[#33B9FF] text-[#07090D] font-display text-2xl font-extrabold uppercase cursor-pointer"
          >
            JOGAR NOVAMENTE
          </button>
          {!isLan && (
            <button
              type="button"
              onClick={onChangeCharacters}
              className="w-full py-3 bg-[#192233] hover:bg-[#222E45] text-[#F4F7FB] font-display text-xl font-bold uppercase cursor-pointer"
            >
              TROCAR PERSONAGEM
            </button>
          )}
          <button
            type="button"
            onClick={onExitMenu}
            className="w-full py-3 bg-[#07090D] border border-white/15 hover:border-[#00A8FF] text-[#F4F7FB] font-display text-xl font-bold uppercase cursor-pointer"
          >
            MENU PRINCIPAL
          </button>
        </div>
      </section>
    </div>
  );
}
