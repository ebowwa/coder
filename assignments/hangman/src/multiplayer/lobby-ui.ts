/**
 * Lobby UI - DOM overlay for creating/joining rooms with 4-digit code
 * Includes chat system and spectator mode
 */

import type {
  PlayerInfo,
  RoomCreatedPayload,
  RoomJoinedPayload,
  RoomUpdatedPayload,
  GameStartedPayload,
  ErrorPayload,
  ChatPayload,
  SpectatorJoinedPayload,
} from './types';
import { PLAYER_COLORS, generatePlayerColor } from './types';
import type { MultiplayerSync } from './sync';

export interface LobbyUIOptions {
  onRoomCreated?: (payload: RoomCreatedPayload) => void;
  onRoomJoined?: (payload: RoomJoinedPayload) => void;
  onGameStarted?: (payload: GameStartedPayload) => void;
  onError?: (error: ErrorPayload) => void;
  onStartGame?: () => void;
  onLeaveRoom?: () => void;
}

interface ChatMessage {
  playerName: string;
  playerId: string;
  message: string;
  timestamp: number;
}

export class LobbyUI {
  private container: HTMLDivElement;
  private overlay: HTMLDivElement;
  private sync: MultiplayerSync;
  private options: LobbyUIOptions;
  private currentView: 'main' | 'lobby' | 'error' = 'main';
  private playerName: string;
  private playerColor: number;
  private unsubscribers: (() => void)[] = [];
  private chatMessages: ChatMessage[] = [];
  private isSpectator: boolean = false;

  constructor(sync: MultiplayerSync, options: LobbyUIOptions = {}) {
    this.sync = sync;
    this.options = options;
    this.playerName = this.generateRandomName();
    this.playerColor = generatePlayerColor();

    // Create container
    this.container = document.createElement('div');
    this.container.id = 'lobby-ui';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1000;
      pointer-events: none;
    `;
    document.body.appendChild(this.container);

    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      pointer-events: auto;
    `;
    this.container.appendChild(this.overlay);

    this.setupEventHandlers();
    this.renderMainView();
  }

