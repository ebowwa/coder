#!/usr/bin/env bun
/**
 * Coder - CLI Entry Point
 * AI-powered terminal coding assistant
 *
 * This is a thin orchestrator that:
 * 1. Parses arguments
 * 2. Sets up session (config, MCP, hooks)
 * 3. Dispatches to TUI or single-query mode
 */

import type { Message } from "../../../../schemas/index.js";
import type { ToolDefinition, PermissionMode } from "../../../../schemas/index.js";
import type { builtInTools } from "../../../../ecosystem/tools/index.js";
import type { HookManager } from "../../../../ecosystem/hooks/index.js";
import type { SkillManager } from "../../../../ecosystem/skills/index.js";
import type { MCPClientImpl } from "../../../mcp/client.js";
import { SessionStore, printSessionsList } from "../../../../core/session-store.js";
import { LoopPersistence } from "../../../../core/agent-loop/loop-persistence.js";
import * as readline from "node:readline/promises";
import { getGitStatus } from "../../../../core/git-status.js";
import { renderStatusLine, getContextWindow, VERSION, type StatusLineOptions } from "../shared/status-line.js";
import { readStatus, formatStatus, getStatusFilePath } from "../../../../core/agent-loop/status-writer.js";
import { runInteractiveTUI } from "../tui/index.js";
import { runCoderREPL } from "../repl/index.js";

// Shared modules
import {
  parseArgs,
  requireApiKey,
  setupSession,
  buildCompleteSystemPrompt,
  runSingleQuery,
} from "../shared/index.js";

// ============================================
// MAIN ENTRY POINT
// ============================================

