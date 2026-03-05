# Progress & UI Features Reference

Reference documentation for implementing terminal UI components.

## CLI Flags

### `--no-progress`

Disables all progress indicators. Useful for:
- Scripting/automation
- Non-TTY environments
- Logging output to files

```
coder --no-progress -q "read package.json"
```

---

## Spinner Component

The main progress indicator is an animated spinner with the following configuration:

### Props Interface

```typescript
interface SpinnerProps {
  mode: string;
  loadingStartTimeRef: { current: number };
  totalPausedMsRef: { current: number };
  pauseStartTimeRef: { current: number | null };
  spinnerTip: string;
  responseLengthRef: { current: number };
  overrideColor?: string;
  overrideShimmerColor?: string;
  overrideMessage?: string;
  spinnerSuffix?: string;
  verbose: boolean;
  todos?: Todo[];
  hasActiveTools: boolean;
}
```

### Spinner States

1. **Idle/Waiting** - Basic animation
2. **Streaming** - Shows response length growing
3. **Tool Execution** - Shows tool name + hasActiveTools=true
4. **Paused** - Tracks paused time separately

---

## Loading State (`isLoading`)

Used throughout the UI to track loading state:

### Footer Component
```typescript
interface FooterProps {
  mode: string;
  toolPermissionContext: ToolPermissionContext;
  showHint: boolean;
  isLoading: boolean;
  tasksSelected: boolean;
  teamsSelected: boolean;
  teammateFooterIndex: number;
}
```

### Stats Display
```typescript
interface StatsProps {
  stats: SessionStats;
  allTimeStats: AllTimeStats;
  dateRange: DateRange;
  isLoading: boolean;
}
```

### Input Area
```typescript
interface InputProps {
  isLoading: boolean;
  onSubmitMessage: (message: string) => void;
}
```

---

## Tool Progress Callback

Tool execution supports progress updates via callback:

### Function Signature
```typescript
async function callTool({
  client,
  clientConnection,
  tool,
  args,
  meta,
  signal,
  setAppState,
  onProgress,
  callToolFn
}): Promise<ToolResult>
```

### Progress Callback Interface
```typescript
interface ProgressUpdate {
  toolName: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  message?: string;
  progress?: number;  // 0-100 percentage
}
```

---

## Animation Frames

Typical spinner frames:

```typescript
const spinnerFrames = [
  '⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'
];

// Or dot-based:
const dotFrames = [
  '.  ', '.. ', '...', '   '
];
```

---

## Integration Points

### 1. API Streaming
- Show spinner during API requests
- Update response length in real-time
- Track elapsed time

### 2. Tool Execution
- Show tool name in spinner tip
- Set `hasActiveTools: true`
- Call `onProgress` callback for updates

### 3. Todo List
- Show current todo in spinner
- Update spinner tip with active task

### 4. Mode Changes
- Different spinner colors/styles per mode
- `overrideColor` for special states

---

## Implementation for Coder

### Required Components

1. **Spinner Component** (`packages/src/ui/spinner.ts`)
   - Animated frames
   - Configurable tip text
   - Time tracking
   - Color theming

2. **Loading State** (`packages/src/core/loading-state.ts`)
   - Global `isLoading` boolean
   - `loadingStartTime` timestamp
   - Active tool tracking

3. **Progress Callback** (`packages/src/tools/progress.ts`)
   - `onProgress` callback type
   - Progress update emitter
   - Integration with tool executor

4. **CLI Flag** (`packages/src/cli.ts`)
   - `--no-progress` flag handling
   - Disable spinner when set

### Suggested Implementation

```typescript
// packages/src/ui/spinner.ts
import { spinnerFrames } from './frames.js';

export interface SpinnerOptions {
  tip?: string;
  color?: string;
  showTime?: boolean;
  hasActiveTools?: boolean;
}

export class Spinner {
  private frameIndex = 0;
  private startTime = Date.now();
  private interval?: Timer;

  start(options: SpinnerOptions): void;
  updateTip(tip: string): void;
  stop(): void;
}
```
