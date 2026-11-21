import { Swords, Wifi, Dumbbell, Settings, Info, ArrowLeft } from 'lucide-react';

interface MainMenuProps {
  onPlay: () => void;
  onLan: () => void;
  onTraining: () => void;
  onSettings: () => void;
  onAbout: () => void;
  onBackTitle: () => void;
}

export function MainMenu({
  onPlay,
  onLan,
  onTraining,
  onSettings,
  onAbout,
  onBackTitle,
}: MainMenuProps) {
  return (
    <main className="relative w-full h-full bg-[#07090D] flex flex-col justify-between px-6 py-6 md:px-14 md:py-10 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold italic tracking-wider text-[#F4F7FB]">
            NEON CLASH <span className="text-[#00A8FF]">ARENA LAN</span>
          </h1>
          <p className="text-sm text-[#94A3B8]">Seleciona o modo de combate</p>
        </div>
        <button
          type="button"
          onClick={onBackTitle}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#10151F] border border-white/15 hover:border-[#00A8FF] text-sm font-semibold text-[#F4F7FB] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Início
        </button>
      </div>

      <div className="my-auto py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch max-w-6xl w-full mx-auto">
        {/* Primary Menu Stack */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <button
            type="button"
            onClick={onPlay}
            className="group flex items-center justify-between px-6 py-5 bg-[#00A8FF] hover:bg-[#29B6FF] text-[#07090D] transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-4">
              <Swords className="w-7 h-7 shrink-0" />
              <div>
                <div className="font-display text-3xl font-extrabold tracking-wide leading-none">
                  JOGAR
                </div>
                <div className="text-xs font-semibold opacity-80 mt-1">
                  Combate 1v1 Rápido ou Escolha de Modo
                </div>
              </div>
            </div>
            <span className="font-display text-xl font-bold tracking-wider">ENTRAR →</span>
          </button>

          <button
            type="button"
            onClick={onLan}
            className="flex items-center justify-between px-6 py-4 bg-[#10151F] hover:bg-[#161E2E] border border-white/10 hover:border-[#00A8FF] text-[#F4F7FB] transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-4">
              <Wifi className="w-6 h-6 text-[#00A8FF] shrink-0" />
              <div>
                <div className="font-display text-2xl font-bold tracking-wide leading-none">
                  MULTIPLAYER LAN
                </div>
                <div className="text-xs text-[#94A3B8] mt-1">
                  Criar ou entrar numa sala local por Wi-Fi / Hotspot sem Internet
                </div>
              </div>
            </div>
            <span className="text-xs font-mono-tech text-[#00A8FF]">REDE LOCAL</span>
          </button>

          <button
            type="button"
            onClick={onTraining}
            className="flex items-center justify-between px-6 py-4 bg-[#10151F] hover:bg-[#161E2E] border border-white/10 hover:border-[#00A8FF] text-[#F4F7FB] transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-4">
              <Dumbbell className="w-6 h-6 text-[#F5B700] shrink-0" />
              <div>
                <div className="font-display text-2xl font-bold tracking-wide leading-none">
                  TREINO
                </div>
                <div className="text-xs text-[#94A3B8] mt-1">
                  Pratica combos, bloqueios e especiais contra CPU configurável
                </div>
              </div>
            </div>
            <span className="text-xs font-mono-tech text-[#F5B700]">VS CPU</span>
          </button>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={onSettings}
              className="flex items-center gap-3 px-5 py-3.5 bg-[#10151F] hover:bg-[#161E2E] border border-white/10 hover:border-[#00A8FF] text-[#F4F7FB] transition-colors cursor-pointer"
            >
              <Settings className="w-5 h-5 text-[#94A3B8]" />
              <span className="font-display text-xl font-bold tracking-wide">DEFINIÇÕES</span>
            </button>

            <button
              type="button"
              onClick={onAbout}
              className="flex items-center gap-3 px-5 py-3.5 bg-[#10151F] hover:bg-[#161E2E] border border-white/10 hover:border-[#00A8FF] text-[#F4F7FB] transition-colors cursor-pointer"
            >
              <Info className="w-5 h-5 text-[#94A3B8]" />
              <span className="font-display text-xl font-bold tracking-wide">SOBRE & ANDROID</span>
            </button>
          </div>
        </div>

        {/* Roster & Spec Highlight Panel */}
        <aside className="lg:col-span-5 bg-[#10151F] border border-white/10 p-6 flex flex-col justify-between">
          <div>
            <p className="text-xs font-mono-tech text-[#00A8FF] tracking-wider uppercase">
              Lutadores Originais
            </p>
            <h2 className="font-display text-2xl font-bold text-[#F4F7FB] mt-1">
              KAEL VS VEXA
            </h2>
            <p className="text-sm text-[#94A3B8] mt-2 leading-relaxed">
              Combate técnico 1 contra 1 em 60 FPS com cancelamento de combos (Ligeiro → Pesado → Especial), defesa tática, atordoamento e duas rondas para vencer.
            </p>
          </div>

          <div className="mt-6 space-y-3 border-t border-white/10 pt-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#00E5FF]">KAEL · Energia</span>
              <span className="text-[#94A3B8]">Especial: Pulso Solar</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#A855F7]">VEXA · Agilidade</span>
              <span className="text-[#94A3B8]">Especial: Vórtice Azul</span>
            </div>
          </div>
        </aside>
      </div>

      <div className="text-xs text-[#64748B]">
        NEON CLASH: ARENA LAN · Motor de Combate 2.5D a 60 FPS
      </div>
    </main>
  );
}
