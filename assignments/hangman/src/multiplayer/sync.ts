/**
 * Game state synchronization over WebSocket
 * Handles client-side multiplayer communication
 */

import type {
  MultiplayerMessage,
  MessageType,
  MultiplayerClientState,
  PlayerInfo,
  RoomState,
  MultiplayerRound,
  RoomCreatedPayload,
  RoomJoinedPayload,
  LetterGuessedPayload,
  TurnChangedPayload,
  RoundCompletePayload,
  GameStartedPayload,
  ErrorPayload,
} from './types';
import {
  generatePlayerId,
  generatePlayerColor,
} from './types';

type MessageHandler = (message: MultiplayerMessage) => void;

export class MultiplayerSync {
  private ws: WebSocket | null = null;
  private serverUrl: string;
  private state: MultiplayerClientState;
  private handlers: Map<MessageType, Set<MessageHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  constructor(serverUrl?: string) {
    // Default to same host with ws protocol
    this.serverUrl = serverUrl || this.getDefaultServerUrl();
    
    this.state = {
      isConnected: false,
      isConnecting: false,
      playerId: null,
      playerName: this.generateRandomName(),
      playerColor: generatePlayerColor(),
      roomCode: null,
      roomState: null,
      isMyTurn: false,
    };
  }

  private getDefaultServerUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }

  private generateRandomName(): string {
    const adjectives = ['Swift', 'Brave', 'Clever', 'Happy', 'Lucky', 'Mighty', 'Noble', 'Quick'];
    const nouns = ['Panda', 'Tiger', 'Eagle', 'Dragon', 'Phoenix', 'Lion', 'Wolf', 'Bear'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${adj}${noun}${Math.floor(Math.random() * 100)}`;
  }

  // Connection management
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.state.isConnecting = true;
      
      try {
        this.ws = new WebSocket(this.serverUrl);
      } catch (error) {
        this.state.isConnecting = false;
        reject(error);
        return;
      }

      this.ws.onopen = () => {
        this.state.isConnected = true;
        this.state.isConnecting = false;
        this.reconnectAttempts = 0;
        
        // Start ping interval to keep connection alive
        this.startPing();
        
        resolve();
      };

      this.ws.onclose = () => {
        this.state.isConnected = false;
        this.state.isConnecting = false;
        this.stopPing();
        
        // Attempt reconnect if not intentional
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.attemptReconnect();
        }
      };

      this.ws.onerror = (error) => {
        this.state.isConnecting = false;
        reject(error);
      };

      this.ws.onmessage = (event) => {
        try {
          const message: MultiplayerMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      };
    });
  }

  disconnect(): void {
    this.stopPing();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.state.isConnected = false;
    this.state.isConnecting = false;
    this.state.roomCode = null;
    this.state.roomState = null;
  }

  private attemptReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      this.connect().catch(console.error);
    }, delay);
  }

  private startPing(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send('ping', {});
      }
    }, 30000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  // Message handling
  private handleMessage(message: MultiplayerMessage): void {
    // Update local state based on message type
    switch (message.type) {
      case 'room-created':
        const created = message.payload as RoomCreatedPayload;
        this.state.playerId = created.playerId;
        this.state.roomCode = created.roomCode;
        break;
        
      case 'room-joined':
        const joined = message.payload as RoomJoinedPayload;
        this.state.playerId = joined.playerId;
        this.state.roomCode = joined.roomCode;
        break;
        
      case 'game-started':
        const started = message.payload as GameStartedPayload;
        this.updateTurnState(started.round);
        break;
        
      case 'turn-changed':
        const turnChanged = message.payload as TurnChangedPayload;
        this.state.isMyTurn = turnChanged.currentTurnPlayerId === this.state.playerId;
        break;
        
      case 'letter-guessed':
        const guessed = message.payload as LetterGuessedPayload;
        if (this.state.roomState?.currentRound) {
          this.state.roomState.currentRound.guessedLetters.push(guessed.letter);
          if (guessed.isCorrect) {
            this.state.roomState.currentRound.revealedLetters.push(...guessed.revealedLetters);
          } else {
            this.state.roomState.currentRound.wrongGuesses = guessed.wrongGuesses;
          }
        }
        break;
        
      case 'round-complete':
        const complete = message.payload as RoundCompletePayload;
        if (this.state.roomState) {
          this.state.roomState.currentRound!.isComplete = true;
          this.state.roomState.currentRound!.isWon = complete.isWon;
          this.state.roomState.currentRound!.word = complete.word;
        }
        break;
    }
    
    // Notify handlers
    const handlers = this.handlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => handler(message));
    }
    
    // Also notify wildcard handlers
    const wildcardHandlers = this.handlers.get('*' as MessageType);
    if (wildcardHandlers) {
      wildcardHandlers.forEach(handler => handler(message));
    }
  }

  private updateTurnState(round: MultiplayerRound): void {
    this.state.isMyTurn = round.currentGuesserId === this.state.playerId;
  }

  // Send messages
  send(type: MessageType, payload: unknown): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return;
    }

    const message: MultiplayerMessage = {
      type,
      payload,
      playerId: this.state.playerId || undefined,
      roomCode: this.state.roomCode || undefined,
      timestamp: Date.now(),
    };

    this.ws.send(JSON.stringify(message));
  }

  // Room actions
  createRoom(playerName?: string, playerColor?: number): void {
    this.send('create-room', {
      playerName: playerName || this.state.playerName,
      playerColor: playerColor ?? this.state.playerColor,
    });
  }

  joinRoom(roomCode: string, playerName?: string, playerColor?: number): void {
    this.send('join-room', {
      roomCode,
      playerName: playerName || this.state.playerName,
      playerColor: playerColor ?? this.state.playerColor,
    });
  }

  leaveRoom(): void {
    this.send('leave-room', {});
    this.state.roomCode = null;
    this.state.roomState = null;
    this.state.isMyTurn = false;
  }

  startGame(): void {
    this.send('start-game', {});
  }

  guessLetter(letter: string): void {
    if (!this.state.isMyTurn) {
      console.warn('Not your turn to guess');
      return;
    }
    this.send('letter-guess', { letter: letter.toUpperCase() });
  }

  nextRound(): void {
    this.send('next-round', {});
  }

  sendChat(message: string): void {
    this.send('chat', { message });
  }

  // Event subscription
  on(type: MessageType, handler: MessageHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
    
    // Return unsubscribe function
    return () => {
      this.handlers.get(type)?.delete(handler);
    };
  }

  off(type: MessageType, handler: MessageHandler): void {
    this.handlers.get(type)?.delete(handler);
  }

  // State access
  getState(): Readonly<MultiplayerClientState> {
    return { ...this.state };
  }

  isConnected(): boolean {
    return this.state.isConnected;
  }

  isMyTurn(): boolean {
    return this.state.isMyTurn;
  }

  getPlayerId(): string | null {
    return this.state.playerId;
  }

  getRoomCode(): string | null {
    return this.state.roomCode;
  }

  getRoomState(): RoomState | null {
    return this.state.roomState;
  }

  setPlayerInfo(name: string, color?: number): void {
    this.state.playerName = name;
    if (color !== undefined) {
      this.state.playerColor = color;
    }
  }
}
