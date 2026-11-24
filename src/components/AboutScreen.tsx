import { ArrowLeft, Download, Terminal } from 'lucide-react';

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
    <main className="w-full h-full bg-[#07090D] flex flex-col justify-between px-4 py-2 sm:px-6 sm:py-3 md:px-10 md:py-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-wide text-[#F4F7FB] leading-none">
            SOBRE · NEON CLASH: ARENA LAN
          </h1>
          <p className="text-[11px] sm:text-xs text-[#94A3B8]">
            Comandos, lutadores originais e compilação automatizada para APK Android
          </p>
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

      <div className="my-auto py-1 max-w-6xl w-full mx-auto grid grid-cols-1 sm:grid-cols-12 gap-2.5 md:gap-4 items-stretch">
        <section className="sm:col-span-6 bg-[#10151F] border border-white/10 p-2.5 md:p-4 flex flex-col justify-between gap-2">
          <div>
            <h2 className="font-display text-lg md:text-2xl font-bold text-[#F4F7FB] leading-none">
              SISTEMA DE COMBATE E COMANDOS
            </h2>
            <p className="text-[11px] md:text-xs text-[#94A3B8] mt-1 leading-snug">
              Combate 2D/2.5D a 60 FPS com cancelamento real: <strong className="text-[#F4F7FB]">Ligeiro → Médio → Pesado → Especial/Ultimate</strong>, Rasteira (-9%), Uppercut (-15%) e Voadora (-10%).
            </p>
          </div>
          <div className="bg-[#07090D] border-t border-b border-white/10 p-2 text-[11px] font-mono-tech space-y-1">
            <div className="flex justify-between gap-2">
              <span className="text-[#94A3B8]">Movimento (P1):</span>
              <span className="text-[#F4F7FB] text-right">A/D · W Saltar · S Agachar · Q/E/Z/C</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-[#94A3B8]">Golpes (P1):</span>
              <span className="text-[#00E5FF] text-right">J Lig · H Méd · K Pes · L Esp · U Def</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-[#94A3B8]">Jogador 2 Local:</span>
              <span className="text-[#A855F7] text-right">Setas · I Lig · O Méd · P Pes · [ Esp</span>
            </div>
          </div>
          <div className="text-[11px] text-[#94A3B8]">
            Multiplayer LAN via Wi-Fi ou Hotspot abrindo o IPv4 local no menu LAN, sem servidores externos.
          </div>
        </section>

        <section className="sm:col-span-6 bg-[#10151F] border border-white/10 p-2.5 md:p-4 flex flex-col justify-between gap-2">
          <div>
            <h2 className="font-display text-lg md:text-2xl font-bold text-[#F4F7FB] leading-none">
              APK ANDROID NATIVO & GITHUB ACTIONS
            </h2>
            <p className="text-[11px] text-[#94A3B8] mt-1 leading-snug">
              Projeto Kotlin + Jetpack Compose com workflow GitHub Actions e scripts para gerar <code className="text-[#00E5FF]">app-debug.apk</code> e <code className="text-[#00E5FF]">app-release.apk</code>.
            </p>
            <div className="mt-1.5 grid grid-cols-3 gap-1 text-[10px] font-mono-tech text-[#94A3B8]">
              {ANDROID_MODULES.slice(0, 9).map((mod) => (
                <div key={mod} className="px-1.5 py-0.5 bg-[#07090D] border border-white/10 truncate">
                  {mod}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#07090D] border border-[#10B981]/35 p-2 text-[10px] font-mono-tech space-y-0.5">
            <div className="flex items-center gap-1.5 text-[#10B981] font-bold">
              <Terminal className="w-3 h-3" />
              Scripts & GitHub Actions Incluídos:
            </div>
            <div className="text-[#CBD5E1] truncate">
              .github/workflows/build-apk.yml · build-apk.sh · build-apk.bat
            </div>
          </div>

          <a
            href="/api/android-project.zip"
            download="neon-clash-arena-lan-android.zip"
            className="inline-flex items-center justify-center gap-2 w-full py-2 md:py-2.5 bg-[#00A8FF] hover:bg-[#33B9FF] text-[#07090D] font-display text-base md:text-xl font-extrabold uppercase"
          >
            <Download className="w-4 h-4" />
            DESCARREGAR PROJETO + CI APK (.ZIP)
          </a>
        </section>
      </div>

      <div className="text-[11px] text-[#64748B]">
        NEON CLASH: ARENA LAN · Identidade visual e personagens 100% originais
      </div>
    </main>
  );
}
