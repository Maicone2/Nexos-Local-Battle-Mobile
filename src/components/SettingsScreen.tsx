import { ArrowLeft } from 'lucide-react';
import { DEFAULT_SETTINGS } from '../game/constants';
import { GraphicsQuality, SettingsConfig, TrainingDummyMode } from '../game/types';

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

  const updateHud = (patch: Partial<SettingsConfig['hudConfig']>) => {
    onUpdate({
      ...settings,
      hudConfig: { ...settings.hudConfig, ...patch },
    });
  };

  return (
    <main className="w-full h-full bg-[#07090D] flex flex-col justify-between px-4 py-2 sm:px-6 sm:py-3 md:px-10 md:py-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-wide text-[#F4F7FB] leading-none">
            DEFINIÇÕES
          </h1>
          <p className="text-[11px] sm:text-xs text-[#94A3B8]">
            Desempenho, sensibilidade, modo de treino, joystick diagonal e Custom HUD
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

      <div className="my-auto py-1 max-w-6xl w-full mx-auto grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:gap-4">
        {/* Performance, Combat & Training */}
        <section className="bg-[#10151F] border border-white/10 p-2.5 md:p-4 space-y-2">
          <div>
            <h2 className="font-display text-lg md:text-2xl font-bold text-[#F4F7FB] leading-none">
              GRÁFICOS E CÂMARA
            </h2>
            <div className="grid grid-cols-3 gap-1.5 mt-1.5">
              {([
                { id: 'high', label: 'Alto' },
                { id: 'medium', label: 'Médio' },
                { id: 'low', label: 'Baixo' },
              ] as { id: GraphicsQuality; label: string }[]).map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => onUpdate({ ...settings, graphicsQuality: q.id })}
                  className={`py-1 md:py-1.5 text-xs font-bold border cursor-pointer ${
                    settings.graphicsQuality === q.id
                      ? 'bg-[#00A8FF] text-[#07090D] border-[#00A8FF]'
                      : 'bg-[#07090D] text-[#F4F7FB] border-white/15'
                  }`}
                >
                  {q.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <div className="flex justify-between text-[11px] text-[#94A3B8] mb-0.5">
                  <span>Vibração Câmara</span>
                  <span className="font-mono-tech text-[#F4F7FB]">
                    {Math.round(settings.cameraShakeLevel * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1.5}
                  step={0.1}
                  value={settings.cameraShakeLevel}
                  onChange={(e) =>
                    onUpdate({ ...settings, cameraShakeLevel: Number(e.target.value) })
                  }
                  className="w-full accent-[#00A8FF]"
                />
              </div>
              <div>
                <div className="flex justify-between text-[11px] text-[#94A3B8] mb-0.5">
                  <span>Buffer Comandos</span>
                  <span className="font-mono-tech text-[#F4F7FB]">
                    {settings.inputBufferFrames}f
                  </span>
                </div>
                <input
                  type="range"
                  min={4}
                  max={16}
                  step={1}
                  value={settings.inputBufferFrames}
                  onChange={(e) =>
                    onUpdate({ ...settings, inputBufferFrames: Number(e.target.value) })
                  }
                  className="w-full accent-[#00A8FF]"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-2 space-y-1.5">
            <h2 className="font-display text-lg md:text-2xl font-bold text-[#F4F7FB] leading-none">ÁUDIO E TREINO</h2>
            <label className="flex items-center justify-between text-xs text-[#F4F7FB]">
              <span>Silenciar Efeitos Sonoros</span>
              <input
                type="checkbox"
                checked={settings.muted}
                onChange={(e) => onUpdate({ ...settings, muted: e.target.checked })}
                className="w-4 h-4 accent-[#00A8FF]"
              />
            </label>

            <div>
              <div className="text-[11px] text-[#94A3B8] mb-1">Adversário (Treino)</div>
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  { id: 'standing', label: 'Parado' },
                  { id: 'guard', label: 'Em Defesa' },
                  { id: 'cpu', label: 'CPU Ativa' },
                ] as { id: TrainingDummyMode; label: string }[]).map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => onUpdate({ ...settings, trainingDummyMode: d.id })}
                    className={`py-1 text-[11px] font-bold border cursor-pointer ${
                      settings.trainingDummyMode === d.id
                        ? 'bg-[#00A8FF] text-[#07090D] border-[#00A8FF]'
                        : 'bg-[#07090D] text-[#F4F7FB] border-white/15'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center justify-between text-xs text-[#F4F7FB]">
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

            <label className="flex items-center justify-between text-xs text-[#F4F7FB]">
              <span>Treino: Regenerar Vida Após Combo</span>
              <input
                type="checkbox"
                checked={settings.trainingAutoRegen}
                onChange={(e) => onUpdate({ ...settings, trainingAutoRegen: e.target.checked })}
                className="w-4 h-4 accent-[#00A8FF]"
              />
            </label>
          </div>
        </section>

        {/* Touch Control & Custom HUD */}
        <section className="bg-[#10151F] border border-white/10 p-2.5 md:p-4 space-y-1.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg md:text-2xl font-bold text-[#F4F7FB] leading-none">
                JOYSTICK & CUSTOM HUD
              </h2>
              <p className="text-[10px] md:text-[11px] text-[#94A3B8]">
                Diagonais no joystick, opacidade, escala e visualizadores
              </p>
            </div>
            <label className="flex items-center gap-1.5 text-[11px] md:text-xs text-[#F4F7FB]">
              <input
                type="checkbox"
                checked={settings.touchLayout.enabled}
                onChange={(e) => updateTouch({ enabled: e.target.checked })}
                className="w-3.5 h-3.5 accent-[#00A8FF]"
              />
              Botões Táteis
            </label>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => updateTouch({ controlStyle: 'joystick' })}
              className={`py-1 md:py-1.5 text-[11px] md:text-xs font-bold border cursor-pointer ${
                settings.touchLayout.controlStyle === 'joystick'
                  ? 'bg-[#00A8FF] text-[#07090D] border-[#00A8FF]'
                  : 'bg-[#07090D] text-[#F4F7FB] border-white/15'
              }`}
            >
              Joystick 360° (Diagonais)
            </button>
            <button
              type="button"
              onClick={() => updateTouch({ controlStyle: 'dpad8' })}
              className={`py-1 md:py-1.5 text-[11px] md:text-xs font-bold border cursor-pointer ${
                settings.touchLayout.controlStyle === 'dpad8'
                  ? 'bg-[#00A8FF] text-[#07090D] border-[#00A8FF]'
                  : 'bg-[#07090D] text-[#F4F7FB] border-white/15'
              }`}
            >
              Pad 8-Direções
            </button>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <div>
              <div className="flex justify-between text-[11px] text-[#94A3B8]">
                <span>Tamanho Botões</span>
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
            <div>
              <div className="flex justify-between text-[11px] text-[#94A3B8]">
                <span>Escala HUD</span>
                <span className="font-mono-tech text-[#F4F7FB]">
                  {Math.round(settings.hudConfig.hudScale * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.8}
                max={1.15}
                step={0.05}
                value={settings.hudConfig.hudScale}
                onChange={(e) => updateHud({ hudScale: Number(e.target.value) })}
                className="w-full accent-[#00A8FF]"
              />
            </div>
            <div>
              <div className="flex justify-between text-[11px] text-[#94A3B8]">
                <span>Opacidade Tátil</span>
                <span className="font-mono-tech text-[#F4F7FB]">
                  {Math.round(settings.touchLayout.opacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.35}
                max={1.0}
                step={0.05}
                value={settings.touchLayout.opacity}
                onChange={(e) => updateTouch({ opacity: Number(e.target.value) })}
                className="w-full accent-[#00A8FF]"
              />
            </div>
            <div>
              <div className="flex justify-between text-[11px] text-[#94A3B8]">
                <span>Opacidade HUD</span>
                <span className="font-mono-tech text-[#F4F7FB]">
                  {Math.round(settings.hudConfig.hudOpacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.5}
                max={1.0}
                step={0.05}
                value={settings.hudConfig.hudOpacity}
                onChange={(e) => updateHud({ hudOpacity: Number(e.target.value) })}
                className="w-full accent-[#00A8FF]"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-x-2 gap-y-1 text-[11px] pt-0.5">
            <label className="flex items-center gap-1.5 text-[#F4F7FB]">
              <input
                type="checkbox"
                checked={settings.hudConfig.showInputHistory}
                onChange={(e) => updateHud({ showInputHistory: e.target.checked })}
                className="accent-[#00A8FF]"
              />
              Histórico
            </label>
            <label className="flex items-center gap-1.5 text-[#F4F7FB]">
              <input
                type="checkbox"
                checked={settings.hudConfig.showFrameData}
                onChange={(e) => updateHud({ showFrameData: e.target.checked })}
                className="accent-[#00A8FF]"
              />
              Frame Data
            </label>
            <label className="flex items-center gap-1.5 text-[#F4F7FB]">
              <input
                type="checkbox"
                checked={settings.hudConfig.showHitboxes}
                onChange={(e) => updateHud({ showHitboxes: e.target.checked })}
                className="accent-[#00A8FF]"
              />
              Hitboxes
            </label>
            <label className="flex items-center gap-1.5 text-[#F4F7FB]">
              <input
                type="checkbox"
                checked={settings.hudConfig.showComboMeter}
                onChange={(e) => updateHud({ showComboMeter: e.target.checked })}
                className="accent-[#00A8FF]"
              />
              Combos
            </label>
            <label className="flex items-center gap-1.5 text-[#F4F7FB]">
              <input
                type="checkbox"
                checked={settings.hudConfig.showCombatLog}
                onChange={(e) => updateHud({ showCombatLog: e.target.checked })}
                className="accent-[#00A8FF]"
              />
              Combat Log
            </label>
            <button
              type="button"
              onClick={() =>
                onUpdate({
                  ...settings,
                  cameraShakeLevel: DEFAULT_SETTINGS.cameraShakeLevel,
                  inputBufferFrames: DEFAULT_SETTINGS.inputBufferFrames,
                  touchLayout: {
                    ...DEFAULT_SETTINGS.touchLayout,
                    controls: { ...DEFAULT_SETTINGS.touchLayout.controls },
                  },
                  hudConfig: { ...DEFAULT_SETTINGS.hudConfig },
                })
              }
              className="px-2 py-0.5 bg-[#07090D] border border-white/15 hover:border-[#00A8FF] text-[11px] font-semibold text-[#F4F7FB] cursor-pointer"
            >
              Repor Padrão
            </button>
          </div>
        </section>
      </div>

      <div className="text-[11px] text-[#64748B] truncate">
        Teclas Diagonais: Q (↖) · E (↗) · Z (↙) · C (↘) · J Ligeiro · H Médio · K Pesado · L Especial · U Defesa · R +Energia · J+U Especial · J+K Rasteira
      </div>
    </main>
  );
}
