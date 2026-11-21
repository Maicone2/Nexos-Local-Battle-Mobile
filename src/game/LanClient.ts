import { FighterId, InputState, LobbyState, MatchState, StageId } from './types';

export type LanConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export interface LanCallbacks {
  onStatusChange?: (status: LanConnectionStatus, error?: string) => void;
  onLobbyUpdate?: (lobby: LobbyState) => void;
  onMatchState?: (state: MatchState) => void;
  onPingUpdate?: (pingMs: number) => void;
  onOpponentDisconnected?: () => void;
}

export class LanClient {
  private ws: WebSocket | null = null;
  private callbacks: LanCallbacks = {};
  private roomId: string | null = null;
  private playerSlot: 1 | 2 | null = null;
  private playerName = 'Jogador';
  private seq = 0;
  private pingTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private lastEndpoint: string | null = null;
  private manualDisconnect = false;
  public status: LanConnectionStatus = 'disconnected';
  public pingMs = 0;

  setCallbacks(callbacks: LanCallbacks): void {
    this.callbacks = callbacks;
  }

  getSlot(): 1 | 2 | null {
    return this.playerSlot;
  }

  getRoomId(): string | null {
    return this.roomId;
  }

  private buildWsUrl(ip?: string, port?: number): string {
    if (ip && ip.trim().length > 0) {
      const cleanIp = ip.trim().replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '').split('/')[0];
      const p = port || 3000;
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return cleanIp.includes(':') ? `${proto}//${cleanIp}/ws` : `${proto}//${cleanIp}:${p}/ws`;
    }
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}/ws`;
  }

  connectAndCreateRoom(playerName: string, stage: StageId): void {
    this.manualDisconnect = false;
    this.playerName = playerName;
    const url = this.buildWsUrl();
    this.openSocket(url, () => {
      this.send({ type: 'create_room', playerName, stage });
    });
  }

  connectAndJoinRoom(roomId: string, playerName: string, ip?: string, port?: number): void {
    this.manualDisconnect = false;
    this.playerName = playerName;
    const url = this.buildWsUrl(ip, port);
    this.openSocket(url, () => {
      this.send({ type: 'join_room', roomId: roomId.trim().toUpperCase(), playerName });
    });
  }

  private openSocket(url: string, onOpenSend: () => void): void {
    this.cleanupSocketOnly();
    this.lastEndpoint = url;
    this.setStatus('connecting');

    try {
      const ws = new WebSocket(url);
      this.ws = ws;

      ws.onopen = () => {
        this.setStatus('connected');
        onOpenSend();
        this.startPingLoop();
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(String(event.data));
          this.handleMessage(msg);
        } catch {
          // Ignore malformed packet
        }
      };

      ws.onerror = () => {
        this.setStatus('error', 'Falha na ligação ao servidor LAN.');
      };

      ws.onclose = () => {
        this.stopPingLoop();
        if (!this.manualDisconnect && this.roomId) {
          this.setStatus('reconnecting', 'Ligação perdida. A tentar reconectar...');
          this.scheduleReconnect();
        } else if (!this.manualDisconnect && this.status !== 'error') {
          this.setStatus('disconnected');
        }
      };
    } catch {
      this.setStatus('error', 'Endereço de rede inválido.');
    }
  }

  private handleMessage(msg: Record<string, unknown>): void {
    switch (msg.type) {
      case 'room_joined': {
        this.roomId = String(msg.roomId);
        this.playerSlot = msg.slot === 1 ? 1 : 2;
        if (msg.lobby) {
          this.callbacks.onLobbyUpdate?.(msg.lobby as LobbyState);
        }
        break;
      }
      case 'lobby_update': {
        this.callbacks.onLobbyUpdate?.(msg.lobby as LobbyState);
        break;
      }
      case 'match_state': {
        this.callbacks.onMatchState?.(msg.state as MatchState);
        break;
      }
      case 'pong': {
        const sentAt = Number(msg.sentAt || 0);
        if (sentAt > 0) {
          this.pingMs = Math.max(1, Math.round(performance.now() - sentAt));
          this.callbacks.onPingUpdate?.(this.pingMs);
        }
        break;
      }
      case 'opponent_disconnected': {
        this.callbacks.onOpponentDisconnected?.();
        break;
      }
      case 'error': {
        this.setStatus('error', String(msg.message || 'Erro de rede LAN.'));
        break;
      }
    }
  }

  private startPingLoop(): void {
    this.stopPingLoop();
    this.pingTimer = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping', sentAt: performance.now() });
      }
    }, 1500);
  }

  private stopPingLoop(): void {
    if (this.pingTimer !== null) {
      window.clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null || !this.lastEndpoint || !this.roomId) return;
    const savedRoom = this.roomId;
    const savedSlot = this.playerSlot;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      if (this.manualDisconnect || !this.lastEndpoint) return;
      this.openSocket(this.lastEndpoint, () => {
        this.send({
          type: 'rejoin_room',
          roomId: savedRoom,
          slot: savedSlot,
          playerName: this.playerName,
        });
      });
    }, 1500);
  }

  setReady(ready: boolean): void {
    this.send({ type: 'lobby_ready', ready });
  }

  selectFighter(fighter: FighterId): void {
    this.send({ type: 'select_fighter', fighter });
  }

  selectStage(stage: StageId): void {
    this.send({ type: 'select_stage', stage });
  }

  startMatch(): void {
    this.send({ type: 'start_match' });
  }

  rematch(): void {
    this.send({ type: 'rematch' });
  }

  sendInput(input: InputState): void {
    this.seq++;
    this.send({
      type: 'input',
      seq: this.seq,
      input,
    });
  }

  private send(payload: Record<string, unknown>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  private setStatus(status: LanConnectionStatus, error?: string): void {
    this.status = status;
    this.callbacks.onStatusChange?.(status, error);
  }

  private cleanupSocketOnly(): void {
    this.stopPingLoop();
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
  }

  disconnect(): void {
    this.manualDisconnect = true;
    this.send({ type: 'leave_room' });
    this.roomId = null;
    this.playerSlot = null;
    this.cleanupSocketOnly();
    this.setStatus('disconnected');
  }
}

export const lanClient = new LanClient();
