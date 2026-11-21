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
    <main className="w-full h-full bg-[#07090D] flex flex-col justify-between px-6 py-5 md:px-12 md:py-8 overflow-y-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-wide text-[#F4F7FB]">
            LOBBY MULTIPLAYER · SALA <span className="text-[#00A8FF]">{lobby.roomId}</span>
          </h1>
          <p className="text-sm font-mono-tech text-[#94A3B8]">
            IP do Anfitrião: {lobby.hostIps[0] || '127.0.0.1'}:{lobby.port} · Latência: {pingMs} ms
          </p>
        </div>
        <button
          type="button"
          onClick={onLeave}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#10151F] border border-white/15 hover:border-[#EF4444] text-sm font-semibold text-[#F4F7FB] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Sair da Sala
        </button>
      </div>

      {statusMessage && (
        <div className="my-2 p-3 bg-[#1E293B] border border-[#F5B700]/50 text-xs text-[#FDE68A]">
          {statusMessage}
        </div>
      )}

      <div className="my-auto py-4 max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Player Slots */}
        {lobby.players.map((pl) => {
          const prof = FIGHTER_PROFILES[pl.fighter];
          const isMe = pl.slot === localSlot;
          return (
            <section
              key={pl.slot}
              className={`lg:col-span-4 bg-[#10151F] border p-5 flex flex-col justify-between ${
                pl.connected ? 'border-white/15' : 'border-dashed border-white/10 opacity-75'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono-tech text-[#00A8FF]">
                    JOGADOR {pl.slot} {pl.slot === 1 ? '(ANFITRIÃO)' : '(DESAFIANTE)'}
                  </span>
                  {pl.connected ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#22C55E]">
                      {pl.ready ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                      {pl.ready ? 'Pronto' : 'Ligado'}
                    </span>
                  ) : (
                    <span className="text-xs text-[#94A3B8]">A aguardar...</span>
                  )}
                </div>

                <h2 className="font-display text-3xl font-extrabold text-[#F4F7FB] mt-2">
                  {pl.name}
                </h2>

                <div className="mt-4 p-3 bg-[#07090D] border border-white/10">
                  <div className="text-xs text-[#94A3B8]">Personagem Selecionada</div>
                  <div className="font-display text-2xl font-bold text-[#F4F7FB]">
                    {prof.name} · <span className="text-sm font-sans text-[#00A8FF]">{prof.specialMoveName}</span>
                  </div>
                </div>
              </div>

              {isMe && (
                <div className="mt-5 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {(['kael', 'vexa'] as FighterId[]).map((fid) => (
                      <button
                        key={fid}
                        type="button"
                        onClick={() => onSelectFighter(fid)}
                        className={`py-2.5 text-sm font-bold uppercase cursor-pointer border ${
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
                    className={`w-full py-3 font-display text-xl font-extrabold uppercase cursor-pointer ${
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
        <section className="lg:col-span-4 bg-[#10151F] border border-white/10 p-5 flex flex-col justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#F4F7FB]">CENÁRIO DA ARENA</h2>
            <p className="text-xs text-[#94A3B8] mt-1">
              {isHost ? 'Seleciona o cenário da partida' : 'Definido pelo anfitrião'}
            </p>

            <div className="mt-4 space-y-2">
              {Object.values(STAGES).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  disabled={!isHost}
                  onClick={() => onSelectStage(st.id)}
                  className={`w-full p-3 text-left border transition-colors ${
                    lobby.stage === st.id
                      ? 'bg-[#0B192C] border-[#00A8FF] text-[#F4F7FB]'
                      : 'bg-[#07090D] border-white/10 text-[#94A3B8]'
                  } ${isHost ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <div className="font-display text-lg font-bold">{st.name}</div>
                  <div className="text-xs opacity-80">{st.subtitle}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            {isHost ? (
              <button
                type="button"
                disabled={!bothConnected}
                onClick={onStartMatch}
                className="w-full py-4 bg-[#00A8FF] hover:bg-[#33B9FF] disabled:opacity-40 text-[#07090D] font-display text-2xl font-extrabold tracking-wider uppercase cursor-pointer"
              >
                {bothConnected ? 'INICIAR COMBATE LAN' : 'AGUARDAR JOGADOR 2'}
              </button>
            ) : (
              <div className="p-3 bg-[#07090D] border border-white/10 text-center text-sm text-[#94A3B8]">
                A aguardar que o Anfitrião inicie o combate...
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="text-xs text-[#64748B]">
        Sincronização autoritativa a 60 Hz · Deteção automática de desconexões ativa
      </div>
    </main>
  );
}
