# TUI Quick Reference

> One-page implementation guide for TUI consolidation

---

## Hook Signatures

```typescript
// useSession.ts
function useSession(): {
  sessionId: string;
  isLoading: boolean;
  streamingText: string;
  spinnerFrame: number;
  startLoading(): void;
  stopLoading(): void;
  appendStream(text: string): void;
}

// useMessages.ts
function useMessages(): {
  messages: UIMessage[];
  apiMessages: ApiMessage[];
  tokenCount: number;
  addUserMessage(content: string): void;
  addAssistantMessage(content: string): void;
  addSystemMessage(content: string): void;
  addToolCall(toolName: string, input: string): void;
  addToolResult(toolName: string, result: string, isError?: boolean): void;
  clearMessages(): void;
}

// useInputWithHistory.ts
function useInputWithHistory(options: { maxHistory?: number }): {
  value: string;
  cursorPosition: number;
  setValue(v: string): void;
  submit(): void;
  clear(): void;
  handlers: KeyHandlers;
}

// useCost.ts
function useCost(): {
  totalCost: number;
  inputTokens: number;
  outputTokens: number;
  addMetrics(m: QueryMetrics): void;
  reset(): void;
}

// useCheckpoints.ts
function useCheckpoints(): {
  checkpoints: Checkpoint[];
  currentIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  save(label?: string): void;
  undo(): Checkpoint | null;
  redo(): Checkpoint | null;
}

// useCommands.ts
function useCommands(): {
  register(name: string, handler: CommandHandler): void;
  execute(input: string): Promise<void>;
  getCompletions(partial: string): string[];
}

// useAgentLoop.ts
function useAgentLoop(): {
  sendMessage(content: string): Promise<void>;
  cancel(): void;
  isProcessing: boolean;
}
```

---

## Context Providers

```tsx
// Wrap app in order
<TuiProvider config={config} apiKey={apiKey}>
  <MessageArea />
  <StatusBar />
  <InputArea />
</TuiProvider>

// Access in any child
const { isLoading, spinnerFrame } = useSessionContext();
const { messages, addUserMessage } = useMessagesContext();
const { totalCost } = useCostContext();
```

---

## Component Props

```typescript
// TuiApp - root
interface TuiAppProps {
  apiKey: string;
  config: TuiConfig;
  onExit?: () => void;
}

// MessageItem
interface MessageItemProps {
  message: UIMessage;
  maxWidth?: number;
  truncate?: boolean;
}

// InputField
interface InputFieldProps {
  label?: string;
  value: string;
  cursorPosition: number;
  placeholder?: string;
  disabled?: boolean;
}

// StatusBar
interface StatusBarProps {
  useNativeRenderer?: boolean;
}

// ToolCallDisplay
interface ToolCallDisplayProps {
  toolName: string;
  input: string;
  maxWidth?: number;
}

// ToolResultDisplay
interface ToolResultDisplayProps {
  toolName: string;
  result: string;
  isError?: boolean;
  maxWidth?: number;
}
```

---

## Command Handler Signature

```typescript
type CommandHandler = (
  args: string,
  ctx: {
    addMessage: (content: string) => void;
    session: UseSessionReturn;
    messages: UseMessagesReturn;
    cost: UseCostReturn;
    checkpoints: UseCheckpointsReturn;
    config: ConfigContextValue;
    onExit?: () => void;
  }
) => Promise<void> | void;

// Example command
commandRegistry.register({
  name: "cost",
  description: "Show session cost",
  handler: (args, { cost, addMessage }) => {
    addMessage(`Total: $${cost.totalCost.toFixed(4)}`);
  },
});
```

---

## TUI Config

```typescript
interface TuiConfig {
  scrollback: boolean;         // Terminal scroll vs virtualized
  costTracking: boolean;       // Enable /cost command
  checkpoints: boolean;        // Enable /checkpoint, /undo, /redo
  skills: boolean;             // Enable /skills command
  telemetry: boolean;          // Enable /telemetry command
  nativeStatusBar: boolean;    // Use Rust for status bar
  maxVisibleMessages: number;  // Virtualization threshold
  maxMessageLength: number;    // Truncate messages
  maxToolPreview: number;      // Truncate tool output
}

const defaultConfig: TuiConfig = {
  scrollback: true,
  costTracking: true,
  checkpoints: true,
  skills: false,
  telemetry: true,
  nativeStatusBar: false,
  maxVisibleMessages: 100,
  maxMessageLength: 1000,
  maxToolPreview: 500,
};
```

