import { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { CombatLogEntry, PlayerPerformanceStats } from '../game/combatLog';
import { GameMode, InputHistoryEntry } from '../game/types';

interface CombatLogOverlayProps {
  mode: GameMode;
  lanSlot: 1 | 2;
  p1Name: string;
  p2Name: string;
  showInputHistory: boolean;
  showCombatLog: boolean;
  isExpanded: boolean;
  inputHistory: InputHistoryEntry[];
  p2InputHistory: InputHistoryEntry[];
  combatLog: CombatLogEntry[];
  stats: { p1: PlayerPerformanceStats; p2: PlayerPerformanceStats };
  onCloseExpanded: () => void;
  onClearLogs: () => void;
}

type LogTab = 'all' | 'attack' | 'defense' | 'inputs';

function buttonChipClass(btn: string): string {
  switch (btn) {
    case 'L':
      return 'bg-[#00E5FF]/20 text-[#00E5FF] border-[#00E5FF]/50';
    case 'M':
      return 'bg-[#38BDF8]/20 text-[#38BDF8] border-[#38BDF8]/50';
    case 'P':
      return 'bg-[#F5B700]/20 text-[#F5B700] border-[#F5B700]/50';
    case 'E':
      return 'bg-[#A855F7]/20 text-[#A855F7] border-[#A855F7]/50';
    default:
      return 'bg-white/10 text-[#F4F7FB] border-white/25';
  }
}

export function CombatLogOverlay({
  mode,
  lanSlot,
  p1Name,
  p2Name,
  showInputHistory,
  showCombatLog,
  isExpanded,
  inputHistory,
  p2InputHistory,
  combatLog,
  stats,
  onCloseExpanded,
  onClearLogs,
}: CombatLogOverlayProps) {
  const [activeTab, setActiveTab] = useState<LogTab>('all');
  const [inputSlotTab, setInputSlotTab] = useState<1 | 2>(mode === 'lan' ? lanSlot : 1);
  const [logPage, setLogPage] = useState(0);
  const [inputPage, setInputPage] = useState(0);

  const localSlotLabel = mode === 'lan' ? `P${lanSlot}` : 'P1';
  const displayedInputs = inputSlotTab === 2 && mode === 'local2p' ? p2InputHistory : inputHistory;

  const filteredLog = combatLog.filter((item) => {
    if (activeTab === 'attack') return item.category === 'attack' || item.category === 'special';
    if (activeTab === 'defense') return item.category === 'defense';
    return true;
  });

  const pageSize = 7;
  const totalInputPages = Math.max(1, Math.ceil(displayedInputs.length / pageSize));
  const safeInputPage = Math.min(inputPage, totalInputPages - 1);
  const visibleInputs = displayedInputs.slice(safeInputPage * pageSize, safeInputPage * pageSize + pageSize);

  const totalLogPages = Math.max(1, Math.ceil(filteredLog.length / pageSize));
  const safeLogPage = Math.min(logPage, totalLogPages - 1);
  const visibleLog = filteredLog.slice(safeLogPage * pageSize, safeLogPage * pageSize + pageSize);

  return (
    <>
      {/* Compact Non-Intrusive Left-Side Analysis Tape (Input History + Live Log Ticker) */}
      {(showInputHistory || showCombatLog) && !isExpanded && (
        <div
          data-testid="compact-analysis-overlay"
          className="flex flex-col gap-1.5 mt-1 pointer-events-none max-w-[255px]"
        >
          {showInputHistory && inputHistory.length > 0 && (
            <div
              data-testid="input-history-tape"
              className="hidden sm:flex flex-col gap-0.5 bg-[#07090D]/75 border border-white/10 px-2 py-1.5"
            >
              <div className="flex items-center justify-between text-[9px] font-mono-tech text-[#64748B] mb-0.5">
                <span>INPUTS ({localSlotLabel})</span>
                <span>FRAMES</span>
              </div>
              {inputHistory.slice(0, 6).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-2 text-[10px] font-mono-tech leading-tight"
                >
                  <div className="flex items-center gap-1">
                    <span className="w-4 text-center font-bold text-[#F4F7FB]">
                      {entry.dirLabel}
                    </span>
                    {entry.buttons.map((b) => (
                      <span
                        key={b}
                        className={`px-1 border text-[9px] font-bold ${buttonChipClass(b)}`}
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                  <span className="text-[#94A3B8] tabular-nums">{entry.frames}f</span>
                </div>
              ))}
            </div>
          )}

          {showCombatLog && combatLog.length > 0 && (
            <div
              data-testid="combat-log-ticker"
              className="hidden sm:flex flex-col gap-1 bg-[#07090D]/75 border border-white/10 px-2 py-1.5"
            >
              <div className="text-[9px] font-mono-tech text-[#64748B]">COMBAT LOG</div>
              {combatLog.slice(0, 3).map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center justify-between gap-2 text-[10px] font-mono-tech leading-tight"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="px-1 text-[9px] font-bold shrink-0"
                      style={{
                        backgroundColor: `${ev.color}22`,
                        color: ev.color,
                        border: `1px solid ${ev.color}55`,
                      }}
                    >
                      {ev.badge}
                    </span>
                    <span className="text-[#F4F7FB] truncate">{ev.detail}</span>
                  </div>
                  <span className="text-[#64748B] shrink-0 tabular-nums">{ev.timeLabel}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Expanded Combat Log & Performance Analyzer Drawer */}
      {isExpanded && (
        <section
          data-testid="combat-log-panel"
          aria-label="Combat Log e Histórico de Comandos"
          className="pointer-events-auto absolute right-2 sm:right-5 top-14 sm:top-24 z-20 w-[calc(100%-1rem)] max-w-md max-h-[calc(100dvh-4rem)] overflow-hidden bg-[#0B0F18]/95 border border-[#00A8FF] p-2.5 sm:p-3.5 space-y-2 text-xs shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
            <div>
              <h3 className="font-display text-base sm:text-lg font-extrabold text-[#F4F7FB] leading-none">
                COMBAT LOG & ANÁLISE
              </h3>
              <span className="text-[10px] font-mono-tech text-[#94A3B8]">
                {mode === 'lan'
                  ? `Modo LAN · Jogador ${lanSlot}`
                  : mode === 'local2p'
                  ? 'Modo Local 1v1'
                  : mode === 'vs_cpu'
                  ? 'Modo 1v1 vs CPU'
                  : mode === 'combo_trials'
                  ? 'Combo Trials'
                  : 'Modo Treino'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onClearLogs}
                aria-label="Limpar registos"
                className="inline-flex items-center gap-1 px-2 py-1 bg-[#10151F] border border-white/15 hover:border-[#EF4444] text-[10px] font-semibold text-[#F4F7FB] cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                Limpar
              </button>
              <button
                type="button"
                onClick={onCloseExpanded}
                aria-label="Fechar Combat Log"
                className="p-1 bg-[#10151F] border border-white/15 hover:border-[#00A8FF] text-[#F4F7FB] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Performance Summary Cards */}
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono-tech">
            <div className="bg-[#07090D] border border-[#00E5FF]/30 p-1.5 sm:p-2 space-y-0.5">
              <div className="flex justify-between font-bold text-[#00E5FF]">
                <span>P1 · {p1Name}</span>
                <span>{stats.p1.totalDamage} DMG</span>
              </div>
              <div className="flex justify-between text-[#94A3B8]">
                <span>Hits: {stats.p1.hitsLanded}</span>
                <span>Máx: {stats.p1.maxCombo}</span>
              </div>
              <div className="flex justify-between text-[#94A3B8]">
                <span>PG/Blk: {stats.p1.perfectGuards}/{stats.p1.blocks}</span>
                <span>Ctr: {stats.p1.counters}</span>
              </div>
            </div>

            <div className="bg-[#07090D] border border-[#A855F7]/30 p-1.5 sm:p-2 space-y-0.5">
              <div className="flex justify-between font-bold text-[#A855F7]">
                <span>{mode === 'training' || mode === 'vs_cpu' || mode === 'combo_trials' ? 'CPU' : 'P2'} · {p2Name}</span>
                <span>{stats.p2.totalDamage} DMG</span>
              </div>
              <div className="flex justify-between text-[#94A3B8]">
                <span>Hits: {stats.p2.hitsLanded}</span>
                <span>Máx: {stats.p2.maxCombo}</span>
              </div>
              <div className="flex justify-between text-[#94A3B8]">
                <span>PG/Blk: {stats.p2.perfectGuards}/{stats.p2.blocks}</span>
                <span>Ctr: {stats.p2.counters}</span>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="grid grid-cols-4 gap-1 text-[11px] font-semibold">
            {([
              { id: 'all', label: 'Tudo' },
              { id: 'attack', label: 'Golpes' },
              { id: 'defense', label: 'Defesa' },
              { id: 'inputs', label: 'Inputs' },
            ] as { id: LogTab; label: string }[]).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`py-1.5 border cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[#00A8FF] text-[#07090D] border-[#00A8FF]'
                    : 'bg-[#07090D] text-[#F4F7FB] border-white/15'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Paginated Log or Input History (Zero Scroll) */}
          {activeTab === 'inputs' ? (
            <div className="space-y-1.5">
              {mode === 'local2p' && (
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => {
                      setInputSlotTab(1);
                      setInputPage(0);
                    }}
                    className={`py-1 border font-bold cursor-pointer ${
                      inputSlotTab === 1
                        ? 'bg-[#00E5FF]/20 text-[#00E5FF] border-[#00E5FF]'
                        : 'bg-[#07090D] text-[#94A3B8] border-white/15'
                    }`}
                  >
                    Inputs Jogador 1
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInputSlotTab(2);
                      setInputPage(0);
                    }}
                    className={`py-1 border font-bold cursor-pointer ${
                      inputSlotTab === 2
                        ? 'bg-[#A855F7]/20 text-[#A855F7] border-[#A855F7]'
                        : 'bg-[#07090D] text-[#94A3B8] border-white/15'
                    }`}
                  >
                    Inputs Jogador 2
                  </button>
                </div>
              )}
              <div className="overflow-hidden space-y-1 bg-[#07090D] border border-white/10 p-2 font-mono-tech">
                {displayedInputs.length === 0 ? (
                  <div className="text-[#64748B] text-center py-4">
                    Sem comandos registados ainda.
                  </div>
                ) : (
                  visibleInputs.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between text-[11px] border-b border-white/5 pb-1 last:border-b-0"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#64748B] text-[9px] w-9 tabular-nums">
                          T{entry.tick}
                        </span>
                        <span className="w-5 text-center font-bold text-[#F4F7FB]">
                          {entry.dirLabel}
                        </span>
                        {entry.buttons.map((b) => (
                          <span
                            key={b}
                            className={`px-1.5 py-0.5 border text-[10px] font-bold ${buttonChipClass(b)}`}
                          >
                            {b}
                          </span>
                        ))}
                      </div>
                      <span className="text-[#00E5FF] tabular-nums">{entry.frames}f</span>
                    </div>
                  ))
                )}
              </div>
              {totalInputPages > 1 && (
                <div className="flex items-center justify-between text-[10px] font-mono-tech text-[#94A3B8]">
                  <button
                    type="button"
                    disabled={safeInputPage === 0}
                    onClick={() => setInputPage((p) => Math.max(0, p - 1))}
                    className="px-2 py-0.5 bg-[#07090D] border border-white/15 disabled:opacity-40 cursor-pointer"
                  >
                    ← Ant.
                  </button>
                  <span>
                    Pág {safeInputPage + 1}/{totalInputPages}
                  </span>
                  <button
                    type="button"
                    disabled={safeInputPage >= totalInputPages - 1}
                    onClick={() => setInputPage((p) => Math.min(totalInputPages - 1, p + 1))}
                    className="px-2 py-0.5 bg-[#07090D] border border-white/15 disabled:opacity-40 cursor-pointer"
                  >
                    Próx. →
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="overflow-hidden space-y-1 bg-[#07090D] border border-white/10 p-2 font-mono-tech">
                {filteredLog.length === 0 ? (
                  <div className="text-[#64748B] text-center py-4">
                    Sem eventos de combate nesta categoria.
                  </div>
                ) : (
                  visibleLog.map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-center justify-between gap-2 text-[11px] border-b border-white/5 pb-1 last:border-b-0"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[#64748B] text-[9px] shrink-0 tabular-nums">
                          R{ev.roundNumber}·{ev.timeLabel}
                        </span>
                        <span
                          className={`text-[10px] font-bold shrink-0 ${
                            ev.actorSlot === 1 ? 'text-[#00E5FF]' : 'text-[#A855F7]'
                          }`}
                        >
                          {ev.actorName}
                        </span>
                        <span
                          className="px-1 text-[9px] font-bold shrink-0"
                          style={{
                            backgroundColor: `${ev.color}22`,
                            color: ev.color,
                            border: `1px solid ${ev.color}55`,
                          }}
                        >
                          {ev.badge}
                        </span>
                        <span className="text-[#F4F7FB] truncate">{ev.detail}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {totalLogPages > 1 && (
                <div className="flex items-center justify-between text-[10px] font-mono-tech text-[#94A3B8]">
                  <button
                    type="button"
                    disabled={safeLogPage === 0}
                    onClick={() => setLogPage((p) => Math.max(0, p - 1))}
                    className="px-2 py-0.5 bg-[#07090D] border border-white/15 disabled:opacity-40 cursor-pointer"
                  >
                    ← Ant.
                  </button>
                  <span>
                    Pág {safeLogPage + 1}/{totalLogPages}
                  </span>
                  <button
                    type="button"
                    disabled={safeLogPage >= totalLogPages - 1}
                    onClick={() => setLogPage((p) => Math.min(totalLogPages - 1, p + 1))}
                    className="px-2 py-0.5 bg-[#07090D] border border-white/15 disabled:opacity-40 cursor-pointer"
                  >
                    Próx. →
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </>
  );
}
