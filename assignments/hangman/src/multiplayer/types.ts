/**
 * Multiplayer type definitions for Hangman game
 */

export interface PlayerInfo {
  id: string;
  name: string;
  color: number; // Hex color for avatar
  score: number;
  isConnected: boolean;
  isHost: boolean;
}

export interface RoomState {
  code: string;
  hostId: string;
  players: Map<string, PlayerInfo>;
  currentTurnIndex: number;
  currentRound: MultiplayerRound | null;
  status: 'waiting' | 'playing' | 'finished';
  maxPlayers: number;
  createdAt: number;
}

export interface MultiplayerRound {
  word: string;
  category: string;
  difficulty: number;
  revealedLetters: string[];
  wrongGuesses: number;
  guessedLetters: string[];
  isComplete: boolean;
  isWon: boolean;
  currentGuesserId: string;
}

export type MessageType = 
  | 'create-room'
  | 'join-room'
  | 'leave-room'
  | 'room-created'
  | 'room-joined'
  | 'room-updated'
  | 'player-joined'
  | 'player-left'
  | 'start-game'
  | 'game-started'
  | 'letter-guess'
  | 'letter-guessed'
  | 'turn-changed'
  | 'round-complete'
  | 'next-round'
  | 'error'
  | 'chat'
  | 'ping'
  | 'pong';

export interface MultiplayerMessage {
  type: MessageType;
  payload: unknown;
  playerId?: string;
  roomCode?: string;
  timestamp: number;
}

export interface CreateRoomPayload {
  playerName: string;
  playerColor: number;
}

export interface JoinRoomPayload {
  roomCode: string;
  playerName: string;
  playerColor: number;
}

export interface RoomCreatedPayload {
  roomCode: string;
  playerId: string;
  players: PlayerInfo[];
}

export interface RoomJoinedPayload {
  roomCode: string;
  playerId: string;
  players: PlayerInfo[];
  isGameStarted: boolean;
  currentRound?: MultiplayerRound;
}

export interface RoomUpdatedPayload {
  roomCode: string;
  players: PlayerInfo[];
  status: RoomState['status'];
}

export interface LetterGuessPayload {
  letter: string;
}

export interface LetterGuessedPayload {
  letter: string;
  playerId: string;
  playerName: string;
  isCorrect: boolean;
  revealedLetters: string[];
  wrongGuesses: number;
}

export interface TurnChangedPayload {
  currentTurnPlayerId: string;
  currentTurnPlayerName: string;
}

export interface RoundCompletePayload {
  word: string;
  isWon: boolean;
  playerScores: { playerId: string; score: number }[];
}

export interface GameStartedPayload {
  round: MultiplayerRound;
  players: PlayerInfo[];
}

export interface ChatPayload {
  message: string;
  playerName: string;
}

export interface ErrorPayload {
  message: string;
  code: string;
}

// Client-side state for multiplayer
export interface MultiplayerClientState {
  isConnected: boolean;
  isConnecting: boolean;
  playerId: string | null;
  playerName: string;
  playerColor: number;
  roomCode: string | null;
  roomState: RoomState | null;
  isMyTurn: boolean;
}

// Default player colors
export const PLAYER_COLORS = [
  0xff6b6b, // Red
  0x4ecdc4, // Teal
  0xffe66d, // Yellow
  0x95e1d3, // Mint
  0xf38181, // Coral
  0xaa96da, // Purple
  0xfcbad3, // Pink
  0xa8d8ea, // Light blue
];

export function generatePlayerColor(): number {
  return PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)];
}

export function generatePlayerId(): string {
  return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateRoomCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}
