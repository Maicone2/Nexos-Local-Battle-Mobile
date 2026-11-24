import { useEffect, useState } from 'react';
import { FIGHTER_PROFILES, UNIVERSAL_COMMAND_SHORTCUTS } from '../game/constants';
import { FighterId } from '../game/types';

interface MoveListModalProps {
  initialFighter?: FighterId;
  onClose: () => void;
}

export function MoveListModal({ initialFighter = 'kael', onClose }: MoveListModalProps) {
  const [sectionTab, setSectionTab] = useState<'moves' | 'shortcuts'>('moves');
  const [selectedFighter, setSelectedFighter] = useState<FighterId>(initialFighter);
  const [movePage, setMovePage] = useState(0);
  const [compactHeight, setCompactHeight] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight < 500 : false
  );

  useEffect(() => {
    const onResize = () => setCompactHeight(window.innerHeight < 500);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const profile = FIGHTER_PROFILES[selectedFighter];
  const moves = Object.values(profile.moves).filter(Boolean);
  const pageSize = compactHeight ? 6 : 10;
  const totalPages = Math.max(1, Math.ceil(moves.length / pageSize));
  const safePage = Math.min(movePage, totalPages - 1);
  const visibleMoves = moves.slice(safePage * pageSize, safePage * pageSize + pageSize);

  return (
    <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-2 sm:p-3 overflow-hidden">
      <section className="w-full max-w-4xl max-h-[95dvh] bg-[#10151F] border border-[#00A8FF] flex flex-col overflow-hidden">
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-white/10 bg-[#07090D]">
          <div>
            <h2 className="font-display text-lg sm:text-2xl font-extrabold text-[#F4F7FB] leading-none">
              LISTA DE ATAQUES & ATALHOS
            </h2>
            <p className="hidden sm:block text-[11px] text-[#94A3B8]">
              Combinações simultâneas, golpes especiais, rasteiras e frame data
            </p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setSectionTab('moves')}
              className={`px-2.5 py-1 font-display text-xs sm:text-sm font-bold uppercase border cursor-pointer ${
                sectionTab === 'moves'
                  ? 'bg-[#00A8FF] text-[#07090D] border-[#00A8FF]'
                  : 'bg-[#10151F] text-[#F4F7FB] border-white/15'
              }`}
            >
              Golpes do Lutador
            </button>
            <button
              type="button"
              onClick={() => setSectionTab('shortcuts')}
              className={`px-2.5 py-1 font-display text-xs sm:text-sm font-bold uppercase border cursor-pointer ${
                sectionTab === 'shortcuts'
                  ? 'bg-[#A855F7] text-white border-[#A855F7]'
                  : 'bg-[#10151F] text-[#F4F7FB] border-white/15'
              }`}
            >
              Atalhos Rápidos
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1 bg-[#00A8FF] hover:bg-[#33B9FF] text-[#07090D] font-display text-sm sm:text-base font-bold uppercase cursor-pointer"
            >
              SAIR
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-2.5 sm:p-4 flex flex-col justify-between gap-2">
          {sectionTab === 'shortcuts' ? (
            <div>
              <h3 className="font-display text-base sm:text-lg font-bold text-[#00E5FF] tracking-wide mb-2">
                ATALHOS RÁPIDOS & COMBINAÇÕES SIMULTÂNEAS
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {UNIVERSAL_COMMAND_SHORTCUTS.map((cmd) => (
                  <div
                    key={cmd.name}
                    className="bg-[#07090D] border border-white/10 p-2 sm:p-2.5 flex flex-col justify-between gap-1"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-display text-sm sm:text-lg font-bold text-[#F4F7FB] leading-none">
                        {cmd.name}
                      </span>
                      <span
                        className="px-1.5 py-0.5 text-[9px] sm:text-[10px] font-mono-tech font-bold text-[#07090D]"
                        style={{ backgroundColor: cmd.color }}
                      >
                        {cmd.badge}
                      </span>
                    </div>
                    <div className="font-mono-tech text-[11px] text-[#00E5FF] font-semibold">
                      {cmd.input} <span className="text-[#64748B]">· {cmd.alt}</span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] text-[#94A3B8] leading-snug">{cmd.effect}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between gap-2 overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(FIGHTER_PROFILES) as FighterId[]).map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setSelectedFighter(id);
                        setMovePage(0);
                      }}
                      className={`px-2.5 py-0.5 sm:py-1 border font-display text-sm sm:text-base font-bold uppercase cursor-pointer ${
                        selectedFighter === id
                          ? 'bg-[#00A8FF] text-[#07090D] border-[#00A8FF]'
                          : 'bg-[#07090D] text-[#F4F7FB] border-white/15'
                      }`}
                    >
                      {FIGHTER_PROFILES[id].name}
                    </button>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5 text-[11px] font-mono-tech text-[#94A3B8]">
                    <button
                      type="button"
                      disabled={safePage === 0}
                      onClick={() => setMovePage((p) => Math.max(0, p - 1))}
                      className="px-2 py-0.5 bg-[#07090D] border border-white/15 disabled:opacity-40 cursor-pointer"
                    >
                      ← Ant.
                    </button>
                    <span>
                      Pág {safePage + 1}/{totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={safePage >= totalPages - 1}
                      onClick={() => setMovePage((p) => Math.min(totalPages - 1, p + 1))}
                      className="px-2 py-0.5 bg-[#07090D] border border-white/15 disabled:opacity-40 cursor-pointer"
                    >
                      Próx. →
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                {visibleMoves.map((m) => {
                  if (!m) return null;
                  const dmgLabel = m.hpPercentDamage
                    ? `${Math.round(m.hpPercentDamage * 100)}% HP`
                    : `${m.damage} DMG`;
                  const flags: string[] = [];
                  if (m.isLow) flags.push('Baixo');
                  if (m.isOverhead) flags.push('Overhead');
                  if (m.isLauncher) flags.push('Launcher');
                  if (m.causesKnockdown) flags.push('Derruba');
                  if (m.causesWallBounce) flags.push('Wall Bounce');
                  if (m.isProjectile) flags.push('Projétil');
                  if (m.energyCost > 0) flags.push(`-${m.energyCost} EN`);

                  return (
                    <div
                      key={m.id}
                      className="bg-[#07090D] border border-white/10 px-2.5 py-1.5 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-[#F4F7FB] truncate">{m.name}</div>
                        <div className="text-[10px] font-mono-tech text-[#94A3B8] truncate">
                          S:{m.startup} · A:{m.active} · R:{m.recovery}
                          {flags.length > 0 ? ` · ${flags.join(' · ')}` : ''}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono-tech font-bold text-[#F5B700]">{dmgLabel}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="text-[10px] sm:text-[11px] text-[#64748B] font-mono-tech truncate">
                Usa o separador &ldquo;Atalhos Rápidos&rdquo; para ver Rasteira, Uppercut, Voadora e Carregar Energia.
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
