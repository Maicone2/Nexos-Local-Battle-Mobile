import { useEffect, useState } from 'react';
import { Film, Play, Trash2, Trophy } from 'lucide-react';
import { FIGHTER_PROFILES, STAGES } from '../game/constants';
import { deleteReplay, loadReplays, MatchReplay } from '../game/replayStorage';

interface ReplayModalProps {
  onWatchReplay: (replay: MatchReplay) => void;
  onClose: () => void;
}

export function ReplayModal({ onWatchReplay, onClose }: ReplayModalProps) {
  const [replays, setReplays] = useState<MatchReplay[]>(() => loadReplays());
  const [page, setPage] = useState(0);
  const [compactHeight, setCompactHeight] = useState(() =>
    typeof window !== 'undefined' ? window.innerHeight < 500 : false
  );

  useEffect(() => {
    const onResize = () => setCompactHeight(window.innerHeight < 500);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleDelete = (id: string) => {
    setReplays(deleteReplay(id));
  };

  const pageSize = compactHeight ? 2 : 4;
  const totalPages = Math.max(1, Math.ceil(replays.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const visibleReplays = replays.slice(safePage * pageSize, safePage * pageSize + pageSize);

  return (
    <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      <section className="w-full max-w-3xl max-h-[95dvh] bg-[#10151F] border border-[#00A8FF] flex flex-col overflow-hidden">
        <div className="shrink-0 flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3 border-b border-white/10 bg-[#07090D]">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 sm:w-5 sm:h-5 text-[#00A8FF]" />
            <div>
              <h2 className="font-display text-xl sm:text-3xl font-extrabold text-[#F4F7FB] leading-none">
                REPLAYS GUARDADOS
              </h2>
              <p className="hidden sm:block text-xs text-[#94A3B8]">
                Revê combates completos frame a frame com histórico de comandos e log
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1 bg-[#00A8FF] hover:bg-[#33B9FF] text-[#07090D] font-display text-base sm:text-lg font-bold uppercase cursor-pointer"
          >
            FECHAR
          </button>
        </div>

        <div className="flex-1 overflow-hidden p-2.5 sm:p-4 flex flex-col justify-between gap-2">
          {replays.length === 0 ? (
            <div className="bg-[#07090D] border border-white/10 p-5 sm:p-8 text-center space-y-1.5 my-auto">
              <div className="font-display text-xl sm:text-2xl font-bold text-[#F4F7FB]">
                SEM REPLAYS GUARDADOS
              </div>
              <p className="text-xs text-[#94A3B8]">
                No final de qualquer combate (ou no menu de pausa), clica em &ldquo;Guardar Replay&rdquo; para gravar a partida e analisá-la aqui.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-1.5 sm:space-y-2">
                {visibleReplays.map((r) => {
                  const p1Name = FIGHTER_PROFILES[r.p1Id]?.name || r.p1Name || 'KAEL';
                  const p2Name = FIGHTER_PROFILES[r.p2Id]?.name || r.p2Name || 'VEXA';
                  const stageName = STAGES[r.stage]?.name || String(r.stage || 'Arena');
                  const parsedDate = new Date(r.createdAt);
                  const dateText = Number.isNaN(parsedDate.getTime())
                    ? 'Agora'
                    : parsedDate.toLocaleString('pt-PT', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                  const winnerLabel =
                    r.winnerSlot === 1
                      ? `${p1Name} venceu`
                      : r.winnerSlot === 2
                      ? `${p2Name} venceu`
                      : 'Sessão gravada';

                  return (
                    <div
                      key={r.id}
                      className="bg-[#07090D] border border-white/15 hover:border-[#00A8FF]/70 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center flex-wrap gap-2">
                          <span className="font-display text-xl font-extrabold text-[#00E5FF]">
                            {p1Name}
                          </span>
                          <span className="font-mono-tech text-xs text-[#94A3B8]">
                            {r.p1Rounds} - {r.p2Rounds}
                          </span>
                          <span className="font-display text-xl font-extrabold text-[#A855F7]">
                            {p2Name}
                          </span>
                          <span className="px-2 py-0.5 bg-[#192233] text-[10px] font-mono-tech text-[#F5B700] uppercase">
                            {r.mode}
                          </span>
                        </div>
                        <div className="flex items-center flex-wrap gap-3 text-[11px] text-[#94A3B8]">
                          <span className="inline-flex items-center gap-1 text-[#F4F7FB]">
                            <Trophy className="w-3 h-3 text-[#F5B700]" />
                            {winnerLabel}
                          </span>
                          <span>{stageName}</span>
                          <span>Combo Máx: {r.maxCombo}</span>
                          <span>Dano: {r.totalDamage}</span>
                          <span>
                            {r.durationSeconds}s · {dateText}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onWatchReplay(r)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#00A8FF] hover:bg-[#33B9FF] text-[#07090D] font-display text-base font-extrabold uppercase cursor-pointer"
                        >
                          <Play className="w-4 h-4" />
                          ASSISTIR
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(r.id)}
                          aria-label="Eliminar replay"
                          className="p-2 bg-[#10151F] border border-white/15 hover:border-[#EF4444] text-[#94A3B8] hover:text-[#EF4444] cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between text-xs font-mono-tech text-[#94A3B8] pt-1 border-t border-white/10">
                  <button
                    type="button"
                    disabled={safePage === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    className="px-3 py-1 bg-[#07090D] border border-white/15 disabled:opacity-40 cursor-pointer"
                  >
                    ← Anterior
                  </button>
                  <span>
                    Página {safePage + 1} / {totalPages} ({replays.length} replays)
                  </span>
                  <button
                    type="button"
                    disabled={safePage >= totalPages - 1}
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    className="px-3 py-1 bg-[#07090D] border border-white/15 disabled:opacity-40 cursor-pointer"
                  >
                    Próxima →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
