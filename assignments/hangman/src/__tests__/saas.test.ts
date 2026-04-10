/**
 * Tests for SaaS platform server endpoints
 * Auth, lobby, friends, profile, dashboard, themes
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { unlinkSync, existsSync } from "fs";

// We'll test the server modules directly since we can't easily spin up HTTP
// in vitest. The modules export manager singletons we can test.

// --- Auth Manager Tests ---
describe("AuthManager", () => {
  // Import dynamically to reset state
  let authManager: any;

  beforeAll(async () => {
    // Remove stale data so the singleton starts fresh
    const dataFile = "data/users.json";
    if (existsSync(dataFile)) {
      unlinkSync(dataFile);
    }
    // Re-import to get fresh state
    const mod = await import("../../server/auth");
    authManager = mod.authManager;
  });

  afterAll(() => {
    // Clean up data file created during tests
    const dataFile = "data/users.json";
    if (existsSync(dataFile)) {
      unlinkSync(dataFile);
    }
  });

  it("should hash passwords consistently", async () => {
    const hash1 = await authManager.hashPassword("test123");
    const hash2 = await authManager.hashPassword("test123");
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex length
  });

  it("should verify correct passwords", async () => {
    const hash = await authManager.hashPassword("mypassword");
    const valid = await authManager.verifyPassword("mypassword", hash);
    expect(valid).toBe(true);
  });

  it("should reject incorrect passwords", async () => {
    const hash = await authManager.hashPassword("mypassword");
    const valid = await authManager.verifyPassword("wrongpassword", hash);
    expect(valid).toBe(false);
  });

  it("should generate and verify tokens", () => {
    const token = authManager.generateToken("user_123", "testuser");
    expect(token.startsWith("hm_")).toBe(true);

    const payload = authManager.verifyToken(token);
    expect(payload).not.toBeNull();
    expect(payload!.userId).toBe("user_123");
    expect(payload!.username).toBe("testuser");
  });

  it("should reject invalid tokens", () => {
    expect(authManager.verifyToken("invalid")).toBeNull();
    expect(authManager.verifyToken("hm_invalid")).toBeNull();
    expect(authManager.verifyToken("")).toBeNull();
  });

  it("should register a new user", async () => {
    const result = await authManager.register("testuser_saas", "password123", "Test User");
    expect(result).not.toBeNull();
    expect(result!.user.username).toBe("testuser_saas");
    expect(result!.user.displayName).toBe("Test User");
    expect(result!.user.tier).toBe("free");
    expect(result!.token).toBeTruthy();
  });

  it("should reject duplicate registration", async () => {
    const result = await authManager.register("testuser_saas", "password123");
    expect(result).toBeNull();
  });

  it("should reject short username", async () => {
    const result = await authManager.register("ab", "password123");
    expect(result).toBeNull();
  });

  it("should reject short password", async () => {
    const result = await authManager.register("newuser123", "12345");
    expect(result).toBeNull();
  });

  it("should login with correct credentials", async () => {
    const result = await authManager.login("testuser_saas", "password123");
    expect(result).not.toBeNull();
    expect(result!.user.username).toBe("testuser_saas");
    expect(result!.token).toBeTruthy();
  });

  it("should reject login with wrong password", async () => {
    const result = await authManager.login("testuser_saas", "wrongpassword");
    expect(result).toBeNull();
  });

  it("should reject login for non-existent user", async () => {
    const result = await authManager.login("nonexistent_user", "password123");
    expect(result).toBeNull();
  });

  it("should get user by username", () => {
    const user = authManager.getUser("testuser_saas");
    expect(user).not.toBeNull();
    expect(user!.username).toBe("testuser_saas");
  });

  it("should return null for unknown user", () => {
    const user = authManager.getUser("unknown_user_xyz");
    expect(user).toBeNull();
  });

  it("should update user profile", () => {
    const updated = authManager.updateUser("testuser_saas", {
      displayName: "Updated Name",
      avatar: "#ff0000",
    });
    expect(updated).not.toBeNull();
    expect(updated!.displayName).toBe("Updated Name");
    expect(updated!.avatar).toBe("#ff0000");
  });

  it("should upgrade user to pro", () => {
    const updated = authManager.updateUser("testuser_saas", { tier: "pro" });
    expect(updated).not.toBeNull();
    expect(updated!.tier).toBe("pro");
  });
});

// --- Friends Manager Tests ---
describe("FriendsManager", () => {
  let friendsManager: any;

  beforeAll(async () => {
    const mod = await import("../../server/friends");
    friendsManager = mod.friendsManager;
  });

  it("should add a friend request", () => {
    const result = friendsManager.addFriend("user_a", "user_b");
    expect(result).not.toBeNull();
    expect(result).not.toHaveProperty("error");
    expect(result!.status).toBe("pending");
  });

  it("should not allow adding yourself", () => {
    const result = friendsManager.addFriend("user_a", "user_a");
    expect(result).toEqual({ error: "Cannot add yourself" });
  });

  it("should accept a friend request", () => {
    const result = friendsManager.acceptFriend("user_b", "user_a");
    expect(result).not.toBeNull();
    expect(result!.status).toBe("accepted");
  });

  it("should list friends", () => {
    const friends = friendsManager.getFriends("user_a");
    expect(friends.length).toBeGreaterThan(0);
    expect(friends[0].status).toBe("accepted");
  });

  it("should get pending requests", () => {
    // user_c sends request to user_d
    friendsManager.addFriend("user_c", "user_d");
    const pending = friendsManager.getPendingRequests("user_d");
    expect(pending.length).toBeGreaterThan(0);
    expect(pending[0].status).toBe("pending");
  });

  it("should remove a friend", () => {
    const result = friendsManager.removeFriend("user_a", "user_b");
    expect(result).toBe(true);
  });

  it("should track online status", () => {
    friendsManager.setOnline("user_x");
    expect(friendsManager.isOnline("user_x")).toBe(true);
    expect(friendsManager.isOnline("user_y")).toBe(false);
  });

  it("should track offline status", () => {
    friendsManager.setOnline("user_z");
    expect(friendsManager.isOnline("user_z")).toBe(true);
    friendsManager.setOffline("user_z");
    expect(friendsManager.isOnline("user_z")).toBe(false);
  });
});

// --- Lobby Manager Tests ---
describe("LobbyManager", () => {
  let lobbyManager: any;

  beforeAll(async () => {
    const mod = await import("../../server/lobby");
    lobbyManager = mod.lobbyManager;
  });

  it("should create a room", () => {
    const room = lobbyManager.createRoom({
      name: "Test Room",
      hostId: "host_1",
      hostName: "HostPlayer",
      visibility: "public",
      category: "animals",
      difficulty: "easy",
      maxPlayers: 4,
      maxRounds: 3,
    });

    expect(room).not.toBeNull();
    expect(room.name).toBe("Test Room");
    expect(room.code).toMatch(/^\d{4}$/);
    expect(room.hostId).toBe("host_1");
    expect(room.visibility).toBe("public");
    expect(room.category).toBe("animals");
    expect(room.maxPlayers).toBe(4);
    expect(room.players.length).toBe(1);
    expect(room.status).toBe("waiting");
  });

  it("should join a room", () => {
    // Create room first
    const room = lobbyManager.createRoom({
      name: "Joinable Room",
      hostId: "host_2",
      hostName: "Host2",
      maxPlayers: 4,
    });

    const joined = lobbyManager.joinRoom(room.code, "player_2", "Joiner");
    expect(joined).not.toBeNull();
    expect(joined!.players.length).toBe(2);
  });

  it("should not join a full room", () => {
    const room = lobbyManager.createRoom({
      name: "Full Room",
      hostId: "host_3",
      hostName: "Host3",
      maxPlayers: 1,
    });

    const result = lobbyManager.joinRoom(room.code, "player_3", "Joiner");
    expect(result).toBeNull();
  });

  it("should leave a room", () => {
    const room = lobbyManager.createRoom({
      name: "Leave Room",
      hostId: "host_4",
      hostName: "Host4",
      maxPlayers: 4,
    });
    lobbyManager.joinRoom(room.code, "player_4", "Joiner4");

    const result = lobbyManager.leaveRoom(room.code, "player_4");
    expect(result).not.toBeNull();
  });

  it("should list public rooms", () => {
    lobbyManager.createRoom({
      name: "Public Room 1",
      hostId: "pub_host",
      hostName: "PubHost",
      visibility: "public",
    });
    lobbyManager.createRoom({
      name: "Private Room",
      hostId: "priv_host",
      hostName: "PrivHost",
      visibility: "private",
    });

    const publicRooms = lobbyManager.getPublicRooms();
    expect(publicRooms.length).toBeGreaterThan(0);
    expect(publicRooms.every((r: any) => r.visibility === "public")).toBe(true);
  });

  it("should start a room", () => {
    const room = lobbyManager.createRoom({
      name: "Start Room",
      hostId: "start_host",
      hostName: "StartHost",
    });

    const started = lobbyManager.startRoom(room.code);
    expect(started).not.toBeNull();
    expect(started!.status).toBe("playing");
    expect(started!.currentRound).toBe(1);
  });

  it("should get user rooms", () => {
    lobbyManager.createRoom({
      name: "User Room",
      hostId: "user_x",
      hostName: "UserX",
    });

    const rooms = lobbyManager.getUserRooms("user_x");
    expect(rooms.length).toBeGreaterThan(0);
    expect(rooms[0].hostId).toBe("user_x");
  });
});
