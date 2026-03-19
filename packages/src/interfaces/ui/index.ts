/**
 * UI Components for Coder CLI
 *
 * Built on @ebowwa/tui-core for composable TUI
 */

// ============================================
// RE-EXPORT FROM TUI-CORE
// ============================================

export {
  // Core components
  Box,
  Text,
  Bold,
  Dim,
  Italic,
  Underline,
  ErrorText,
  Success,
  Warning,
  Info,
  Muted,
  Input,
  List,
  Table,
  StatusBar,
  Panel,
  ErrorPanel,
  LoadingPanel,
  // Layout hooks
  useTerminalSize,
  useWindowShape,
  useLayoutInfo,
  // State
  TUIStore,
  createStore,
  useStore,
  useSyncedState,
  // Resilience
  ErrorBoundary,
  // Rendering
  render,
  useApp,
  useInput,
  // Types
  type BoxProps,
  type TextProps,
  type InputProps,
  type ListProps,
  type ListItem,
  type TableProps,
  type TableColumn,
  type StatusBarProps,
  type StatusSection,
  type PanelProps,
  type TerminalSizeOptions,
  type WindowShapeResult,
} from "@ebowwa/tui-core"
import { TUIStore as TUIStoreClass } from "@ebowwa/tui-core/state"

// Import from algorithms for local use and re-export
import {
  SPINNERS,
  createProgressIndicator,
  renderProgressBar,
  getFrame,
  nextFrame,
  createAnimation,
  fade,
  easing,
} from "@ebowwa/tui-core/algorithms"

// Re-export from algorithms
export {
  SPINNERS,
  createProgressIndicator,
  renderProgressBar,
  getFrame,
  nextFrame,
  createAnimation,
  fade,
  easing,
}

// Re-export SPINNERS_MAP alias for backwards compatibility
export const SPINNERS_MAP = SPINNERS

// Re-export frame presets for backwards compatibility
// SPINNERS.xxx is SpinnerFrame[] - take first element's frames
export const defaultFrames = SPINNERS.dots?.[0]?.frames ?? []
export const dotFrames = SPINNERS.dots?.[0]?.frames ?? []
export const arrowFrames = SPINNERS.arrow?.[0]?.frames ?? []

// Tip presets
export const defaultTips = [
  "Processing...",
  "Thinking...",
  "Working on it...",
]

export const toolTips = [
  "Executing tool...",
  "Running command...",
  "Processing...",
]

export const streamingTips = [
  "Receiving response...",
  "Streaming...",
  "Processing...",
]

// Spinner types
export type SpinnerColor =
  | "black"
  | "red"
  | "green"
  | "yellow"
  | "blue"
  | "magenta"
  | "cyan"
  | "white"
  | "gray"

export interface SpinnerOptions {
  text?: string
  color?: SpinnerColor
  spinner?: "dots" | "dots2" | "dots3" | "dots4" | "dots5" | "dots6" | "arrow" | "line" | "simpleDots" | "star" | "noise"
}

// ============================================
// SPINNER CLASS
// ============================================

let activeSpinner: Spinner | null = null

export class Spinner {
  private text: string
  private color: SpinnerColor
  private frames: readonly string[]
  private frameIndex: number
  private interval: ReturnType<typeof setInterval> | null
  private isSpinning: boolean
  private stream: NodeJS.WriteStream

  constructor(options: SpinnerOptions = {}) {
    this.text = options.text ?? ""
    this.color = options.color ?? "cyan"
    const spinnerKey = options.spinner ?? "dots"
    // SPINNERS is Record<string, SpinnerFrame[]> - take first element's frames
    const spinnerData = SPINNERS[spinnerKey]?.[0] ?? SPINNERS.dots?.[0]
    this.frames = spinnerData?.frames ?? ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
    this.frameIndex = 0
    this.interval = null
    this.isSpinning = false
    this.stream = process.stderr
  }

  start(text?: string): this {
    if (text) this.text = text
    if (this.isSpinning) return this
    this.isSpinning = true
    this.stream.write("\x1B[?25l") // Hide cursor
    this.interval = setInterval(() => {
      this.render()
      this.frameIndex = (this.frameIndex + 1) % this.frames.length
    }, 80)
    return this
  }

  private render(): void {
    const frame = this.frames[this.frameIndex]
    const colorCode = this.getColorCode()
    this.stream.write(`\r${colorCode}${frame}\x1B[0m ${this.text}`)
  }

  private getColorCode(): string {
    const colors: Record<SpinnerColor, string> = {
      black: "\x1B[30m",
      red: "\x1B[31m",
      green: "\x1B[32m",
      yellow: "\x1B[33m",
      blue: "\x1B[34m",
      magenta: "\x1B[35m",
      cyan: "\x1B[36m",
      white: "\x1B[37m",
      gray: "\x1B[90m",
    }
    return colors[this.color] ?? colors.cyan
  }

  stop(): this {
    if (!this.isSpinning) return this
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
    this.stream.write("\r\x1B[K") // Clear line
    this.stream.write("\x1B[?25h") // Show cursor
    this.isSpinning = false
    return this
  }

