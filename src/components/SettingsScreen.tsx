import { ArrowLeft } from 'lucide-react';
import { DEFAULT_SETTINGS } from '../game/constants';
import { GraphicsQuality, SettingsConfig } from '../game/types';

interface SettingsScreenProps {
  settings: SettingsConfig;
  onUpdate: (next: SettingsConfig) => void;
  onBack: () => void;
}

export function SettingsScreen({ settings, onUpdate, onBack }: SettingsScreenProps) {
  const updateTouch = (patch: Partial<SettingsConfig['touchLayout']>) => {
    onUpdate({
      ...settings,
      touchLayout: { ...settings.touchLayout, ...patch },
    });
  };

  return (
    <main className="w-full h-full bg-[#07090D] flex flex-col justify-between px-6 py-5 md:px-12 md:py-8 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-wide text-[#F4F7FB]">
            DEFINIÇÕES
          </h1>
          <p className="text-sm text-[#94A3B8]">
            Otimização de desempenho, áudio, modo de treino e posição dos controlos táteis
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

      <div className="my-auto py-4 max-w-5xl w-full mx-auto grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Performance & Audio */}
        <section className="bg-[#10151F] border border-white/10 p-5 space-y-5">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#F4F7FB]">
              GRÁFICOS E BATERIA
            </h2>
            <p className="text-xs text-[#94A3B8] mt-1">
              Reduz efeitos visuais em dispositivos de gama baixa para manter 60 FPS
            </p>
            <div className="grid grid-cols-3 gap-2 mt-3">
              {([
                { id: 'high', label: 'Alto' },
                { id: 'medium', label: 'Médio' },
                { id: 'low', label: 'Baixo' },
              ] as { id: GraphicsQuality; label: string }[]).map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => onUpdate({ ...settings, graphicsQuality: q.id })}
                  className={`py-2.5 text-sm font-bold border cursor-pointer ${
                    settings.graphicsQuality === q.id
                      ? 'bg-[#00A8FF] text-[#07090D] border-[#00A8FF]'
                      : 'bg-[#07090D] text-[#F4F7FB] border-white/15'
                  }`}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-white/10 pt-4 space-y-3">
            <h2 className="font-display text-2xl font-bold text-[#F4F7FB]">ÁUDIO E TREINO</h2>
            <label className="flex items-center justify-between text-sm text-[#F4F7FB]">
              <span>Silenciar Efeitos Sonoros</span>
              <input
                type="checkbox"
                checked={settings.muted}
                onChange={(e) => onUpdate({ ...settings, muted: e.target.checked })}
                className="w-4 h-4 accent-[#00A8FF]"
              />
            </label>

            <label className="flex items-center justify-between text-sm text-[#F4F7FB]">
              <span>Treino: Energia Especial Infinita</span>
              <input
                type="checkbox"
                checked={settings.trainingInfiniteEnergy}
                onChange={(e) =>
                  onUpdate({ ...settings, trainingInfiniteEnergy: e.target.checked })
                }
                className="w-4 h-4 accent-[#00A8FF]"
              />
            </label>

            <label className="flex items-center justify-between text-sm text-[#F4F7FB]">
              <span>Treino: Regenerar Vida Após Combo</span>
              <input
                type="checkbox"
                checked={settings.trainingAutoRegen}
                onChange={(e) => onUpdate({ ...settings, trainingAutoRegen: e.target.checked })}
                className="w-4 h-4 accent-[#00A8FF]"
              />
            </label>

            <div>
              <div className="flex justify-between text-xs text-[#94A3B8] mb-1">
                <span>Treino: Vida Inicial</span>
                <span className="font-mono-tech text-[#F4F7FB]">{settings.trainingHpPercent}%</span>
              </div>
              <input
                type="range"
                min={50}
                max={200}
                step={25}
                value={settings.trainingHpPercent}
                onChange={(e) =>
                  onUpdate({ ...settings, trainingHpPercent: Number(e.target.value) })
                }
                className="w-full accent-[#00A8FF]"
              />
            </div>
          </div>
        </section>

        {/* Touch Control Position & Scale Customizer */}
        <section className="bg-[#10151F] border border-white/10 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold text-[#F4F7FB]">
                CONTROLOS TÁTEIS
              </h2>
              <p className="text-xs text-[#94A3B8]">
                Ajusta o tamanho e posição dos botões no ecrã
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs text-[#F4F7FB]">
              <input
                type="checkbox"
                checked={settings.touchLayout.enabled}
                onChange={(e) => updateTouch({ enabled: e.target.checked })}
                className="w-4 h-4 accent-[#00A8FF]"
              />
              Mostrar Botões
            </label>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs text-[#94A3B8] mb-1">
                <span>Tamanho dos Botões</span>
                <span className="font-mono-tech text-[#F4F7FB]">
                  {Math.round(settings.touchLayout.scale * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.75}
                max={1.35}
                step={0.05}
                value={settings.touchLayout.scale}
                onChange={(e) => updateTouch({ scale: Number(e.target.value) })}
                className="w-full accent-[#00A8FF]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex justify-between text-xs text-[#94A3B8] mb-1">
                  <span>Movimento X</span>
                  <span className="font-mono-tech">{settings.touchLayout.leftOffsetX}px</span>
                </div>
                <input
                  type="range"
                  min={-40}
                  max={80}
                  step={5}
                  value={settings.touchLayout.leftOffsetX}
                  onChange={(e) => updateTouch({ leftOffsetX: Number(e.target.value) })}
                  className="w-full accent-[#00A8FF]"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs text-[#94A3B8] mb-1">
                  <span>Movimento Y</span>
                  <span className="font-mono-tech">{settings.touchLayout.leftOffsetY}px</span>
                </div>
                <input
                  type="range"
                  min={-60}
                  max={20}
                  step={5}
                  value={settings.touchLayout.leftOffsetY}
                  onChange={(e) => updateTouch({ leftOffsetY: Number(e.target.value) })}
                  className="w-full accent-[#00A8FF]"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs text-[#94A3B8] mb-1">
                  <span>Ataques X</span>
                  <span className="font-mono-tech">{settings.touchLayout.rightOffsetX}px</span>
                </div>
                <input
                  type="range"
                  min={-80}
                  max={40}
                  step={5}
                  value={settings.touchLayout.rightOffsetX}
                  onChange={(e) => updateTouch({ rightOffsetX: Number(e.target.value) })}
                  className="w-full accent-[#00A8FF]"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs text-[#94A3B8] mb-1">
                  <span>Ataques Y</span>
                  <span className="font-mono-tech">{settings.touchLayout.rightOffsetY}px</span>
                </div>
                <input
                  type="range"
                  min={-60}
                  max={20}
                  step={5}
                  value={settings.touchLayout.rightOffsetY}
                  onChange={(e) => updateTouch({ rightOffsetY: Number(e.target.value) })}
                  className="w-full accent-[#00A8FF]"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => updateTouch(DEFAULT_SETTINGS.touchLayout)}
              className="mt-2 px-4 py-2 bg-[#07090D] border border-white/15 hover:border-[#00A8FF] text-xs font-semibold text-[#F4F7FB] cursor-pointer"
            >
              Repor Posição Padrão
            </button>
          </div>
        </section>
      </div>

      <div className="text-xs text-[#64748B]">
        As definições são guardadas localmente no dispositivo.
      </div>
    </main>
  );
}
