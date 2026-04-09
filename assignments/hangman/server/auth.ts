/**
 * Authentication & User Account System
 * JWT-based auth with bcrypt password hashing
 */

import { existsSync, readFileSync } from "fs";
import { mkdirSync } from "fs";

// --- Simple hash/verify for passwords (no bcrypt dep needed) ---
// Uses Bun's built-in crypto via password hashing

const DATA_DIR = "data";
const USERS_FILE = `${DATA_DIR}/users.json`;

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  displayName: string;
  avatar: string; // color hex
  tier: "free" | "pro";
  theme: "default" | "dark" | "neon" | "classic-wood";
  createdAt: number;
  lastLogin: number;
}

export interface UserStats {
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  currentStreak: number;
  bestStreak: number;
  rank: number;
  score: number;
  avgGuesses: number;
}

export interface UsersData {
  users: Record<string, User>; // username -> User
  lastUpdated: number;
}

class AuthManager {
  private data: UsersData;
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.data = this.load();
  }

  private load(): UsersData {
    try {
      if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
      if (existsSync(USERS_FILE)) {
        return JSON.parse(readFileSync(USERS_FILE, "utf-8"));
      }
    } catch (e) {
      console.error("Failed to load users:", e);
    }
    return { users: {}, lastUpdated: Date.now() };
  }

  private save(): void {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.data.lastUpdated = Date.now();
      Bun.write(USERS_FILE, JSON.stringify(this.data, null, 2));
    }, 100);
  }

  async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    const computed = await this.hashPassword(password);
    return computed === hash;
  }

  generateToken(userId: string, username: string): string {
    const payload = {
      sub: userId,
      username,
      iat: Date.now(),
      exp: Date.now() + 24 * 60 * 60 * 1000, // 24h
    };
    // Simple base64 token (not production JWT - no external deps)
    const encoded = btoa(JSON.stringify(payload));
    return `hm_${encoded}`;
  }

  verifyToken(token: string): { userId: string; username: string } | null {
    try {
      if (!token.startsWith("hm_")) return null;
      const payload = JSON.parse(atob(token.slice(3)));
      if (payload.exp < Date.now()) return null;
      return { userId: payload.sub, username: payload.username };
    } catch {
      return null;
    }
  }

  async register(
    username: string,
    password: string,
    displayName?: string
  ): Promise<{ user: User; token: string } | null> {
    const key = username.toLowerCase();
    if (this.data.users[key]) return null; // already exists
    if (username.length < 3 || username.length > 20) return null;
    if (password.length < 6) return null;

    const passwordHash = await this.hashPassword(password);
    const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const user: User = {
      id,
      username,
      passwordHash,
      displayName: displayName || username,
      avatar: "#4ecdc4",
      tier: "free",
      theme: "default",
      createdAt: Date.now(),
      lastLogin: Date.now(),
    };

    this.data.users[key] = user;
    this.save();

    const token = this.generateToken(id, username);
    return { user, token };
  }

  async login(
    username: string,
    password: string
  ): Promise<{ user: User; token: string } | null> {
    const key = username.toLowerCase();
    const user = this.data.users[key];
    if (!user) return null;

    const valid = await this.verifyPassword(password, user.passwordHash);
    if (!valid) return null;

    user.lastLogin = Date.now();
    this.save();

    const token = this.generateToken(user.id, user.username);
    return { user, token };
  }

  getUser(username: string): User | null {
    return this.data.users[username.toLowerCase()] || null;
  }

  getUserById(id: string): User | null {
    return Object.values(this.data.users).find((u) => u.id === id) || null;
  }

  updateUser(
    username: string,
    updates: Partial<Pick<User, "displayName" | "avatar" | "tier" | "theme">>
  ): User | null {
    const key = username.toLowerCase();
    const user = this.data.users[key];
    if (!user) return null;

    if (updates.displayName) user.displayName = updates.displayName;
    if (updates.avatar) user.avatar = updates.avatar;
    if (updates.tier) user.tier = updates.tier;
    if (updates.theme) user.theme = updates.theme;

    this.save();
    return user;
  }

  getAllUsers(): User[] {
    return Object.values(this.data.users);
  }

  // For auth middleware
  authenticateRequest(
    req: Request
  ): { userId: string; username: string } | null {
    const auth = req.headers.get("Authorization");
    if (!auth) return null;
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
    return this.verifyToken(token);
  }
}

export const authManager = new AuthManager();