  succeed(text?: string): this {
    this.stop()
    if (text) {
      this.stream.write(`\r\x1B[32m✔\x1B[0m ${text}\n`)
    }
    return this
  }

  fail(text?: string): this {
    this.stop()
    if (text) {
      this.stream.write(`\r\x1B[31m✖\x1B[0m ${text}\n`)
    }
    return this
  }

  warn(text?: string): this {
    this.stop()
    if (text) {
      this.stream.write(`\r\x1B[33m⚠\x1B[0m ${text}\n`)
    }
    return this
  }

  info(text?: string): this {
    this.stop()
    if (text) {
      this.stream.write(`\r\x1B[34mℹ\x1B[0m ${text}\n`)
    }
    return this
  }

  update(text: string): this {
    this.text = text
    return this
  }

  setColor(color: SpinnerColor): this {
    this.color = color
    return this
  }
}

export function getSpinner(options?: SpinnerOptions): Spinner {
  if (!activeSpinner) {
    activeSpinner = new Spinner(options)
  } else if (options) {
    if (options.text) activeSpinner.update(options.text)
    if (options.color) activeSpinner.setColor(options.color)
  }
  return activeSpinner
}

export function resetSpinner(): void {
  if (activeSpinner) {
    activeSpinner.stop()
    activeSpinner = null
  }
}
// ============================================
// LOADING STATE (using TUIStore)
// ============================================

type LoadingPhase =
  | "idle"
  | "connecting"
  | "sending"
  | "receiving"
  | "processing"
  | "tool_use"
  | "complete"
  | "error"

interface LoadingStateData {
  isLoading: boolean
  phase: LoadingPhase
  message: string
  toolName?: string
  startTime?: number
}

const loadingStore = new TUIStoreClass()

// Initialize with default state
loadingStore.set("isLoading", false)
loadingStore.set("phase", "idle")
loadingStore.set("message", "")

export interface LoadingStateEvents {
  start: (phase: LoadingPhase, message: string) => void
  update: (message: string) => void
  stop: () => void
}

export const LoadingState = {
  start(phase: LoadingPhase = "processing", message = ""): void {
    loadingStore.set("isLoading", true)
    loadingStore.set("phase", phase)
    loadingStore.set("message", message)
    loadingStore.set("startTime", Date.now())
  },

  stop(): void {
    loadingStore.set("isLoading", false)
    loadingStore.set("phase", "idle")
    loadingStore.set("message", "")
    loadingStore.set("startTime", undefined)
  },

  update(message: string): void {
    loadingStore.set("message", message)
  },

  getState(): LoadingStateData {
    return {
      isLoading: loadingStore.get("isLoading") as boolean,
      phase: loadingStore.get("phase") as LoadingPhase,
      message: loadingStore.get("message") as string,
      toolName: loadingStore.get("toolName") as string | undefined,
      startTime: loadingStore.get("startTime") as number | undefined,
    }
  },

  subscribe(listener: (state: LoadingStateData) => void): () => void {
    // Simple implementation - just call listener once
    listener(this.getState())
    // Return unsubscribe function
    return () => {
      // No-op for simple implementation
    }
  },
}

export function getLoadingState(): LoadingStateData {
  return LoadingState.getState()
}

export function setLoading(phase: LoadingPhase, message: string): void {
  LoadingState.start(phase, message)
}

export function stopLoading(): void {
  LoadingState.stop()
}

export function updateLoading(message: string): void {
  LoadingState.update(message)
}

export function startTool(toolName: string): void {
  loadingStore.set("toolName", toolName)
  LoadingState.start("tool_use", `Running ${toolName}...`)
}

export function endTool(): void {
  loadingStore.set("toolName", undefined)
  LoadingState.stop()
}

// ============================================
// PROGRESS CALLBACK TYPES
// ============================================

export interface ProgressUpdate {
  toolName: string
  status: "pending" | "running" | "complete" | "error"
  message?: string
  progress?: number
  timestamp: number
}

export type ProgressCallback = (update: ProgressUpdate) => void

export function createProgressCallback(
  toolName: string,
  onProgress?: ((message: string) => void) | undefined
): ProgressCallback | undefined {
  if (!onProgress) return undefined
  return (update: ProgressUpdate) => {
    const message = update.message ?? `${update.toolName}: ${update.status}`
    onProgress(message)
  }
}

// ============================================
// UTILITIES
// ============================================

export function formatElapsedTime(startTime: number): string {
  const elapsed = Date.now() - startTime
  const seconds = Math.floor(elapsed / 1000)
  const minutes = Math.floor(seconds / 60)
  if (minutes > 1) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}

export function formatLoadingMessage(phase: LoadingPhase, toolName?: string): string {
  switch (phase) {
    case "connecting":
      return "Connecting..."
    case "sending":
      return "Sending request..."
    case "receiving":
      return "Receiving response..."
    case "processing":
      return "Processing..."
    case "tool_use":
      return toolName ? `Running ${toolName}...` : "Executing tool..."
    case "complete":
      return "Complete"
    case "error":
      return "Error"
    case "idle":
    default:
      return ""
  }
}
