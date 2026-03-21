# TUI Architecture Specification

> Version: 1.0.0
> Last Updated: 2026-03-17
> Status: Draft for Consolidation

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Target Architecture](#3-target-architecture)
4. [Component Specification](#4-component-specification)
5. [Hooks Specification](#5-hooks-specification)
6. [Type System](#6-type-system)
7. [Command System](#7-command-system)
8. [Rendering Strategy](#8-rendering-strategy)
9. [Performance Requirements](#9-performance-requirements)
10. [Migration Path](#10-migration-path)
11. [File Structure](#11-file-structure)
12. [Implementation Checklist](#12-implementation-checklist)

---

## 1. Executive Summary

### Problem Statement

The current TUI implementation suffers from:
- **Code duplication** across `InteractiveTUI.tsx` and `ScrollableTUI.tsx` (~80% overlap)
- **God components** with 900+ lines handling multiple concerns
- **Mixed rendering strategies** (Ink React + Native Rust) without clear boundaries
- **Props drilling** with 17+ props passed through components
- **Ref-based state** mixed with useState causing synchronization issues
- **No virtualization** for message lists causing performance degradation

### Solution Direction

Consolidate into a single, modular TUI system with:
- Hook-based state extraction
- Composition over inheritance
- Clear rendering strategy (Ink-first, native for performance-critical)
- Command registry pattern
- Virtualized message rendering

---

## 2. Current State Analysis

### 2.1 File Inventory

```
packages/src/coder/packages/src/interfaces/ui/
├── index.ts                      # Exports (185 lines)
├── spinner.ts                    # Spinner implementation (250 lines)
├── lmdb.db                       # ❌ Database in UI layer
├── lmdb.db-lock                  # ❌ Lock file
│
├── components/
│   ├── index.ts                  # Component exports
│   ├── types.ts                  # Component types
│   ├── InputField.tsx            # Input with cursor (60 lines)
│   ├── MessageList.tsx           # Message rendering
│   ├── ToolDisplay.tsx           # Tool call/result display
│   └── useInputWithHistory.ts    # History hook (UNUSED)
│
├── terminal/
│   ├── cli/
│   │   └── index.ts              # CLI entry point
│   │
│   ├── shared/
│   │   ├── index.ts
│   │   ├── args.ts               # CLI argument parsing
│   │   ├── loading-state.ts      # Loading state management
│   │   ├── query.ts              # Query handling
│   │   ├── setup.ts              # Setup utilities
│   │   ├── status-line.ts        # Status bar rendering
│   │   └── system-prompt.ts      # System prompt handling
│   │
│   └── tui/
│       ├── index.ts              # TUI exports
│       ├── types.ts              # TUI-specific types
│       ├── console.ts            # Console output
│       ├── console.test.ts       # Console tests
│       ├── spinner.ts            # Spinner frames
│       ├── useTerminalSize.ts    # Terminal resize hook
│       ├── tui-renderer.ts       # Native Rust TUI bridge (365 lines)
│       ├── tui-footer.ts         # Footer component
│       ├── InteractiveTUI.tsx    # ❌ God component (993 lines)
│       ├── InteractiveTUI.tsx.backup  # ❌ Backup in source
│       ├── ScrollableTUI.tsx     # ❌ Duplicate (519 lines)
│       ├── run.tsx               # Run entry
│       ├── run-ink.tsx           # Ink runner
│       ├── run-scrollable.tsx    # Scrollable runner
│       └── run-native.ts         # Native runner
│
└── utils/
    ├── index.ts
    ├── format.ts                 # Formatting utilities
    ├── id.ts                     # ID generation
    └── tokens.ts                 # Token estimation
```

### 2.2 Duplication Matrix

| Function/Type | InteractiveTUI | ScrollableTUI | utils/ | Status |
|---------------|----------------|---------------|--------|--------|
| `genId()` | ✅ Redefined | ✅ Redefined | ✅ exists | ❌ Not used |
| `estimateTokens()` | ✅ Redefined | ✅ Redefined | ✅ exists | ❌ Not used |
| `estimateMessagesTokens()` | ✅ Redefined | ✅ Redefined | ❌ | ⚠️ Partial |
| `apiToText()` | ✅ Redefined | ✅ Redefined | ✅ exists | ❌ Not used |
| `UIMessage` type | ✅ Defined | ✅ Defined | ❌ | ❌ Duplicate |
| `HELP_TEXT` | ✅ Version 1 | ✅ Version 2 | ❌ | ⚠️ Different |
| `processMessage()` | ✅ 100 lines | ✅ 95 lines | ❌ | ❌ Duplicate |
| `handleCommand()` | ✅ 200 lines | ✅ 130 lines | ❌ | ❌ Duplicate |
| Keyboard handling | ✅ 100 lines | ✅ 100 lines | ❌ | ❌ Duplicate |

### 2.3 Props Comparison

```typescript
// InteractiveTUIProps - 17 props
interface InteractiveTUIProps {
  apiKey: string;
  model: string;
  permissionMode: PermissionMode;
  maxTokens: number;
  systemPrompt?: string;
  tools?: ToolDefinition[];
  hookManager: HookManager;
  sessionStore: SessionStore;
  sessionId: string;
  setSessionId: (id: string) => void;
  workingDirectory: string;
  onExit?: () => void;
  initialMessages?: ApiMessage[];
  stopSequences?: string[];
  resultConditions?: string;
  stopOnUnhandledError?: boolean;
}

// ScrollableTUIProps - 14 props (missing cost, checkpoints, skills)
interface ScrollableTUIProps {
  apiKey: string;
  model: string;
  permissionMode: PermissionMode;
  maxTokens: number;
  systemPrompt?: string;
  tools?: ToolDefinition[];
  hookManager: HookManager;
  sessionStore: SessionStore;
  sessionId: string;
  setSessionId: (id: string) => void;
  workingDirectory: string;
  onExit?: () => void;
  initialMessages?: ApiMessage[];
  onMessage: (msg: UIMessage) => void;  // Unique: callback for logging
}
```

### 2.4 State Management Audit

**InteractiveTUI State (15 useState calls):**
```typescript
const [messages, setMessages] = useState<UIMessage[]>([]);
const [apiMessages, setApiMessages] = useState<ApiMessage[]>(initialMessages);
const [inputValue, setInputValue] = useState("");
const [cursorPos, setCursorPos] = useState(0);
const [isLoading, setIsLoading] = useState(false);
const [streamingText, setStreamingText] = useState("");
const [streamingThinking, setStreamingThinking] = useState("");
const [spinnerFrame, setSpinnerFrame] = useState(0);
const [tokenCount, setTokenCount] = useState(0);
const [model, setModel] = useState(initialModel);
const [sessionCost, setSessionCost] = useState<SessionCost>(...);
const [checkpointHistory, setCheckpointHistory] = useState<Checkpoint[]>([]);
const [checkpointIndex, setCheckpointIndex] = useState(-1);
const [showCommandHints, setShowCommandHints] = useState(false);
```

**Ref State (anti-pattern):**
```typescript
const historyRef = useRef<string[]>([]);
const historyIdxRef = useRef(-1);
const savedInputRef = useRef("");
const isProcessingRef = useRef(false);
```

---

## 3. Target Architecture

### 3.1 Layered Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLI Entry (cli/index.ts)                 │
│  - Argument parsing                                               │
│  - Config loading                                                 │
│  - Session restoration                                            │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                      TUI Controller (TuiApp.tsx)                  │
│  - Context providers                                              │
│  - High-level state coordination                                  │
│  - Lifecycle management                                           │
└───────────────────────────────┬─────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
┌───────▼───────┐       ┌───────▼───────┐       ┌───────▼───────┐
│  MessageArea  │       │   InputArea   │       │   StatusBar   │
│  (virtualized)│       │  (with cursor)│       │  (native opt) │
└───────────────┘       └───────────────┘       └───────────────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                          Hooks Layer                              │
│  useMessages      useInput       useSession     useCommands      │
│  useTools         useHistory     useCost        useCheckpoints   │
└─────────────────────────────────────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                        Core Services                              │
│  agentLoop        sessionStore     hookManager    telemetry      │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Rendering Strategy Decision Tree

```
                    What needs rendering?
                           │
           ┌───────────────┼───────────────┐
           │               │               │
      Static text    Frequent update   Complex layout
           │               │               │
      Ink <Text>      Native Rust      Ink <Box>
                           │
                    ┌──────┴──────┐
                    │             │
              Spinner       Status bar
              (80ms tick)    (token count)
```

### 3.3 Single TUI Mode with Feature Flags

Replace `InteractiveTUI` + `ScrollableTUI` with single `TuiApp`:

```typescript
interface TuiConfig {
  // Display mode
  scrollback: boolean;        // Enable terminal scrollback vs virtualized

  // Feature flags
  costTracking: boolean;      // Session cost display
  checkpoints: boolean;       // Undo/redo support
  skills: boolean;            // Skills marketplace
  telemetry: boolean;         // Telemetry commands

  // Rendering
  nativeStatusBar: boolean;   // Use Rust status bar
  maxMessages: number;        // Virtualization threshold
}
```

---

## 4. Component Specification

### 4.1 TuiApp (Root Component)

**Responsibilities:**
- Provide context for all child components
- Coordinate high-level state
- Handle lifecycle (mount/unmount)

**Props:**
```typescript
interface TuiAppProps {
  // Minimal props - use context for the rest
  apiKey: string;
  config: TuiConfig;
  onExit?: () => void;
}
```

**Structure:**
```tsx
function TuiApp({ apiKey, config, onExit }: TuiAppProps) {
  return (
    <SessionProvider apiKey={apiKey}>
      <TuiConfigProvider config={config}>
        <Box flexDirection="column" height="100%">
          <MessageArea />
          <StatusBar />
          <InputArea onExit={onExit} />
        </Box>
      </TuiConfigProvider>
    </SessionProvider>
  );
}
```

### 4.2 MessageArea

**Responsibilities:**
- Render message list with virtualization
- Handle streaming text display
- Show tool calls/results

**Props:**
```typescript
interface MessageAreaProps {
  // All from context
}
```

**Virtualization Strategy:**
```typescript
// Only render visible messages + buffer
const VISIBLE_BUFFER = 5;  // Extra messages above/below viewport

function MessageArea() {
  const { messages } = useMessages();
  const { viewportHeight } = useTerminalSize();
  const [scrollOffset, setScrollOffset] = useState(0);

  const maxVisible = viewportHeight - 4;  // Reserve for status/input
  const startIdx = Math.max(0, scrollOffset - VISIBLE_BUFFER);
  const endIdx = Math.min(messages.length, scrollOffset + maxVisible + VISIBLE_BUFFER);

  const visibleMessages = messages.slice(startIdx, endIdx);

  return (
    <Box flexDirection="column">
      {visibleMessages.map(msg => (
        <MessageItem key={msg.id} message={msg} />
      ))}
    </Box>
  );
}
```

### 4.3 MessageItem

**Responsibilities:**
- Render single message with appropriate styling
- Handle truncation for long content
- Support different message types

**Props:**
```typescript
interface MessageItemProps {
  message: UIMessage;
  maxWidth?: number;
  truncate?: boolean;
}
```

**Variants:**
```tsx
function MessageItem({ message, maxWidth = 80, truncate = true }: MessageItemProps) {
  switch (message.type) {
    case "tool_call":
      return <ToolCallDisplay toolName={message.toolName!} input={message.content} />;
    case "tool_result":
      return <ToolResultDisplay toolName={message.toolName!} result={message.content} isError={message.isError} />;
    case "thinking":
      return <ThinkingDisplay content={message.content} />;
    default:
      return <TextMessage message={message} maxWidth={maxWidth} truncate={truncate} />;
  }
}
```

### 4.4 InputArea

**Responsibilities:**
- Handle keyboard input
- Manage cursor position
- Provide history navigation
- Dispatch commands and messages

**Props:**
```typescript
interface InputAreaProps {
  onExit?: () => void;
}
```

**Implementation:**
```tsx
function InputArea({ onExit }: InputAreaProps) {
  const { value, cursorPos, handlers } = useInputWithHistory({
    maxHistory: 100,
    onSubmit: handleSubmit,
  });
  const { isLoading } = useSession();

  return (
    <Box flexDirection="column">
      <InputField
        value={value}
        cursorPosition={cursorPos}
        disabled={isLoading}
      />
    </Box>
  );
}
```

### 4.5 StatusBar

**Responsibilities:**
- Display context info (tokens, percent remaining)
- Show current model and permission mode
- Display cost when enabled
- Show loading spinner when processing

**Props:**
```typescript
interface StatusBarProps {
  // All from context
  useNativeRenderer?: boolean;
}
```

**Implementation:**
```tsx
function StatusBar({ useNativeRenderer = false }: StatusBarProps) {
  const { isLoading, spinnerFrame } = useSession();
  const { tokenCount, contextInfo } = useContextInfo();
  const { model, permissionMode } = useConfig();
  const { cost } = useCost();
  const { width } = useTerminalSize();

  const left = isLoading
    ? `${spinnerFrames[spinnerFrame]} Processing...`
    : `${getModelDisplayName(model)} | ${permissionMode}`;
  const right = `${formatTokenCount(tokenCount)} | ${formatCostBrief(cost)}`;

  if (useNativeRenderer) {
    return <Text>{renderStatusBar(left, right, width)}</Text>;
  }

  return (
    <Box width={width}>
      <Box flexGrow={1}>
        <Text dimColor>{left}</Text>
      </Box>
      <Box>
        <Text dimColor>{right}</Text>
      </Box>
    </Box>
  );
}
```

### 4.6 ToolCallDisplay

**Props:**
```typescript
interface ToolCallDisplayProps {
  toolName: string;
  input: string;
  maxWidth?: number;
}
```

### 4.7 ToolResultDisplay

**Props:**
```typescript
interface ToolResultDisplayProps {
  toolName: string;
  result: string;
  isError?: boolean;
  maxWidth?: number;
}
```

---

## 5. Hooks Specification

### 5.1 useSession

**Purpose:** Central session state management

**Returns:**
```typescript
interface UseSessionReturn {
  // State
  sessionId: string;
  isLoading: boolean;
  streamingText: string;
  streamingThinking: string;
  spinnerFrame: number;

  // Actions
  setSessionId: (id: string) => void;
  startLoading: () => void;
  stopLoading: () => void;
  appendStream: (text: string) => void;
  clearStream: () => void;
}
```

**Implementation:**
```typescript
function useSession(): UseSessionReturn {
  const [sessionId, setSessionId] = useState(generateSessionId);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [streamingThinking, setStreamingThinking] = useState("");
  const [spinnerFrame, setSpinnerFrame] = useState(0);

  // Spinner animation
  useEffect(() => {
    if (!isLoading) return;
    const iv = setInterval(() => setSpinnerFrame(f => (f + 1) % spinnerFrames.length), 80);
    return () => clearInterval(iv);
  }, [isLoading]);

  return {
    sessionId,
    isLoading,
    streamingText,
    streamingThinking,
    spinnerFrame,
    setSessionId,
    startLoading: () => setIsLoading(true),
    stopLoading: () => {
      setIsLoading(false);
      setStreamingText("");
      setStreamingThinking("");
    },
    appendStream: (text) => setStreamingText(prev => prev + text),
    clearStream: () => setStreamingText(""),
  };
}
```

### 5.2 useMessages

**Purpose:** Message list management with virtualization support

**Returns:**
```typescript
interface UseMessagesReturn {
  // State
  messages: UIMessage[];
  apiMessages: ApiMessage[];
  tokenCount: number;

  // Actions
  addUserMessage: (content: string) => void;
  addAssistantMessage: (content: string) => void;
  addSystemMessage: (content: string) => void;
  addToolCall: (toolName: string, input: string) => void;
  addToolResult: (toolName: string, result: string, isError?: boolean) => void;
  clearMessages: () => void;
  setApiMessages: (messages: ApiMessage[]) => void;
}
```

### 5.3 useInputWithHistory (Enhanced)

**Purpose:** Input handling with history and cursor management

**Current State:** Exists but unused in components

**Enhanced Returns:**
```typescript
interface UseInputWithHistoryReturn {
  // State
  value: string;
  cursorPosition: number;
  history: string[];
  historyIndex: number;

  // Actions
  setValue: (value: string) => void;
  setCursorPosition: (pos: number) => void;
  submit: () => void;
  clear: () => void;

  // Keyboard handlers (for useInput)
  handlers: {
    onChar: (char: string) => void;
    onBackspace: () => void;
    onDelete: () => void;
    onLeft: () => void;
    onRight: () => void;
    onHome: () => void;
    onEnd: () => void;
    onUp: () => void;
    onDown: () => void;
    onEnter: () => void;
  };
}
```

### 5.4 useCommands

**Purpose:** Command registration and dispatch

**Returns:**
```typescript
interface UseCommandsReturn {
  // Actions
  registerCommand: (name: string, handler: CommandHandler) => void;
  unregisterCommand: (name: string) => void;
  executeCommand: (input: string) => Promise<void>;
  getCompletions: (partial: string) => string[];

  // State
  commands: Map<string, CommandDefinition>;
}

interface CommandDefinition {
  name: string;
  description: string;
  aliases?: string[];
  handler: CommandHandler;
  usage?: string;
}

type CommandHandler = (args: string, context: CommandContext) => Promise<void> | void;

interface CommandContext {
  addMessage: (content: string) => void;
  session: UseSessionReturn;
  messages: UseMessagesReturn;
  cost: UseCostReturn;
  // ... other context
}
```

### 5.5 useCost

**Purpose:** Session cost tracking

**Returns:**
```typescript
interface UseCostReturn {
  // State
  totalCost: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;

  // Actions
  addMetrics: (metrics: QueryMetrics) => void;
  reset: () => void;
  getBreakdown: () => CostBreakdown;
}

interface CostBreakdown {
  total: string;
  input: string;
  output: string;
  cache: string;
}
```

### 5.6 useCheckpoints

**Purpose:** Undo/redo functionality

**Returns:**
```typescript
interface UseCheckpointsReturn {
  // State
  checkpoints: Checkpoint[];
  currentIndex: number;
  canUndo: boolean;
  canRedo: boolean;

  // Actions
  save: (label?: string) => void;
  undo: () => Checkpoint | null;
  redo: () => Checkpoint | null;
  restore: (id: string) => Checkpoint | null;
  list: () => Checkpoint[];
}

interface Checkpoint {
  id: string;
  label: string;
  messages: ApiMessage[];
  timestamp: number;
}
```

### 5.7 useAgentLoop

**Purpose:** Wrap agentLoop with TUI callbacks

**Returns:**
```typescript
interface UseAgentLoopReturn {
  // Actions
  sendMessage: (content: string) => Promise<void>;
  cancel: () => void;

  // State
  isProcessing: boolean;
  error: Error | null;
}
```

---

## 6. Type System

### 6.1 Core Types

```typescript
// ============================================
// ui/types/index.ts
// ============================================

/**
 * UI Message representation
 */
export interface UIMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;

  // Tool-related
  toolName?: string;
  toolInput?: string;
  toolOutput?: string;
  isError?: boolean;

  // Type discrimination
  type?: "text" | "tool_call" | "tool_result" | "thinking";

  // Metadata
  costUSD?: number;
  tokens?: number;
  timestamp: number;
}

/**
 * Session cost tracking
 */
export interface SessionCost {
  totalCost: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

/**
 * Checkpoint for undo/redo
 */
export interface Checkpoint {
  id: string;
  label: string;
  messages: ApiMessage[];
  timestamp: number;
}

/**
 * TUI Configuration
 */
export interface TuiConfig {
  // Display mode
  scrollback: boolean;

  // Features
  costTracking: boolean;
  checkpoints: boolean;
  skills: boolean;
  telemetry: boolean;

  // Rendering
  nativeStatusBar: boolean;
  maxVisibleMessages: number;
  maxMessageLength: number;
  maxToolPreview: number;
}

/**
 * Input history options
 */
export interface InputHistoryOptions {
  maxHistory: number;
  persistKey?: string;
}

/**
 * Input state with cursor
 */
export interface InputWithHistory {
  value: string;
  cursorPosition: number;
  history: string[];
  historyIndex: number;
}
```

### 6.2 Context Types

```typescript
/**
 * Session context value
 */
export interface SessionContextValue extends UseSessionReturn {}

/**
 * Messages context value
 */
export interface MessagesContextValue extends UseMessagesReturn {}

/**
 * Config context value
 */
export interface ConfigContextValue {
  config: TuiConfig;
  model: string;
  permissionMode: PermissionMode;
  workingDirectory: string;
  setModel: (model: string) => void;
}

/**
 * Cost context value
 */
export interface CostContextValue extends UseCostReturn {}
```

### 6.3 Event Types

```typescript
/**
 * TUI event types
 */
export type TuiEvent =
  | { type: "message:sent"; message: UIMessage }
  | { type: "message:received"; message: UIMessage }
  | { type: "tool:call"; toolName: string; input: unknown }
  | { type: "tool:result"; toolName: string; result: unknown; isError: boolean }
  | { type: "session:start"; sessionId: string }
  | { type: "session:end"; sessionId: string }
  | { type: "checkpoint:save"; checkpoint: Checkpoint }
  | { type: "checkpoint:restore"; checkpoint: Checkpoint };
```

---

## 7. Command System

### 7.1 Command Registry

```typescript
// commands/registry.ts

class CommandRegistry {
  private commands = new Map<string, CommandDefinition>();
  private aliases = new Map<string, string>();

  register(def: CommandDefinition): void {
    this.commands.set(def.name, def);
    def.aliases?.forEach(alias => this.aliases.set(alias, def.name));
  }

  get(name: string): CommandDefinition | undefined {
    const resolvedName = this.aliases.get(name) ?? name;
    return this.commands.get(resolvedName);
  }

  getCompletions(partial: string): string[] {
    const allNames = [...this.commands.keys(), ...this.aliases.keys()];
    return allNames.filter(name => name.startsWith(partial));
  }

  list(): CommandDefinition[] {
    return Array.from(this.commands.values());
  }
}

export const commandRegistry = new CommandRegistry();
```

### 7.2 Built-in Commands

```typescript
// commands/builtin.ts

commandRegistry.register({
  name: "help",
  description: "Show available commands",
  handler: (args, { addMessage }) => {
    const commands = commandRegistry.list();
    const help = commands.map(c => `  /${c.name} - ${c.description}`).join("\n");
    addMessage(`Commands:\n${help}`);
  },
});

commandRegistry.register({
  name: "clear",
  description: "Clear message history",
  handler: (args, { messages }) => {
    messages.clearMessages();
  },
});

commandRegistry.register({
  name: "exit",
  aliases: ["quit", "q"],
  description: "Exit the application",
  handler: (args, { session, onExit }) => {
    onExit?.();
  },
});

commandRegistry.register({
  name: "model",
  description: "Show or switch model",
  usage: "[model-name]",
  handler: async (args, { config, addMessage }) => {
    if (args) {
      config.setModel(args);
      addMessage(`Model switched to: ${getModelDisplayName(args)}`);
    } else {
      addMessage(`Current model: ${getModelDisplayName(config.model)}`);
    }
  },
});

commandRegistry.register({
  name: "cost",
  description: "Show session cost breakdown",
  handler: (args, { cost, addMessage }) => {
    const breakdown = cost.getBreakdown();
    addMessage([
      "Session Cost Summary",
      "━━━━━━━━━━━━━━━━━━━━",
      `Total: ${breakdown.total}`,
      `Input: ${breakdown.input}`,
      `Output: ${breakdown.output}`,
      `Cache: ${breakdown.cache}`,
    ].join("\n"));
  },
});

commandRegistry.register({
  name: "status",
  description: "Show session status",
  handler: (args, { session, messages, config, cost, addMessage }) => {
    addMessage([
      "Session Status",
      "━━━━━━━━━━━━━━━━━━━━",
      `Session ID: ${session.sessionId.slice(0, 8)}...`,
      `Model: ${getModelDisplayName(config.model)}`,
      `Permission Mode: ${config.permissionMode}`,
      `Messages: ${messages.messages.length}`,
      `Total Cost: ${formatCost(cost.totalCost)}`,
    ].join("\n"));
  },
});

commandRegistry.register({
  name: "checkpoint",
  aliases: ["cp"],
  description: "Save a checkpoint",
  usage: "[label]",
  handler: (args, { checkpoints, messages, addMessage }) => {
    const label = args || `Checkpoint ${checkpoints.checkpoints.length + 1}`;
    checkpoints.save(label);
    addMessage(`Checkpoint saved: "${label}" (${messages.apiMessages.length} messages)`);
  },
});

commandRegistry.register({
  name: "checkpoints",
  aliases: ["cps"],
  description: "List checkpoints",
  handler: (args, { checkpoints, addMessage }) => {
    const list = checkpoints.list();
    if (list.length === 0) {
      addMessage("No checkpoints. Use /checkpoint to save one.");
    } else {
      const formatted = list.map((cp, i) => {
        const time = new Date(cp.timestamp).toLocaleTimeString();
        const current = i === checkpoints.currentIndex ? " ← current" : "";
        return `${i + 1}. ${cp.label} (${cp.messages.length} msgs, ${time})${current}`;
      }).join("\n");
      addMessage(`Checkpoints:\n${formatted}`);
    }
  },
});

commandRegistry.register({
  name: "undo",
  description: "Undo to previous checkpoint",
  handler: (args, { checkpoints, messages, addMessage }) => {
    const checkpoint = checkpoints.undo();
    if (checkpoint) {
      messages.setApiMessages(checkpoint.messages);
      addMessage(`Restored: "${checkpoint.label}"`);
    } else {
      addMessage("Nothing to undo.");
    }
  },
});

commandRegistry.register({
  name: "redo",
  description: "Redo to next checkpoint",
  handler: (args, { checkpoints, messages, addMessage }) => {
    const checkpoint = checkpoints.redo();
    if (checkpoint) {
      messages.setApiMessages(checkpoint.messages);
      addMessage(`Restored: "${checkpoint.label}"`);
    } else {
      addMessage("Nothing to redo.");
    }
  },
});
```

### 7.3 Command Context

```typescript
// commands/context.ts

interface CommandContext {
  // Message actions
  addMessage: (content: string) => void;

  // State access
  session: UseSessionReturn;
  messages: UseMessagesReturn;
  cost: UseCostReturn;
  checkpoints: UseCheckpointsReturn;
  config: ConfigContextValue;

  // Lifecycle
  onExit?: () => void;
}

function createCommandContext(
  deps: {
    session: UseSessionReturn;
    messages: UseMessagesReturn;
    cost: UseCostReturn;
    checkpoints: UseCheckpointsReturn;
    config: ConfigContextValue;
    onExit?: () => void;
  }
): CommandContext {
  return {
    addMessage: (content) => {
      deps.messages.addSystemMessage(content);
    },
    ...deps,
  };
}
```

---

## 8. Rendering Strategy

### 8.1 Ink-First Approach

**Use Ink for:**
- Layout (Box, Flex)
- Static content (Text)
- Conditional rendering
- Event handling (useInput)

**Use Native Rust for:**
- High-frequency updates (spinner)
- Status bar (rendered every tick)
- Large text rendering (syntax highlighting)

### 8.2 Rendering Modes

```typescript
type RenderMode = "reactive" | "scrollback";

interface RenderStrategy {
  mode: RenderMode;

  // Reactive mode: Ink re-renders on state change
  // Good for: Interactive input, small message lists

  // Scrollback mode: Write to stdout, use terminal scroll
  // Good for: Large histories, log-style viewing
}
```

### 8.3 Performance Optimizations

1. **Message Virtualization**
   ```typescript
   // Only render visible messages
   const visibleMessages = useMemo(() => {
     return messages.slice(startIdx, endIdx);
   }, [messages, startIdx, endIdx]);
   ```

2. **Debounced Status Updates**
   ```typescript
   // Don't update status bar on every token
   const debouncedTokenCount = useDebounce(tokenCount, 100);
   ```

3. **Memoized Components**
   ```typescript
   const MessageItem = memo(function MessageItem({ message }: Props) {
     // ...
   });
   ```

4. **Native Spinner**
   ```typescript
   // Use native Rust for 80ms ticker instead of React state
   useEffect(() => {
     if (!isLoading) return;
     const iv = setInterval(() => {
       process.stdout.write(native.tui_spinner_frame());
     }, 80);
     return () => clearInterval(iv);
   }, [isLoading]);
   ```

---

## 9. Performance Requirements

### 9.1 Targets

| Metric | Target | Current |
|--------|--------|---------|
| Initial render | < 100ms | Unknown |
| Message add | < 16ms | Unknown |
| Input keystroke | < 5ms | Unknown |
| Status bar update | < 1ms | Unknown |
| Memory (1000 messages) | < 50MB | Unknown |
| CPU idle | < 1% | Unknown |

### 9.2 Benchmarks

```typescript
// benchmarks/tui.bench.ts

describe("TUI Performance", () => {
  it("renders 100 messages in < 100ms", () => {
    const messages = generateMessages(100);
    const start = performance.now();
    render(<MessageArea messages={messages} />);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100);
  });

  it("handles keystroke in < 5ms", () => {
    const { handlers } = useInputWithHistory();
    const start = performance.now();
    handlers.onChar("a");
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(5);
  });
});
```

---

## 10. Migration Path

### 10.1 Phase 1: Extract Hooks (No Behavior Change)

**Goal:** Move logic out of components without changing behavior

**Tasks:**
1. Create `useSession` from InteractiveTUI state
2. Create `useMessages` from message management code
3. Enhance `useInputWithHistory` with all keyboard handling
4. Create `useCost` from cost tracking code
5. Create `useCheckpoints` from checkpoint code
6. Create `useAgentLoop` wrapper

**Files to create:**
```
terminal/tui/hooks/
├── useSession.ts
├── useMessages.ts
├── useInputWithHistory.ts (enhance existing)
├── useCost.ts
├── useCheckpoints.ts
├── useAgentLoop.ts
└── index.ts
```

### 10.2 Phase 2: Create Command System

**Goal:** Extract command handling into registry pattern

**Tasks:**
1. Create `CommandRegistry` class
2. Extract all commands to individual files
3. Create `useCommands` hook
4. Update TUI to use command registry

**Files to create:**
```
terminal/tui/commands/
├── registry.ts
├── context.ts
├── builtin/
│   ├── help.ts
│   ├── clear.ts
│   ├── exit.ts
│   ├── model.ts
│   ├── cost.ts
│   ├── status.ts
│   ├── checkpoint.ts
│   ├── checkpoints.ts
│   ├── undo.ts
│   ├── redo.ts
│   └── index.ts
└── index.ts
```

### 10.3 Phase 3: Create Context Providers

**Goal:** Eliminate props drilling with context

**Tasks:**
1. Create `SessionProvider`
2. Create `MessagesProvider`
3. Create `ConfigProvider`
4. Create `CostProvider`
5. Create `CheckpointsProvider`
6. Create composite `TuiProvider`

**Files to create:**
```
terminal/tui/context/
├── SessionContext.tsx
├── MessagesContext.tsx
├── ConfigContext.tsx
├── CostContext.tsx
├── CheckpointsContext.tsx
├── TuiContext.tsx (composite)
└── index.ts
```

### 10.4 Phase 4: Consolidate TUI Components

**Goal:** Single TUI implementation with feature flags

**Tasks:**
1. Create new `TuiApp.tsx` using hooks and context
2. Create `MessageArea` with virtualization
3. Create `InputArea` using enhanced input hook
4. Create `StatusBar` with native option
5. Update CLI entry to use new TUI
6. Remove old `InteractiveTUI.tsx` and `ScrollableTUI.tsx`

**Files to create:**
```
terminal/tui/components/
├── TuiApp.tsx
├── MessageArea.tsx
├── MessageItem.tsx
├── InputArea.tsx
├── StatusBar.tsx
├── ToolCallDisplay.tsx
├── ToolResultDisplay.tsx
├── ThinkingDisplay.tsx
└── index.ts
```

### 10.5 Phase 5: Cleanup

**Tasks:**
1. Remove duplicate utility functions
2. Remove `lmdb.db` from UI directory
3. Remove `.backup` files
4. Update exports in `index.ts`
5. Add unit tests for hooks
6. Add integration tests for TUI
7. Update documentation

---

## 11. File Structure

### 11.1 Target Structure

```
packages/src/coder/packages/src/interfaces/ui/
├── index.ts                      # Public exports
├── spinner.ts                    # Spinner implementation
├── types.ts                      # All UI types
│
├── components/
│   ├── index.ts
│   ├── InputField.tsx            # Input with cursor
│   └── types.ts
│
├── terminal/
│   ├── cli/
│   │   └── index.ts              # CLI entry
│   │
│   ├── shared/
│   │   ├── index.ts
│   │   ├── args.ts
│   │   ├── loading-state.ts
│   │   ├── query.ts
│   │   ├── setup.ts
│   │   ├── status-line.ts
│   │   └── system-prompt.ts
│   │
│   └── tui/
│       ├── index.ts
│       ├── types.ts
│       ├── console.ts
│       ├── spinner.ts
│       ├── useTerminalSize.ts
│       ├── tui-renderer.ts
│       │
│       ├── components/
│       │   ├── index.ts
│       │   ├── TuiApp.tsx
│       │   ├── MessageArea.tsx
│       │   ├── MessageItem.tsx
│       │   ├── InputArea.tsx
│       │   ├── StatusBar.tsx
│       │   ├── ToolCallDisplay.tsx
│       │   ├── ToolResultDisplay.tsx
│       │   └── ThinkingDisplay.tsx
│       │
│       ├── hooks/
│       │   ├── index.ts
│       │   ├── useSession.ts
│       │   ├── useMessages.ts
│       │   ├── useInputWithHistory.ts
│       │   ├── useCommands.ts
│       │   ├── useCost.ts
│       │   ├── useCheckpoints.ts
│       │   └── useAgentLoop.ts
│       │
│       ├── context/
│       │   ├── index.ts
│       │   ├── SessionContext.tsx
│       │   ├── MessagesContext.tsx
│       │   ├── ConfigContext.tsx
│       │   ├── CostContext.tsx
│       │   ├── CheckpointsContext.tsx
│       │   └── TuiContext.tsx
│       │
│       └── commands/
│           ├── index.ts
│           ├── registry.ts
│           ├── context.ts
│           └── builtin/
│               ├── index.ts
│               ├── help.ts
│               ├── clear.ts
│               ├── exit.ts
│               ├── model.ts
│               ├── cost.ts
│               ├── status.ts
│               ├── checkpoint.ts
│               ├── checkpoints.ts
│               ├── undo.ts
│               └── redo.ts
│
└── utils/
    ├── index.ts
    ├── format.ts
    ├── id.ts
    └── tokens.ts
```

### 11.2 Files to Delete

```
- InteractiveTUI.tsx
- InteractiveTUI.tsx.backup
- ScrollableTUI.tsx
- run.tsx
- run-ink.tsx
- run-scrollable.tsx
- run-native.ts
- tui-footer.ts
- lmdb.db
- lmdb.db-lock
```

---

## 12. Implementation Checklist

### Phase 1: Hooks Extraction
- [ ] Create `hooks/useSession.ts`
- [ ] Create `hooks/useMessages.ts`
- [ ] Enhance `hooks/useInputWithHistory.ts`
- [ ] Create `hooks/useCost.ts`
- [ ] Create `hooks/useCheckpoints.ts`
- [ ] Create `hooks/useAgentLoop.ts`
- [ ] Create `hooks/index.ts`

### Phase 2: Command System
- [ ] Create `commands/registry.ts`
- [ ] Create `commands/context.ts`
- [ ] Create `commands/builtin/help.ts`
- [ ] Create `commands/builtin/clear.ts`
- [ ] Create `commands/builtin/exit.ts`
- [ ] Create `commands/builtin/model.ts`
- [ ] Create `commands/builtin/cost.ts`
- [ ] Create `commands/builtin/status.ts`
- [ ] Create `commands/builtin/checkpoint.ts`
- [ ] Create `commands/builtin/checkpoints.ts`
- [ ] Create `commands/builtin/undo.ts`
- [ ] Create `commands/builtin/redo.ts`
- [ ] Create `commands/builtin/index.ts`
- [ ] Create `commands/index.ts`
- [ ] Create `hooks/useCommands.ts`

### Phase 3: Context Providers
- [ ] Create `context/SessionContext.tsx`
- [ ] Create `context/MessagesContext.tsx`
- [ ] Create `context/ConfigContext.tsx`
- [ ] Create `context/CostContext.tsx`
- [ ] Create `context/CheckpointsContext.tsx`
- [ ] Create `context/TuiContext.tsx`
- [ ] Create `context/index.ts`

### Phase 4: Consolidated Components
- [ ] Create `components/TuiApp.tsx`
- [ ] Create `components/MessageArea.tsx`
- [ ] Create `components/MessageItem.tsx`
- [ ] Create `components/InputArea.tsx`
- [ ] Create `components/StatusBar.tsx`
- [ ] Create `components/ToolCallDisplay.tsx`
- [ ] Create `components/ToolResultDisplay.tsx`
- [ ] Create `components/ThinkingDisplay.tsx`
- [ ] Update CLI entry to use new TUI
- [ ] Create `components/index.ts`

### Phase 5: Cleanup
- [ ] Remove `InteractiveTUI.tsx`
- [ ] Remove `InteractiveTUI.tsx.backup`
- [ ] Remove `ScrollableTUI.tsx`
- [ ] Remove old runner files
- [ ] Remove `lmdb.db` and lock file
- [ ] Update `terminal/tui/index.ts`
- [ ] Update main `ui/index.ts`
- [ ] Add unit tests for hooks
- [ ] Add integration tests

### Phase 6: Documentation
- [ ] Update CLAUDE.md with new structure
- [ ] Add JSDoc to all public exports
- [ ] Create usage examples
- [ ] Document command extension pattern

---

## Appendix A: Keybindings Reference

| Key | Action |
|-----|--------|
| `Enter` | Submit message |
| `Ctrl+C` | Exit |
| `Ctrl+L` | Clear screen |
| `Ctrl+U` | Clear input line |
| `Ctrl+A` | Cursor to start |
| `Ctrl+E` | Cursor to end |
| `↑` | History previous |
| `↓` | History next |
| `←` | Cursor left |
| `→` | Cursor right |
| `Backspace` | Delete char before cursor |
| `Delete` | Delete char at cursor |
| `Tab` | Command completion (future) |

---

## Appendix B: Command Reference

| Command | Aliases | Description |
|---------|---------|-------------|
| `/help` | `/h`, `/?` | Show available commands |
| `/clear` | `/cls` | Clear message history |
| `/exit` | `/quit`, `/q` | Exit application |
| `/model [name]` | `/m` | Show or switch model |
| `/cost` | | Show session cost |
| `/status` | `/s` | Show session status |
| `/checkpoint [label]` | `/cp` | Save checkpoint |
| `/checkpoints` | `/cps` | List checkpoints |
| `/undo` | | Restore previous checkpoint |
| `/redo` | | Restore next checkpoint |
| `/compact` | | Compact context (future) |
| `/skills [query]` | | Search skills (future) |

---

## Appendix C: Migration Commands

```bash
# Create directory structure
mkdir -p terminal/tui/{components,hooks,context,commands/builtin}

# Phase 1: Create hooks
touch terminal/tui/hooks/{index,useSession,useMessages,useInputWithHistory,useCost,useCheckpoints,useAgentLoop}.ts

# Phase 2: Create commands
touch terminal/tui/commands/{index,registry,context}.ts
touch terminal/tui/commands/builtin/{index,help,clear,exit,model,cost,status,checkpoint,checkpoints,undo,redo}.ts

# Phase 3: Create context
touch terminal/tui/context/{index,SessionContext,MessagesContext,ConfigContext,CostContext,CheckpointsContext,TuiContext}.tsx

# Phase 4: Create components
touch terminal/tui/components/{index,TuiApp,MessageArea,MessageItem,InputArea,StatusBar,ToolCallDisplay,ToolResultDisplay,ThinkingDisplay}.tsx
```

---

*End of Specification*
