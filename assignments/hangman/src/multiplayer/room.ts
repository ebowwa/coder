/**
 * Room management for multiplayer Hangman
 * Supports players and spectators
 */

import type { PlayerInfo, RoomState, MultiplayerRound, SpectatorInfo } from './types';
import { generateRoomCode } from './types';
import { getRandomWord } from '../words';

export class RoomManager {
  private rooms: Map<string, RoomState> = new Map();
  private playerRooms: Map<string, string> = new Map(); // playerId -> roomCode
  private spectatorRooms: Map<string, string> = new Map(); // spectatorId -> roomCode

  createRoom(playerId: string, playerName: string, playerColor: number): RoomState | null {
    const code = generateRoomCode();
    const player: PlayerInfo = {
      id: playerId,
      name: playerName,
      color: playerColor,
      score: 0,
      isConnected: true,
      isHost: true,
      isSpectator: false,
    };

    const room: RoomState = {
      code,
      hostId: playerId,
      players: new Map([[playerId, player]]),
      spectators: new Map(),
      currentTurnIndex: 0,
      currentRound: null,
      status: 'waiting',
      maxPlayers: 8,
      createdAt: Date.now(),
    };

    this.rooms.set(code, room);
    this.playerRooms.set(playerId, code);
    return room;
  }

  joinRoom(code: string, playerId: string, playerName: string, playerColor: number): RoomState | null {
    const room = this.rooms.get(code);
    if (!room) return null;
    if (room.players.size >= room.maxPlayers) return null;

    const player: PlayerInfo = {
      id: playerId,
      name: playerName,
      color: playerColor,
      score: 0,
      isConnected: true,
      isHost: false,
    };

    room.players.set(playerId, player);
    this.playerRooms.set(playerId, code);
    return room;
  }

  leaveRoom(playerId: string): { room: RoomState; newHost?: PlayerInfo } | null {
    const code = this.playerRooms.get(playerId);
    if (!code) return null;

    const room = this.rooms.get(code);
    if (!room) return null;

    room.players.delete(playerId);
    this.playerRooms.delete(playerId);

    if (room.players.size === 0) {
      this.rooms.delete(code);
      return null;
    }

    // Transfer host if needed
    let newHost: PlayerInfo | undefined;
    if (room.hostId === playerId) {
      const nextPlayer = room.players.values().next().value;
      if (nextPlayer) {
        nextPlayer.isHost = true;
        room.hostId = nextPlayer.id;
        newHost = nextPlayer;
      }
    }

    // Adjust turn index
    if (room.currentTurnIndex >= room.players.size) {
      room.currentTurnIndex = 0;
    }

    return { room, newHost };
  }

  getRoom(code: string): RoomState | null {
    return this.rooms.get(code) || null;
  }

  getPlayerRoom(playerId: string): RoomState | null {
    const code = this.playerRooms.get(playerId);
    return code ? this.rooms.get(code) || null : null;
  }

  startGame(code: string, difficulty: number = 1, forcedWord?: string): MultiplayerRound | null {
    const room = this.rooms.get(code);
    if (!room || room.status !== 'waiting') return null;

    const wordEntry = getRandomWord(difficulty);
    const playerIds = Array.from(room.players.keys());
    
    room.currentRound = {
      word: forcedWord ? forcedWord.toUpperCase() : wordEntry.word.toUpperCase(),
      category: wordEntry.category,
      difficulty: wordEntry.difficulty,
      revealedLetters: [],
      wrongGuesses: 0,
      guessedLetters: [],
      isComplete: false,
      isWon: false,
      currentGuesserId: playerIds[room.currentTurnIndex],
    };

    room.status = 'playing';
    return room.currentRound;
  }

  processGuess(code: string, playerId: string, letter: string): {
    round: MultiplayerRound;
    isCorrect: boolean;
    nextPlayerId: string;
  } | null {
    const room = this.rooms.get(code);
    if (!room || !room.currentRound) return null;

    const round = room.currentRound;
    if (round.isComplete) return null;
    if (round.currentGuesserId !== playerId) return null;
    if (round.guessedLetters.includes(letter)) return null;

    round.guessedLetters.push(letter);
    const isCorrect = round.word.includes(letter);

    if (isCorrect) {
      round.revealedLetters.push(letter);
      // Check win
      const allRevealed = round.word.split('').every(l => round.revealedLetters.includes(l));
      if (allRevealed) {
        round.isComplete = true;
        round.isWon = true;
        // Award points to all players who guessed correctly
        const playerIds = Array.from(room.players.keys());
        room.players.forEach(p => p.score += round.word.length * 10);
      }
    } else {
      round.wrongGuesses++;
      // Check loss
      if (round.wrongGuesses >= 6) {
        round.isComplete = true;
        round.isWon = false;
      }
    }

    // Move to next player if wrong guess AND round is NOT complete after this guess
    // When round completes (win or lose), turn should NOT advance
    let nextPlayerId = round.currentGuesserId;
    if (!isCorrect && !round.isComplete) {
      const playerIds = Array.from(room.players.keys());
      room.currentTurnIndex = (room.currentTurnIndex + 1) % playerIds.length;
      nextPlayerId = playerIds[room.currentTurnIndex];
      round.currentGuesserId = nextPlayerId;
    }    return { round, isCorrect, nextPlayerId };
  }

  nextRound(code: string): MultiplayerRound | null {
    const room = this.rooms.get(code);
    if (!room) return null;

    const playerIds = Array.from(room.players.keys());
    room.currentTurnIndex = (room.currentTurnIndex + 1) % playerIds.length;

    const difficulty = Math.min(5, 1 + Math.floor(room.players.size / 2));
    const wordEntry = getRandomWord(difficulty);

    room.currentRound = {
      word: wordEntry.word.toUpperCase(),
      category: wordEntry.category,
      difficulty: wordEntry.difficulty,
      revealedLetters: [],
      wrongGuesses: 0,
      guessedLetters: [],
      isComplete: false,
      isWon: false,
      currentGuesserId: playerIds[room.currentTurnIndex],
    };

    return room.currentRound;
  }

  setPlayerDisconnected(playerId: string): void {
    const code = this.playerRooms.get(playerId);
    if (!code) return;

    const room = this.rooms.get(code);
    if (!room) return;

    const player = room.players.get(playerId);
    if (player) {
      player.isConnected = false;
    }
  }

  getPlayers(code: string): PlayerInfo[] {
    const room = this.rooms.get(code);
    return room ? Array.from(room.players.values()) : [];
  }

  // Spectator methods
  joinAsSpectator(code: string, spectatorId: string, spectatorName: string, spectatorColor: number): RoomState | null {
    const room = this.rooms.get(code);
    if (!room) return null;

    const spectator: SpectatorInfo = {
      id: spectatorId,
      name: spectatorName,
      color: spectatorColor,
      isConnected: true,
    };

    room.spectators.set(spectatorId, spectator);
    this.spectatorRooms.set(spectatorId, code);
    return room;
  }

  leaveAsSpectator(spectatorId: string): RoomState | null {
    const code = this.spectatorRooms.get(spectatorId);
    if (!code) return null;

    const room = this.rooms.get(code);
    if (!room) return null;

    room.spectators.delete(spectatorId);
    this.spectatorRooms.delete(spectatorId);

    return room;
  }

  getSpectators(code: string): SpectatorInfo[] {
    const room = this.rooms.get(code);
    return room ? Array.from(room.spectators.values()) : [];
  }
}

export const roomManager = new RoomManager();