async function main(): Promise<void> {
  const args = parseArgs();

  // Handle --version flag
  if (args.showVersion) {
    console.log(`Coder v${VERSION}`);
    console.log(`Model: ${args.model}`);
    console.log(`Node: ${process.version}`);
    console.log(`Platform: ${process.platform} ${process.arch}`);
    process.exit(0);
  }

  // Handle --status flag (show current running Coder status)
  if (args.showStatus) {
    const status = readStatus();
    if (status) {
      console.log(formatStatus(status));
      console.log(`\n\x1b[90mStatus file: ${getStatusFilePath()}\x1b[0m`);
    } else {
      console.log("\x1b[90mNo active Coder session found.\x1b[0m");
      console.log(`\x1b[90mStatus file: ${getStatusFilePath()}\x1b[0m`);
    }
    process.exit(0);
  }

  // Handle daemon mode flags
  if (args.daemonStatus) {
    const { DaemonState } = await import("../../../../core/daemon/daemon-state.js");
    const state = DaemonState.load();
    if (state) {
      console.log("Daemon Status:");
      console.log(`  Session: ${state.sessionId}`);
      console.log(`  Status: ${state.status}`);
      console.log(`  Goal: ${state.goal}`);
      console.log(`  PID: ${state.pid ?? "none"}`);
      console.log(`  Turns: ${state.turns}`);
      console.log(`  Restarts: ${state.restartCount}`);
      console.log(`  Errors: ${state.errors}`);
      console.log(`  Started: ${state.startTime}`);
      console.log(`  Last Activity: ${state.lastActivity}`);
    } else {
      console.log("No active daemon session found");
    }
    process.exit(0);
  }

  if (args.daemonStop) {
    const { DaemonState } = await import("../../../../core/daemon/daemon-state.js");
    const state = DaemonState.load();
    if (state && state.pid) {
      try {
        process.kill(state.pid, "SIGTERM");
        console.log(`Sent SIGTERM to daemon process ${state.pid}`);
      } catch (error) {
        console.log(`Failed to stop daemon: ${error}`);
      }
    } else {
      console.log("No active daemon session found");
    }
    process.exit(0);
  }

  // Handle --daemon flag (start daemon mode)
  if (args.daemon) {
    const { DaemonSupervisor } = await import("../../../../core/daemon/supervisor.js");
    const { DEFAULT_DAEMON_CONFIG } = await import("../../../../core/daemon/types.js");

    const goal = args.daemonGoal || args.query || "Work autonomously on the codebase";

    console.log("\x1b[36m🐍 Starting Coder Daemon Mode\x1b[0m");
    console.log(`\x1b[90m  Goal: ${goal}\x1b[0m`);
    console.log(`\x1b[90m  Working directory: ${process.cwd()}\x1b[0m`);
    console.log(`\x1b[90m  Model: ${args.model}\x1b[0m`);
    console.log(`\x1b[90m  Auto-restart: ${args.daemonMaxRestarts ?? 10} max attempts\x1b[0m`);
    console.log(`\x1b[90m  Auto-commit: ${args.daemonAutoCommit !== false ? 'enabled' : 'disabled'}\x1b[0m`);
    console.log(`\x1b[90m  Watchdog: ${args.daemonWatchdog !== false ? 'enabled' : 'disabled'}\x1b[0m`);
    console.log(`\x1b[90m  Telegram alerts: ${args.daemonTelegram ? 'enabled' : 'disabled'}\x1b[0m\n`);

    const supervisor = new DaemonSupervisor({
      ...DEFAULT_DAEMON_CONFIG,
      goal,
      workingDirectory: process.cwd(),
      model: args.model,
      permissionMode: args.permissionMode,
      maxRestarts: args.daemonMaxRestarts ?? 10,
      autoCommit: args.daemonAutoCommit !== false,
      watchdogInterval: args.daemonWatchdog !== false ? 30000 : 0,
      enableTelegram: args.daemonTelegram ?? false,
    });

    // Handle supervisor events
    supervisor.on("started", (sessionId) => {
      console.log(`\x1b[32m✓ Daemon started: ${sessionId}\x1b[0m`);
      console.log(`\x1b[90m  Check status: coder --daemon-status\x1b[0m`);
      console.log(`\x1b[90m  Stop daemon: coder --daemon-stop\x1b[0m\n`);
    });

    supervisor.on("output", (output) => {
      process.stdout.write(output);
    });

    supervisor.on("error", (error) => {
      console.error(`\x1b[31m[Error] ${error}\x1b[0m`);
    });

    supervisor.on("restarting", (count) => {
      console.log(`\x1b[33m[Restart] Attempt ${count}\x1b[0m`);
    });

    supervisor.on("completed", () => {
      console.log(`\x1b[32m✓ Daemon completed successfully\x1b[0m`);
    });

    supervisor.on("failed", (reason) => {
      console.error(`\x1b[31m✗ Daemon failed: ${reason}\x1b[0m`);
    });

    supervisor.on("shutdown", () => {
      console.log(`\x1b[90mDaemon shutdown\x1b[0m`);
    });

    // Start the daemon
    await supervisor.start();
    return;
  }

  // Initialize session store
  const sessionStore = new SessionStore();
  await sessionStore.init();

  // Handle --sessions flag
  if (args.listSessions) {
    const sessions = await sessionStore.listSessions(20);
    printSessionsList(sessions);
    process.exit(0);
  }

  // Get API key
  const apiKey = requireApiKey();

  // Setup session (config, MCP, hooks, skills)
  const setup = await setupSession({
    args,
    apiKey,
    workingDirectory: process.cwd(),
  });

  // Get git status for system prompt
  const gitStatus = await getGitStatus(process.cwd());

  // Build system prompt
  const systemPrompt = await buildCompleteSystemPrompt(process.cwd(), {
    systemPrompt: args.systemPrompt,
    appendSystemPrompt: args.appendSystemPrompt,
    teammateMode: args.teammateMode,
    agentId: args.agentId,
    agentName: args.agentName,
    teamName: args.teamName,
  });

  // Handle session resume
  let messages: Message[] = [];
  let sessionId: string | undefined;

  if (args.resumeSession) {
    const loadedSession = await sessionStore.resumeSession(args.resumeSession);
    if (!loadedSession) {
      console.error(`Error: Session not found: ${args.resumeSession}`);
      process.exit(1);
    }

    messages = loadedSession.messages;
    sessionId = args.resumeSession;

    // Update args from session metadata
    args.model = loadedSession.metadata.model as typeof args.model;
    args.agentName = loadedSession.metadata.agentName;
    args.agentColor = loadedSession.metadata.agentColor;
    args.teamName = loadedSession.metadata.teamName;

    console.log(`\x1b[90mResumed session: ${args.resumeSession}\x1b[0m`);
    console.log(`\x1b[90mModel: ${args.model} | Messages: ${messages.length}\x1b[0m\n`);
  } else {
    // Check for interrupted sessions and prompt to resume
    const loopPersistence = new LoopPersistence();
    const interruptedSessionId = await loopPersistence.getMostRecentInterruptedLoop();

    if (interruptedSessionId && process.stdin.isTTY) {
      const manifest = await loopPersistence.loadManifest(interruptedSessionId);
      const timeSinceUpdate = manifest ? Date.now() - manifest.updatedAt : 0;
      const minutesAgo = Math.round(timeSinceUpdate / 60000);

      console.log(`\n\x1b[33m⚠ Interrupted session found: ${interruptedSessionId.slice(0, 8)}...\x1b[0m`);
      if (manifest) {
        console.log(`\x1b[90m  Turns: ${manifest.totalTurns} | Cost: $${manifest.totalCost.toFixed(4)} | ${minutesAgo} minutes ago\x1b[0m`);
      }
      console.log(`\x1b[90m  Working directory: ${manifest?.workingDirectory || 'unknown'}\x1b[0m\n`);

      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      const answer = await rl.question(`Resume this session? [Y/n] `);
      rl.close();

      if (answer.toLowerCase() !== 'n') {
        // Resume the interrupted session
        const recoveryResult = await loopPersistence.recoverLoop(interruptedSessionId);
        if (recoveryResult.success && recoveryResult.state) {
          const loadedSession = await sessionStore.resumeSession(interruptedSessionId);
          if (loadedSession) {
            messages = loadedSession.messages;
            sessionId = interruptedSessionId;

            // Update args from session metadata
            args.model = loadedSession.metadata.model as typeof args.model;
            args.agentName = loadedSession.metadata.agentName;
            args.agentColor = loadedSession.metadata.agentColor;
            args.teamName = loadedSession.metadata.teamName;

            console.log(`\x1b[90m✓ Resumed interrupted session: ${interruptedSessionId.slice(0, 8)}...\x1b[0m`);
            console.log(`\x1b[90mModel: ${args.model} | Messages: ${messages.length}\x1b[0m\n`);
          } else {
            console.log(`\x1b[33mCould not load session messages, starting fresh...\x1b[0m\n`);
          }
        } else {
          console.log(`\x1b[33mRecovery failed, starting fresh session...\x1b[0m\n`);
        }
      } else {
        console.log(`\x1b[90mStarting fresh session...\x1b[0m\n`);
      }
    }

    // Create new session (if not resuming)
    if (!sessionId) {
      sessionId = await sessionStore.createSession({
        model: args.model,
        workingDirectory: process.cwd(),
        agentName: args.agentName,
        agentColor: args.agentColor,
        teamName: args.teamName,
      });
    }
  }

  // Get initial query
  let query = args.query;
  const firstArg = process.argv[2];
  if (!query && process.argv.length > 2 && firstArg && !firstArg.startsWith("-")) {
    query = process.argv.slice(2).join(" ");
  }

  if (!query) {
    // Show initial status line
    const initialStatusOptions: StatusLineOptions = {
      permissionMode: setup.permissionMode,
      tokensUsed: 0,
      maxTokens: getContextWindow(args.model),
      model: args.model,
      isLoading: false,
    };
    console.log(`\x1b[90m${renderStatusLine(initialStatusOptions)}\x1b[0m`);
    console.log(`\x1b[90mSession: ${sessionId}\x1b[0m`);
    console.log("\x1b[90mType your message, ? for help, or /help for commands.\x1b[0m\n");

    // Check if REPL mode requested
    if (args.repl) {
      // Run readline-based REPL (no TTY required)
      await runCoderREPL({
        apiKey,
        model: args.model,
        permissionMode: setup.permissionMode,
        maxTokens: args.maxTokens,
        systemPrompt,
        tools: setup.tools,
        hookManager: setup.hookManager,
        skillManager: setup.skillManager,
        sessionStore,
        sessionId,
        initialMessages: messages,
        workingDirectory: process.cwd(),
      });
      return;
    }

    // Interactive mode (Ink TUI)
    await runInteractiveMode(
      apiKey,
      args,
      systemPrompt,
      setup.tools,
      setup.hookManager,
      setup.skillManager,
      sessionStore,
      messages,
      sessionId,
      setup.mcpClients,
      setup.permissionMode
    );
  } else {
    // Single query mode
    // Use resolved permissionMode from setup, not raw args
    const resolvedArgs = { ...args, permissionMode: setup.permissionMode };
    await runSingleQuery({
      apiKey,
      args: resolvedArgs,
      systemPrompt,
      tools: setup.tools,
      query,
      sessionStore,
      sessionId,
      hookManager: setup.hookManager,
      workingDirectory: process.cwd(),
      gitStatus,
    });
  }
}

