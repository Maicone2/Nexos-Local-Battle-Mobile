import { useEffect, useState } from 'react';
import { ArrowLeft, Paintbrush, Play } from 'lucide-react';
import { getTrialsForFighter, loadCompletedTrials } from '../game/comboTrials';
import { FIGHTER_PROFILES } from '../game/constants';
import { FighterAppearance, FighterId } from '../game/types';
import { FighterPortrait } from './FighterEmblem';

interface CharacterSelectProps {
  p1Fighter: FighterId;
  p2Fighter: FighterId;
  isLan: boolean;
  isTrialsMode?: boolean;
  localSlot?: 1 | 2;
  customizations?: { p1: FighterAppearance; p2: FighterAppearance };
  onSelectP1: (id: FighterId) => void;
  onSelectP2: (id: FighterId) => void;
  onOpenCustomize?: (slot: 1 | 2) => void;
  onContinue: () => void;
  onStartDirect?: () => void;
  onBack: () => void;
}

export function CharacterSelect({
  p1Fighter,
  p2Fighter,
  isLan,
  isTrialsMode = false,
  localSlot = 1,
  customizations,
  onSelectP1,
  onSelectP2,
  onOpenCustomize,
  onContinue,
  onStartDirect,
  onBack,
}: CharacterSelectProps) {
  const [compactHeight, setCompactHeight] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight < 500 : false
  );

  useEffect(() => {
    const onResize = () => setCompactHeight(window.innerHeight < 500);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const fighters = Object.keys(FIGHTER_PROFILES) as FighterId[];
  const p1 = FIGHTER_PROFILES[p1Fighter];
  const p2 = FIGHTER_PROFILES[p2Fighter];
  const completedMap = loadCompletedTrials();
  const portraitSize = compactHeight ? 72 : 122;

  const handleChoose = (id: FighterId) => {
    if (isLan && localSlot === 2) {
      onSelectP2(id);
    } else {
      onSelectP1(id);
    }
  };

  return (
    <main className="w-full h-full bg-[#07090D] flex flex-col justify-between px-4 py-2 sm:px-6 sm:py-3 md:px-10 md:py-4 overflow-hidden">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-wide text-[#F4F7FB] leading-none">
            {isTrialsMode ? 'COMBO TRIALS · ESCOLHER LUTADOR' : 'SELEÇÃO DE PERSONAGENS'}
          </h1>
          <p className="text-[11px] sm:text-xs text-[#94A3B8]">
            {isLan
              ? `Escolhe o teu lutador (Jogador ${localSlot})`
              : isTrialsMode
              ? 'Escolhe o lutador para completar os 5 desafios de combo progressivos'
              : 'Escolhe os lutadores e entra diretamente na partida ou escolhe o cenário'}
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

      <div className="my-auto grid grid-cols-1 sm:grid-cols-12 gap-2.5 md:gap-4 max-w-6xl w-full mx-auto py-1 items-stretch">
        {/* P1 Preview */}
        <section className="sm:col-span-3 bg-[#10151F] border border-white/10 p-2.5 md:p-3.5 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-1.5">
            <div>
              <div className="text-[10px] font-mono-tech text-[#00A8FF]">
                {isTrialsMode ? 'DESAFIANTE (P1)' : 'JOGADOR 1'}
              </div>
              <h2 className="font-display text-xl md:text-2xl font-extrabold text-[#F4F7FB] leading-none mt-0.5">
                {p1.name}
              </h2>
              <p className="text-[10px] text-[#94A3B8]">{p1.style} · {p1.maxHp} HP</p>
            </div>
            {onOpenCustomize && (
              <button
                type="button"
                onClick={() => onOpenCustomize(1)}
                className="inline-flex items-center gap-1 px-2 py-1 bg-[#07090D] border border-[#00A8FF]/60 hover:bg-[#00A8FF] hover:text-[#07090D] text-[10px] font-bold text-[#00E5FF] uppercase cursor-pointer"
              >
                <Paintbrush className="w-3 h-3" />
                Visual
              </button>
            )}
          </div>
          <div className="flex justify-center my-0.5">
            <FighterPortrait fighterId={p1.id} size={portraitSize} appearance={customizations?.p1} />
          </div>
          <div className="border-t border-white/10 pt-1.5">
            <div className="text-[11px] font-semibold text-[#F4F7FB] truncate">
              Esp: {p1.specialMoveName}
            </div>
            <p className="hidden md:block text-[10px] text-[#94A3B8] mt-0.5 leading-snug">
              {p1.specialMoveDesc}
            </p>
          </div>
        </section>

        {/* Center 4-Fighter Selector Grid */}
        <section className="sm:col-span-6 flex flex-col justify-between gap-2">
          <div className="grid grid-cols-2 gap-2">
            {fighters.map((id) => {
              const prof = FIGHTER_PROFILES[id];
              const isSelected = (isLan && localSlot === 2 ? p2Fighter : p1Fighter) === id;
              const isP2Selected = p2Fighter === id;
              const fTrials = getTrialsForFighter(id);
              const fDone = fTrials.filter((t) => completedMap[t.id]).length;
              return (
                <div
                  key={id}
                  className={`p-2 md:p-3 bg-[#10151F] border transition-colors flex flex-col justify-between gap-1.5 ${
                    isSelected ? 'border-[#00A8FF]' : isP2Selected && !isLan ? 'border-[#A855F7]/70' : 'border-white/10'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <div className="font-display text-lg md:text-2xl font-extrabold text-[#F4F7FB] leading-none" style={{ color: prof.primaryColor }}>
                        {prof.name}
                      </div>
                      <span className="text-[10px] font-mono-tech text-[#10B981]">
                        {fDone}/{fTrials.length} Trials
                      </span>
                    </div>
                    <div className="text-[10px] text-[#94A3B8] truncate mt-0.5">
                      {prof.title} · {prof.maxHp} HP
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleChoose(id)}
                      className={`flex-1 py-1 text-[11px] font-bold uppercase cursor-pointer ${
                        isSelected
                          ? 'bg-[#00A8FF] text-[#07090D]'
                          : 'bg-[#192233] text-[#F4F7FB] hover:bg-[#222E45]'
                      }`}
                    >
                      {isLan ? `P${localSlot}` : 'P1'}
                    </button>
                    {!isLan && (
                      <button
                        type="button"
                        onClick={() => onSelectP2(id)}
                        className={`flex-1 py-1 text-[11px] font-bold uppercase cursor-pointer ${
                          isP2Selected
                            ? 'bg-[#A855F7] text-white'
                            : 'bg-[#192233] text-[#F4F7FB] hover:bg-[#222E45]'
                        }`}
                      >
                        {isTrialsMode ? 'DUMMY' : 'P2 / CPU'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-nowrap gap-1.5">
            {onOpenCustomize && (
              <button
                type="button"
                onClick={() => onOpenCustomize(1)}
                className="px-2 lg:px-3 py-2 lg:py-2.5 bg-[#10151F] hover:bg-[#192233] border border-[#00A8FF]/70 text-[#00E5FF] font-display text-xs lg:text-base font-bold tracking-wide uppercase inline-flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer"
              >
                <Paintbrush className="w-3 h-3 lg:w-3.5 lg:h-3.5 shrink-0" />
                SUPREME DUELIST
              </button>
            )}
            <button
              type="button"
              onClick={onContinue}
              className="px-2.5 lg:px-3.5 py-2 lg:py-2.5 bg-[#10151F] hover:bg-[#192233] border border-white/25 hover:border-[#00A8FF] text-[#F4F7FB] font-display text-xs lg:text-base font-bold tracking-wide uppercase whitespace-nowrap cursor-pointer"
            >
              CENÁRIO
            </button>
            <button
              type="button"
              onClick={onStartDirect ?? onContinue}
              className="flex-1 min-w-0 px-2.5 lg:px-4 py-2 lg:py-2.5 bg-[#00A8FF] hover:bg-[#33B9FF] text-[#07090D] font-display text-xs sm:text-sm lg:text-lg font-extrabold tracking-wide uppercase inline-flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer"
            >
              <Play className="w-3 h-3 lg:w-4 lg:h-4 fill-current shrink-0" />
              ENTRAR NA PARTIDA →
            </button>
          </div>
        </section>

        {/* P2 Preview */}
        <section className="sm:col-span-3 bg-[#10151F] border border-white/10 p-2.5 md:p-3.5 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-1.5">
            {onOpenCustomize ? (
              <button
                type="button"
                onClick={() => onOpenCustomize(2)}
                className="inline-flex items-center gap-1 px-2 py-1 bg-[#07090D] border border-[#A855F7]/60 hover:bg-[#A855F7] hover:text-white text-[10px] font-bold text-[#A855F7] uppercase cursor-pointer"
              >
                <Paintbrush className="w-3 h-3" />
                Visual
              </button>
            ) : <span />}
            <div className="text-right">
              <div className="text-[10px] font-mono-tech text-[#A855F7]">
                {isTrialsMode ? 'ALVO DE TREINO' : 'JOGADOR 2 / ADV.'}
              </div>
              <h2 className="font-display text-xl md:text-2xl font-extrabold text-[#F4F7FB] leading-none mt-0.5">
                {p2.name}
              </h2>
              <p className="text-[10px] text-[#94A3B8]">{p2.style} · {p2.maxHp} HP</p>
            </div>
          </div>
          <div className="flex justify-center my-0.5">
            <FighterPortrait fighterId={p2.id} size={portraitSize} appearance={customizations?.p2} flipX />
          </div>
          <div className="border-t border-white/10 pt-1.5 text-right">
            <div className="text-[11px] font-semibold text-[#F4F7FB] truncate">
              Esp: {p2.specialMoveName}
            </div>
            <p className="hidden md:block text-[10px] text-[#94A3B8] mt-0.5 leading-snug">
              {p2.specialMoveDesc}
            </p>
          </div>
        </section>
      </div>

      <div className="text-[11px] text-[#64748B] truncate">
        Kael (Energia) · Vexa (Agilidade) · Zane (Titã Sísmico) · Nyx (Ninja Criogénica)
      </div>
    </main>
  );
}
