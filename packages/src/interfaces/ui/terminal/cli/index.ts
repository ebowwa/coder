#!/usr/bin/env bun
/**
 * Coder - CLI Entry Point
 * AI-powered terminal coding assistant
 *
 * This is a thin orchestrator that:
 * 1. Parses arguments
 * 2. Sets up session (config, MCP, hooks)
 * 3. Initializes teammate mode if enabled
 * 4. Dispatches to TUI or single-query mode
 */

import type { Message } from "../../../../types/index.js";
import type { ToolDefinition, PermissionMode } from "../../../../types/index.js";
import type { builtInTools } from "../../../../ecosystem/tools/index.js";
import type { HookManager } from "../../../../ecosystem/hooks/index.js";
import type { SkillManager } from "../../../../ecosystem/skills/index.js";
import type { MCPClientImpl } from "../../../mcp/client.js";
import type { TeammateMessage } from "../../../../types/index.js";
import { SessionStore, printSessionsList } from "../../../../core/session-store.js";
import { getGitStatus } from "../../../../core/git-status.js";
import { renderStatusLine, getContextWindow, VERSION, type StatusLineOptions } from "../shared/status-line.js";
import { runInteractiveTUI } from "../tui/index.js";
import {
  TeammateModeRunner,
  setTeammateRunner,
  isTeammateModeActive,
} from "../../../../teammates/runner.js";

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
  let sessionId: string;

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
    // Create new session
    sessionId = await sessionStore.createSession({
      model: args.model,
      workingDirectory: process.cwd(),
      agentName: args.agentName,
      agentColor: args.agentColor,
      teamName: args.teamName,
    });
  }

  // Get initial query
  let query = args.query;
  const firstArg = process.argv[2];
  if (!query && process.argv.length > 2 && firstArg && !firstArg.startsWith("-")) {
    query = process.argv.slice(2).join(" ");
  }

  // ============================================
  // TEAMMATE MODE INITIALIZATION
  // ============================================

  let teammateRunner: TeammateModeRunner | null = null;
  let pendingTeammateMessages: TeammateMessage[] = [];

  if (args.teammateMode && args.teamName) {
    try {
      teammateRunner = new TeammateModeRunner({
        teamName: args.teamName,
        agentId: args.agentId,
        agentName: args.agentName,
        agentColor: args.agentColor,
        prompt: args.systemPrompt,
        workingDirectory: process.cwd(),
        onMessage: (message: TeammateMessage) => {
          // Queue message for injection into conversation
          pendingTeammateMessages.push(message);
          console.log(`\x1b[90m[Teammate] Message from ${message.from}: ${message.content.slice(0, 50)}...\x1b[0m`);
        },
        onIdle: () => {
          console.log(`\x1b[90m[Teammate] Now idle, waiting for tasks...\x1b[0m`);
        },
        pollInterval: 2000,
      });

      const teammate = await teammateRunner.start();

      // Set global reference for tools to access
      setTeammateRunner(teammateRunner);

      console.log(`\x1b[90m[Teammate] Joined team "${args.teamName}" as ${teammate.name} (${teammate.teammateId})\x1b[0m`);
    } catch (error) {
      console.error(`\x1b[31mError starting teammate mode: ${error}\x1b[0m`);
      teammateRunner = null;
    }
  }

  // Cleanup handler
  const cleanup = async () => {
    if (teammateRunner) {
      console.log(`\x1b[90m[Teammate] Stopping teammate mode...\x1b[0m`);
      await teammateRunner.stop();
      setTeammateRunner(null);
    }
  };

  process.on("SIGINT", async () => {
    await cleanup();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await cleanup();
    process.exit(0);
  });

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
    if (teammateRunner) {
      console.log(`\x1b[90mTeammate Mode: Active | Team: ${args.teamName}\x1b[0m`);
    }
    console.log("\x1b[90mType your message, ? for help, or /help for commands.\x1b[0m\n");

    // Interactive mode
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
      setup.permissionMode,
      teammateRunner
    );
  } else {
    // Single query mode
    await runSingleQuery({
      apiKey,
      args,
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
  permissionMode: PermissionMode,
  teammateRunner: TeammateModeRunner | null = null
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
    teammateRunner,
    onExit: async () => {
      // Cleanup teammate mode
      if (teammateRunner) {
        await teammateRunner.stop();
        setTeammateRunner(null);
      }
      console.log("\n\x1b[90mGoodbye!\x1b[0m");
    },
  });
}

// ============================================
// RUN MAIN
// ============================================

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
