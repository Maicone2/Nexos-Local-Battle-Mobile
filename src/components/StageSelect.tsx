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
    <main className="w-full h-full bg-[#07090D] flex flex-col justify-between px-6 py-6 md:px-14 md:py-10 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-wide text-[#F4F7FB]">
            SELEÇÃO DE CENÁRIO
          </h1>
          <p className="text-sm text-[#94A3B8]">Escolhe a arena do combate</p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#10151F] border border-white/15 hover:border-[#00A8FF] text-sm font-semibold text-[#F4F7FB] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
      </div>

      <div className="my-auto grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl w-full mx-auto py-4">
        {stageList.map((st) => {
          const active = selectedStage === st.id;
          return (
            <button
              key={st.id}
              type="button"
              onClick={() => onSelectStage(st.id)}
              className={`group text-left bg-[#10151F] border transition-colors overflow-hidden cursor-pointer ${
                active ? 'border-[#00A8FF]' : 'border-white/10 hover:border-white/30'
              }`}
            >
              <div className="relative aspect-video w-full bg-[#0B101A] overflow-hidden">
                <img
                  src={st.imagePath}
                  alt={st.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl font-bold text-[#F4F7FB]">{st.name}</h2>
                  <p className="text-xs text-[#94A3B8] mt-0.5">{st.subtitle}</p>
                </div>
                <span
                  className={`text-xs font-mono-tech font-bold ${
                    active ? 'text-[#00A8FF]' : 'text-[#64748B]'
                  }`}
                >
                  {active ? 'ATIVO' : 'SELECIONAR'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-end max-w-5xl w-full mx-auto">
        <button
          type="button"
          data-start="true"
          onClick={onStartCombat}
          className="px-10 py-4 bg-[#00A8FF] hover:bg-[#33B9FF] text-[#07090D] font-display text-2xl font-extrabold tracking-wider uppercase cursor-pointer"
        >
          INICIAR COMBATE →
        </button>
      </div>
    </main>
  );
}