// ============================================
// INTERACTIVE MODE
// ============================================

async function runInteractiveMode(
  apiKey: string,
  args: Awaited<ReturnType<typeof parseArgs>>,
  systemPrompt: string,
  tools: ToolDefinition[],
  hookManager: HookManager,
  skillManager: SkillManager,
  sessionStore: SessionStore,
  messages: Message[],
  sessionId: string,
  mcpClients: Map<string, MCPClientImpl>,
  permissionMode: PermissionMode
): Promise<void> {
  // Check if stdin is a TTY (interactive terminal)
  const isInteractive = process.stdin.isTTY;

  // Allow force-interactive mode for testing
  const forceInteractive = process.env.CLAUDE_FORCE_INTERACTIVE === "true";

  if (!isInteractive && !forceInteractive) {
    console.error("Error: Interactive mode requires a TTY. Use -q for single query mode.");
    console.error("       Or set CLAUDE_FORCE_INTERACTIVE=true for testing.");
    return;
  }

  // Create a mutable session ID holder for the TUI
  let currentSessionId = sessionId;
  const setSessionId = (newId: string) => {
    currentSessionId = newId;
  };

  // Run the Ink-based React TUI
  await runInteractiveTUI({
    apiKey,
    model: args.model,
    permissionMode,
    maxTokens: args.maxTokens,
    systemPrompt,
    tools,
    hookManager,
    sessionStore,
    sessionId: currentSessionId,
    setSessionId,
    initialMessages: messages,
    workingDirectory: process.cwd(),
    stopSequences: args.stopSequences,
    resultConditions: args.resultConditions,
    stopOnUnhandledError: args.stopOnUnhandledError,
    // Autonomous loop continuation (Ralph-style)
    continuation: args.continuation,
    // Long-running mode for extended autonomous sessions
    longRunning: args.longRunning,
    longRunningGoal: args.longRunningGoal,
    onExit: () => {
      console.log("\n\x1b[90mGoodbye!\x1b[0m");
    },
  });
}

// ============================================
// RUN MAIN
// ============================================

main().catch((error) => {
  // Handle ENAMETOOLONG gracefully - occurs with deeply nested node_modules
  if (error instanceof Error && error.message.includes("ENAMETOOLONG")) {
    console.error("\x1b[31mError: Path too long encountered during directory scan.\x1b[0m");
    console.error("\x1b[90mThis usually happens with deeply nested node_modules.\x1b[0m");
    console.error("\x1b[90mTry running Coder from a different directory or clean up nested node_modules.\x1b[0m");
    process.exit(1);
  }
  console.error("Fatal error:", error);
  process.exit(1);
});

// Handle uncaught ENAMETOOLONG errors from bundled dependencies
process.on("uncaughtException", (error) => {
  if (error instanceof Error && error.message.includes("ENAMETOOLONG")) {
    console.error("\x1b[31mError: Path too long encountered during directory scan.\x1b[0m");
    console.error("\x1b[90mThis usually happens with deeply nested node_modules.\x1b[0m");
    console.error("\x1b[90mTry running Coder from a different directory or clean up nested node_modules.\x1b[0m");
    process.exit(1);
  }
  throw error;
});
