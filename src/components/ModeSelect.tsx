import { ArrowLeft, Award, Cpu, Swords, Users, Wifi } from 'lucide-react';
import { GameMode } from '../game/types';

interface ModeSelectProps {
  onSelectMode: (mode: GameMode) => void;
  onBack: () => void;
}

export function ModeSelect({ onSelectMode, onBack }: ModeSelectProps) {
  return (
    <main className="w-full h-full bg-[#07090D] flex flex-col justify-between px-4 py-2 sm:px-6 sm:py-3 md:px-10 md:py-5 overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-wide text-[#F4F7FB] leading-none">
            SELEÇÃO DE MODO DE JOGO
          </h1>
          <p className="text-[11px] sm:text-xs text-[#94A3B8]">Escolhe o modo para entrar na partida</p>
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

      <div className="my-auto grid grid-cols-6 gap-2.5 md:gap-4 max-w-5xl w-full mx-auto py-1">
        <button
          type="button"
          onClick={() => onSelectMode('vs_cpu')}
          className="col-span-3 sm:col-span-2 flex flex-col justify-between p-3 md:p-4 bg-[#10151F] hover:bg-[#151D2B] border border-[#00A8FF]/55 hover:border-[#00E5FF] text-left transition-colors cursor-pointer"
        >
          <div>
            <Swords className="w-5 h-5 md:w-6 md:h-6 text-[#00E5FF]" />
            <h2 className="font-display text-xl md:text-2xl font-bold text-[#F4F7FB] mt-1.5 leading-none">
              1V1 VS CPU
            </h2>
            <p className="text-[11px] md:text-xs text-[#94A3B8] mt-1 leading-snug">
              Partida completa de 2 rondas e 99s contra a IA.
            </p>
          </div>
          <span className="font-display text-sm md:text-base font-extrabold text-[#00E5FF] mt-2">
            ENTRAR NA PARTIDA →
          </span>
        </button>

        <button
          type="button"
          onClick={() => onSelectMode('local2p')}
          className="col-span-3 sm:col-span-2 flex flex-col justify-between p-3 md:p-4 bg-[#10151F] hover:bg-[#151D2B] border border-white/10 hover:border-[#00A8FF] text-left transition-colors cursor-pointer"
        >
          <div>
            <Users className="w-5 h-5 md:w-6 md:h-6 text-[#00A8FF]" />
            <h2 className="font-display text-xl md:text-2xl font-bold text-[#F4F7FB] mt-1.5 leading-none">
              VERSUS 1V1 LOCAL
            </h2>
            <p className="text-[11px] md:text-xs text-[#94A3B8] mt-1 leading-snug">
              Combate local de 2 rondas com placar da sessão.
            </p>
          </div>
          <span className="font-display text-sm md:text-base font-extrabold text-[#00A8FF] mt-2">
            ENTRAR NA PARTIDA →
          </span>
        </button>

        <button
          type="button"
          onClick={() => onSelectMode('lan')}
          className="col-span-3 sm:col-span-2 flex flex-col justify-between p-3 md:p-4 bg-[#10151F] hover:bg-[#151D2B] border border-white/10 hover:border-[#A855F7] text-left transition-colors cursor-pointer"
        >
          <div>
            <Wifi className="w-5 h-5 md:w-6 md:h-6 text-[#A855F7]" />
            <h2 className="font-display text-xl md:text-2xl font-bold text-[#F4F7FB] mt-1.5 leading-none">
              MULTIPLAYER LAN
            </h2>
            <p className="text-[11px] md:text-xs text-[#94A3B8] mt-1 leading-snug">
              Liga dois dispositivos na rede Wi-Fi / Hotspot a 60 Hz.
            </p>
          </div>
          <span className="font-display text-sm md:text-base font-extrabold text-[#A855F7] mt-2">
            ENTRAR NA SALA LAN →
          </span>
        </button>

        <button
          type="button"
          onClick={() => onSelectMode('combo_trials')}
          className="col-span-3 flex flex-col justify-between p-3 md:p-4 bg-[#10151F] hover:bg-[#151D2B] border border-[#10B981]/50 hover:border-[#10B981] text-left transition-colors cursor-pointer"
        >
          <div>
            <Award className="w-5 h-5 md:w-6 md:h-6 text-[#10B981]" />
            <h2 className="font-display text-xl md:text-2xl font-bold text-[#F4F7FB] mt-1.5 leading-none">
              COMBO TRIALS
            </h2>
            <p className="text-[11px] md:text-xs text-[#94A3B8] mt-1 leading-snug">
              20 desafios progressivos para dominar Kael, Vexa, Zane e Nyx.
            </p>
          </div>
          <span className="font-display text-sm md:text-base font-extrabold text-[#10B981] mt-2">
            ENTRAR NOS TRIALS →
          </span>
        </button>

        <button
          type="button"
          onClick={() => onSelectMode('training')}
          className="col-span-6 sm:col-span-3 flex flex-col justify-between p-3 md:p-4 bg-[#10151F] hover:bg-[#151D2B] border border-white/10 hover:border-[#F5B700] text-left transition-colors cursor-pointer"
        >
          <div>
            <Cpu className="w-5 h-5 md:w-6 md:h-6 text-[#F5B700]" />
            <h2 className="font-display text-xl md:text-2xl font-bold text-[#F4F7FB] mt-1.5 leading-none">
              TREINO LIVRE
            </h2>
            <p className="text-[11px] md:text-xs text-[#94A3B8] mt-1 leading-snug">
              Treina combos, hitboxes e frame data com energia e regeneração configuráveis.
            </p>
          </div>
          <span className="font-display text-sm md:text-base font-extrabold text-[#F5B700] mt-2">
            ENTRAR NO TREINO →
          </span>
        </button>
      </div>

      <div className="text-[11px] text-[#64748B]">
        Melhor de 3 Rondas · 20 Combo Trials Progressivos · Otimizado para Ecrã Horizontal Android
      </div>
    </main>
  );
}
