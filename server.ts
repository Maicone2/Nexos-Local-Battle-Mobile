import express from 'express';
import http from 'http';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';
import { WebSocketServer, WebSocket } from 'ws';
import { createMatchState, stepMatchSimulation } from './src/game/CombatSystem';
import { EMPTY_INPUT, FIXED_FPS } from './src/game/constants';
import { FighterId, InputState, LanRoomSummary, LobbyState, MatchState, StageId } from './src/game/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);

function getLocalIpv4Addresses(): string[] {
  const nets = os.networkInterfaces();
  const ips: string[] = [];
  for (const ifaceList of Object.values(nets)) {
    if (!ifaceList) continue;
    for (const net of ifaceList) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  return ips.length > 0 ? ips : ['127.0.0.1'];
}

interface RoomClient {
  ws: WebSocket;
  slot: 1 | 2;
  name: string;
  fighter: FighterId;
  ready: boolean;
  connected: boolean;
  lastSeq: number;
  input: InputState;
}

interface LanRoom {
  roomId: string;
  stage: StageId;
  p1: RoomClient;
  p2: RoomClient | null;
  matchState: MatchState | null;
  loopTimer: NodeJS.Timeout | null;
  broadcastTick: number;
}

const rooms = new Map<string, LanRoom>();
const socketMeta = new Map<WebSocket, { roomId: string; slot: 1 | 2 }>();

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? generateRoomId() : code;
}

function buildLobbyState(room: LanRoom): LobbyState {
  const ips = getLocalIpv4Addresses();
  return {
    roomId: room.roomId,
    hostIps: ips,
    port: PORT,
    stage: room.stage,
    matchStarted: room.matchState !== null,
    players: [
      {
        slot: 1,
        name: room.p1.name,
        fighter: room.p1.fighter,
        ready: room.p1.ready,
        connected: room.p1.connected,
      },
      room.p2
        ? {
            slot: 2,
            name: room.p2.name,
            fighter: room.p2.fighter,
            ready: room.p2.ready,
            connected: room.p2.connected,
          }
        : {
            slot: 2,
            name: 'A aguardar Jogador 2...',
            fighter: 'vexa',
            ready: false,
            connected: false,
          },
    ],
  };
}

function sendJson(ws: WebSocket | null | undefined, payload: unknown): void {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastLobby(room: LanRoom): void {
  const lobby = buildLobbyState(room);
  sendJson(room.p1.ws, { type: 'lobby_update', lobby });
  if (room.p2) {
    sendJson(room.p2.ws, { type: 'lobby_update', lobby });
  }
}

function stopRoomMatch(room: LanRoom): void {
  if (room.loopTimer) {
    clearInterval(room.loopTimer);
    room.loopTimer = null;
  }
  room.matchState = null;
}

function startRoomMatch(room: LanRoom): void {
  if (!room.p2 || !room.p2.connected) return;
  stopRoomMatch(room);

  room.matchState = createMatchState({
    mode: 'lan',
    stage: room.stage,
    p1Id: room.p1.fighter,
    p2Id: room.p2.fighter,
    p1Name: room.p1.name,
    p2Name: room.p2.name,
  });
  room.broadcastTick = 0;

  broadcastLobby(room);
  sendJson(room.p1.ws, { type: 'match_state', state: room.matchState });
  sendJson(room.p2.ws, { type: 'match_state', state: room.matchState });

  const tickMs = Math.round(1000 / FIXED_FPS);
  room.loopTimer = setInterval(() => {
    if (!room.matchState) return;
    stepMatchSimulation(
      room.matchState,
      room.p1.input,
      room.p2 ? room.p2.input : EMPTY_INPUT
    );
    room.broadcastTick++;
    // Send authoritative state at 30Hz (every 2 ticks) or immediately on combat events
    const hasEvent = room.matchState.events.length > 0;
    if (hasEvent || room.broadcastTick % 2 === 0 || room.matchState.phase !== 'fighting') {
      const payload = { type: 'match_state', state: room.matchState };
      sendJson(room.p1.ws, payload);
      if (room.p2) sendJson(room.p2.ws, payload);
    }
  }, tickMs);
}

function sanitizeInput(raw: unknown): InputState {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    left: Boolean(obj.left),
    right: Boolean(obj.right),
    up: Boolean(obj.up),
    down: Boolean(obj.down),
    light: Boolean(obj.light),
    heavy: Boolean(obj.heavy),
    special: Boolean(obj.special),
    block: Boolean(obj.block),
  };
}

