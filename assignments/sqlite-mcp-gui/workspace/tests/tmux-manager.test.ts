/**
 * Tests for TmuxSessionManager
 * Unit tests for multi-node tmux session management
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { TmuxSessionManager, getTmuxManager, resetTmuxManager } from "../src/lib/terminal/manager";
import type { Node } from "../src/lib/terminal/manager";

describe("TmuxSessionManager", () => {
  let manager: TmuxSessionManager;

  beforeEach(() => {
    resetTmuxManager();
    manager = getTmuxManager();
  });

  afterEach(() => {
    resetTmuxManager();
  });

  describe("Node Management", () => {
    it("should add a node", () => {
      const node: Node = {
        id: "test-node-1",
        name: "Test Server",
        ip: "192.168.1.100",
        user: "root",
        port: 22,
        keyPath: "/test/key",
        status: "running",
        tags: ["test"],
        location: "fsn1",
      };

      manager.addNode(node);

      const retrieved = manager.getNode("test-node-1");
      expect(retrieved).toEqual(node);
    });

    it("should remove a node", () => {
      const node: Node = {
        id: "test-node-1",
        name: "Test Server",
        ip: "192.168.1.100",
        user: "root",
        port: 22,
        status: "running",
      };

      manager.addNode(node);
      expect(manager.getNode("test-node-1")).toBeDefined();

      manager.removeNode("test-node-1");
      expect(manager.getNode("test-node-1")).toBeUndefined();
    });

    it("should get all nodes", () => {
      manager.addNode({
        id: "node-1",
        name: "Server 1",
        ip: "192.168.1.1",
        user: "root",
        port: 22,
        status: "running",
      });
      manager.addNode({
        id: "node-2",
        name: "Server 2",
        ip: "192.168.1.2",
        user: "root",
        port: 22,
        status: "running",
      });

      const nodes = manager.getAllNodes();
      expect(nodes).toHaveLength(2);
    });

    it("should get nodes by tag", () => {
      manager.addNode({
        id: "node-1",
        name: "Web Server",
        ip: "192.168.1.1",
        user: "root",
        port: 22,
        status: "running",
        tags: ["web", "production"],
      });
      manager.addNode({
        id: "node-2",
        name: "DB Server",
        ip: "192.168.1.2",
        user: "root",
        port: 22,
        status: "running",
        tags: ["database", "production"],
      });
      manager.addNode({
        id: "node-3",
        name: "Dev Server",
        ip: "192.168.1.3",
        user: "root",
        port: 22,
        status: "running",
        tags: ["development"],
      });

      const prodNodes = manager.getNodesByTag("production");
      expect(prodNodes).toHaveLength(2);

      const devNodes = manager.getNodesByTag("development");
      expect(devNodes).toHaveLength(1);
    });

    it("should get active nodes only", () => {
      manager.addNode({
        id: "node-1",
        name: "Running Server",
        ip: "192.168.1.1",
        user: "root",
        port: 22,
        status: "running",
      });
      manager.addNode({
        id: "node-2",
        name: "Stopped Server",
        ip: "192.168.1.2",
        user: "root",
        port: 22,
        status: "stopped",
      });
      manager.addNode({
        id: "node-3",
        name: "Unreachable Server",
        ip: "192.168.1.3",
        user: "root",
        port: 22,
        status: "unreachable",
      });

      const activeNodes = manager.getActiveNodes();
      expect(activeNodes).toHaveLength(1);
      expect(activeNodes[0].id).toBe("node-1");
    });
  });

  describe("Session Cache", () => {
    it("should invalidate cache for a specific node", () => {
      manager.addNode({
        id: "node-1",
        name: "Test",
        ip: "192.168.1.1",
        user: "root",
        port: 22,
        status: "running",
      });

      // Simulate cached data
      (manager as any).sessionCache.set("node-1", [{ name: "test", nodeId: "node-1", exists: true }]);
      (manager as any).lastCacheUpdate.set("node-1", Date.now());

      manager.invalidateCache("node-1");

      expect((manager as any).sessionCache.has("node-1")).toBe(false);
      expect((manager as any).lastCacheUpdate.has("node-1")).toBe(false);
    });

    it("should invalidate all cache", () => {
      manager.addNode({
        id: "node-1",
        name: "Test",
        ip: "192.168.1.1",
        user: "root",
        port: 22,
        status: "running",
      });
      manager.addNode({
        id: "node-2",
        name: "Test 2",
        ip: "192.168.1.2",
        user: "root",
        port: 22,
        status: "running",
      });

      // Simulate cached data
      (manager as any).sessionCache.set("node-1", [{ name: "test", nodeId: "node-1", exists: true }]);
      (manager as any).sessionCache.set("node-2", [{ name: "test2", nodeId: "node-2", exists: true }]);

      manager.invalidateCache();

      expect((manager as any).sessionCache.size).toBe(0);
      expect((manager as any).lastCacheUpdate.size).toBe(0);
    });

    it("should validate cache freshness", () => {
      manager.addNode({
        id: "node-1",
        name: "Test",
        ip: "192.168.1.1",
        user: "root",
        port: 22,
        status: "running",
      });

      // No cache = not valid
      expect((manager as any).isCacheValid("node-1")).toBe(false);

      // Add cache with old timestamp
      (manager as any).lastCacheUpdate.set("node-1", Date.now() - 40000); // 40 seconds ago
      expect((manager as any).isCacheValid("node-1")).toBe(false);

      // Add fresh cache
      (manager as any).lastCacheUpdate.set("node-1", Date.now() - 10000); // 10 seconds ago
      expect((manager as any).isCacheValid("node-1")).toBe(true);
    });
  });

  describe("SSH Options Generation", () => {
    it("should generate SSH options for a node", () => {
      const node: Node = {
        id: "node-1",
        name: "Test",
        ip: "192.168.1.100",
        user: "ubuntu",
        port: 2222,
        keyPath: "/custom/key",
        status: "running",
      };

      manager.addNode(node);

      const options = (manager as any).getSSHOptions(node);
      expect(options).toEqual({
        host: "192.168.1.100",
        user: "ubuntu",
        port: 2222,
        keyPath: "/custom/key",
        timeout: 30,
      });
    });

    it("should use default timeout when not specified", () => {
      const node: Node = {
        id: "node-1",
        name: "Test",
        ip: "192.168.1.100",
        user: "root",
        port: 22,
        status: "running",
      };

      manager.addNode(node);

      const options = (manager as any).getSSHOptions(node);
      expect(options.timeout).toBe(30);
    });
  });

  describe("Error Handling", () => {
    it("should return error when node not found for createSession", async () => {
      const result = await manager.createSession("nonexistent", { sessionName: "test" });
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should return error when node is not running", async () => {
      manager.addNode({
        id: "stopped-node",
        name: "Stopped",
        ip: "192.168.1.1",
        user: "root",
        port: 22,
        status: "stopped",
      });

      const result = await manager.createSession("stopped-node", { sessionName: "test" });
      expect(result.success).toBe(false);
      expect(result.error).toContain("not running");
    });

    it("should return error when node not found for sendCommand", async () => {
      const result = await manager.sendCommand("nonexistent", "session", "ls");
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should return error when node is not running for sendCommand", async () => {
      manager.addNode({
        id: "stopped-node",
        name: "Stopped",
        ip: "192.168.1.1",
        user: "root",
        port: 22,
        status: "stopped",
      });

      const result = await manager.sendCommand("stopped-node", "session", "ls");
      expect(result.success).toBe(false);
      expect(result.error).toContain("not running");
    });

    it("should return error for batch operations with no valid nodes", async () => {
      const result = await manager.sendCommandToNodes(["nonexistent1", "nonexistent2"], "session", "ls");
      expect(result.total).toBe(0);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(0);
    });

    it("should return error for killSession when node not found", async () => {
      const result = await manager.killSession("nonexistent", "session");
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should return error for killSession when node is not running", async () => {
      manager.addNode({
        id: "stopped-node",
        name: "Stopped",
        ip: "192.168.1.1",
        user: "root",
        port: 22,
        status: "stopped",
      });

      const result = await manager.killSession("stopped-node", "session");
      expect(result.success).toBe(false);
      expect(result.error).toContain("not running");
    });

    it("should return error for splitPaneOnNode when node not found", async () => {
      const result = await manager.splitPaneOnNode("nonexistent", "session", "v");
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should return error for capturePaneOutput when node not found", async () => {
      const result = await manager.capturePaneOutput("nonexistent", "session");
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should return error for getPaneHistory when node not found", async () => {
      const result = await manager.getPaneHistory("nonexistent", "session");
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should return error for listWindows when node not found", async () => {
      const result = await manager.listWindows("nonexistent", "session");
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should return error for listPanes when node not found", async () => {
      const result = await manager.listPanes("nonexistent", "session");
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should return error for switchToWindow when node not found", async () => {
      const result = await manager.switchToWindow("nonexistent", "session", "0");
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should return error for switchToPane when node not found", async () => {
      const result = await manager.switchToPane("nonexistent", "session", "0");
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should return error for renameWindowInSession when node not found", async () => {
      const result = await manager.renameWindowInSession("nonexistent", "session", "0", "newname");
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should return error for killPaneInSession when node not found", async () => {
      const result = await manager.killPaneInSession("nonexistent", "session", "0");
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should return error for cleanupOldSessions when node not found", async () => {
      const result = await manager.cleanupOldSessions("nonexistent", 86400000);
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should return error for getResourceUsage when node not found", async () => {
      const result = await manager.getResourceUsage("nonexistent");
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should return null for getDetailedSession when node not found", async () => {
      const result = await manager.getDetailedSession("nonexistent", "session");
      expect(result).toBeNull();
    });

    it("should return null for getDetailedSession when node is not running", async () => {
      manager.addNode({
        id: "stopped-node",
        name: "Stopped",
        ip: "192.168.1.1",
        user: "root",
        port: 22,
        status: "stopped",
      });

      const result = await manager.getDetailedSession("stopped-node", "session");
      expect(result).toBeNull();
    });

    it("should return error for attachSession when node not found", async () => {
      const result = await manager.attachSession("nonexistent", "session");
      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should return error for attachSession when node is not running", async () => {
      manager.addNode({
        id: "stopped-node",
        name: "Stopped",
        ip: "192.168.1.1",
        user: "root",
        port: 22,
        status: "stopped",
      });

      const result = await manager.attachSession("stopped-node", "session");
      expect(result.success).toBe(false);
      expect(result.error).toContain("not running");
    });
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance on subsequent calls", () => {
      const manager1 = getTmuxManager();
      const manager2 = getTmuxManager();

      expect(manager1).toBe(manager2);
    });

    it("should create new instance after reset", () => {
      const manager1 = getTmuxManager();
      resetTmuxManager();
      const manager2 = getTmuxManager();

      expect(manager1).not.toBe(manager2);
    });
  });

  describe("Summary Statistics", () => {
    beforeEach(() => {
      manager.addNode({
        id: "node-1",
        name: "Server 1",
        ip: "192.168.1.1",
        user: "root",
        port: 22,
        status: "running",
      });
      manager.addNode({
        id: "node-2",
        name: "Server 2",
        ip: "192.168.1.2",
        user: "root",
        port: 22,
        status: "running",
      });
      manager.addNode({
        id: "node-3",
        name: "Server 3",
        ip: "192.168.1.3",
        user: "root",
        port: 22,
        status: "stopped",
      });
    });

    // Note: getSummary() requires SSH mocking to test properly
    // This is tested in integration tests
  });
});