  private generateRandomName(): string {
    const adjectives = ['Swift', 'Brave', 'Clever', 'Happy', 'Lucky', 'Mighty', 'Noble', 'Quick'];
    const nouns = ['Panda', 'Tiger', 'Eagle', 'Dragon', 'Phoenix', 'Lion', 'Wolf', 'Bear'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${adj}${noun}${Math.floor(Math.random() * 100)}`;
  }

  private setupEventHandlers(): void {
    // Subscribe to sync events
    const unsub1 = this.sync.on('room-created', (msg) => {
      const payload = msg.payload as RoomCreatedPayload;
      this.currentView = 'lobby';
      this.isSpectator = false;
      this.chatMessages = [];
      this.renderLobbyView(payload.players, payload.roomCode, true);
      this.options.onRoomCreated?.(payload);
    });

    const unsub2 = this.sync.on('room-joined', (msg) => {
      const payload = msg.payload as RoomJoinedPayload;
      this.currentView = 'lobby';
      this.chatMessages = [];
      this.renderLobbyView(payload.players, payload.roomCode, false);
      this.options.onRoomJoined?.(payload);
    });

    const unsub3 = this.sync.on('room-updated', (msg) => {
      const payload = msg.payload as RoomUpdatedPayload;
      const state = this.sync.getState();
      if (state.roomCode) {
        this.renderLobbyView(payload.players, state.roomCode, payload.players[0]?.id === state.playerId);
      }
    });

    const unsub4 = this.sync.on('game-started', (msg) => {
      const payload = msg.payload as GameStartedPayload;
      this.hide();
      this.options.onGameStarted?.(payload);
    });

    const unsub5 = this.sync.on('error', (msg) => {
      const payload = msg.payload as ErrorPayload;
      this.showError(payload.message);
      this.options.onError?.(payload);
    });

    // Chat handler
    const unsub6 = this.sync.on('chat', (msg) => {
      const payload = msg.payload as ChatPayload;
      this.addChatMessage(payload);
    });

    // Spectator joined handler
    const unsub7 = this.sync.on('spectator-joined', (msg) => {
      const payload = msg.payload as SpectatorJoinedPayload;
      this.addSystemMessage(`${payload.spectator.name} joined as spectator`);
    });

    this.unsubscribers.push(unsub1, unsub2, unsub3, unsub4, unsub5, unsub6, unsub7);
  }

  private addChatMessage(payload: ChatPayload): void {
    this.chatMessages.push({
      playerName: payload.playerName,
      playerId: payload.playerId,
      message: payload.message,
      timestamp: payload.timestamp,
    });
    this.updateChatDisplay();
  }

  private addSystemMessage(message: string): void {
    this.chatMessages.push({
      playerName: 'System',
      playerId: 'system',
      message,
      timestamp: Date.now(),
    });
    this.updateChatDisplay();
  }

  private updateChatDisplay(): void {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    const state = this.sync.getState();
    const messagesHtml = this.chatMessages.slice(-50).map(msg => {
      const isMe = msg.playerId === state.playerId;
      const isSystem = msg.playerId === 'system';
      const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      if (isSystem) {
        return `<div style="color: #888; font-size: 0.8em; padding: 4px 8px; text-align: center;">${msg.message}</div>`;
      }
      
      return `
        <div style="padding: 4px 8px; ${isMe ? 'background: rgba(78, 205, 196, 0.1);' : ''}">
          <span style="color: #4ecdc4; font-size: 0.8em;">${msg.playerName}</span>
          <span style="color: #666; font-size: 0.7em; margin-left: 5px;">${time}</span>
          <div style="color: #fff; font-size: 0.9em; word-wrap: break-word;">${this.escapeHtml(msg.message)}</div>
        </div>
      `;
    }).join('');

    chatMessages.innerHTML = messagesHtml;
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private renderMainView(): void {
    this.overlay.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border-radius: 20px;
        padding: 40px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.1);
      ">
        <h1 style="
          color: #fff;
          text-align: center;
          margin: 0 0 10px 0;
          font-size: 2.5em;
          text-shadow: 0 0 20px rgba(78, 205, 196, 0.5);
        ">Hangman</h1>
        <p style="
          color: #4ecdc4;
          text-align: center;
          margin: 0 0 30px 0;
          font-size: 1.1em;
        ">Multiplayer Mode</p>

        <div style="margin-bottom: 25px;">
          <label style="
            display: block;
            color: #aaa;
            margin-bottom: 8px;
            font-size: 0.9em;
          ">Your Name</label>
          <input type="text" id="player-name" value="${this.playerName}" style="
            width: 100%;
            padding: 12px 15px;
            border: 2px solid #333;
            border-radius: 10px;
            background: #0f0f1a;
            color: #fff;
            font-size: 1em;
            box-sizing: border-box;
            transition: border-color 0.3s;
          " placeholder="Enter your name">
        </div>

        <div style="margin-bottom: 30px;">
          <label style="
            display: block;
            color: #aaa;
            margin-bottom: 8px;
            font-size: 0.9em;
          ">Your Color</label>
          <div id="color-picker" style="
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
          "></div>
        </div>

        <button id="create-room-btn" style="
          width: 100%;
          padding: 15px;
          background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
          border: none;
          border-radius: 10px;
          color: #fff;
          font-size: 1.1em;
          font-weight: bold;
          cursor: pointer;
          margin-bottom: 15px;
          transition: transform 0.2s, box-shadow 0.2s;
        ">Create New Room</button>

        <div style="
          display: flex;
          align-items: center;
          margin: 20px 0;
        ">
          <div style="
            flex: 1;
            height: 1px;
            background: #333;
          "></div>
          <span style="
            color: #666;
            padding: 0 15px;
            font-size: 0.9em;
          ">OR</span>
          <div style="
            flex: 1;
            height: 1px;
            background: #333;
          "></div>
        </div>

        <div style="margin-bottom: 15px;">
          <label style="
            display: block;
            color: #aaa;
            margin-bottom: 8px;
            font-size: 0.9em;
          ">Room Code (4 digits)</label>
          <input type="text" id="room-code" maxlength="4" style="
            width: 100%;
            padding: 12px 15px;
            border: 2px solid #333;
            border-radius: 10px;
            background: #0f0f1a;
            color: #fff;
            font-size: 1.5em;
            text-align: center;
            letter-spacing: 10px;
            box-sizing: border-box;
            text-transform: uppercase;
          " placeholder="----">
        </div>

        <button id="join-room-btn" style="
          width: 100%;
          padding: 15px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 10px;
          color: #fff;
          font-size: 1.1em;
          font-weight: bold;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        ">Join as Player</button>

        <button id="join-spectator-btn" style="
          width: 100%;
          padding: 12px;
          background: transparent;
          border: 2px solid #aa96da;
          border-radius: 10px;
          color: #aa96da;
          font-size: 0.95em;
          cursor: pointer;
          margin-top: 10px;
          transition: background 0.3s;
        ">Join as Spectator</button>

        <button id="single-player-btn" style="
          width: 100%;
          padding: 12px;
          background: transparent;
          border: 2px solid #444;
          border-radius: 10px;
          color: #888;
          font-size: 0.95em;
          cursor: pointer;
          margin-top: 10px;
          transition: border-color 0.3s, color 0.3s;
        ">Play Single Player</button>

        <div id="connection-status" style="
          text-align: center;
          margin-top: 15px;
          color: #666;
          font-size: 0.85em;
        "></div>
      </div>
    `;

    this.setupColorPicker();
    this.setupMainViewEvents();
    this.updateConnectionStatus();
  }

  private setupColorPicker(): void {
    const picker = document.getElementById('color-picker');
    if (!picker) return;

    PLAYER_COLORS.forEach((color, index) => {
      const colorBtn = document.createElement('div');
      colorBtn.style.cssText = `
        width: 35px;
        height: 35px;
        border-radius: 50%;
        background: #${color.toString(16).padStart(6, '0')};
        cursor: pointer;
        border: 3px solid ${color === this.playerColor ? '#fff' : 'transparent'};
        transition: transform 0.2s, border-color 0.2s;
      `;
      colorBtn.dataset.colorIndex = index.toString();
      picker.appendChild(colorBtn);
    });
  }

  private setupMainViewEvents(): void {
    const nameInput = document.getElementById('player-name') as HTMLInputElement;
    const createBtn = document.getElementById('create-room-btn');
    const joinBtn = document.getElementById('join-room-btn');
    const joinSpectatorBtn = document.getElementById('join-spectator-btn');
    const singlePlayerBtn = document.getElementById('single-player-btn');
    const roomCodeInput = document.getElementById('room-code') as HTMLInputElement;
    const colorPicker = document.getElementById('color-picker');

    nameInput?.addEventListener('input', (e) => {
      this.playerName = (e.target as HTMLInputElement).value;
    });

    colorPicker?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.dataset.colorIndex !== undefined) {
        const index = parseInt(target.dataset.colorIndex, 10);
        this.playerColor = PLAYER_COLORS[index];
        // Update border on all color buttons
        colorPicker.querySelectorAll('div').forEach((btn, i) => {
          btn.style.borderColor = i === index ? '#fff' : 'transparent';
        });
      }
    });

    createBtn?.addEventListener('click', () => {
      if (!this.sync.isConnected()) {
        this.sync.connect().then(() => {
          this.sync.setPlayerInfo(this.playerName, this.playerColor);
          this.sync.createRoom(this.playerName, this.playerColor);
        }).catch((err) => {
          this.showError('Failed to connect to server');
          console.error(err);
        });
      } else {
        this.sync.setPlayerInfo(this.playerName, this.playerColor);
        this.sync.createRoom(this.playerName, this.playerColor);
      }
    });

    joinBtn?.addEventListener('click', () => {
      const code = roomCodeInput?.value.trim();
      if (!code || code.length !== 4) {
        this.showError('Please enter a valid 4-digit room code');
        return;
      }

      this.isSpectator = false;
      if (!this.sync.isConnected()) {
        this.sync.connect().then(() => {
          this.sync.setPlayerInfo(this.playerName, this.playerColor);
          this.sync.joinRoom(code, this.playerName, this.playerColor);
        }).catch((err) => {
          this.showError('Failed to connect to server');
          console.error(err);
        });
      } else {
        this.sync.setPlayerInfo(this.playerName, this.playerColor);
        this.sync.joinRoom(code, this.playerName, this.playerColor);
      }
    });

    joinSpectatorBtn?.addEventListener('click', () => {
      const code = roomCodeInput?.value.trim();
      if (!code || code.length !== 4) {
        this.showError('Please enter a valid 4-digit room code');
        return;
      }

      this.isSpectator = true;
      if (!this.sync.isConnected()) {
        this.sync.connect().then(() => {
          this.sync.setPlayerInfo(this.playerName, this.playerColor);
          this.sync.joinAsSpectator(code, this.playerName, this.playerColor);
        }).catch((err) => {
          this.showError('Failed to connect to server');
          console.error(err);
        });
      } else {
        this.sync.setPlayerInfo(this.playerName, this.playerColor);
        this.sync.joinAsSpectator(code, this.playerName, this.playerColor);
      }
    });

    singlePlayerBtn?.addEventListener('click', () => {
      this.hide();
      // Dispatch custom event for single player mode
      document.dispatchEvent(new CustomEvent('start-single-player'));
    });

    // Format room code input
    roomCodeInput?.addEventListener('input', (e) => {
      const input = e.target as HTMLInputElement;
      input.value = input.value.replace(/[^0-9]/g, '').slice(0, 4);
    });
  }

  private renderLobbyView(players: PlayerInfo[], roomCode: string, isHost: boolean): void {
    const state = this.sync.getState();
    const canStart = players.length >= 1 && isHost && !this.isSpectator;

    this.overlay.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border-radius: 20px;
        padding: 40px;
        max-width: 600px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.1);
      ">
        <div style="text-align: center; margin-bottom: 25px;">
          <p style="color: #888; margin: 0 0 5px 0; font-size: 0.9em;">Room Code</p>
          <div style="
            font-size: 3em;
            font-weight: bold;
            color: #4ecdc4;
            letter-spacing: 15px;
            text-shadow: 0 0 20px rgba(78, 205, 196, 0.5);
          ">${roomCode}</div>
          <p style="color: #666; margin: 10px 0 0 0; font-size: 0.85em;">Share this code with friends to join!</p>
          ${this.isSpectator ? '<p style="color: #aa96da; margin: 5px 0 0 0; font-size: 0.9em;">You are spectating</p>' : ''}
        </div>

        <div style="display: flex; gap: 20px;">
          <!-- Players List -->
          <div style="flex: 1; margin-bottom: 20px;">
            <div style="
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 15px;
            ">
              <span style="color: #aaa; font-size: 0.9em;">Players (${players.length}/8)</span>
              ${isHost ? '<span style="color: #4ecdc4; font-size: 0.85em;">You are the host</span>' : ''}
            </div>
            <div id="player-list" style="
              background: rgba(0, 0, 0, 0.3);
              border-radius: 10px;
              padding: 15px;
              min-height: 100px;
              max-height: 200px;
              overflow-y: auto;
            ">
              ${players.map(p => this.renderPlayerItem(p, p.id === state.playerId)).join('')}
            </div>
          </div>

          <!-- Chat Panel -->
          <div style="flex: 1; margin-bottom: 20px;">
            <span style="color: #aaa; font-size: 0.9em; display: block; margin-bottom: 15px;">Chat</span>
            <div style="
              background: rgba(0, 0, 0, 0.3);
              border-radius: 10px;
              padding: 10px;
              height: 200px;
              display: flex;
              flex-direction: column;
            ">
              <div id="chat-messages" style="
                flex: 1;
                overflow-y: auto;
                margin-bottom: 10px;
                font-size: 0.9em;
              "></div>
              <div style="display: flex; gap: 8px;">
                <input type="text" id="chat-input" placeholder="Type a message..." style="
                  flex: 1;
                  padding: 8px 12px;
                  border: 1px solid #333;
                  border-radius: 5px;
                  background: #0f0f1a;
                  color: #fff;
                  font-size: 0.9em;
                ">
                <button id="send-chat-btn" style="
                  padding: 8px 15px;
                  background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
                  border: none;
                  border-radius: 5px;
                  color: #fff;
                  cursor: pointer;
                ">Send</button>
              </div>
            </div>
          </div>
        </div>

        ${!this.isSpectator && isHost ? `
          <button id="start-game-btn" style="
            width: 100%;
            padding: 15px;
            background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
            border: none;
            border-radius: 10px;
            color: #fff;
            font-size: 1.1em;
            font-weight: bold;
            cursor: pointer;
            margin-bottom: 15px;
            transition: transform 0.2s, box-shadow 0.2s;
            ${!canStart ? 'opacity: 0.5; cursor: not-allowed;' : ''}
          " ${!canStart ? 'disabled' : ''}>Start Game</button>
        ` : this.isSpectator ? `
          <div style="
            text-align: center;
            padding: 15px;
            background: rgba(170, 150, 218, 0.1);
            border-radius: 10px;
            color: #aa96da;
            margin-bottom: 15px;
          ">
            You are watching this game as a spectator
          </div>
        ` : `
          <div style="
            text-align: center;
            padding: 15px;
            background: rgba(78, 205, 196, 0.1);
            border-radius: 10px;
            color: #4ecdc4;
            margin-bottom: 15px;
          ">
            Waiting for host to start the game...
          </div>
        `}

        <button id="leave-room-btn" style="
          width: 100%;
          padding: 12px;
          background: transparent;
          border: 2px solid #f38181;
          border-radius: 10px;
          color: #f38181;
          font-size: 0.95em;
          cursor: pointer;
          transition: background 0.3s;
        ">Leave Room</button>
      </div>
    `;

    this.setupLobbyViewEvents(isHost);
    this.updateChatDisplay();
  }

  private renderPlayerItem(player: PlayerInfo, isCurrentPlayer: boolean): string {
    const colorHex = '#' + player.color.toString(16).padStart(6, '0');
    const statusColor = player.isConnected ? '#4ecdc4' : '#f38181';
    const statusText = player.isConnected ? 'Online' : 'Disconnected';

    return `
      <div style="
        display: flex;
        align-items: center;
        padding: 8px;
        margin-bottom: 6px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        ${isCurrentPlayer ? 'border: 1px solid rgba(78, 205, 196, 0.3);' : ''}
      ">
        <div style="
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: ${colorHex};
          display: flex;
          justify-content: center;
          align-items: center;
          margin-right: 10px;
          font-weight: bold;
          color: #fff;
          font-size: 0.9em;
          text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        ">${player.name.charAt(0).toUpperCase()}</div>
        <div style="flex: 1;">
          <div style="
            color: #fff;
            font-size: 0.85em;
            font-weight: ${isCurrentPlayer ? 'bold' : 'normal'};
          ">
            ${player.name}${isCurrentPlayer ? ' (You)' : ''}${player.isHost ? ' 👑' : ''}
          </div>
          <div style="color: #666; font-size: 0.75em;">
            Score: ${player.score}
          </div>
        </div>
        <div style="
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: ${statusColor};
        "></div>
      </div>
    `;
  }

  private setupLobbyViewEvents(isHost: boolean): void {
    const startBtn = document.getElementById('start-game-btn');
    const leaveBtn = document.getElementById('leave-room-btn');
    const chatInput = document.getElementById('chat-input') as HTMLInputElement;
    const sendChatBtn = document.getElementById('send-chat-btn');

    startBtn?.addEventListener('click', () => {
      this.sync.startGame();
    });

    leaveBtn?.addEventListener('click', () => {
      this.sync.leaveRoom();
      this.options.onLeaveRoom?.();
      this.currentView = 'main';
      this.isSpectator = false;
      this.chatMessages = [];
      this.renderMainView();
    });

    const sendChat = () => {
      const message = chatInput?.value.trim();
      if (message) {
        this.sync.sendChat(message);
        chatInput.value = '';
      }
    };

    sendChatBtn?.addEventListener('click', sendChat);
    chatInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendChat();
      }
    });
  }

  private showError(message: string): void {
    const existingError = document.getElementById('error-toast');
    if (existingError) existingError.remove();

    const errorDiv = document.createElement('div');
    errorDiv.id = 'error-toast';
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #f38181 0%, #e84393 100%);
      color: white;
      padding: 15px 25px;
      border-radius: 10px;
      font-weight: bold;
      z-index: 2000;
      box-shadow: 0 10px 30px rgba(243, 129, 129, 0.4);
      animation: slideDown 0.3s ease-out;
    `;
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);

    setTimeout(() => {
      errorDiv.style.animation = 'slideUp 0.3s ease-out forwards';
      setTimeout(() => errorDiv.remove(), 300);
    }, 3000);

    // Add animation styles if not present
    if (!document.getElementById('lobby-animation-styles')) {
      const style = document.createElement('style');
      style.id = 'lobby-animation-styles';
      style.textContent = `
        @keyframes slideDown {
          from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateX(-50%) translateY(0); opacity: 1; }
          to { transform: translateX(-50%) translateY(-100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  private updateConnectionStatus(): void {
    const statusEl = document.getElementById('connection-status');
    if (!statusEl) return;

    const update = () => {
      const state = this.sync.getState();
      if (state.isConnecting) {
        statusEl.innerHTML = '<span style="color: #ffe66d;">Connecting...</span>';
      } else if (state.isConnected) {
        statusEl.innerHTML = '<span style="color: #4ecdc4;">Connected to server</span>';
      } else {
        statusEl.innerHTML = '<span style="color: #666;">Not connected</span>';
      }
    };

    update();
    setInterval(update, 1000);
  }

  show(): void {
    this.container.style.display = 'block';
    if (this.currentView === 'main') {
      this.renderMainView();
    }
  }

  hide(): void {
    this.container.style.display = 'none';
  }

  destroy(): void {
    this.unsubscribers.forEach(unsub => unsub());
    this.container.remove();
  }
}
