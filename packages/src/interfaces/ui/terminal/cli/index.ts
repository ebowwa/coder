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
import { homedir } from "node:os";
import { existsSync, readFileSync } from "node:fs";
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
  if (args.daemonList) {
    const { SingletonLock } = await import("@ebowwa/daemons");
    const locks = SingletonLock.listAll();

    if (locks.length === 0) {
      console.log("No daemon instances found");
    } else {
      console.log(`\n\x1b[36mActive Daemon Instances (${locks.length})\x1b[0m\n`);
      for (const lock of locks) {
        const status = lock.isAlive ? "\x1b[32mrunning\x1b[0m" : "\x1b[31mdead\x1b[0m";
        const uptime = Math.round((Date.now() - lock.startTime) / 1000);
        console.log(`  ${lock.sessionId.slice(0, 8)}... [${status}]`);
        console.log(`    PID: ${lock.pid} | Uptime: ${uptime}s`);
        console.log(`    Dir: ${lock.workingDirectory}`);
        console.log(`    Goal: ${lock.goal.slice(0, 50)}${lock.goal.length > 50 ? "..." : ""}`);
        console.log(``);
      }
    }
    process.exit(0);
  }

  if (args.daemonStatus) {
    const { SingletonLock } = await import("@ebowwa/daemons");
    const { running, lockInfo, isAlive } = SingletonLock.checkDirectory(process.cwd());

    if (lockInfo) {
      const status = isAlive ? "\x1b[32mrunning\x1b[0m" : "\x1b[31mdead (stale lock)\x1b[0m";
      const uptime = Math.round((Date.now() - lockInfo.startTime) / 1000);

      console.log(`\n\x1b[36mDaemon Status\x1b[0m`);
      console.log(`  Status: ${status}`);
      console.log(`  Session: ${lockInfo.sessionId}`);
      console.log(`  PID: ${lockInfo.pid}`);
      console.log(`  Uptime: ${uptime}s`);
      console.log(`  Goal: ${lockInfo.goal}`);
      console.log(`  Model: ${lockInfo.model}`);
      console.log(`  Working Dir: ${lockInfo.workingDirectory}\n`);
    } else {
      console.log("\x1b[90mNo daemon running for this directory\x1b[0m");
    }
    process.exit(0);
  }

  if (args.daemonStop) {
    const { SingletonLock } = await import("@ebowwa/daemons");

    if (args.daemonStopAll) {
      // Stop all daemons
      const locks = SingletonLock.listAll().filter((l: { isAlive: boolean }) => l.isAlive);
      if (locks.length === 0) {
        console.log("No active daemons to stop");
      } else {
        console.log(`Stopping ${locks.length} daemon(s)...`);
        for (const lock of locks) {
          const result = await SingletonLock.stopDaemon(lock.lockFile);
          console.log(`  ${result.message}`);
        }
      }
    } else {
      // Stop daemon for current directory only
      const { running, lockInfo } = SingletonLock.checkDirectory(process.cwd());
      if (running && lockInfo) {
        const lockFile = SingletonLock.getLockFilePath(process.cwd());
        const result = await SingletonLock.stopDaemon(lockFile);
        console.log(result.message);
      } else {
        console.log("No daemon running for this directory");
        console.log("\x1b[90mUse --daemon-stop-all to stop all daemons\x1b[0m");
      }
    }
    process.exit(0);
  }

  // Handle daemon observability commands
  if (args.daemonLogs || args.daemonProgress || args.daemonFiles || args.daemonTools) {
    const { SingletonLock } = await import("@ebowwa/daemons");
    const { running, lockInfo } = SingletonLock.checkDirectory(process.cwd());

    if (!running || !lockInfo) {
      console.log("\x1b[90mNo daemon running for this directory\x1b[0m");
      process.exit(1);
    }

    // Read the observability log file
    const logPath = `${homedir()}/.claude/daemon/logs/${lockInfo.sessionId}.jsonl`;
    if (!existsSync(logPath)) {
      console.log("\x1b[90mNo observability data available yet\x1b[0m");
      process.exit(0);
    }

    const logContent = readFileSync(logPath, "utf-8");
    const events = logContent.trim().split("\n").filter(Boolean).map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);

    if (args.daemonProgress) {
      console.log("\x1b[36mDaemon Progress\x1b[0m\n");
      const progressEvents = events.filter((e: { type: string }) => e.type === "progress:update");
      const latest = progressEvents[progressEvents.length - 1];
      if (latest?.data) {
        const m = latest.data;
        console.log(`  Turns: ${m.turns}`);
        console.log(`  Tokens: ${m.totalTokens?.toLocaleString()}`);
        console.log(`  Cost: $${(m.totalCost || 0).toFixed(4)}`);
        console.log(`  Tool Calls: ${m.toolCalls}`);
        console.log(`  Files Read: ${m.filesRead}`);
        console.log(`  Files Modified: ${m.filesModified}`);
        console.log(`  Errors: ${m.errors}`);
        console.log(`  Status: ${m.status}`);
        if (m.goalProgress) {
          console.log(`  Goal Progress: ${m.goalProgress}%`);
        }
        if (m.currentActivity) {
          console.log(`  Activity: ${m.currentActivity}`);
        }
      } else {
        console.log("\x1b[90mNo progress data yet\x1b[0m");
      }
    }

    if (args.daemonFiles) {
      console.log("\x1b[36mFile Activity\x1b[0m\n");
      const fileEvents = events.filter((e: { type: string }) =>
        e.type?.startsWith("file:")
      );
      const recent = fileEvents.slice(-20);
      const iconMap: Record<string, string> = { read: "\x1b[34m→\x1b[0m", write: "\x1b[33m✎\x1b[0m", create: "\x1b[32m+\x1b[0m", delete: "\x1b[31m-\x1b[0m", modify: "\x1b[33m✎\x1b[0m" };
      for (const e of recent) {
        const action = String(e.type).replace("file:", "");
        const icon = iconMap[action] || "?";
        console.log(`  ${icon} ${e.data?.path || "unknown"}`);
      }
      if (fileEvents.length === 0) {
        console.log("\x1b[90mNo file activity yet\x1b[0m");
      }
    }

    if (args.daemonTools) {
      console.log("\x1b[36mTool Calls\x1b[0m\n");
      const toolEvents = events.filter((e: { type: string }) => e.type === "tool:end");
      const recent = toolEvents.slice(-15);
      for (const e of recent) {
        const d = e.data;
        const status = d?.success ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
        const duration = d?.durationMs ? `${d.durationMs}ms` : "?";
        console.log(`  ${status} ${d?.tool || "unknown"} (${duration})`);
      }
      if (toolEvents.length === 0) {
        console.log("\x1b[90mNo tool calls yet\x1b[0m");
      }
    }

    if (args.daemonLogs) {
      console.log("\x1b[36mRecent Events\x1b[0m\n");
      const recent = events.slice(-30);
      for (const e of recent) {
        const time = new Date(e.timestamp).toLocaleTimeString();
        const type = e.type?.split(":")[1] || e.type;
        console.log(`  \x1b[90m${time}\x1b[0m [${type}]`);
      }
    }

    process.exit(0);
  }

  // Handle --daemon flag (start daemon mode)
  if (args.daemon) {
    // Check if using new autonomous daemon mode (role-based)
    if (args.daemonRole || args.daemonJurisdiction) {
      // Use new AutonomousDaemon
      const { AutonomousDaemon } = await import("../../../../core/daemon/autonomous.js");
      const apiKey = requireApiKey();

      const role = args.daemonRole || "maintainer";
      const jurisdiction = args.daemonJurisdiction || process.cwd();

      console.log("\x1b[36m Autonomous Daemon Starting\x1b[0m");
      console.log(`\x1b[90m  Role: ${role}\x1b[0m`);
      console.log(`\x1b[90m  Jurisdiction: ${jurisdiction}\x1b[0m`);
      console.log(`\x1b[90m  Working directory: ${process.cwd()}\x1b[0m`);
      console.log(`\x1b[90m  Model: ${args.model}\x1b[0m`);
      if (args.daemonGoal) {
        console.log(`\x1b[90m  Initial goal: ${args.daemonGoal}\x1b[0m`);
      }
      console.log(`\x1b[90m  Cooldown: ${args.daemonCooldown ?? 5000}ms\x1b[0m`);
      if (args.daemonMaxTurns) {
        console.log(`\x1b[90m  Max turns: ${args.daemonMaxTurns}\x1b[0m`);
      }
      console.log("");

      const daemon = new AutonomousDaemon({
        role,
        jurisdiction,
        customRolePrompt: args.daemonCustomPrompt,
        workingDirectory: process.cwd(),
        model: args.model,
        permissionMode: args.permissionMode,
        enableLock: true,
        autoCommit: args.daemonAutoCommit !== false,
        turnCooldown: args.daemonCooldown ?? 5000,
        maxTurnsPerSession: args.daemonMaxTurns ?? 0,
        enableStatus: true,
        apiKey,
        goal: args.daemonGoal,
      });

      // Handle daemon events
      daemon.on("started", (sessionId) => {
        console.log(`\x1b[32m[Daemon] Autonomous daemon started: ${sessionId}\x1b[0m`);
        console.log(`\x1b[90m  Check status: coder --daemon-status\x1b[0m`);
        console.log(`\x1b[90m  Stop daemon: coder --daemon-stop\x1b[0m\n`);
      });

      daemon.on("output", (text) => {
        process.stdout.write(text);
      });

      daemon.on("error", (error) => {
        console.error(`\x1b[31m[Daemon Error] ${error}\x1b[0m`);
      });

      daemon.on("turn", (result) => {
        console.log(`\x1b[90m[Daemon] Turn completed. Tokens: ${result.totalTokens}, Cost: $${(result.totalCost || 0).toFixed(4)}\x1b[0m`);
      });

      daemon.on("shutdown", () => {
        console.log(`\x1b[90m[Daemon] Shutdown complete\x1b[0m`);
      });

      daemon.on("failed", (reason) => {
        console.error(`\x1b[31m[Daemon] Failed: ${reason}\x1b[0m`);
      });

      // Start the daemon
      const started = await daemon.start(args.daemonReplace === true);
      if (!started) {
        process.exit(1);
      }
      return;
    }

    // Fall back to old supervisor+worker mode
    const { DaemonSupervisor } = await import("../../../../core/daemon/supervisor.js");
    const { DEFAULT_DAEMON_CONFIG } = await import("../../../../core/daemon/types.js");

    const goal = args.daemonGoal || args.query || "Work autonomously on the codebase";

    console.log("\x1b[36m Daemon Starting (Supervisor Mode)\x1b[0m");
    console.log(`\x1b[90m  Goal: ${goal}\x1b[0m`);
    console.log(`\x1b[90m  Working directory: ${process.cwd()}\x1b[0m`);
    console.log(`\x1b[90m  Model: ${args.model}\x1b[0m`);
    console.log(`\x1b[90m  Auto-restart: ${args.daemonMaxRestarts ?? 10} max attempts\x1b[0m`);
    console.log(`\x1b[90m  Auto-commit: ${args.daemonAutoCommit !== false ? 'enabled' : 'disabled'}\x1b[0m`);
    console.log(`\x1b[90m  Watchdog: ${args.daemonWatchdog !== false ? 'enabled' : 'disabled'}\x1b[0m`);
    console.log(`\x1b[90m  Channel alerts: ${args.daemonTelegram ? 'enabled' : 'disabled'}\x1b[0m\n`);

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
      console.log(`\x1b[32m Daemon started: ${sessionId}\x1b[0m`);
      console.log(`\x1b[90m  Check status: coder --daemon-status\x1b[0m`);
      console.log(`\x1b[90m  Stop daemon: coder --daemon-stop\x1b[0m`);
      console.log(`\x1b[90m  List all: coder --daemon-list\x1b[0m\n`);
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
      console.log(`\x1b[32m Daemon completed successfully\x1b[0m`);
    });

    supervisor.on("failed", (reason) => {
      console.error(`\x1b[31m Daemon failed: ${reason}\x1b[0m`);
    });

    supervisor.on("shutdown", () => {
      console.log(`\x1b[90mDaemon shutdown\x1b[0m`);
    });

    // Start the daemon with lock acquisition
    // The supervisor handles the lock internally now
    const started = await supervisor.start(args.daemonReplace === true);
    if (!started) {
      // Supervisor already printed detailed message about existing daemon
      process.exit(1);
    }
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