function cleanupSocket(ws: WebSocket): void {
  const meta = socketMeta.get(ws);
  if (!meta) return;
  socketMeta.delete(ws);

  const room = rooms.get(meta.roomId);
  if (!room) return;

  if (meta.slot === 1) {
    room.p1.connected = false;
    room.p1.input = { ...EMPTY_INPUT };
    if (room.p2 && room.p2.connected) {
      sendJson(room.p2.ws, { type: 'opponent_disconnected' });
      broadcastLobby(room);
    }
  } else if (room.p2) {
    room.p2.connected = false;
    room.p2.input = { ...EMPTY_INPUT };
    if (room.p1.connected) {
      sendJson(room.p1.ws, { type: 'opponent_disconnected' });
      broadcastLobby(room);
    }
  }

  // Remove empty rooms after brief grace window for reconnect
  setTimeout(() => {
    const current = rooms.get(meta.roomId);
    if (!current) return;
    const p1Alive = current.p1.connected;
    const p2Alive = Boolean(current.p2?.connected);
    if (!p1Alive && !p2Alive) {
      stopRoomMatch(current);
      rooms.delete(meta.roomId);
    }
  }, 15000);
}

async function addFolderToZip(zip: JSZip, folderPath: string, zipPrefix: string): Promise<void> {
  const entries = fs.readdirSync(folderPath, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(folderPath, entry.name);
    const rel = zipPrefix ? `${zipPrefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      await addFolderToZip(zip, full, rel);
    } else {
      zip.file(rel, fs.readFileSync(full));
    }
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/lan/info', (_req, res) => {
    res.json({
      ips: getLocalIpv4Addresses(),
      port: PORT,
    });
  });

  app.get('/api/lan/rooms', (_req, res) => {
    const ips = getLocalIpv4Addresses();
    const list: LanRoomSummary[] = [];
    for (const room of rooms.values()) {
      list.push({
        roomId: room.roomId,
        hostName: room.p1.name,
        hostIp: ips[0] || '127.0.0.1',
        port: PORT,
        playerCount: room.p2 && room.p2.connected ? 2 : 1,
        maxPlayers: 2,
        status: room.matchState ? 'in_match' : room.p2?.connected ? 'lobby' : 'waiting',
        stage: room.stage,
      });
    }
    res.json({ rooms: list });
  });

  app.get('/api/android-project.zip', async (_req, res) => {
    const androidDir = path.join(__dirname, 'android-project');
    if (!fs.existsSync(androidDir)) {
      res.status(404).json({ error: 'Projeto Android não encontrado.' });
      return;
    }
    const zip = new JSZip();
    await addFolderToZip(zip, androidDir, 'neon-clash-arena-lan-android');
    const buffer = await zip.generateAsync({ type: 'nodebuffer' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="neon-clash-arena-lan-android.zip"');
    res.send(buffer);
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    ws.on('message', (data) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(String(data));
      } catch {
        return;
      }

      const type = String(msg.type || '');
      if (type === 'ping') {
        sendJson(ws, { type: 'pong', sentAt: msg.sentAt });
        return;
      }

      if (type === 'create_room') {
        cleanupSocket(ws);
        const roomId = generateRoomId();
        const playerName = String(msg.playerName || 'Anfitrião').slice(0, 18);
        const stage: StageId = msg.stage === 'energy_dock' ? 'energy_dock' : 'orbital_arena';

        const room: LanRoom = {
          roomId,
          stage,
          p1: {
            ws,
            slot: 1,
            name: playerName,
            fighter: 'kael',
            ready: false,
            connected: true,
            lastSeq: 0,
            input: { ...EMPTY_INPUT },
          },
          p2: null,
          matchState: null,
          loopTimer: null,
          broadcastTick: 0,
        };
        rooms.set(roomId, room);
        socketMeta.set(ws, { roomId, slot: 1 });
        sendJson(ws, { type: 'room_joined', roomId, slot: 1, lobby: buildLobbyState(room) });
        return;
      }

      if (type === 'join_room') {
        cleanupSocket(ws);
        const requestedId = String(msg.roomId || '').trim().toUpperCase();
        // If no roomId provided, join the first open waiting room automatically
        let room = requestedId ? rooms.get(requestedId) : undefined;
        if (!requestedId) {
          for (const candidate of rooms.values()) {
            if (!candidate.p2 || !candidate.p2.connected) {
              room = candidate;
              break;
            }
          }
        }
        if (!room) {
          sendJson(ws, { type: 'error', message: 'Sala LAN não encontrada.' });
          return;
        }
        if (room.p2 && room.p2.connected) {
          sendJson(ws, { type: 'error', message: 'A sala já está completa (2/2 jogadores).' });
          return;
        }

        const playerName = String(msg.playerName || 'Desafiante').slice(0, 18);
        room.p2 = {
          ws,
          slot: 2,
          name: playerName,
          fighter: 'vexa',
          ready: false,
          connected: true,
          lastSeq: 0,
          input: { ...EMPTY_INPUT },
        };
        socketMeta.set(ws, { roomId: room.roomId, slot: 2 });
        sendJson(ws, { type: 'room_joined', roomId: room.roomId, slot: 2, lobby: buildLobbyState(room) });
        broadcastLobby(room);
        return;
      }

      if (type === 'rejoin_room') {
        const roomId = String(msg.roomId || '').toUpperCase();
        const slot = msg.slot === 1 ? 1 : 2;
        const room = rooms.get(roomId);
        if (!room) {
          sendJson(ws, { type: 'error', message: 'Sala expirada.' });
          return;
        }
        const target = slot === 1 ? room.p1 : room.p2;
        if (!target) return;
        target.ws = ws;
        target.connected = true;
        socketMeta.set(ws, { roomId, slot });
        sendJson(ws, { type: 'room_joined', roomId, slot, lobby: buildLobbyState(room) });
        if (room.matchState) {
          sendJson(ws, { type: 'match_state', state: room.matchState });
        }
        broadcastLobby(room);
        return;
      }

      const meta = socketMeta.get(ws);
      if (!meta) return;
      const room = rooms.get(meta.roomId);
      if (!room) return;
      const client = meta.slot === 1 ? room.p1 : room.p2;
      if (!client) return;

      switch (type) {
        case 'leave_room':
          cleanupSocket(ws);
          break;
        case 'lobby_ready':
          client.ready = Boolean(msg.ready);
          broadcastLobby(room);
          break;
        case 'select_fighter':
          client.fighter = msg.fighter === 'vexa' ? 'vexa' : 'kael';
          broadcastLobby(room);
          break;
        case 'select_stage':
          if (meta.slot === 1) {
            room.stage = msg.stage === 'energy_dock' ? 'energy_dock' : 'orbital_arena';
            broadcastLobby(room);
          }
          break;
        case 'start_match':
          if (meta.slot === 1 && room.p2?.connected) {
            startRoomMatch(room);
          }
          break;
        case 'rematch':
          if (room.p2?.connected) {
            startRoomMatch(room);
          }
          break;
        case 'input': {
          const seq = Number(msg.seq || 0);
          if (seq > client.lastSeq) {
            client.lastSeq = seq;
            client.input = sanitizeInput(msg.input);
          }
          break;
        }
      }
    });

    ws.on('close', () => cleanupSocket(ws));
    ws.on('error', () => cleanupSocket(ws));
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    const ips = getLocalIpv4Addresses();
    console.log(`NEON CLASH: ARENA LAN server listening on http://0.0.0.0:${PORT} (LAN: ${ips.join(', ')})`);
  });
}

startServer();
