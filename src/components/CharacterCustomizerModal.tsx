import { useEffect, useState } from 'react';
import { Crown, Eye, LogOut, Palette, RotateCcw, Shuffle, Sparkles, Swords } from 'lucide-react';
import {
  DEFAULT_FIGHTER_APPEARANCE,
  FIGHTER_PROFILES,
  SUPREME_BACK_GEAR,
  SUPREME_COLOR_SWATCHES,
  SUPREME_EYE_STYLES,
  SUPREME_HEADGEAR,
  SUPREME_PRESETS,
  SUPREME_WEAPONS,
} from '../game/constants';
import { FighterAppearance, FighterId } from '../game/types';
import { FighterPortrait } from './FighterEmblem';

interface CharacterCustomizerModalProps {
  p1Fighter: FighterId;
  p2Fighter: FighterId;
  initialSlot?: 1 | 2;
  customizations: { p1: FighterAppearance; p2: FighterAppearance };
  onChange: (next: { p1: FighterAppearance; p2: FighterAppearance }) => void;
  onClose: () => void;
}

type CustomizerTab = 'weapon' | 'head' | 'back' | 'colors';

export function CharacterCustomizerModal({
  p1Fighter,
  p2Fighter,
  initialSlot = 1,
  customizations,
  onChange,
  onClose,
}: CharacterCustomizerModalProps) {
  const [slot, setSlot] = useState<1 | 2>(initialSlot);
  const [tab, setTab] = useState<CustomizerTab>('weapon');
  const [previewPose, setPreviewPose] = useState<'idle' | 'heavy' | 'victory'>('idle');
  const [flipPreview, setFlipPreview] = useState(false);
  const [compactHeight, setCompactHeight] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight < 500 : false
  );

  useEffect(() => {
    const onResize = () => setCompactHeight(window.innerHeight < 500);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const fighterId = slot === 1 ? p1Fighter : p2Fighter;
  const profile = FIGHTER_PROFILES[fighterId];
  const current: FighterAppearance = slot === 1 ? customizations.p1 : customizations.p2;

  const updateCurrent = (patch: Partial<FighterAppearance>) => {
    const updated = { ...current, ...patch };
    onChange(
      slot === 1
        ? { ...customizations, p1: updated }
        : { ...customizations, p2: updated }
    );
  };

  const handleRandomize = () => {
    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const colorPool = SUPREME_COLOR_SWATCHES;
    updateCurrent({
      weapon: pick(SUPREME_WEAPONS).id,
      headgear: pick(SUPREME_HEADGEAR).id,
      eyeStyle: pick(SUPREME_EYE_STYLES).id,
      backGear: pick(SUPREME_BACK_GEAR).id,
      primaryColor: pick(colorPool),
      secondaryColor: pick(colorPool),
      suitColor: pick(['#0F172A', '#18181B', '#1E293B', '#172554', '#31102F', '#0B0E14']),
      skinColor: pick(['#E8B89A', '#F2CBB8', '#0B0E14', '#CBD5E1', '#F5B700', '#1F2937']),
      weaponColor: pick(colorPool),
    });
  };

  const handleReset = () => {
    updateCurrent({ ...DEFAULT_FIGHTER_APPEARANCE });
  };

  const colorRows: {
    key: keyof Pick<
      FighterAppearance,
      'primaryColor' | 'secondaryColor' | 'suitColor' | 'skinColor' | 'weaponColor'
    >;
    label: string;
    fallback: string;
  }[] = [
    { key: 'primaryColor', label: 'Principal', fallback: profile.primaryColor },
    { key: 'secondaryColor', label: 'Secundária', fallback: profile.secondaryColor },
    { key: 'weaponColor', label: 'Arma', fallback: profile.primaryColor },
    { key: 'suitColor', label: 'Armadura', fallback: '#1A2236' },
    { key: 'skinColor', label: 'Cabeça', fallback: '#E8B89A' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-1.5 sm:p-3 overflow-hidden">
      <section className="w-full max-w-5xl max-h-[96dvh] bg-[#0B0F17] border border-[#00A8FF] flex flex-col overflow-hidden">
        {/* Top Bar with Explicit SAIR button */}
        <header className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-[#07090D] border-b border-white/10">
          <div>
            <h2 className="font-display text-lg sm:text-2xl font-extrabold text-[#F4F7FB] tracking-wide leading-none">
              CUSTOMIZAÇÃO SUPREME DUELIST
            </h2>
            <p className="hidden md:block text-[11px] text-[#94A3B8] mt-0.5">
              Arma, capacete, visor, aura e cores em tempo real
            </p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setSlot(1)}
              className={`px-2.5 py-1 font-display text-sm sm:text-base font-bold border cursor-pointer ${
                slot === 1
                  ? 'bg-[#00A8FF] text-[#07090D] border-[#00A8FF]'
                  : 'bg-[#10151F] text-[#F4F7FB] border-white/15'
              }`}
            >
              P1 · {FIGHTER_PROFILES[p1Fighter].name}
            </button>
            <button
              type="button"
              onClick={() => setSlot(2)}
              className={`px-2.5 py-1 font-display text-sm sm:text-base font-bold border cursor-pointer ${
                slot === 2
                  ? 'bg-[#A855F7] text-white border-[#A855F7]'
                  : 'bg-[#10151F] text-[#F4F7FB] border-white/15'
              }`}
            >
              P2 · {FIGHTER_PROFILES[p2Fighter].name}
            </button>
            <button
              type="button"
              data-testid="customizer-exit-top"
              onClick={onClose}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#EF4444]/15 hover:bg-[#EF4444] text-[#FCA5A5] hover:text-white border border-[#EF4444]/60 text-[11px] sm:text-xs font-bold uppercase cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair
            </button>
          </div>
        </header>

        {/* Body (No Scrollbar) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3 p-2 sm:p-3">
          {/* Live Supreme Preview */}
          <div className="sm:col-span-4 bg-[#10151F] border border-white/10 p-2 sm:p-3 flex flex-col items-center justify-between gap-1.5 sm:gap-2 overflow-hidden">
            <div className="w-full flex items-center justify-between text-[11px]">
              <span className="font-mono-tech text-[#00A8FF] font-bold truncate">
                {profile.name}
              </span>
              <button
                type="button"
                onClick={() => setFlipPreview((v) => !v)}
                className="px-2 py-0.5 bg-[#07090D] border border-white/15 text-[10px] text-[#94A3B8] hover:text-white cursor-pointer"
              >
                Virar ↔
              </button>
            </div>

            <div className="w-full flex items-center justify-center bg-[#07090D] border border-white/10 py-1">
              <FighterPortrait
                fighterId={fighterId}
                size={compactHeight ? 82 : 148}
                appearance={current}
                previewAction={previewPose}
                flipX={flipPreview}
              />
            </div>

            <div className="grid grid-cols-3 gap-1 w-full">
              {([
                { id: 'idle', label: 'Repouso' },
                { id: 'heavy', label: 'Ataque' },
                { id: 'victory', label: 'Vitória' },
              ] as const).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPreviewPose(p.id)}
                  className={`py-1 text-[10px] sm:text-xs font-bold uppercase border cursor-pointer ${
                    previewPose === p.id
                      ? 'bg-[#00A8FF] text-[#07090D] border-[#00A8FF]'
                      : 'bg-[#07090D] text-[#94A3B8] border-white/10 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-1.5 w-full">
              <button
                type="button"
                onClick={handleRandomize}
                className="inline-flex items-center justify-center gap-1 py-1 sm:py-1.5 bg-[#192233] hover:bg-[#23304A] border border-white/15 text-[11px] sm:text-xs font-bold text-[#F4F7FB] uppercase cursor-pointer"
              >
                <Shuffle className="w-3 h-3 text-[#F5B700]" />
                Aleatório
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center justify-center gap-1 py-1 sm:py-1.5 bg-[#07090D] hover:bg-[#192233] border border-white/15 text-[11px] sm:text-xs font-bold text-[#94A3B8] hover:text-white uppercase cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Repor
              </button>
            </div>
          </div>

          {/* Right Controls */}
          <div className="sm:col-span-8 flex flex-col gap-1.5 sm:gap-2 overflow-hidden">
            {/* Category Tabs */}
            <div className="shrink-0 grid grid-cols-4 gap-1.5">
              {([
                { id: 'weapon', label: 'Armas', icon: Swords },
                { id: 'head', label: 'Cabeça', icon: Crown },
                { id: 'back', label: 'Costas', icon: Sparkles },
                { id: 'colors', label: 'Cores', icon: Palette },
              ] as const).map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`flex items-center justify-center gap-1 py-1 sm:py-1.5 px-2 text-[11px] sm:text-sm font-bold border uppercase cursor-pointer ${
                      tab === t.id
                        ? 'bg-[#00A8FF] text-[#07090D] border-[#00A8FF]'
                        : 'bg-[#10151F] text-[#F4F7FB] border-white/10 hover:border-[#00A8FF]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Content (Zero Scroll) */}
            <div className="flex-1 bg-[#10151F] border border-white/10 p-2 sm:p-3 overflow-hidden flex flex-col justify-between">
              {tab === 'weapon' && (
                <div>
                  <div className="text-[11px] font-mono-tech text-[#00A8FF] mb-1.5 uppercase">
                    Armas Supreme Duelist ({SUPREME_WEAPONS.length} estilos)
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                    {SUPREME_WEAPONS.map((w) => {
                      const active = current.weapon === w.id;
                      return (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => updateCurrent({ weapon: w.id })}
                          className={`p-1.5 sm:p-2 text-left border transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#0B192C] border-[#00A8FF] text-[#F4F7FB]'
                              : 'bg-[#07090D] border-white/10 text-[#94A3B8] hover:border-white/30'
                          }`}
                        >
                          <div className="font-display text-sm sm:text-base font-bold text-[#F4F7FB] leading-tight">
                            {w.label}
                          </div>
                          <div className="text-[10px] leading-tight mt-0.5 opacity-85 line-clamp-2">
                            {w.desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {tab === 'head' && (
                <div className="space-y-2">
                  <div>
                    <div className="text-[11px] font-mono-tech text-[#00A8FF] mb-1 uppercase">
                      Cabeça / Elmo / Stickman
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {SUPREME_HEADGEAR.map((h) => (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => updateCurrent({ headgear: h.id })}
                          className={`py-1.5 px-2 text-[11px] font-bold uppercase border cursor-pointer ${
                            current.headgear === h.id
                              ? 'bg-[#00A8FF] text-[#07090D] border-[#00A8FF]'
                              : 'bg-[#07090D] text-[#F4F7FB] border-white/10 hover:border-white/30'
                          }`}
                        >
                          {h.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] font-mono-tech text-[#A855F7] mb-1 uppercase">
                      <Eye className="w-3.5 h-3.5" />
                      Olhos / Visor / Máscara
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {SUPREME_EYE_STYLES.map((e) => (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => updateCurrent({ eyeStyle: e.id })}
                          className={`py-1.5 px-1.5 text-[11px] font-bold uppercase border cursor-pointer ${
                            current.eyeStyle === e.id
                              ? 'bg-[#A855F7] text-white border-[#A855F7]'
                              : 'bg-[#07090D] text-[#F4F7FB] border-white/10 hover:border-white/30'
                          }`}
                        >
                          {e.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {tab === 'back' && (
                <div>
                  <div className="text-[11px] font-mono-tech text-[#00A8FF] mb-1.5 uppercase">
                    Acessórios de Costas & Aura
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {SUPREME_BACK_GEAR.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => updateCurrent({ backGear: b.id })}
                        className={`p-2 sm:p-3 text-left border cursor-pointer ${
                          current.backGear === b.id
                            ? 'bg-[#0B192C] border-[#00A8FF] text-[#F4F7FB]'
                            : 'bg-[#07090D] border-white/10 text-[#94A3B8] hover:border-white/30'
                        }`}
                      >
                        <div className="font-display text-base sm:text-lg font-bold text-[#F4F7FB]">
                          {b.label}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {tab === 'colors' && (
                <div className="space-y-1.5">
                  <div>
                    <div className="text-[10px] font-mono-tech text-[#F5B700] mb-1 uppercase">
                      Estilos Prontos (Presets)
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {SUPREME_PRESETS.map((pr) => (
                        <button
                          key={pr.name}
                          type="button"
                          onClick={() => updateCurrent({ ...pr.appearance })}
                          className="px-2 py-0.5 bg-[#07090D] hover:bg-[#192233] border border-white/15 hover:border-[#F5B700] text-[10px] font-bold text-[#F4F7FB] cursor-pointer"
                        >
                          {pr.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1 border-t border-white/10 pt-1.5">
                    {colorRows.map((row) => {
                      const val = current[row.key];
                      const activeHex = val === 'default' ? row.fallback : val;
                      return (
                        <div
                          key={row.key}
                          className="flex flex-wrap items-center justify-between gap-1.5 bg-[#07090D] border border-white/10 px-2 py-1"
                        >
                          <span className="text-[11px] font-semibold text-[#F4F7FB]">
                            {row.label}
                          </span>
                          <div className="flex items-center gap-1 flex-wrap">
                            <button
                              type="button"
                              onClick={() => updateCurrent({ [row.key]: 'default' })}
                              className={`px-1.5 py-0.5 text-[10px] font-mono-tech border cursor-pointer ${
                                val === 'default'
                                  ? 'bg-[#00A8FF] text-[#07090D] border-[#00A8FF] font-bold'
                                  : 'bg-[#10151F] text-[#94A3B8] border-white/15'
                              }`}
                            >
                              Auto
                            </button>
                            {SUPREME_COLOR_SWATCHES.map((hex) => (
                              <button
                                key={hex}
                                type="button"
                                aria-label={`${row.label} ${hex}`}
                                onClick={() => updateCurrent({ [row.key]: hex })}
                                className={`w-3.5 h-3.5 border cursor-pointer ${
                                  val === hex ? 'border-white scale-110' : 'border-white/25'
                                }`}
                                style={{ backgroundColor: hex }}
                              />
                            ))}
                            <input
                              type="color"
                              value={activeHex}
                              onChange={(e) => updateCurrent({ [row.key]: e.target.value })}
                              className="w-5 h-3.5 bg-transparent border border-white/20 cursor-pointer"
                              aria-label={`Cor livre ${row.label}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="shrink-0 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-3.5 py-1 sm:py-1.5 bg-[#10151F] hover:bg-[#192233] border border-white/15 hover:border-[#EF4444] text-[#F4F7FB] font-display text-sm sm:text-lg font-bold uppercase cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-[#EF4444]" />
                SAIR
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-1 sm:py-1.5 bg-[#00A8FF] hover:bg-[#33B9FF] text-[#07090D] font-display text-sm sm:text-lg font-extrabold uppercase cursor-pointer"
              >
                GUARDAR E SAIR
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
