import { ArrowLeft, Cpu, Users, Wifi } from 'lucide-react';
import { GameMode } from '../game/types';

interface ModeSelectProps {
  onSelectMode: (mode: GameMode) => void;
  onBack: () => void;
}

export function ModeSelect({ onSelectMode, onBack }: ModeSelectProps) {
  return (
    <main className="w-full h-full bg-[#07090D] flex flex-col justify-between px-6 py-6 md:px-14 md:py-10 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-wide text-[#F4F7FB]">
            SELEÇÃO DE MODO DE JOGO
          </h1>
          <p className="text-sm text-[#94A3B8]">Escolhe como queres entrar na arena</p>
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

      <div className="my-auto grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl w-full mx-auto py-6">
        <button
          type="button"
          onClick={() => onSelectMode('training')}
          className="flex flex-col justify-between p-6 bg-[#10151F] hover:bg-[#151D2B] border border-white/10 hover:border-[#F5B700] text-left transition-colors cursor-pointer min-h-[220px]"
        >
          <div>
            <Cpu className="w-8 h-8 text-[#F5B700]" />
            <h2 className="font-display text-3xl font-bold text-[#F4F7FB] mt-4">TREINO (VS CPU)</h2>
            <p className="text-sm text-[#94A3B8] mt-2 leading-relaxed">
              Treina sequências de combos e especiais contra o computador com energia e vida configuráveis.
            </p>
          </div>
          <span className="font-display text-lg font-bold text-[#F5B700] mt-6">SELECIONAR →</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectMode('local2p')}
          className="flex flex-col justify-between p-6 bg-[#10151F] hover:bg-[#151D2B] border border-white/10 hover:border-[#00A8FF] text-left transition-colors cursor-pointer min-h-[220px]"
        >
          <div>
            <Users className="w-8 h-8 text-[#00A8FF]" />
            <h2 className="font-display text-3xl font-bold text-[#F4F7FB] mt-4">VERSUS 1V1 LOCAL</h2>
            <p className="text-sm text-[#94A3B8] mt-2 leading-relaxed">
              Combate completo de 2 rondas entre dois jogadores no mesmo dispositivo ou teclado.
            </p>
          </div>
          <span className="font-display text-lg font-bold text-[#00A8FF] mt-6">SELECIONAR →</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectMode('lan')}
          className="flex flex-col justify-between p-6 bg-[#10151F] hover:bg-[#151D2B] border border-white/10 hover:border-[#A855F7] text-left transition-colors cursor-pointer min-h-[220px]"
        >
          <div>
            <Wifi className="w-8 h-8 text-[#A855F7]" />
            <h2 className="font-display text-3xl font-bold text-[#F4F7FB] mt-4">MULTIPLAYER LAN</h2>
            <p className="text-sm text-[#94A3B8] mt-2 leading-relaxed">
              Liga dois dispositivos na mesma rede Wi-Fi ou Hotspot com sincronização em tempo real a 60 ticks.
            </p>
          </div>
          <span className="font-display text-lg font-bold text-[#A855F7] mt-6">ABRIR REDE LAN →</span>
        </button>
      </div>

      <div className="text-xs text-[#64748B]">
        Melhor de 3 Rondas · Temporizador de 99 Segundos
      </div>
    </main>
  );
}
