/**
 * Lobby / Room System - Enhanced game room management
 * Named rooms, categories, difficulty, max players, rounds, public/private
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";

const DATA_DIR = "data";
const LOBBY_FILE = DATA_DIR + "/lobby.json";

export type RoomVisibility = "public" | "private";
export type RoomStatus = "waiting" | "playing" | "finished";

export interface LobbyRoom {
  id: string;
  code: string;
  name: string;
  hostId: string;
  hostName: string;
  visibility: RoomVisibility;
  category: string;
  difficulty: "easy" | "medium" | "hard" | "any";
  maxPlayers: number;
  maxRounds: number;
  currentRound: number;
  status: RoomStatus;
  players: RoomPlayer[];
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
}

export interface RoomPlayer {
  userId: string;
  username: string;
  displayName: string;
  score: number;
  isConnected: boolean;
}

export interface LobbyData {
  rooms: Record<string, LobbyRoom>; // code -> room
  lastUpdated: number;
}

class LobbyManager {
  private data: LobbyData;
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.data = this.load();
  }

  private load(): LobbyData {
    try {
      if (!existsSync(DATA_DIR)) {
        mkdirSync(DATA_DIR, { recursive: true });
      }
      if (existsSync(LOBBY_FILE)) {
        return JSON.parse(readFileSync(LOBBY_FILE, "utf-8"));
      }
    } catch (e) {
      console.error("Failed to load lobby:", e);
    }
    return { rooms: {}, lastUpdated: Date.now() };
  }

  private save(): void {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.data.lastUpdated = Date.now();
      writeFileSync(LOBBY_FILE, JSON.stringify(this.data, null, 2));
    }, 100);
  }

  clearSaveTimeout(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
  }

  createRoom(opts: {
    name: string;
    hostId: string;
    hostName: string;
    visibility?: RoomVisibility;
    category?: string;
    difficulty?: "easy" | "medium" | "hard" | "any";
    maxPlayers?: number;
    maxRounds?: number;
    password?: string;
  }): LobbyRoom {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const room: LobbyRoom = {
      id: "room_" + Date.now(),
      code,
      name: opts.name,
      hostId: opts.hostId,
      hostName: opts.hostName,
      visibility: opts.visibility || "public",
      category: opts.category || "any",
      difficulty: opts.difficulty || "any",
      maxPlayers: opts.maxPlayers || 8,
      maxRounds: opts.maxRounds || 5,
      currentRound: 0,
      status: "waiting",
      players: [
        {
          userId: opts.hostId,
          username: opts.hostName,
          displayName: opts.hostName,
          score: 0,
          isConnected: true,
        },
      ],
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
    };

    this.data.rooms[code] = room;
    this.save();
    return room;
  }

  joinRoom(code: string, userId: string, username: string): LobbyRoom | null {
    const room = this.data.rooms[code];
    if (!room) return null;
    if (room.status !== "waiting") return null;
    if (room.players.length >= room.maxPlayers) return null;
    if (room.players.some((p) => p.userId === userId)) return room; // already in

    room.players.push({
      userId,
      username,
      displayName: username,
      score: 0,
      isConnected: true,
    });

    this.save();
    return room;
  }

  leaveRoom(code: string, userId: string): LobbyRoom | null {
    const room = this.data.rooms[code];
    if (!room) return null;

    room.players = room.players.filter((p) => p.userId !== userId);
    if (room.players.length === 0) {
      delete this.data.rooms[code];
    } else if (room.hostId === userId) {
      room.hostId = room.players[0].userId;
      room.hostName = room.players[0].displayName;
    }

    this.save();
    return room;
  }

  getRoom(code: string): LobbyRoom | null {
    return this.data.rooms[code] || null;
  }

  getPublicRooms(): LobbyRoom[] {
    return Object.values(this.data.rooms)
      .filter((r) => r.visibility === "public" && r.status === "waiting")
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  getUserRooms(userId: string): LobbyRoom[] {
    return Object.values(this.data.rooms).filter(
      (r) =>
        r.players.some((p) => p.userId === userId) && r.status !== "finished"
    );
  }

  startRoom(code: string): LobbyRoom | null {
    const room = this.data.rooms[code];
    if (!room) return null;
    room.status = "playing";
    room.currentRound = 1;
    room.startedAt = Date.now();
    this.save();
    return room;
  }
}

export const lobbyManager = new LobbyManager();
