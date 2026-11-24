import { ArrowLeft, CheckCircle2, Circle } from 'lucide-react';
import { FIGHTER_PROFILES, STAGES } from '../game/constants';
import { FighterId, LobbyState, StageId } from '../game/types';

interface LobbyScreenProps {
  lobby: LobbyState;
  localSlot: 1 | 2;
  pingMs: number;
  statusMessage: string | null;
  onToggleReady: (ready: boolean) => void;
  onSelectFighter: (fighter: FighterId) => void;
  onSelectStage: (stage: StageId) => void;
  onStartMatch: () => void;
  onLeave: () => void;
}

export function LobbyScreen({
  lobby,
  localSlot,
  pingMs,
  statusMessage,
  onToggleReady,
  onSelectFighter,
  onSelectStage,
  onStartMatch,
  onLeave,
}: LobbyScreenProps) {
  const me = lobby.players[localSlot - 1];
  const p1 = lobby.players[0];
  const p2 = lobby.players[1];
  const bothConnected = p1.connected && p2.connected;
  const isHost = localSlot === 1;

  return (
    <main className="w-full h-full bg-[#07090D] flex flex-col justify-between px-4 py-2 sm:px-6 sm:py-3 md:px-10 md:py-4 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-wide text-[#F4F7FB] leading-none">
            LOBBY MULTIPLAYER · SALA <span className="text-[#00A8FF]">{lobby.roomId}</span>
          </h1>
          <p className="text-[11px] sm:text-xs font-mono-tech text-[#94A3B8]">
            IP: {lobby.hostIps[0] || '127.0.0.1'}:{lobby.port} · Latência: {pingMs} ms
          </p>
        </div>
        <button
          type="button"
          onClick={onLeave}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#10151F] border border-white/15 hover:border-[#EF4444] text-xs sm:text-sm font-semibold text-[#F4F7FB] cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Sair da Sala
        </button>
      </div>

      {statusMessage && (
        <div className="my-1 px-3 py-1.5 bg-[#1E293B] border border-[#F5B700]/50 text-[11px] text-[#FDE68A]">
          {statusMessage}
        </div>
      )}

      <div className="my-auto py-1 max-w-6xl w-full mx-auto grid grid-cols-1 sm:grid-cols-12 gap-2.5 md:gap-4">
        {/* Player Slots */}
        {lobby.players.map((pl) => {
          const prof = FIGHTER_PROFILES[pl.fighter];
          const isMe = pl.slot === localSlot;
          return (
            <section
              key={pl.slot}
              className={`sm:col-span-4 bg-[#10151F] border p-2.5 md:p-4 flex flex-col justify-between ${
                pl.connected ? 'border-white/15' : 'border-dashed border-white/10 opacity-75'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono-tech text-[#00A8FF]">
                    JOGADOR {pl.slot} {pl.slot === 1 ? '(ANFITRIÃO)' : '(DESAFIANTE)'}
                  </span>
                  {pl.connected ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#22C55E]">
                      {pl.ready ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                      {pl.ready ? 'Pronto' : 'Ligado'}
                    </span>
                  ) : (
                    <span className="text-[11px] text-[#94A3B8]">A aguardar...</span>
                  )}
                </div>

                <h2 className="font-display text-xl md:text-2xl font-extrabold text-[#F4F7FB] mt-1 leading-none">
                  {pl.name}
                </h2>

                <div className="mt-2 p-2 bg-[#07090D] border border-white/10">
                  <div className="text-[10px] text-[#94A3B8]">Personagem</div>
                  <div className="font-display text-lg md:text-xl font-bold text-[#F4F7FB] leading-tight">
                    {prof.name} · <span className="text-xs font-sans text-[#00A8FF]">{prof.specialMoveName}</span>
                  </div>
                </div>
              </div>

              {isMe && (
                <div className="mt-2 space-y-1.5">
                  <div className="grid grid-cols-2 gap-1.5">
                    {(Object.keys(FIGHTER_PROFILES) as FighterId[]).map((fid) => (
                      <button
                        key={fid}
                        type="button"
                        onClick={() => onSelectFighter(fid)}
                        className={`py-1 text-[11px] font-bold uppercase cursor-pointer border ${
                          pl.fighter === fid
                            ? 'bg-[#00A8FF] text-[#07090D] border-[#00A8FF]'
                            : 'bg-[#07090D] text-[#F4F7FB] border-white/15 hover:border-[#00A8FF]'
                        }`}
                      >
                        {FIGHTER_PROFILES[fid].name}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleReady(!me.ready)}
                    className={`w-full py-2 font-display text-base md:text-lg font-extrabold uppercase cursor-pointer ${
                      me.ready
                        ? 'bg-[#1E293B] text-[#F4F7FB] border border-white/20'
                        : 'bg-[#22C55E] text-[#07090D]'
                    }`}
                  >
                    {me.ready ? 'CANCELAR PRONTO' : 'MARCAR COMO PRONTO'}
                  </button>
                </div>
              )}
            </section>
          );
        })}

        {/* Stage & Match Launch Panel */}
        <section className="sm:col-span-4 bg-[#10151F] border border-white/10 p-2.5 md:p-4 flex flex-col justify-between">
          <div>
            <h2 className="font-display text-lg md:text-2xl font-bold text-[#F4F7FB] leading-none">
              CENÁRIO DA ARENA
            </h2>
            <p className="text-[10px] text-[#94A3B8] mt-0.5">
              {isHost ? 'Seleciona o cenário da partida' : 'Definido pelo anfitrião'}
            </p>

            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {Object.values(STAGES).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  disabled={!isHost}
                  onClick={() => onSelectStage(st.id)}
                  className={`w-full p-2 text-left border transition-colors ${
                    lobby.stage === st.id
                      ? 'bg-[#0B192C] border-[#00A8FF] text-[#F4F7FB]'
                      : 'bg-[#07090D] border-white/10 text-[#94A3B8]'
                  } ${isHost ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <div className="font-display text-sm font-bold leading-tight truncate">{st.name}</div>
                  <div className="text-[10px] opacity-80 truncate">{st.subtitle}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-2.5">
            {isHost ? (
              <button
                type="button"
                disabled={!bothConnected}
                onClick={onStartMatch}
                className="w-full py-2.5 md:py-3.5 bg-[#00A8FF] hover:bg-[#33B9FF] disabled:opacity-40 text-[#07090D] font-display text-lg md:text-2xl font-extrabold tracking-wider uppercase cursor-pointer"
              >
                {bothConnected ? 'ENTRAR NA PARTIDA LAN →' : 'AGUARDAR JOGADOR 2'}
              </button>
            ) : (
              <div className="p-2.5 bg-[#07090D] border border-white/10 text-center text-xs text-[#94A3B8]">
                A aguardar que o Anfitrião entre na partida...
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="text-[11px] text-[#64748B]">
        Sincronização autoritativa a 60 Hz · Deteção automática de desconexões ativa
      </div>
    </main>
  );
}
