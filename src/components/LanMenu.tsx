import { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw, Wifi, Server, LogIn } from 'lucide-react';
import { LanConnectionStatus } from '../game/LanClient';
import { LanRoomSummary } from '../game/types';

interface LanMenuProps {
  status: LanConnectionStatus;
  errorMsg: string | null;
  onCreateRoom: (playerName: string) => void;
  onJoinRoom: (roomId: string, playerName: string, ip: string, port: number) => void;
  onBack: () => void;
}

export function LanMenu({
  status,
  errorMsg,
  onCreateRoom,
  onJoinRoom,
  onBack,
}: LanMenuProps) {
  const [playerName, setPlayerName] = useState('Lutador');
  const [hostIpInput, setHostIpInput] = useState('');
  const [portInput, setPortInput] = useState('3000');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [localIps, setLocalIps] = useState<string[]>([]);
  const [localPort, setLocalPort] = useState<number>(3000);
  const [discoveredRooms, setDiscoveredRooms] = useState<LanRoomSummary[]>([]);
  const [scanning, setScanning] = useState(false);

  const fetchLanInfoAndRooms = async () => {
    setScanning(true);
    try {
      const [infoRes, roomsRes] = await Promise.all([
        fetch('/api/lan/info'),
        fetch('/api/lan/rooms'),
      ]);
      if (infoRes.ok) {
        const info = await infoRes.json();
        setLocalIps(info.ips || []);
        setLocalPort(info.port || 3000);
      }
      if (roomsRes.ok) {
        const data = await roomsRes.json();
        setDiscoveredRooms(data.rooms || []);
      }
    } catch {
      // ignore fetch error
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    fetchLanInfoAndRooms();
    const id = window.setInterval(fetchLanInfoAndRooms, 3000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <main className="w-full h-full bg-[#07090D] flex flex-col justify-between px-6 py-5 md:px-12 md:py-8 overflow-y-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-wide text-[#F4F7FB]">
            MULTIPLAYER POR LAN
          </h1>
          <p className="text-sm text-[#94A3B8]">
            Combate em rede local Wi-Fi ou Hotspot sem dependência de Internet externa
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

      <div className="my-auto py-4 max-w-6xl w-full mx-auto space-y-5">
        {/* Player Name & Local Network Info Strip */}
        <div className="bg-[#10151F] border border-white/10 p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label htmlFor="lan-player-name" className="text-xs font-semibold text-[#94A3B8] uppercase">
              Nome do Jogador
            </label>
            <input
              id="lan-player-name"
              type="text"
              value={playerName}
              maxLength={18}
              onChange={(e) => setPlayerName(e.target.value)}
              className="px-3 py-1.5 bg-[#07090D] border border-white/15 focus:border-[#00A8FF] text-sm text-[#F4F7FB] outline-none"
            />
          </div>
          <div className="text-xs font-mono-tech text-[#94A3B8]">
            IPv4 Local:{' '}
            <span className="text-[#00A8FF] font-bold">
              {localIps.length > 0 ? localIps[0] : '127.0.0.1'}
            </span>{' '}
            · Porta: <span className="text-[#F4F7FB] font-bold">{localPort}</span>
          </div>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="p-3 bg-[#2B1216] border border-[#EF4444]/60 text-sm text-[#FCA5A5]"
          >
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Create Room */}
          <section className="lg:col-span-4 bg-[#10151F] border border-white/10 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-[#00A8FF]">
                <Server className="w-5 h-5" />
                <h2 className="font-display text-2xl font-bold text-[#F4F7FB]">CRIAR SALA</h2>
              </div>
              <p className="text-sm text-[#94A3B8] mt-2 leading-relaxed">
                Este dispositivo atua como anfitrião autoritário a 60 ticks por segundo. Partilha o IP ou código de sala com o segundo jogador na mesma rede Wi-Fi/Hotspot.
              </p>
              <div className="mt-4 p-3 bg-[#07090D] border border-white/10 text-xs font-mono-tech space-y-1">
                <div className="text-[#94A3B8]">Endereço de Ligação:</div>
                <div className="text-[#00A8FF] font-bold">
                  {localIps[0] || '127.0.0.1'}:{localPort}
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={status === 'connecting'}
              onClick={() => onCreateRoom(playerName.trim() || 'Anfitrião')}
              className="mt-5 w-full py-3.5 bg-[#00A8FF] hover:bg-[#33B9FF] disabled:opacity-50 text-[#07090D] font-display text-xl font-extrabold tracking-wider uppercase cursor-pointer"
            >
              {status === 'connecting' ? 'A INICIAR...' : 'CRIAR SALA LAN'}
            </button>
          </section>

          {/* Auto-Discovery Rooms */}
          <section className="lg:col-span-4 bg-[#10151F] border border-white/10 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[#00E5FF]">
                  <Wifi className="w-5 h-5" />
                  <h2 className="font-display text-2xl font-bold text-[#F4F7FB]">
                    SALAS NA REDE
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={fetchLanInfoAndRooms}
                  aria-label="Procurar salas na rede"
                  className="p-2 bg-[#07090D] border border-white/15 hover:border-[#00A8FF] text-[#F4F7FB] cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
                </button>
              </div>
              <p className="text-xs text-[#94A3B8] mt-1">
                Procura automática de partidas ativas na rede local
              </p>

              <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                {discoveredRooms.length === 0 ? (
                  <div className="p-4 bg-[#07090D] border border-white/5 text-xs text-[#64748B] text-center">
                    Nenhuma sala aberta encontrada de momento.
                  </div>
                ) : (
                  discoveredRooms.map((room) => (
                    <div
                      key={room.roomId}
                      className="p-3 bg-[#07090D] border border-white/10 flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="text-sm font-bold text-[#F4F7FB]">
                          Sala {room.roomId} · {room.hostName}
                        </div>
                        <div className="text-xs font-mono-tech text-[#94A3B8]">
                          {room.hostIp}:{room.port} · {room.playerCount}/{room.maxPlayers}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={room.playerCount >= 2}
                        onClick={() =>
                          onJoinRoom(
                            room.roomId,
                            playerName.trim() || 'Desafiante',
                            '',
                            room.port
                          )
                        }
                        className="px-3 py-1.5 bg-[#00A8FF] hover:bg-[#33B9FF] disabled:opacity-40 text-[#07090D] text-xs font-bold uppercase cursor-pointer"
                      >
                        Entrar
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* Manual IP / Port / Room Join */}
          <section className="lg:col-span-4 bg-[#10151F] border border-white/10 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-[#A855F7]">
                <LogIn className="w-5 h-5" />
                <h2 className="font-display text-2xl font-bold text-[#F4F7FB]">
                  ENTRAR NA SALA
                </h2>
              </div>
              <p className="text-xs text-[#94A3B8] mt-1">
                Ligação manual por endereço IP, porta e código
              </p>

              <div className="mt-4 space-y-3">
                <div>
                  <label htmlFor="lan-ip" className="block text-xs text-[#94A3B8] mb-1">
                    Endereço IP do Anfitrião (opcional no mesmo servidor)
                  </label>
                  <input
                    id="lan-ip"
                    type="text"
                    placeholder="Ex: 192.168.1.42"
                    value={hostIpInput}
                    onChange={(e) => setHostIpInput(e.target.value)}
                    className="w-full px-3 py-2 bg-[#07090D] border border-white/15 focus:border-[#00A8FF] text-sm font-mono-tech text-[#F4F7FB] outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="lan-port" className="block text-xs text-[#94A3B8] mb-1">
                      Porta
                    </label>
                    <input
                      id="lan-port"
                      type="number"
                      value={portInput}
                      onChange={(e) => setPortInput(e.target.value)}
                      className="w-full px-3 py-2 bg-[#07090D] border border-white/15 focus:border-[#00A8FF] text-sm font-mono-tech text-[#F4F7FB] outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="lan-room-code" className="block text-xs text-[#94A3B8] mb-1">
                      Código da Sala
                    </label>
                    <input
                      id="lan-room-code"
                      type="text"
                      placeholder="Ex: A7K2"
                      value={roomCodeInput}
                      maxLength={6}
                      onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 bg-[#07090D] border border-white/15 focus:border-[#00A8FF] text-sm font-mono-tech text-[#F4F7FB] uppercase outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={status === 'connecting'}
              onClick={() =>
                onJoinRoom(
                  roomCodeInput,
                  playerName.trim() || 'Desafiante',
                  hostIpInput,
                  Number(portInput) || 3000
                )
              }
              className="mt-5 w-full py-3.5 bg-[#A855F7] hover:bg-[#B86FF9] disabled:opacity-50 text-white font-display text-xl font-extrabold tracking-wider uppercase cursor-pointer"
            >
              {status === 'connecting' ? 'A LIGAR...' : 'LIGAR À SALA'}
            </button>
          </section>
        </div>
      </div>

      <div className="text-xs text-[#64748B] flex items-center justify-between">
        <span>Estado da Rede: {status === 'connected' ? 'Ligado' : status === 'connecting' ? 'A ligar...' : 'Pronto'}</span>
        <span>Arquitetura Cliente-Servidor · Sincronização a 60 Ticks</span>
      </div>
    </main>
  );
}
