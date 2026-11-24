import { ArrowLeft } from 'lucide-react';
import { STAGES } from '../game/constants';
import { StageId } from '../game/types';

interface StageSelectProps {
  selectedStage: StageId;
  onSelectStage: (stage: StageId) => void;
  onStartCombat: () => void;
  onBack: () => void;
}

export function StageSelect({
  selectedStage,
  onSelectStage,
  onStartCombat,
  onBack,
}: StageSelectProps) {
  const stageList = Object.values(STAGES);

  return (
    <main className="w-full h-full bg-[#07090D] flex flex-col justify-between px-4 py-2 sm:px-6 sm:py-3 md:px-10 md:py-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-wide text-[#F4F7FB] leading-none">
            SELEÇÃO DE CENÁRIO
          </h1>
          <p className="text-[11px] sm:text-xs text-[#94A3B8]">Escolhe entre as 4 arenas de combate</p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#10151F] border border-white/15 hover:border-[#00A8FF] text-xs sm:text-sm font-semibold text-[#F4F7FB] cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar
        </button>
      </div>

      <div className="my-auto grid grid-cols-2 sm:grid-cols-4 gap-2.5 md:gap-3.5 max-w-6xl w-full mx-auto py-1">
        {stageList.map((st) => {
          const active = selectedStage === st.id;
          return (
            <button
              key={st.id}
              type="button"
              onClick={() => onSelectStage(st.id)}
              className={`group text-left bg-[#10151F] border transition-colors overflow-hidden cursor-pointer flex flex-col ${
                active ? 'border-[#00A8FF]' : 'border-white/10 hover:border-white/30'
              }`}
            >
              <div className="relative h-24 sm:h-28 md:h-40 w-full bg-[#0B101A] overflow-hidden">
                <img
                  src={st.imagePath}
                  alt={st.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="px-2.5 py-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-display text-base md:text-lg font-bold text-[#F4F7FB] leading-tight truncate">
                    {st.name}
                  </h2>
                  <p className="text-[10px] text-[#94A3B8] truncate">{st.subtitle}</p>
                </div>
                <span
                  className={`text-[10px] font-mono-tech font-bold shrink-0 ${
                    active ? 'text-[#00A8FF]' : 'text-[#64748B]'
                  }`}
                >
                  {active ? 'ATIVO' : 'OK'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-end max-w-6xl w-full mx-auto pt-1">
        <button
          type="button"
          data-start="true"
          onClick={onStartCombat}
          className="px-6 py-2 md:px-8 md:py-3 bg-[#00A8FF] hover:bg-[#33B9FF] text-[#07090D] font-display text-lg md:text-2xl font-extrabold tracking-wider uppercase cursor-pointer"
        >
          ENTRAR NA PARTIDA →
        </button>
      </div>
    </main>
  );
}