---

## File Checklist

```
Phase 1 - Hooks:
□ hooks/useSession.ts
□ hooks/useMessages.ts
□ hooks/useInputWithHistory.ts
□ hooks/useCost.ts
□ hooks/useCheckpoints.ts
□ hooks/useAgentLoop.ts
□ hooks/index.ts

Phase 2 - Commands:
□ commands/registry.ts
□ commands/context.ts
□ commands/builtin/*.ts
□ commands/index.ts
□ hooks/useCommands.ts

Phase 3 - Context:
□ context/SessionContext.tsx
□ context/MessagesContext.tsx
□ context/ConfigContext.tsx
□ context/CostContext.tsx
□ context/CheckpointsContext.tsx
□ context/TuiContext.tsx
□ context/index.ts

Phase 4 - Components:
□ components/TuiApp.tsx
□ components/MessageArea.tsx
□ components/MessageItem.tsx
□ components/InputArea.tsx
□ components/StatusBar.tsx
□ components/ToolCallDisplay.tsx
□ components/ToolResultDisplay.tsx
□ components/ThinkingDisplay.tsx
□ components/index.ts

Phase 5 - Cleanup:
□ Delete InteractiveTUI.tsx
□ Delete ScrollableTUI.tsx
□ Delete .backup files
□ Delete lmdb.db
□ Update exports
```

---

## Quick Start

```bash
# Create structure
mkdir -p terminal/tui/{hooks,context,commands/builtin,components}

# Phase 1
for f in useSession useMessages useInputWithHistory useCost useCheckpoints useAgentLoop; do
  echo "// TODO: implement $f" > terminal/tui/hooks/$f.ts
done

# Phase 2
echo "// Command registry" > terminal/tui/commands/registry.ts
echo "// Command context" > terminal/tui/commands/context.ts

# Phase 3
for f in SessionContext MessagesContext ConfigContext CostContext CheckpointsContext TuiContext; do
  echo "// TODO: $f provider" > terminal/tui/context/$f.tsx
done

# Phase 4
for f in TuiApp MessageArea MessageItem InputArea StatusBar ToolCallDisplay ToolResultDisplay ThinkingDisplay; do
  echo "// TODO: $f component" > terminal/tui/components/$f.tsx
done
```

---

## Import Paths

```typescript
// From old
import { InteractiveTUI } from "./terminal/tui/InteractiveTUI.tsx";

// To new
import { TuiApp } from "./terminal/tui/components/TuiApp.tsx";
import { useSession } from "./terminal/tui/hooks/useSession.ts";
import { useMessages } from "./terminal/tui/hooks/useMessages.ts";
import { commandRegistry } from "./terminal/tui/commands/registry.ts";
```

---

## Key Patterns

### 1. Hook Returns Object
```typescript
// Good
function useSession() {
  const [isLoading, setIsLoading] = useState(false);
  return { isLoading, startLoading: () => setIsLoading(true) };
}

// Bad - returns array
function useSession() {
  return [isLoading, setIsLoading]; // No type safety
}
```

### 2. Context + Hook Pattern
```typescript
const SessionContext = createContext<SessionContextValue | null>(null);

export function useSessionContext() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSessionContext must be used within SessionProvider");
  return ctx;
}
```

### 3. Command Registry
```typescript
// Register at module load
commandRegistry.register({ name: "help", handler: helpHandler });

// Execute in component
const { execute } = useCommands();
if (input.startsWith("/")) {
  await execute(input);
}
```

### 4. Message Virtualization
```typescript
const visibleMessages = useMemo(() => {
  const start = Math.max(0, scrollOffset - BUFFER);
  const end = Math.min(messages.length, scrollOffset + viewportHeight + BUFFER);
  return messages.slice(start, end);
}, [messages, scrollOffset, viewportHeight]);
```

---

*End of Quick Reference*
