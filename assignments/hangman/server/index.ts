/**
 * Bun HTTP + WebSocket server for Hangman multiplayer game
 * Serves static files, provides word list API, and handles multiplayer sync
 */

import { serve, type ServerWebSocket } from "bun";
import { getRandomWord } from "../src/words";
import { RoomManager } from "../src/multiplayer/room";
import { leaderboardManager, type LeaderboardEntry } from "./leaderboard";
import { replayManager } from "./replays";
import type {
  MultiplayerMessage,
  MessageType,
  PlayerInfo,
  RoomCreatedPayload,
  RoomJoinedPayload,
  RoomUpdatedPayload,
  GameStartedPayload,
  LetterGuessedPayload,
  TurnChangedPayload,
  RoundCompletePayload,
  CreateRoomPayload,
  JoinRoomPayload,
  JoinAsSpectatorPayload,
  LetterGuessPayload,
  ChatPayload,
  SpectatorJoinedPayload,
  SpectatorInfo,
} from "../src/multiplayer/types";
import { generatePlayerId } from "../src/multiplayer/types";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const roomManager = new RoomManager();

// Track WebSocket connections with player info
interface WebSocketData {
  playerId: string;
  roomCode: string | null;
  isSpectator: boolean;
}

const playerSockets = new Map<string, ServerWebSocket<WebSocketData>>();

// Helper to send JSON message
function sendMessage(ws: ServerWebSocket<WebSocketData>, type: MessageType, payload: unknown): void {
  const message: MultiplayerMessage = {
    type,
    payload,
    timestamp: Date.now(),
  };
  ws.send(JSON.stringify(message));
}

// Broadcast to all players in a room
function broadcastToRoom(roomCode: string, type: MessageType, payload: unknown, excludePlayerId?: string): void {
  const room = roomManager.getRoom(roomCode);
  if (!room) return;

  const message: MultiplayerMessage = {
    type,
    payload,
    roomCode,
    timestamp: Date.now(),
  };

  room.players.forEach((player, playerId) => {
    if (playerId === excludePlayerId) return;
    const ws = playerSockets.get(playerId);
    if (ws) {
      ws.send(JSON.stringify(message));
    }
  });
}

// Handle WebSocket messages
function handleMessage(ws: ServerWebSocket<WebSocketData>, message: string): void {
  try {
    const msg: MultiplayerMessage = JSON.parse(message);
    const data = ws.data;

    switch (msg.type) {
      case 'create-room':
        handleCreateRoom(ws, msg.payload as CreateRoomPayload);
        break;

      case 'join-room':
        handleJoinRoom(ws, msg.payload as JoinRoomPayload);
        break;

      case 'leave-room':
        handleLeaveRoom(ws);
        break;

      case 'start-game':
        handleStartGame(ws);
        break;

      case 'letter-guess':
        handleLetterGuess(ws, msg.payload as LetterGuessPayload);
        break;

      case 'next-round':
        handleNextRound(ws);
        break;

      case 'chat':
        handleChat(ws, msg.payload as { message: string });
        break;

      case 'ping':
        // Keepalive - just respond with pong
        sendMessage(ws, 'pong' as MessageType, {});
        break;

      default:
        sendMessage(ws, 'error', { message: 'Unknown message type', code: 'UNKNOWN_TYPE' });
    }
  } catch (error) {
    console.error('Failed to handle message:', error);
    sendMessage(ws, 'error', { message: 'Failed to process message', code: 'PROCESSING_ERROR' });
  }
}

function handleCreateRoom(ws: ServerWebSocket<WebSocketData>, payload: CreateRoomPayload): void {
  const playerId = generatePlayerId();
  const room = roomManager.createRoom(playerId, payload.playerName, payload.playerColor);

  if (!room) {
    sendMessage(ws, 'error', { message: 'Failed to create room', code: 'CREATE_FAILED' });
    return;
  }

  // Update WebSocket data
  ws.data.playerId = playerId;
  ws.data.roomCode = room.code;
  playerSockets.set(playerId, ws);

  const responsePayload: RoomCreatedPayload = {
    roomCode: room.code,
    playerId,
    players: roomManager.getPlayers(room.code),
  };

  sendMessage(ws, 'room-created', responsePayload);
  console.log(`Room ${room.code} created by ${payload.playerName}`);
}

