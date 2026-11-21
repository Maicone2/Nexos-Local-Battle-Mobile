import { ArrowLeft } from 'lucide-react';
import { FIGHTER_PROFILES } from '../game/constants';
import { FighterId } from '../game/types';
import { FighterPortrait } from './FighterEmblem';

interface CharacterSelectProps {
  p1Fighter: FighterId;
  p2Fighter: FighterId;
  isLan: boolean;
  localSlot?: 1 | 2;
  onSelectP1: (id: FighterId) => void;
  onSelectP2: (id: FighterId) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function CharacterSelect({
  p1Fighter,
  p2Fighter,
  isLan,
  localSlot = 1,
  onSelectP1,
  onSelectP2,
  onContinue,
  onBack,
}: CharacterSelectProps) {
  const fighters: FighterId[] = ['kael', 'vexa'];
  const p1 = FIGHTER_PROFILES[p1Fighter];
  const p2 = FIGHTER_PROFILES[p2Fighter];

  const handleChoose = (id: FighterId) => {
    if (isLan && localSlot === 2) {
      onSelectP2(id);
    } else {
      onSelectP1(id);
    }
  };

  return (
    <main className="w-full h-full bg-[#07090D] flex flex-col justify-between px-6 py-5 md:px-12 md:py-8 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-wide text-[#F4F7FB]">
            SELEÇÃO DE PERSONAGENS
          </h1>
          <p className="text-sm text-[#94A3B8]">
            {isLan
              ? `Escolhe o teu lutador (Jogador ${localSlot})`
              : 'Escolhe o teu lutador e o adversário'}
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

      <div className="my-auto grid grid-cols-1 lg:grid-cols-12 gap-5 max-w-6xl w-full mx-auto py-4 items-stretch">
        {/* P1 Preview */}
        <section className="lg:col-span-4 bg-[#10151F] border border-white/10 p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs font-mono-tech text-[#00A8FF]">JOGADOR 1</div>
            <h2 className="font-display text-3xl font-extrabold text-[#F4F7FB] mt-1">{p1.name}</h2>
            <p className="text-xs text-[#94A3B8]">{p1.style} · {p1.specialty}</p>
          </div>
          <div className="flex justify-center my-2">
            <FighterPortrait fighterId={p1.id} size={156} />
          </div>
          <div className="border-t border-white/10 pt-3">
            <div className="text-xs font-semibold text-[#F4F7FB]">Especial: {p1.specialMoveName}</div>
            <p className="text-xs text-[#94A3B8] mt-1">{p1.specialMoveDesc}</p>
          </div>
        </section>

        {/* Center Fighter Cards */}
        <section className="lg:col-span-4 flex flex-col justify-center gap-4">
          {fighters.map((id) => {
            const prof = FIGHTER_PROFILES[id];
            const isSelected = (isLan && localSlot === 2 ? p2Fighter : p1Fighter) === id;
            return (
              <div
                key={id}
                className={`p-4 bg-[#10151F] border transition-colors ${
                  isSelected ? 'border-[#00A8FF]' : 'border-white/10'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-display text-2xl font-extrabold text-[#F4F7FB]">
                      {prof.name}
                    </div>
                    <div className="text-xs text-[#94A3B8]">
                      {prof.title} · {prof.specialMoveName}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleChoose(id)}
                      className={`px-3.5 py-2 text-xs font-bold uppercase cursor-pointer ${
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
                        className={`px-3.5 py-2 text-xs font-bold uppercase cursor-pointer ${
                          p2Fighter === id
                            ? 'bg-[#A855F7] text-white'
                            : 'bg-[#192233] text-[#F4F7FB] hover:bg-[#222E45]'
                        }`}
                      >
                        P2 / CPU
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={onContinue}
            className="w-full py-4 bg-[#00A8FF] hover:bg-[#33B9FF] text-[#07090D] font-display text-2xl font-extrabold tracking-wider uppercase cursor-pointer"
          >
            ESCOLHER CENÁRIO →
          </button>
        </section>

        {/* P2 Preview */}
        <section className="lg:col-span-4 bg-[#10151F] border border-white/10 p-5 flex flex-col justify-between">
          <div className="text-right">
            <div className="text-xs font-mono-tech text-[#A855F7]">JOGADOR 2 / ADVERSÁRIO</div>
            <h2 className="font-display text-3xl font-extrabold text-[#F4F7FB] mt-1">{p2.name}</h2>
            <p className="text-xs text-[#94A3B8]">{p2.style} · {p2.specialty}</p>
          </div>
          <div className="flex justify-center my-2 scale-x-[-1]">
            <FighterPortrait fighterId={p2.id} size={156} />
          </div>
          <div className="border-t border-white/10 pt-3 text-right">
            <div className="text-xs font-semibold text-[#F4F7FB]">Especial: {p2.specialMoveName}</div>
            <p className="text-xs text-[#94A3B8] mt-1">{p2.specialMoveDesc}</p>
          </div>
        </section>
      </div>

      <div className="text-xs text-[#64748B]">
        Kael: Pulso Solar (Projétil de Energia) · Vexa: Vórtice Azul (Avanço Giratório)
      </div>
    </main>
  );
}
