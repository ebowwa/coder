/**
 * Daemon Plugin
 *
 * Registers daemon operational capabilities as ecosystem tools:
 * - QualityGate: run tests + typecheck + git diff for verification
 * - DaemonInstall: install persistent daemon service (launchd/systemd)
 * - DaemonUninstall: remove the daemon service
 * - DaemonStatus: query whether the daemon service is running
 *
 * Usage:
 *   plugins.push(createDaemonPlugin());
 */

import type { EcosystemPlugin, PluginContext } from "../plugin.js";
import type { ToolDefinition, ToolResult, ToolContext } from "../../schemas/index.js";
import { verifyQualityGate, buildRetryPrompt } from "./quality-gate.js";
import { installService } from "./service/install.js";
import { uninstallService } from "./service/uninstall.js";
import { getServiceStatus } from "./service/status.js";

const QualityGateTool: ToolDefinition = {
  name: "QualityGate",
  description:
    "Run the quality gate (bun test + tsc --noEmit + git diff) against a working directory. Returns structured pass/fail with test counts, TS error count, and changed files list.",
  input_schema: {
    type: "object",
    properties: {
      working_directory: {
        type: "string",
        description: "Absolute path to the project directory to verify",
      },
    },
    required: ["working_directory"],
  },
  handler: async (args: Record<string, unknown>): Promise<ToolResult> => {
    const cwd = args.working_directory as string;
    if (!cwd) {
      return { content: "Error: working_directory is required", is_error: true };
    }
    try {
      const result = await verifyQualityGate(cwd);
      return {
        content: JSON.stringify(result, null, 2),
        is_error: !result.passed,
      };
    } catch (e) {
      return { content: `QualityGate error: ${e}`, is_error: true };
    }
  },
};

const DaemonInstallTool: ToolDefinition = {
  name: "DaemonInstall",
  description:
    "Install the coder daemon as a persistent OS service (launchd on macOS, systemd on Linux). The daemon auto-restarts on crash and survives reboots.",
  input_schema: {
    type: "object",
    properties: {
      role: {
        type: "string",
        description: "Daemon role/identity (e.g. 'developer', 'reviewer')",
      },
      jurisdiction: {
        type: "string",
        description: "Absolute path to the working directory the daemon operates in",
      },
      model: {
        type: "string",
        description: "LLM model to use (default: glm-5)",
      },
      cooldown: {
        type: "number",
        description: "Seconds between turns (default: 30)",
      },
    },
    required: ["role", "jurisdiction"],
  },
  handler: async (args: Record<string, unknown>): Promise<ToolResult> => {
    try {
      const result = await installService({
        role: args.role as string,
        jurisdiction: args.jurisdiction as string,
        model: args.model as string | undefined,
        cooldown: args.cooldown as number | undefined,
      });
      return { content: result.message, is_error: !result.success };
    } catch (e) {
      return { content: `Install error: ${e}`, is_error: true };
    }
  },
};

const DaemonUninstallTool: ToolDefinition = {
  name: "DaemonUninstall",
  description: "Uninstall the coder daemon service from the OS process manager.",
  input_schema: {
    type: "object",
    properties: {},
    required: [],
  },
  handler: async (): Promise<ToolResult> => {
    try {
      const result = await uninstallService();
      return { content: result.message, is_error: !result.success };
    } catch (e) {
      return { content: `Uninstall error: ${e}`, is_error: true };
    }
  },
};

const DaemonStatusTool: ToolDefinition = {
  name: "DaemonStatus",
  description:
    "Query the current state of the daemon service (installed, running, PID, uptime).",
  input_schema: {
    type: "object",
    properties: {},
    required: [],
  },
  handler: async (): Promise<ToolResult> => {
    try {
      const status = await getServiceStatus();
      return { content: JSON.stringify(status, null, 2) };
    } catch (e) {
      return { content: `Status error: ${e}`, is_error: true };
    }
  },
};

export function createDaemonPlugin(): EcosystemPlugin {
  return {
    name: "daemon",
    register({ tools }) {
      tools.push(QualityGateTool, DaemonInstallTool, DaemonUninstallTool, DaemonStatusTool);
    },
  };
}
