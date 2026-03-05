/**
 * Hook System Tests
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { HookManager, builtInHooks, hookExitCodes } from "../index.js";
import type { HookEvent, HookInput, HookOutput } from "../../../types/index.js";

describe("HookManager", () => {
  let manager: HookManager;

  beforeEach(() => {
    manager = new HookManager(5000);
  });

  afterEach(() => {
    manager.clear();
  });

  describe("registration", () => {
    it("should register a hook", () => {
      manager.register("PreToolUse", {
        event: "PreToolUse",
        command: "echo 'test'",
        enabled: true,
      });

      const hooks = manager.getHooks("PreToolUse");
      expect(hooks).toHaveLength(1);
      expect(hooks[0]?.command).toBe("echo 'test'");
    });

    it("should register multiple hooks for the same event", () => {
      manager.register("PreToolUse", {
        event: "PreToolUse",
        command: "echo '1'",
        enabled: true,
      });

      manager.register("PreToolUse", {
        event: "PreToolUse",
        command: "echo '2'",
        enabled: true,
      });

      const hooks = manager.getHooks("PreToolUse");
      expect(hooks).toHaveLength(2);
    });

    it("should register all hooks from a record", () => {
      // Using type assertion since registerAll expects a complete Record
      manager.registerAll({
        PreToolUse: [
          {
            event: "PreToolUse",
            command: "echo '1'",
            enabled: true,
          },
        ],
        PostToolUse: [
          {
            event: "PostToolUse",
            command: "echo '2'",
            enabled: true,
          },
        ],
      } as any);

      expect(manager.getHooks("PreToolUse")).toHaveLength(1);
      expect(manager.getHooks("PostToolUse")).toHaveLength(1);
    });
  });

  describe("in-process handlers", () => {
    it("should execute an in-process handler", async () => {
      let called = false;

      manager.registerHandler("PreToolUse", async (input) => {
        called = true;
        return { decision: "allow" };
      });

      const result = await manager.execute("PreToolUse", {
        tool_name: "Write",
        tool_input: {},
      });

      expect(called).toBe(true);
      expect(result.decision).toBe("allow");
    });

    it("should allow handler to deny execution", async () => {
      manager.registerHandler("PreToolUse", async (input) => {
        return {
          decision: "deny",
          reason: "Not allowed",
        };
      });

      const result = await manager.execute("PreToolUse", {
        tool_name: "Write",
        tool_input: {},
      });

      expect(result.decision).toBe("deny");
      expect(result.reason).toBe("Not allowed");
    });

    it("should allow handler to modify input", async () => {
      manager.registerHandler("PreToolUse", async (input) => {
        return {
          decision: "allow",
          modified_input: {
            tool_input: { modified: true },
          },
        };
      });

      const input = {
        tool_name: "Write",
        tool_input: { original: true },
      };

      const result = await manager.execute("PreToolUse", input);

      expect(result.decision).toBe("allow");
      expect((input as any).tool_input).toEqual({ modified: true });
    });

    it("should handle handler errors gracefully", async () => {
      manager.registerHandler("PreToolUse", async () => {
        throw new Error("Handler failed");
      });

      const result = await manager.execute("PreToolUse", {
        tool_name: "Write",
        tool_input: {},
      });

      expect(result.decision).toBe("deny");
      expect(result.reason).toBe("Hook handler error: Handler failed");
      expect(result.errors?.[0]).toContain("Handler failed");
    });
  });

  describe("shell command hooks", () => {
    it("should execute a simple shell hook", async () => {
      manager.register("PostToolUse", {
        event: "PostToolUse",
        command: `node -e '
          const input = JSON.parse(require("fs").readFileSync(0, "utf8"));
          console.log(JSON.stringify({ decision: "allow" }));
        '`,
        enabled: true,
      });

      const result = await manager.execute("PostToolUse", {
        tool_name: "Write",
        tool_input: {},
        tool_result: { content: "test" },
      });

      expect(result.decision).toBe("allow");
    });

    it("should parse JSON output from hook", async () => {
      manager.register("PreToolUse", {
        event: "PreToolUse",
        command: `node -e '
          const input = JSON.parse(require("fs").readFileSync(0, "utf8"));
          console.log(JSON.stringify({
            decision: "deny",
            reason: "Test denial"
          }));
        '`,
        enabled: true,
      });

      const result = await manager.execute("PreToolUse", {
        tool_name: "Write",
        tool_input: {},
      });

      expect(result.decision).toBe("deny");
      expect(result.reason).toBe("Test denial");
    });

    it("should default to allow on invalid JSON", async () => {
      manager.register("PreToolUse", {
        event: "PreToolUse",
        command: `echo "not json"`,
        enabled: true,
      });

      const result = await manager.execute("PreToolUse", {
        tool_name: "Write",
        tool_input: {},
      });

      expect(result.decision).toBe("allow");
    });

    it("should handle exit code 1 as deny", async () => {
      manager.register("PreToolUse", {
        event: "PreToolUse",
        command: `node -e '
          console.error("Access denied");
          process.exit(1);
        '`,
        enabled: true,
      });

      const result = await manager.execute("PreToolUse", {
        tool_name: "Write",
        tool_input: {},
      });

      expect(result.decision).toBe("deny");
      expect(result.reason).toContain("Access denied");
    });

    it("should handle exit code 2 as block", async () => {
      manager.register("PreToolUse", {
        event: "PreToolUse",
        command: `node -e '
          console.error("Blocked");
          process.exit(2);
        '`,
        enabled: true,
      });

      const result = await manager.execute("PreToolUse", {
        tool_name: "Write",
        tool_input: {},
      });

      expect(result.decision).toBe("block");
    });

    it("should timeout long-running hooks", async () => {
      manager.register("PreToolUse", {
        event: "PreToolUse",
        command: `node -e '
          setTimeout(() => {}, 10000);
        '`,
        enabled: true,
        timeout: 100,
      });

      const result = await manager.execute("PreToolUse", {
        tool_name: "Write",
        tool_input: {},
      });


      // After timeout, execution is denied
      expect(result.decision).toBe("deny");
      expect(result.reason).toContain("Hook timeout");
    });
  });

  describe("hook chaining", () => {
    it("should execute multiple hooks in sequence", async () => {
      const order: string[] = [];

      manager.registerHandler("PreToolUse", async () => {
        order.push("hook1");
        return { decision: "allow" };
      });

      manager.registerHandler("PreToolUse", async () => {
        order.push("hook2");
        return { decision: "allow" };
      });

      manager.registerHandler("PreToolUse", async () => {
        order.push("hook3");
        return { decision: "allow" };
      });

      await manager.execute("PreToolUse", {
        tool_name: "Write",
        tool_input: {},
      });

      expect(order).toEqual(["hook1", "hook2", "hook3"]);
    });

    it("should stop on first deny", async () => {
      const order: string[] = [];

      manager.registerHandler("PreToolUse", async () => {
        order.push("hook1");
        return { decision: "allow" };
      });

      manager.registerHandler("PreToolUse", async () => {
        order.push("hook2");
        return { decision: "deny", reason: "Stop here" };
      });

      manager.registerHandler("PreToolUse", async () => {
        order.push("hook3");
        return { decision: "allow" };
      });

      const result = await manager.execute("PreToolUse", {
        tool_name: "Write",
        tool_input: {},
      });

      expect(order).toEqual(["hook1", "hook2"]);
      expect(result.decision).toBe("deny");
      expect(result.reason).toBe("Stop here");
    });

    it("should stop on first block", async () => {
      const order: string[] = [];

      manager.registerHandler("PreToolUse", async () => {
        order.push("hook1");
        return { decision: "allow" };
      });

      manager.registerHandler("PreToolUse", async () => {
        order.push("hook2");
        return { decision: "block", reason: "Blocked" };
      });

      manager.registerHandler("PreToolUse", async () => {
        order.push("hook3");
        return { decision: "allow" };
      });

      const result = await manager.execute("PreToolUse", {
        tool_name: "Write",
        tool_input: {},
      });

      expect(order).toEqual(["hook1", "hook2"]);
      expect(result.decision).toBe("block");
    });
  });

  describe("disabled hooks", () => {
    it("should skip disabled hooks", async () => {
      let called = false;

      manager.registerHandler("PreToolUse", async () => {
        called = true;
        return { decision: "deny" };
      });

      const hooks = manager.getHooks("PreToolUse");
      if (hooks[0]) hooks[0].enabled = false;

      const result = await manager.execute("PreToolUse", {
        tool_name: "Write",
        tool_input: {},
      });

      expect(called).toBe(false);
      expect(result.decision).toBe("allow");
    });
  });

  describe("input modification", () => {
    it("should apply modifications from hooks", async () => {
      manager.registerHandler("PreToolUse", async () => {
        return {
          decision: "allow",
          modified_input: {
            tool_input: { step1: true },
          },
        };
      });

      manager.registerHandler("PreToolUse", async () => {
        return {
          decision: "allow",
          modified_input: {
            tool_input: { step2: true },
          },
        };
      });

      const input = {
        tool_name: "Write",
        tool_input: { original: true },
      };

      await manager.execute("PreToolUse", input);

      expect((input as any).tool_input).toEqual({
        step2: true,
      });
    });
  });

  describe("clear hooks", () => {
    it("should clear all hooks", () => {
      manager.register("PreToolUse", {
        event: "PreToolUse",
        command: "echo '1'",
        enabled: true,
      });

      manager.register("PostToolUse", {
        event: "PostToolUse",
        command: "echo '2'",
        enabled: true,
      });

      expect(manager.getHooks("PreToolUse")).toHaveLength(1);
      expect(manager.getHooks("PostToolUse")).toHaveLength(1);

      manager.clear();

      expect(manager.getHooks("PreToolUse")).toHaveLength(0);
      expect(manager.getHooks("PostToolUse")).toHaveLength(0);
    });

    it("should clear specific event hooks", () => {
      manager.register("PreToolUse", {
        event: "PreToolUse",
        command: "echo '1'",
        enabled: true,
      });

      manager.register("PostToolUse", {
        event: "PostToolUse",
        command: "echo '2'",
        enabled: true,
      });

      manager.clear("PreToolUse");

      expect(manager.getHooks("PreToolUse")).toHaveLength(0);
      expect(manager.getHooks("PostToolUse")).toHaveLength(1);
    });
  });

  describe("built-in hooks", () => {
    it("should have built-in hooks defined", () => {
      expect(builtInHooks.validateWrite).toBeDefined();
      expect(builtInHooks.logToolUse).toBeDefined();
    });

    it("should have validateWrite hook disabled by default", () => {
      expect(builtInHooks.validateWrite?.enabled).toBe(false);
    });

    it("should have logToolUse hook disabled by default", () => {
      expect(builtInHooks.logToolUse?.enabled).toBe(false);
    });
  });

  describe("hook input structure", () => {
    it("should include timestamp in hook input", async () => {
      let receivedTimestamp = 0;

      manager.registerHandler("PreToolUse", async (input) => {
        receivedTimestamp = input.timestamp;
        return { decision: "allow" };
      });

      await manager.execute("PreToolUse", {
        tool_name: "Write",
        tool_input: {},
      });

      expect(receivedTimestamp).toBeGreaterThan(0);
    });

    it("should include event in hook input", async () => {
      let receivedEvent: HookEvent | null = null;

      manager.registerHandler("PreToolUse", async (input) => {
        receivedEvent = input.event;
        return { decision: "allow" };
      });

      await manager.execute("PreToolUse", {
        tool_name: "Write",
        tool_input: {},
      });

      expect(receivedEvent === "PreToolUse").toBe(true);
    });
  });

  describe("real-world scenarios", () => {
    it("should prevent writes to sensitive paths", async () => {
      manager.register("PreToolUse", {
        event: "PreToolUse",
        command: `node -e '
          const input = JSON.parse(require("fs").readFileSync(0, "utf8"));
          if (input.tool_name === "Write") {
            const path = input.tool_input.file_path;
            if (path.includes("/etc/") || path.includes("~/.ssh/")) {
              console.log(JSON.stringify({
                decision: "deny",
                reason: "Cannot write to sensitive path: " + path
              }));
              process.exit(1);
            }
          }
          console.log(JSON.stringify({ decision: "allow" }));
        '`,
        enabled: true,
      });

      const safeResult = await manager.execute("PreToolUse", {
        tool_name: "Write",
        tool_input: { file_path: "/tmp/test.txt" },
      });

      expect(safeResult.decision).toBe("allow");

      const dangerousResult = await manager.execute("PreToolUse", {
        tool_name: "Write",
        tool_input: { file_path: "/etc/passwd" },
      });

      expect(dangerousResult.decision).toBe("deny");
      expect(dangerousResult.reason).toContain("Cannot write to sensitive path");
      expect(dangerousResult.reason).toContain("/etc/passwd");
    });

    it("should log all tool uses", async () => {
      const logs: string[] = [];

      manager.registerHandler("PostToolUse", async (input) => {
        logs.push(`Used: ${input.tool_name}`);
        return { decision: "allow" };
      });

      await manager.execute("PostToolUse", {
        tool_name: "Read",
        tool_input: { file_path: "test.txt" },
        tool_result: { content: "content" },
      });

      await manager.execute("PostToolUse", {
        tool_name: "Write",
        tool_input: { file_path: "test.txt" },
        tool_result: { content: "" },
      });

      expect(logs).toEqual(["Used: Read", "Used: Write"]);
    });
  });
});

describe("hookExitCodes", () => {
  it("should have correct exit codes", () => {
    expect(hookExitCodes.ALLOW).toBe(0);
    expect(hookExitCodes.DENY).toBe(1);
    expect(hookExitCodes.BLOCK).toBe(2);
  });
});