function handleJoinRoom(ws: ServerWebSocket<WebSocketData>, payload: JoinRoomPayload): void {
  const playerId = generatePlayerId();
  const room = roomManager.joinRoom(payload.roomCode, playerId, payload.playerName, payload.playerColor);

  if (!room) {
    sendMessage(ws, 'error', { message: 'Room not found or full', code: 'JOIN_FAILED' });
    return;
  }

  // Update WebSocket data
  ws.data.playerId = playerId;
  ws.data.roomCode = room.code;
  playerSockets.set(playerId, ws);

  const players = roomManager.getPlayers(room.code);

  // Send room-joined to the joining player
  const joinedPayload: RoomJoinedPayload = {
    roomCode: room.code,
    playerId,
    players,
    isGameStarted: room.status === 'playing',
    currentRound: room.currentRound || undefined,
  };
  sendMessage(ws, 'room-joined', joinedPayload);

  // Broadcast player-joined to others
  broadcastToRoom(room.code, 'room-updated', {
    roomCode: room.code,
    players,
    status: room.status,
  } as RoomUpdatedPayload, playerId);

  console.log(`${payload.playerName} joined room ${room.code}`);
}

function handleLeaveRoom(ws: ServerWebSocket<WebSocketData>): void {
  const data = ws.data;
  if (!data.playerId || !data.roomCode) return;

  const result = roomManager.leaveRoom(data.playerId);
  playerSockets.delete(data.playerId);

  if (result && result.room.players.size > 0) {
    // Notify remaining players
    broadcastToRoom(data.roomCode, 'room-updated', {
      roomCode: data.roomCode,
      players: roomManager.getPlayers(data.roomCode),
      status: result.room.status,
    } as RoomUpdatedPayload);
  }

  ws.data.roomCode = null;
  console.log(`Player ${data.playerId} left room ${data.roomCode}`);
}

function handleStartGame(ws: ServerWebSocket<WebSocketData>): void {
  const data = ws.data;
  if (!data.roomCode) return;

  const room = roomManager.getRoom(data.roomCode);
  if (!room || room.hostId !== data.playerId) {
    sendMessage(ws, 'error', { message: 'Only the host can start the game', code: 'NOT_HOST' });
    return;
  }

  const round = roomManager.startGame(data.roomCode);
  if (!round) {
    sendMessage(ws, 'error', { message: 'Failed to start game', code: 'START_FAILED' });
    return;
  }

  const players = roomManager.getPlayers(data.roomCode);
  const payload: GameStartedPayload = { round, players };

  // Broadcast to all players
  broadcastToRoom(data.roomCode, 'game-started', payload);
  console.log(`Game started in room ${data.roomCode}`);
}

function handleLetterGuess(ws: ServerWebSocket<WebSocketData>, payload: LetterGuessPayload): void {
  const data = ws.data;
  if (!data.roomCode || !data.playerId) return;

  const room = roomManager.getRoom(data.roomCode);
  if (!room || !room.currentRound) {
    sendMessage(ws, 'error', { message: 'No active game', code: 'NO_GAME' });
    return;
  }

  if (room.currentRound.currentGuesserId !== data.playerId) {
    sendMessage(ws, 'error', { message: 'Not your turn', code: 'NOT_YOUR_TURN' });
    return;
  }

  const letter = payload.letter.toUpperCase();
  const result = roomManager.processGuess(data.roomCode, data.playerId, letter);

  if (!result) {
    sendMessage(ws, 'error', { message: 'Invalid guess', code: 'INVALID_GUESS' });
    return;
  }

  const player = room.players.get(data.playerId);
  const playerName = player?.name || 'Unknown';

  // Broadcast the guess result
  const guessedPayload: LetterGuessedPayload = {
    letter,
    playerId: data.playerId,
    playerName,
    isCorrect: result.isCorrect,
    revealedLetters: result.round.revealedLetters,
    wrongGuesses: result.round.wrongGuesses,
  };
  broadcastToRoom(data.roomCode, 'letter-guessed', guessedPayload);

  // Check if round complete
  if (result.round.isComplete) {
    const completePayload: RoundCompletePayload = {
      word: result.round.word,
      isWon: result.round.isWon,
      playerScores: Array.from(room.players.values()).map(p => ({
        playerId: p.id,
        score: p.score,
      })),
    };
    broadcastToRoom(data.roomCode, 'round-complete', completePayload);
  } else if (!result.isCorrect) {
    // Turn changed
    const nextPlayer = room.players.get(result.nextPlayerId);
    const turnPayload: TurnChangedPayload = {
      currentTurnPlayerId: result.nextPlayerId,
      currentTurnPlayerName: nextPlayer?.name || 'Unknown',
    };
    broadcastToRoom(data.roomCode, 'turn-changed', turnPayload);
  }
}

