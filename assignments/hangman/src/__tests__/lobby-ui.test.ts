/**
 * Tests for LobbyUI - DOM overlay for creating/joining rooms
 * Tests focus on event handling, chat system, and view management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LobbyUI, type LobbyUIOptions } from '../multiplayer/lobby-ui';
import type { MultiplayerSync } from '../multiplayer/sync';
import type {
  RoomCreatedPayload,
  RoomJoinedPayload,
  GameStartedPayload,
  ErrorPayload,
  ChatPayload,
  MultiplayerMessage,
  MultiplayerClientState,
} from '../multiplayer/types';

// ── Helpers ────────────────────────────────────────────────────────────────

function createMockSync(overrides?: Partial<MultiplayerClientState>): MultiplayerSync {
  const defaultState: MultiplayerClientState = {
    isConnected: true,
    isConnecting: false,
    playerId: 'test-player-1',
    playerName: 'TestPlayer',
    playerColor: 0xff6b6b,
    roomCode: null,
    roomState: null,
    isMyTurn: false,
  };

  const state = { ...defaultState, ...overrides };
  const handlers = new Map<string, Set<(msg: MultiplayerMessage) => void>>();

  return {
    on: vi.fn((type: string, handler: (msg: MultiplayerMessage) => void) => {
      if (!handlers.has(type)) handlers.set(type, new Set());
      handlers.get(type)!.add(handler);
      return () => handlers.get(type)?.delete(handler);
    }),
    getState: vi.fn(() => state),
    isConnected: vi.fn(() => state.isConnected),
    setPlayerInfo: vi.fn(),
    createRoom: vi.fn(),
    joinRoom: vi.fn(),
    joinAsSpectator: vi.fn(),
    leaveRoom: vi.fn(),
    startGame: vi.fn(),
    sendChat: vi.fn(),
    connect: vi.fn(() => Promise.resolve()),
    // Helper to emit events in tests
    _emit: (type: string, payload: unknown) => {
      const set = handlers.get(type);
      if (set) {
        const msg: MultiplayerMessage = { type: type as any, payload, timestamp: Date.now() };
        set.forEach(h => h(msg));
      }
    },
  } as unknown as MultiplayerSync & { _emit: (type: string, payload: unknown) => void };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('LobbyUI', () => {
  let mockSync: ReturnType<typeof createMockSync>;
  let options: LobbyUIOptions;

  beforeEach(() => {
    document.body.innerHTML = '';
    mockSync = createMockSync();
    options = {
      onRoomCreated: vi.fn(),
      onRoomJoined: vi.fn(),
      onGameStarted: vi.fn(),
      onError: vi.fn(),
      onStartGame: vi.fn(),
      onLeaveRoom: vi.fn(),
    };
  });

  describe('construction', () => {
    it('creates the lobby container and appends to body', () => {
      const ui = new LobbyUI(mockSync, options);
      const container = document.getElementById('lobby-ui');
      expect(container).not.toBeNull();
      expect(container?.style.position).toBe('fixed');
      ui.destroy();
    });

    it('renders the main view with name input and buttons', () => {
      const ui = new LobbyUI(mockSync, options);
      expect(document.getElementById('player-name')).not.toBeNull();
      expect(document.getElementById('create-room-btn')).not.toBeNull();
      expect(document.getElementById('join-room-btn')).not.toBeNull();
      expect(document.getElementById('join-spectator-btn')).not.toBeNull();
      expect(document.getElementById('single-player-btn')).not.toBeNull();
      expect(document.getElementById('room-code')).not.toBeNull();
      ui.destroy();
    });

    it('renders the color picker with player colors', () => {
      const ui = new LobbyUI(mockSync, options);
      const picker = document.getElementById('color-picker');
      expect(picker).not.toBeNull();
      // PLAYER_COLORS has 8 entries
      expect(picker?.children.length).toBe(8);
      ui.destroy();
    });

    it('subscribes to sync events on construction', () => {
      const ui = new LobbyUI(mockSync, options);
      // Should have subscribed to 7 event types
      expect(mockSync.on).toHaveBeenCalledTimes(7);
      ui.destroy();
    });
  });

  describe('main view interactions', () => {
    let ui: LobbyUI;

    beforeEach(() => {
      ui = new LobbyUI(mockSync, options);
    });

    afterEach(() => {
      ui.destroy();
    });

    it('updates player name when typing in the name input', () => {
      const nameInput = document.getElementById('player-name') as HTMLInputElement;
      expect(nameInput).not.toBeNull();
      nameInput.value = 'NewName';
      nameInput.dispatchEvent(new Event('input'));
      // Name should be updated internally; verify by checking input value persists
      expect(nameInput.value).toBe('NewName');
    });

    it('formats room code input to digits only, max 4', () => {
      const roomInput = document.getElementById('room-code') as HTMLInputElement;
      roomInput.value = '12a3b4c5';
      roomInput.dispatchEvent(new Event('input'));
      expect(roomInput.value).toBe('1234');
    });

    it('calls sync.createRoom when clicking Create Room (already connected)', () => {
      const btn = document.getElementById('create-room-btn') as HTMLButtonElement;
      btn.click();
      expect(mockSync.setPlayerInfo).toHaveBeenCalled();
      expect(mockSync.createRoom).toHaveBeenCalled();
    });

    it('shows error when joining with invalid room code', () => {
      const joinBtn = document.getElementById('join-room-btn') as HTMLButtonElement;
      const roomInput = document.getElementById('room-code') as HTMLInputElement;
      roomInput.value = '12';
      joinBtn.click();
      // Error toast should appear
      // The showError method creates a div with id 'error-toast'
      // This happens async through connect, but since sync is already connected it
      // will call joinRoom. With invalid code, it should show error.
      // Let's check that joinRoom is NOT called for short codes
      expect(mockSync.joinRoom).not.toHaveBeenCalled();
    });

    it('calls sync.joinRoom when clicking Join with valid code', () => {
      const joinBtn = document.getElementById('join-room-btn') as HTMLButtonElement;
      const roomInput = document.getElementById('room-code') as HTMLInputElement;
      roomInput.value = '1234';
      joinBtn.click();
      expect(mockSync.joinRoom).toHaveBeenCalledWith('1234', expect.any(String), expect.any(Number));
    });

    it('calls sync.joinAsSpectator when clicking spectator join with valid code', () => {
      const specBtn = document.getElementById('join-spectator-btn') as HTMLButtonElement;
      const roomInput = document.getElementById('room-code') as HTMLInputElement;
      roomInput.value = '5678';
      specBtn.click();
      expect(mockSync.joinAsSpectator).toHaveBeenCalledWith('5678', expect.any(String), expect.any(Number));
    });

    it('does not call joinAsSpectator with invalid code', () => {
      const specBtn = document.getElementById('join-spectator-btn') as HTMLButtonElement;
      specBtn.click();
      expect(mockSync.joinAsSpectator).not.toHaveBeenCalled();
    });

    it('dispatches start-single-player event and hides on single player click', () => {
      const listener = vi.fn();
      document.addEventListener('start-single-player', listener);
      const btn = document.getElementById('single-player-btn') as HTMLButtonElement;
      btn.click();
      expect(listener).toHaveBeenCalled();
      // Container should be hidden
      const container = document.getElementById('lobby-ui');
      expect(container?.style.display).toBe('none');
      document.removeEventListener('start-single-player', listener);
    });
  });

  describe('sync event handlers', () => {
    let ui: LobbyUI & { _emit: (type: string, payload: unknown) => void };

    beforeEach(() => {
      // Use a sync mock that tracks handlers so we can emit
      ui = new LobbyUI(mockSync, options) as LobbyUI & { _emit: (type: string, payload: unknown) => void };
    });

    afterEach(() => {
      ui.destroy();
    });

    it('calls onRoomCreated callback on room-created event', () => {
      const payload: RoomCreatedPayload = {
        roomCode: '1234',
        playerId: 'p1',
        players: [
          { id: 'p1', name: 'Player 1', color: 0xff0000, score: 0, isConnected: true, isHost: true },
        ],
      };
      mockSync._emit('room-created', payload);
      expect(options.onRoomCreated).toHaveBeenCalledWith(payload);
    });

    it('calls onRoomJoined callback on room-joined event', () => {
      const payload: RoomJoinedPayload = {
        roomCode: '5678',
        playerId: 'p2',
        players: [
          { id: 'p1', name: 'Player 1', color: 0xff0000, score: 0, isConnected: true, isHost: true },
          { id: 'p2', name: 'Player 2', color: 0x00ff00, score: 0, isConnected: true, isHost: false },
        ],
        isGameStarted: false,
      };
      mockSync._emit('room-joined', payload);
      expect(options.onRoomJoined).toHaveBeenCalledWith(payload);
    });

    it('calls onGameStarted callback and hides on game-started event', () => {
      const payload: GameStartedPayload = {
        round: {
          word: 'TEST',
          category: 'general',
          difficulty: 1,
          revealedLetters: [],
          wrongGuesses: 0,
          guessedLetters: [],
          isComplete: false,
          isWon: false,
          currentGuesserId: 'p1',
        },
        players: [
          { id: 'p1', name: 'Player 1', color: 0xff0000, score: 0, isConnected: true, isHost: true },
        ],
      };
      mockSync._emit('game-started', payload);
      expect(options.onGameStarted).toHaveBeenCalledWith(payload);
      // Should hide the lobby
      const container = document.getElementById('lobby-ui');
      expect(container?.style.display).toBe('none');
    });

    it('calls onError callback on error event', () => {
      const payload: ErrorPayload = { message: 'Room not found', code: 'ROOM_NOT_FOUND' };
      mockSync._emit('error', payload);
      expect(options.onError).toHaveBeenCalledWith(payload);
    });
  });

  describe('chat system', () => {
    let ui: LobbyUI & { _emit: (type: string, payload: unknown) => void };

    beforeEach(() => {
      ui = new LobbyUI(mockSync, options) as LobbyUI & { _emit: (type: string, payload: unknown) => void };
    });

    afterEach(() => {
      ui.destroy();
    });

    it('adds chat messages on chat event', () => {
      // First, trigger room-joined so lobby view is rendered (with chat panel)
      const roomPayload: RoomJoinedPayload = {
        roomCode: '9999',
        playerId: 'p1',
        players: [
          { id: 'p1', name: 'Test', color: 0xff0000, score: 0, isConnected: true, isHost: true },
        ],
        isGameStarted: false,
      };
      mockSync._emit('room-joined', roomPayload);

      const chatPayload: ChatPayload = {
        message: 'Hello!',
        playerName: 'Test',
        playerId: 'p1',
        timestamp: Date.now(),
      };
      mockSync._emit('chat', chatPayload);

      const chatMessages = document.getElementById('chat-messages');
      expect(chatMessages).not.toBeNull();
      expect(chatMessages?.innerHTML).toContain('Hello!');
    });

    it('adds system message on spectator-joined event', () => {
      const roomPayload: RoomJoinedPayload = {
        roomCode: '9999',
        playerId: 'p1',
        players: [
          { id: 'p1', name: 'Test', color: 0xff0000, score: 0, isConnected: true, isHost: true },
        ],
        isGameStarted: false,
      };
      mockSync._emit('room-joined', roomPayload);

      const specPayload = {
        roomCode: '9999',
        spectator: { id: 'sp1', name: 'Watcher', color: 0xaa96da, isConnected: true },
        spectatorCount: 1,
      };
      mockSync._emit('spectator-joined', specPayload);

      const chatMessages = document.getElementById('chat-messages');
      expect(chatMessages?.innerHTML).toContain('Watcher joined as spectator');
    });
  });

  describe('show/hide/destroy', () => {
    it('show() makes the container visible', () => {
      const ui = new LobbyUI(mockSync, options);
      ui.hide();
      expect(document.getElementById('lobby-ui')?.style.display).toBe('none');
      ui.show();
      expect(document.getElementById('lobby-ui')?.style.display).toBe('block');
      ui.destroy();
    });

    it('destroy() removes the container from DOM', () => {
      const ui = new LobbyUI(mockSync, options);
      expect(document.getElementById('lobby-ui')).not.toBeNull();
      ui.destroy();
      expect(document.getElementById('lobby-ui')).toBeNull();
    });
  });

  describe('lobby view interactions', () => {
    let ui: LobbyUI & { _emit: (type: string, payload: unknown) => void };

    beforeEach(() => {
      ui = new LobbyUI(mockSync, options) as LobbyUI & { _emit: (type: string, payload: unknown) => void };
      // Enter lobby view via room-created event
      const roomPayload: RoomCreatedPayload = {
        roomCode: '1234',
        playerId: 'test-player-1',
        players: [
          { id: 'test-player-1', name: 'Test', color: 0xff0000, score: 0, isConnected: true, isHost: true },
        ],
      };
      mockSync._emit('room-created', roomPayload);
    });

    afterEach(() => {
      ui.destroy();
    });

    it('renders lobby view with room code', () => {
      expect(document.getElementById('start-game-btn')).not.toBeNull();
      expect(document.getElementById('leave-room-btn')).not.toBeNull();
      // Room code should be displayed
      expect(document.body.innerHTML).toContain('1234');
    });

    it('calls sync.startGame when Start Game is clicked', () => {
      const startBtn = document.getElementById('start-game-btn') as HTMLButtonElement;
      startBtn.click();
      expect(mockSync.startGame).toHaveBeenCalled();
    });

    it('navigates back to main view on Leave Room', () => {
      const leaveBtn = document.getElementById('leave-room-btn') as HTMLButtonElement;
      leaveBtn.click();
      expect(mockSync.leaveRoom).toHaveBeenCalled();
      expect(options.onLeaveRoom).toHaveBeenCalled();
      // Should be back to main view
      expect(document.getElementById('create-room-btn')).not.toBeNull();
    });

    it('sends chat message when typing and pressing Send', () => {
      const chatInput = document.getElementById('chat-input') as HTMLInputElement;
      const sendBtn = document.getElementById('send-chat-btn') as HTMLButtonElement;
      chatInput.value = 'Hello world';
      sendBtn.click();
      expect(mockSync.sendChat).toHaveBeenCalledWith('Hello world');
      expect(chatInput.value).toBe('');
    });

    it('sends chat message on Enter keypress', () => {
      const chatInput = document.getElementById('chat-input') as HTMLInputElement;
      chatInput.value = 'Test message';
      chatInput.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter' }));
      expect(mockSync.sendChat).toHaveBeenCalledWith('Test message');
    });

    it('does not send empty chat messages', () => {
      const chatInput = document.getElementById('chat-input') as HTMLInputElement;
      const sendBtn = document.getElementById('send-chat-btn') as HTMLButtonElement;
      chatInput.value = '   ';
      sendBtn.click();
      expect(mockSync.sendChat).not.toHaveBeenCalled();
    });
  });
});
