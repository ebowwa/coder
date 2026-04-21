/**
 * Friends System - Add/remove friends, online status, challenge
 */

import { existsSync, readFileSync } from "fs";

const DATA_DIR = "data";
const FRIENDS_FILE = `${DATA_DIR}/friends.json`;

export interface FriendRelation {
  userId: string;
  friendId: string;
  status: "pending" | "accepted" | "blocked";
  requestedAt: number;
  acceptedAt: number | null;
}

export interface FriendData {
  friends: FriendRelation[];
  onlineUsers: Record<string, number>; // userId -> lastSeen timestamp
  lastUpdated: number;
}

class FriendsManager {
  private data: FriendData;
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.data = this.load();
  }

  private load(): FriendData {
    try {
      if (!existsSync(DATA_DIR)) {
        const { mkdirSync } = require("fs");
        mkdirSync(DATA_DIR, { recursive: true });
      }
      if (existsSync(FRIENDS_FILE)) {
        return JSON.parse(readFileSync(FRIENDS_FILE, "utf-8"));
      }
    } catch (e) {
      console.error("Failed to load friends:", e);
    }
    return { friends: [], onlineUsers: {}, lastUpdated: Date.now() };
  }

  private save(): void {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.data.lastUpdated = Date.now();
      if (typeof Bun !== 'undefined') {
        Bun.write(FRIENDS_FILE, JSON.stringify(this.data, null, 2));
      } else {
        const fs = require('fs');
        fs.writeFileSync(FRIENDS_FILE, JSON.stringify(this.data, null, 2));
      }
    }, 100);
  }

  addFriend(
    userId: string,
    friendId: string
  ): FriendRelation | { error: string } {
    if (userId === friendId) return { error: "Cannot add yourself" };

    const existing = this.data.friends.find(
      (f) =>
        (f.userId === userId && f.friendId === friendId) ||
        (f.userId === friendId && f.friendId === userId)
    );
    if (existing) {
      if (existing.status === "accepted") return { error: "Already friends" };
      if (existing.status === "pending")
        return { error: "Request already pending" };
    }

    const relation: FriendRelation = {
      userId,
      friendId,
      status: "pending",
      requestedAt: Date.now(),
      acceptedAt: null,
    };
    this.data.friends.push(relation);
    this.save();
    return relation;
  }

  acceptFriend(userId: string, friendId: string): FriendRelation | null {
    const relation = this.data.friends.find(
      (f) =>
        f.userId === friendId &&
        f.friendId === userId &&
        f.status === "pending"
    );
    if (!relation) return null;

    relation.status = "accepted";
    relation.acceptedAt = Date.now();
    this.save();
    return relation;
  }

  removeFriend(userId: string, friendId: string): boolean {
    const idx = this.data.friends.findIndex(
      (f) =>
        (f.userId === userId && f.friendId === friendId) ||
        (f.userId === friendId && f.friendId === userId)
    );
    if (idx < 0) return false;
    this.data.friends.splice(idx, 1);
    this.save();
    return true;
  }

  getFriends(userId: string): FriendRelation[] {
    return this.data.friends.filter(
      (f) =>
        (f.userId === userId || f.friendId === userId) &&
        f.status === "accepted"
    );
  }

  getPendingRequests(userId: string): FriendRelation[] {
    return this.data.friends.filter(
      (f) => f.friendId === userId && f.status === "pending"
    );
  }

  setOnline(userId: string): void {
    this.data.onlineUsers[userId] = Date.now();
    this.save();
  }

  setOffline(userId: string): void {
    delete this.data.onlineUsers[userId];
    this.save();
  }

  isOnline(userId: string): boolean {
    const lastSeen = this.data.onlineUsers[userId];
    if (!lastSeen) return false;
    // Consider online if seen in last 2 minutes
    return Date.now() - lastSeen < 2 * 60 * 1000;
  }

  getOnlineFriends(userId: string): string[] {
    const friends = this.getFriends(userId);
    return friends
      .map((f) => (f.userId === userId ? f.friendId : f.userId))
      .filter((fid) => this.isOnline(fid));
  }
}

export const friendsManager = new FriendsManager();