function handleNextRound(ws: ServerWebSocket<WebSocketData>): void {
  const data = ws.data;
  if (!data.roomCode) return;

  const room = roomManager.getRoom(data.roomCode);
  if (!room || room.hostId !== data.playerId) {
    sendMessage(ws, 'error', { message: 'Only the host can start next round', code: 'NOT_HOST' });
    return;
  }

  const round = roomManager.nextRound(data.roomCode);
  if (!round) {
    sendMessage(ws, 'error', { message: 'Failed to start next round', code: 'NEXT_ROUND_FAILED' });
    return;
  }

  const players = roomManager.getPlayers(data.roomCode);
  const payload: GameStartedPayload = { round, players };
  broadcastToRoom(data.roomCode, 'game-started', payload);
}

function handleChat(ws: ServerWebSocket<WebSocketData>, payload: { message: string }): void {
  const data = ws.data;
  if (!data.roomCode || !data.playerId) return;

  const room = roomManager.getRoom(data.roomCode);
  if (!room) return;

  const player = room.players.get(data.playerId);
  broadcastToRoom(data.roomCode, 'chat', {
    message: payload.message,
    playerName: player?.name || 'Unknown',
  });
}

// Handle WebSocket close
function handleClose(ws: ServerWebSocket<WebSocketData>): void {
  const data = ws.data;
  if (data.playerId) {
    roomManager.setPlayerDisconnected(data.playerId);
    playerSockets.delete(data.playerId);

    if (data.roomCode) {
      const room = roomManager.getRoom(data.roomCode);
      if (room) {
        broadcastToRoom(data.roomCode, 'room-updated', {
          roomCode: data.roomCode,
          players: roomManager.getPlayers(data.roomCode),
          status: room.status,
        } as RoomUpdatedPayload);
      }
    }
  }
}

// Create HTTP + WebSocket server
const server = serve({
  port: PORT,

  async fetch(req, server) {
    const url = new URL(req.url);

    // WebSocket upgrade
    if (url.pathname === "/ws") {
      const success = server.upgrade(req, {
        data: { playerId: '', roomCode: null },
      } as any);
      if (success) return undefined; // Upgrade handled
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    // API endpoint: GET /api/word?difficulty=N
    if (url.pathname === "/api/word") {
      const difficultyParam = url.searchParams.get("difficulty");
      const difficulty = difficultyParam ? parseInt(difficultyParam, 10) : 1;
      
      const wordEntry = getRandomWord(difficulty);
      
      return new Response(JSON.stringify(wordEntry), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Serve static files from /dist
    if (url.pathname.startsWith("/dist/")) {
      const filePath = url.pathname.slice(1); // Remove leading /
      const file = Bun.file(filePath);
      
      if (await file.exists()) {
        return new Response(file);
      }
      
      return new Response("Not Found", { status: 404 });
    }

    // Serve static files from /public
    if (url.pathname.startsWith("/public/")) {
      const filePath = url.pathname.slice(1); // Remove leading /
      const file = Bun.file(filePath);
      
      if (await file.exists()) {
        return new Response(file);
      }
      
      return new Response("Not Found", { status: 404 });
    }

    // Serve index.html for root
    if (url.pathname === "/" || url.pathname === "/index.html") {
      const file = Bun.file("public/index.html");
      
      if (await file.exists()) {
        return new Response(file);
      }
      
      return new Response("index.html not found", { status: 404 });
    }

    // Serve dist/main.js as fallback for game
    if (url.pathname === "/main.js" || url.pathname === "/dist/main.js") {
      const file = Bun.file("dist/main.js");
      
      if (await file.exists()) {
        return new Response(file, {
          headers: {
            "Content-Type": "application/javascript",
          },
        });
      }
      
      return new Response("main.js not found - run build first", { status: 404 });
    }

    return new Response("Not Found", { status: 404 });
  },

  websocket: {
    open(ws: ServerWebSocket<WebSocketData>) {
      console.log('WebSocket connected');
    },
    message(ws: ServerWebSocket<WebSocketData>, message: string | Buffer) {
      if (typeof message === 'string') {
        handleMessage(ws, message);
      } else {
        handleMessage(ws, message.toString());
      }
    },
    close(ws: ServerWebSocket<WebSocketData>) {
      handleClose(ws);
      console.log('WebSocket disconnected');
    },
  } as any,

  error(error) {
    return new Response(`Server Error: ${error.message}`, { status: 500 });
  },
});

console.log(`🎮 Hangman server running at http://localhost:${PORT}`);
console.log(`📝 API: GET /api/word?difficulty=1-5`);
console.log(`🔌 WebSocket: ws://localhost:${PORT}/ws`);
