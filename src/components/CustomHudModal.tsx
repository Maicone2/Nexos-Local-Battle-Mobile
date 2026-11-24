import { useRef, useState } from 'react';
import { Grid, Move, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { DEFAULT_SETTINGS, DEFAULT_TOUCH_CONTROLS } from '../game/constants';
import { SettingsConfig, TouchButtonConfig, TouchControlId } from '../game/types';

interface CustomHudModalProps {
  settings: SettingsConfig;
  isPortrait?: boolean;
  onUpdate: (next: SettingsConfig) => void;
  onClose: () => void;
}

const CONTROL_META: {
  id: TouchControlId;
  short: string;
  label: string;
  color: string;
  border: string;
}[] = [
  { id: 'joystick', short: 'JOY', label: 'Joystick / Direcional', color: '#00A8FF', border: '#00A8FF' },
  { id: 'light', short: 'LIGEIRO', label: 'Ataque Ligeiro (J)', color: '#00E5FF', border: '#00E5FF' },
  { id: 'medium', short: 'MÉDIO', label: 'Ataque Médio (H)', color: '#38BDF8', border: '#38BDF8' },
  { id: 'heavy', short: 'PESADO', label: 'Ataque Pesado (K)', color: '#F5B700', border: '#F5B700' },
  { id: 'block', short: 'DEFESA', label: 'Defesa (U)', color: '#F4F7FB', border: '#94A3B8' },
  { id: 'special', short: 'ESPECIAL', label: 'Especial / Ult (L)', color: '#A855F7', border: '#A855F7' },
  { id: 'charge', short: '+EN', label: 'Carregar Energia (R)', color: '#4ADE80', border: '#4ADE80' },
  { id: 'sweep', short: 'RASTEIRA', label: 'Rasteira (-9% HP)', color: '#FB7185', border: '#FB7185' },
];

export function CustomHudModal({
  settings,
  isPortrait = false,
  onUpdate,
  onClose,
}: CustomHudModalProps) {
  const [tab, setTab] = useState<'grid' | 'general'>('grid');
  const [selectedId, setSelectedId] = useState<TouchControlId>('light');
  const [snapGrid, setSnapGrid] = useState(true);
  const gridContainerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    id: TouchControlId;
    startClientX: number;
    startClientY: number;
    startXPct: number;
    startYPct: number;
  } | null>(null);

  const controls = settings.touchLayout.controls || DEFAULT_TOUCH_CONTROLS;
  const selectedCtrl = controls[selectedId] || DEFAULT_TOUCH_CONTROLS[selectedId];
  const selectedMeta = CONTROL_META.find((m) => m.id === selectedId) || CONTROL_META[0];

  const updateTouch = (patch: Partial<SettingsConfig['touchLayout']>) => {
    onUpdate({
      ...settings,
      touchLayout: { ...settings.touchLayout, ...patch },
    });
  };

  const updateSingleControl = (id: TouchControlId, patch: Partial<TouchButtonConfig>) => {
    const current = controls[id] || DEFAULT_TOUCH_CONTROLS[id];
    onUpdate({
      ...settings,
      touchLayout: {
        ...settings.touchLayout,
        controls: {
          ...controls,
          [id]: { ...current, ...patch },
        },
      },
    });
  };

  const updateHud = (patch: Partial<SettingsConfig['hudConfig']>) => {
    onUpdate({
      ...settings,
      hudConfig: { ...settings.hudConfig, ...patch },
    });
  };

  const resetAllHud = () => {
    onUpdate({
      ...settings,
      cameraShakeLevel: DEFAULT_SETTINGS.cameraShakeLevel,
      inputBufferFrames: DEFAULT_SETTINGS.inputBufferFrames,
      touchLayout: {
        ...DEFAULT_SETTINGS.touchLayout,
        controls: {
          joystick: { ...DEFAULT_TOUCH_CONTROLS.joystick },
          block: { ...DEFAULT_TOUCH_CONTROLS.block },
          sweep: { ...DEFAULT_TOUCH_CONTROLS.sweep },
          light: { ...DEFAULT_TOUCH_CONTROLS.light },
          charge: { ...DEFAULT_TOUCH_CONTROLS.charge },
          medium: { ...DEFAULT_TOUCH_CONTROLS.medium },
          heavy: { ...DEFAULT_TOUCH_CONTROLS.heavy },
          special: { ...DEFAULT_TOUCH_CONTROLS.special },
        },
      },
      hudConfig: { ...DEFAULT_SETTINGS.hudConfig },
    });
  };

  const handleControlPointerDown = (
    id: TouchControlId,
    e: React.PointerEvent<HTMLDivElement>
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(id);
    const ctrl = controls[id] || DEFAULT_TOUCH_CONTROLS[id];
    dragRef.current = {
      id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startXPct: ctrl.xPct,
      startYPct: ctrl.yPct,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore if pointer capture unavailable in synthetic test
    }
  };

  const handleControlPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    const container = gridContainerRef.current;
    if (!d || !container) return;

    const screenDx = e.clientX - d.startClientX;
    const screenDy = e.clientY - d.startClientY;
    // Transform screen drag delta into rotated 90deg CW local arena coordinates when in portrait
    const localDx = isPortrait ? screenDy : screenDx;
    const localDy = isPortrait ? -screenDx : screenDy;

    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);
    let nextX = d.startXPct + (localDx / w) * 100;
    let nextY = d.startYPct + (localDy / h) * 100;

    if (snapGrid) {
      nextX = Math.round(nextX / 2) * 2;
      nextY = Math.round(nextY / 2) * 2;
    }

    nextX = Math.max(6, Math.min(94, Number(nextX.toFixed(1))));
    nextY = Math.max(20, Math.min(90, Number(nextY.toFixed(1))));

    updateSingleControl(d.id, { xPct: nextX, yPct: nextY });
  };

  const handleControlPointerUp = () => {
    dragRef.current = null;
  };

  if (tab === 'grid') {
    return (
      <div
        ref={gridContainerRef}
        className="absolute inset-0 z-40 bg-[#05080E]/65 select-none overflow-hidden"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(0, 168, 255, 0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 168, 255, 0.14) 1px, transparent 1px)',
          backgroundSize: '4% 8%',
        }}
      >
        {/* Center Crosshair Guide */}
        <div className="absolute inset-y-0 left-1/2 w-px bg-[#00E5FF]/25 pointer-events-none" />
        <div className="absolute inset-x-0 top-1/2 h-px bg-[#00E5FF]/25 pointer-events-none" />

        {/* Top Floating Free Fire Inspector Bar */}
        <div className="relative z-20 mx-auto mt-1 sm:mt-2 max-w-4xl px-2">
          <div className="bg-[#0B101A]/95 border border-[#00A8FF] p-1.5 sm:p-2.5 space-y-1 sm:space-y-1.5 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setTab('grid')}
                  className="inline-flex items-center gap-1 px-2 py-0.5 sm:py-1 bg-[#00A8FF] text-[#07090D] font-display text-xs sm:text-sm font-bold uppercase cursor-pointer"
                >
                  <Grid className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  Grelha Free Fire
                </button>
                <button
                  type="button"
                  onClick={() => setTab('general')}
                  className="inline-flex items-center gap-1 px-2 py-0.5 sm:py-1 bg-[#161E2E] text-[#F4F7FB] border border-white/15 hover:border-[#00A8FF] font-display text-xs sm:text-sm font-bold uppercase cursor-pointer"
                >
                  <SlidersHorizontal className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  Geral HUD
                </button>
                <button
                  type="button"
                  onClick={() => setSnapGrid((s) => !s)}
                  className={`px-2 py-0.5 sm:py-1 border text-[10px] sm:text-[11px] font-mono-tech cursor-pointer ${
                    snapGrid
                      ? 'bg-[#00E5FF]/20 border-[#00E5FF] text-[#00E5FF]'
                      : 'bg-[#07090D] border-white/15 text-[#94A3B8]'
                  }`}
                >
                  Snap: {snapGrid ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={resetAllHud}
                  className="inline-flex items-center gap-1 px-2 py-0.5 sm:py-1 bg-[#07090D] border border-white/15 hover:border-[#00A8FF] text-[11px] font-semibold text-[#F4F7FB] cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Repor
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-0.5 sm:py-1 bg-[#00A8FF] hover:bg-[#33B9FF] text-[#07090D] font-display text-sm sm:text-base font-extrabold uppercase cursor-pointer"
                >
                  GUARDAR
                </button>
              </div>
            </div>

            {/* Button Selector Chips */}
            <div className="flex flex-wrap items-center gap-1">
              {CONTROL_META.map((m) => {
                const ctrl = controls[m.id] || DEFAULT_TOUCH_CONTROLS[m.id];
                const isSelected = selectedId === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedId(m.id)}
                    className={`px-1.5 py-0.5 text-[10px] font-mono-tech border cursor-pointer ${
                      isSelected
                        ? 'bg-[#00A8FF] text-[#07090D] border-white font-bold'
                        : ctrl.visible
                        ? 'bg-[#07090D] text-[#F4F7FB] border-white/15'
                        : 'bg-[#07090D] text-[#64748B] border-white/10 line-through'
                    }`}
                  >
                    {m.short}
                  </button>
                );
              })}
            </div>

            {/* Selected Button Individual Size, Opacity & Visibility */}
            <div className="grid grid-cols-12 gap-2 items-center pt-1 border-t border-white/10 text-[11px]">
              <div className="col-span-4 sm:col-span-3 flex items-center justify-between sm:justify-start gap-1.5 truncate">
                <span className="font-bold text-[#F4F7FB] truncate" style={{ color: selectedMeta.color }}>
                  {selectedMeta.label}
                </span>
                <span className="hidden sm:inline text-[10px] font-mono-tech text-[#94A3B8]">
                  ({selectedCtrl.xPct}%, {selectedCtrl.yPct}%)
                </span>
              </div>

              <div className="col-span-3 sm:col-span-4">
                <div className="flex justify-between text-[10px] text-[#94A3B8]">
                  <span>Tamanho</span>
                  <span className="font-mono-tech text-[#F4F7FB]">
                    {Math.round(selectedCtrl.scale * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  aria-label="Tamanho Individual"
                  min={0.6}
                  max={1.6}
                  step={0.05}
                  value={selectedCtrl.scale}
                  onChange={(e) =>
                    updateSingleControl(selectedId, { scale: Number(e.target.value) })
                  }
                  className="w-full accent-[#00A8FF]"
                />
              </div>

              <div className="col-span-3">
                <div className="flex justify-between text-[10px] text-[#94A3B8]">
                  <span>Opacidade</span>
                  <span className="font-mono-tech text-[#F4F7FB]">
                    {Math.round(selectedCtrl.opacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  aria-label="Opacidade Individual"
                  min={0.2}
                  max={1.0}
                  step={0.05}
                  value={selectedCtrl.opacity}
                  onChange={(e) =>
                    updateSingleControl(selectedId, { opacity: Number(e.target.value) })
                  }
                  className="w-full accent-[#00A8FF]"
                />
              </div>

              <div className="col-span-2 flex items-center justify-end">
                <label className="inline-flex items-center gap-1 text-[#F4F7FB] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCtrl.visible}
                    onChange={(e) =>
                      updateSingleControl(selectedId, { visible: e.target.checked })
                    }
                    className="accent-[#00A8FF]"
                  />
                  Visível
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Draggable Touch Controls Canvas */}
        {CONTROL_META.map((m) => {
          const ctrl = controls[m.id] || DEFAULT_TOUCH_CONTROLS[m.id];
          const isSelected = selectedId === m.id;
          const isJoy = m.id === 'joystick';
          const isSpec = m.id === 'special';

          return (
            <div
              key={m.id}
              data-testid={`hud-drag-${m.id}`}
              onPointerDown={(e) => handleControlPointerDown(m.id, e)}
              onPointerMove={handleControlPointerMove}
              onPointerUp={handleControlPointerUp}
              onPointerCancel={handleControlPointerUp}
              className={`absolute touch-none cursor-grab active:cursor-grabbing flex flex-col items-center justify-center transition-shadow ${
                isSelected ? 'z-30 ring-2 ring-white shadow-[0_0_18px_rgba(0,229,255,0.6)]' : 'z-10'
              }`}
              style={{
                left: `${ctrl.xPct}%`,
                top: `${ctrl.yPct}%`,
                transform: `translate(-50%, -50%) scale(${ctrl.scale})`,
                opacity: ctrl.visible ? ctrl.opacity : 0.25,
              }}
            >
              {isJoy ? (
                <div
                  className="w-28 h-28 rounded-full border-2 border-dashed flex flex-col items-center justify-center bg-[#0D131D]/80"
                  style={{ borderColor: m.border, color: m.color }}
                >
                  <Move className="w-5 h-5 mb-1" />
                  <span className="font-display text-xs font-bold tracking-wider">JOYSTICK 360°</span>
                </div>
              ) : (
                <div
                  className={`${
                    isSpec ? 'w-28 h-12' : 'w-18 h-12'
                  } border-2 flex items-center justify-center font-display text-xs font-extrabold uppercase bg-[#10151F]/90`}
                  style={{ borderColor: m.border, color: m.color }}
                >
                  {m.short}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-40 bg-black/75 flex items-center justify-center p-2 sm:p-3 overflow-hidden">
      <section className="w-full max-w-2xl max-h-[95dvh] overflow-hidden bg-[#10151F] border border-[#00A8FF] p-2.5 sm:p-4 space-y-2 sm:space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setTab('grid')}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#161E2E] border border-white/15 hover:border-[#00A8FF] text-[#F4F7FB] font-display text-sm sm:text-base font-bold uppercase cursor-pointer"
            >
              <Grid className="w-3.5 h-3.5" />
              Grelha Free Fire
            </button>
            <button
              type="button"
              onClick={() => setTab('general')}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#00A8FF] text-[#07090D] font-display text-sm sm:text-base font-bold uppercase cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Geral HUD
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1 bg-[#00A8FF] hover:bg-[#33B9FF] text-[#07090D] font-display text-sm sm:text-lg font-bold uppercase cursor-pointer"
          >
            GUARDAR & FECHAR
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 text-[11px] sm:text-xs">
          {/* Direcional & Controlos Táteis */}
          <div className="bg-[#07090D] border border-white/10 p-2.5 sm:p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-display text-base sm:text-lg font-bold text-[#F4F7FB]">DIRECIONAL</span>
              <label className="flex items-center gap-1.5 text-[#F4F7FB]">
                <input
                  type="checkbox"
                  checked={settings.touchLayout.enabled}
                  onChange={(e) => updateTouch({ enabled: e.target.checked })}
                  className="accent-[#00A8FF]"
                />
                Visível
              </label>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => updateTouch({ controlStyle: 'joystick' })}
                className={`py-1.5 border font-bold cursor-pointer ${
                  settings.touchLayout.controlStyle === 'joystick'
                    ? 'bg-[#00A8FF] text-[#07090D] border-[#00A8FF]'
                    : 'bg-[#10151F] text-[#F4F7FB] border-white/15'
                }`}
              >
                Joystick Diagonais
              </button>
              <button
                type="button"
                onClick={() => updateTouch({ controlStyle: 'dpad8' })}
                className={`py-1.5 border font-bold cursor-pointer ${
                  settings.touchLayout.controlStyle === 'dpad8'
                    ? 'bg-[#00A8FF] text-[#07090D] border-[#00A8FF]'
                    : 'bg-[#10151F] text-[#F4F7FB] border-white/15'
                }`}
              >
                Pad 8-Direções
              </button>
            </div>

            <p className="text-[10px] sm:text-[11px] text-[#94A3B8] leading-snug">
              Usa o separador <strong className="text-[#00E5FF]">Grelha Free Fire</strong> para arrastar cada botão livremente e ajustar tamanho e opacidade individuais.
            </p>
          </div>

          {/* HUD & Sensibilidade */}
          <div className="bg-[#07090D] border border-white/10 p-2.5 sm:p-3.5 space-y-1.5">
            <div className="font-display text-base sm:text-lg font-bold text-[#F4F7FB] leading-none">
              INTERFACE (HUD) & COMBATE
            </div>

            <div className="grid grid-cols-2 gap-x-2.5 gap-y-1">
              <div>
                <div className="flex justify-between text-[10px] text-[#94A3B8]">
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
                <div className="flex justify-between text-[10px] text-[#94A3B8]">
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

              <div>
                <div className="flex justify-between text-[10px] text-[#94A3B8]">
                  <span>Buffer</span>
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
                  onChange={(e) => onUpdate({ ...settings, inputBufferFrames: Number(e.target.value) })}
                  className="w-full accent-[#00A8FF]"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-[#94A3B8]">
                  <span>Vibração</span>
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
                  onChange={(e) => onUpdate({ ...settings, cameraShakeLevel: Number(e.target.value) })}
                  className="w-full accent-[#00A8FF]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1 border-t border-white/10 text-[10px] sm:text-[11px]">
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
                  checked={settings.hudConfig.showCombatLog}
                  onChange={(e) => updateHud({ showCombatLog: e.target.checked })}
                  className="accent-[#00A8FF]"
                />
                Combat Log
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
              <label className="flex items-center gap-1.5 text-[#F4F7FB] col-span-2">
                <input
                  type="checkbox"
                  checked={settings.hudConfig.showComboMeter}
                  onChange={(e) => updateHud({ showComboMeter: e.target.checked })}
                  className="accent-[#00A8FF]"
                />
                Contador e Dano de Combo
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-0.5">
          <button
            type="button"
            onClick={resetAllHud}
            className="px-3 py-1 bg-[#07090D] border border-white/15 hover:border-[#00A8FF] text-[11px] font-semibold text-[#F4F7FB] cursor-pointer"
          >
            Repor HUD Padrão
          </button>
          <span className="text-[10px] sm:text-[11px] text-[#64748B]">
            Alterações aplicadas em tempo real
          </span>
        </div>
      </section>
    </div>
  );
}
