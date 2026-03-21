import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";
import { TeammateTemplateManager } from "../manager.js";
import { TEAMMATE_TEMPLATES } from "../types.js";
import type { TeammateTemplate } from "../types.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Mock fs module
mock.module("fs", () => ({
  existsSync: mock(() => false),
  readdirSync: mock(() => []),
  readFileSync: mock(() => ""),
  mkdirSync: mock(() => undefined),
  writeFileSync: mock(() => undefined),
}));

describe("TeammateTemplateManager", () => {
  let manager: TeammateTemplateManager;

  beforeEach(() => {
    manager = new TeammateTemplateManager();
  });

  describe("constructor", () => {
    it("should load built-in templates", () => {
      expect(manager.has("developer")).toBe(true);
      expect(manager.has("quant")).toBe(true);
      expect(manager.has("robotics")).toBe(true);
      expect(manager.has("infrastructure")).toBe(true);
    });
  });

  describe("get", () => {
    it("should return developer template", () => {
      const template = manager.get("developer");
      expect(template).toBeDefined();
      expect(template?.name).toBe("developer");
      expect(template?.description).toBe("AI coding assistant for software development");
      expect(template?.mcpServers).toBeDefined();
      expect(template?.permissions?.allowedTools).toContain("Read");
      expect(template?.permissions?.allowedTools).toContain("Write");
    });

    it("should return undefined for non-existent template", () => {
      expect(manager.get("nonexistent")).toBeUndefined();
    });
  });

  describe("has", () => {
    it("should return true for existing template", () => {
      expect(manager.has("developer")).toBe(true);
    });

    it("should return false for non-existent template", () => {
      expect(manager.has("nonexistent")).toBe(false);
    });
  });

  describe("list", () => {
    it("should return all template names sorted", () => {
      const names = manager.list();
      expect(names).toContain("developer");
      expect(names).toContain("quant");
      expect(names).toContain("robotics");
      expect(names).toContain("infrastructure");
      // Check sorted
      expect(names).toEqual([...names].sort());
    });
  });

  describe("merge", () => {
    it("should merge multiple templates", () => {
      const merged = manager.merge("developer", "quant");
      expect(merged.name).toBe("merged");
      expect(merged.mcpServers).toBeDefined();
      // Should have MCP servers from both
      expect(Object.keys(merged.mcpServers ?? {})).toContain("hetzner");
      expect(Object.keys(merged.mcpServers ?? {})).toContain("prediction-markets");
    });

    it("should merge permissions allowedTools", () => {
      const merged = manager.merge("developer");
      expect(merged.permissions?.allowedTools).toBeDefined();
    });

    it("should handle non-existent templates gracefully", () => {
      const merged = manager.merge("nonexistent", "developer");
      expect(merged.name).toBe("merged");
    });
  });

  describe("create", () => {
    it("should create a new template", () => {
      const newTemplate: TeammateTemplate = {
        name: "test-template",
        description: "Test template",
        version: "1.0.0",
      };
      
      manager.create("test-template", newTemplate);
      expect(manager.has("test-template")).toBe(true);
    });
  });

  describe("getInfo", () => {
    it("should return template info", () => {
      const info = manager.getInfo("developer");
      expect(info).toBeDefined();
      expect(info?.name).toBe("developer");
      expect(info?.description).toBe("AI coding assistant for software development");
      expect(info?.mcpServerCount).toBeGreaterThan(0);
      expect(info?.hasClaudeMd).toBe(true);
      expect(info?.tags).toContain("development");
    });

    it("should return null for non-existent template", () => {
      expect(manager.getInfo("nonexistent")).toBeNull();
    });
  });
});
