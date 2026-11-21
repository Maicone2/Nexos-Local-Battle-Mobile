import { ArrowLeft, Download } from 'lucide-react';

interface AboutScreenProps {
  onBack: () => void;
}

const ANDROID_MODULES = [
  'MainActivity.kt',
  'GameEngine.kt',
  'GameRenderer.kt',
  'GameLoop.kt',
  'FighterController.kt',
  'CombatSystem.kt',
  'CollisionSystem.kt',
  'AnimationSystem.kt',
  'AudioManager.kt',
  'LanNetworkManager.kt',
  'LanHost.kt',
  'LanClient.kt',
  'GameStateManager.kt',
  'GameUI.kt',
  'SettingsManager.kt',
];

export function AboutScreen({ onBack }: AboutScreenProps) {
  return (
    <main className="w-full h-full bg-[#07090D] flex flex-col justify-between px-6 py-5 md:px-12 md:py-8 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-wide text-[#F4F7FB]">
            SOBRE · NEON CLASH: ARENA LAN
          </h1>
          <p className="text-sm text-[#94A3B8]">
            Comandos, lutadores originais e código-fonte nativo Android (Kotlin)
          </p>
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

      <div className="my-auto py-4 max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <section className="lg:col-span-6 bg-[#10151F] border border-white/10 p-5 space-y-4">
          <h2 className="font-display text-2xl font-bold text-[#F4F7FB]">
            SISTEMA DE COMBATE E COMANDOS
          </h2>
          <p className="text-sm text-[#94A3B8] leading-relaxed">
            Combate 2D/2.5D em 60 ticks por segundo com cancelamento de combos: encadeia <strong className="text-[#F4F7FB]">Ataque Ligeiro → Ataque Pesado → Ataque Especial</strong> durante o impacto.
          </p>
          <div className="bg-[#07090D] border-t border-b border-white/10 p-4 text-xs font-mono-tech space-y-2">
            <div className="flex justify-between">
              <span className="text-[#94A3B8]">Movimento (P1):</span>
              <span className="text-[#F4F7FB]">A / D · W (Saltar) · S (Agachar)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#94A3B8]">Golpes (P1):</span>
              <span className="text-[#00E5FF]">J Ligeiro · K Pesado · L Especial · U Defesa</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#94A3B8]">Jogador 2 Local:</span>
              <span className="text-[#A855F7]">Setas · I / O / P / ; (ou Numpad 1/2/3/0)</span>
            </div>
          </div>
          <div className="text-xs text-[#94A3B8]">
            Multiplayer LAN funciona através da mesma rede Wi-Fi ou Hotspot abrindo o endereço IPv4 local apresentado no menu LAN, sem servidores externos.
          </div>
        </section>

        <section className="lg:col-span-6 bg-[#10151F] border border-white/10 p-5 flex flex-col justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#F4F7FB]">
              PROJETO ANDROID NATIVO (KOTLIN + COMPOSE)
            </h2>
            <p className="text-sm text-[#94A3B8] mt-1 leading-relaxed">
              Estrutura completa modular pronta para Android Studio (Android 8.0+, Jetpack Compose, SurfaceView + Canvas e TCP/UDP LAN).
            </p>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono-tech text-[#94A3B8]">
              {ANDROID_MODULES.map((mod) => (
                <div key={mod} className="px-2.5 py-1.5 bg-[#07090D] border border-white/10 truncate">
                  {mod}
                </div>
              ))}
            </div>
          </div>

          <a
            href="/api/android-project.zip"
            download="neon-clash-arena-lan-android.zip"
            className="mt-5 inline-flex items-center justify-center gap-2 w-full py-3.5 bg-[#00A8FF] hover:bg-[#33B9FF] text-[#07090D] font-display text-xl font-extrabold uppercase"
          >
            <Download className="w-5 h-5" />
            DESCARREGAR PROJETO ANDROID (.ZIP)
          </a>
        </section>
      </div>

      <div className="text-xs text-[#64748B]">
        NEON CLASH: ARENA LAN · Identidade visual e personagens 100% originais
      </div>
    </main>
  );
}
