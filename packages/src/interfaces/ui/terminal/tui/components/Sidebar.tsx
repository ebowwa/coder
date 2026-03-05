/** @jsx React.createElement */
/**
 * Sidebar Component
 * Collapsible sidebar for sessions, files, todos, and tools
 *
 * Features:
 * - Collapsible with keyboard shortcut
 * - Tabbed sections (sessions, files, todos, tools)
 * - Keyboard navigation
 * - Context-aware content
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Box, Text, useStdout } from "ink";
import chalk from "chalk";

// ============================================
// TYPES
// ============================================

export type SidebarTab = "sessions" | "files" | "todos" | "tools";

export interface SidebarSession {
  id: string;
  messageCount: number;
  lastActivity?: number;
  model?: string;
  preview?: string;
}

export interface SidebarFile {
  path: string;
  status: "modified" | "added" | "deleted" | "untracked";
  lineCount?: number;
}

export interface SidebarTodo {
  id: string;
  text: string;
  status: "pending" | "in_progress" | "completed";
}

export interface SidebarTool {
  name: string;
  server: string;
  status: "available" | "running" | "error";
}

export interface SidebarProps {
  /** Whether sidebar is visible */
  isOpen: boolean;
  /** Current active tab */
  activeTab?: SidebarTab;
  /** Width in columns */
  width?: number;
  /** Sessions list */
  sessions?: SidebarSession[];
  /** Modified files list */
  files?: SidebarFile[];
  /** Todos list */
  todos?: SidebarTodo[];
  /** Available tools list */
  tools?: SidebarTool[];
  /** Current session ID */
  currentSessionId?: string;
  /** Called when tab changes */
  onTabChange?: (tab: SidebarTab) => void;
  /** Called when session selected */
  onSessionSelect?: (sessionId: string) => void;
  /** Called when file selected */
  onFileSelect?: (path: string) => void;
  /** Called when todo toggled */
  onTodoToggle?: (todoId: string) => void;
  /** Called when tool selected */
  onToolSelect?: (toolName: string) => void;
  /** Called when close requested */
  onClose?: () => void;
}

// ============================================
// TAB CONFIGURATION
// ============================================

const TABS: { id: SidebarTab; label: string; icon: string }[] = [
  { id: "sessions", label: "Sessions", icon: "◈" },
  { id: "files", label: "Files", icon: "◇" },
  { id: "todos", label: "Todos", icon: "○" },
  { id: "tools", label: "Tools", icon: "◆" },
];

// ============================================
// SUB-COMPONENTS
// ============================================

interface TabBarProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
}

function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <Box flexDirection="row" borderBottom>
      {TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <Box
            key={tab.id}
            paddingX={1}
            borderStyle={isActive ? "single" : undefined}
            borderBottom={isActive}
          >
            <Text
              color={isActive ? "cyan" : "gray"}
              bold={isActive}
            >
              {tab.icon} {tab.label}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}

// ============================================
// SESSIONS TAB
// ============================================

interface SessionsTabProps {
  sessions: SidebarSession[];
  currentSessionId?: string;
  onSelect?: (sessionId: string) => void;
}

function SessionsTab({ sessions, currentSessionId, onSelect }: SessionsTabProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const handleKey = (data: Buffer) => {
      const key = data.toString();

      if (key === "\x1b[A" || key === "k") {
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      } else if (key === "\x1b[B" || key === "j") {
        setSelectedIndex((prev) => Math.min(sessions.length - 1, prev + 1));
      } else if (key === "\r" || key === "\n" || key === "l") {
        const session = sessions[selectedIndex];
        if (session) {
          onSelect?.(session.id);
        }
      }
    };

    process.stdin.on("data", handleKey);
    return () => {
      process.stdin.off("data", handleKey);
    };
  }, [sessions, selectedIndex, onSelect]);

  if (sessions.length === 0) {
    return (
      <Box paddingX={1}>
        <Text dimColor>No recent sessions</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {sessions.slice(0, 15).map((session, index) => {
        const isSelected = index === selectedIndex;
        const isCurrent = session.id === currentSessionId;

        const timeAgo = session.lastActivity
          ? formatTimeAgo(session.lastActivity)
          : "unknown";

        return (
          <Box
            key={session.id}
            paddingX={1}
            flexDirection="column"
          >
            <Box>
              {isSelected && <Text color="cyan">→ </Text>}
              {!isSelected && <Text>  </Text>}
              {isCurrent && <Text color="green">● </Text>}
              {!isCurrent && <Text dimColor>○ </Text>}
              <Text
                color={isSelected ? "cyan" : "white"}
                bold={isSelected}
              >
                {session.id.slice(0, 8)}
              </Text>
              <Text dimColor> {session.model?.slice(0, 10) || "unknown"}</Text>
            </Box>
            <Box marginLeft={3}>
              <Text dimColor>
                {session.messageCount} msgs · {timeAgo}
              </Text>
            </Box>
            {session.preview && (
              <Box marginLeft={3}>
                <Text dimColor>
                  {session.preview.slice(0, 30)}
                </Text>
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

// ============================================
// FILES TAB
// ============================================

const FILE_STATUS_COLORS: Record<string, string> = {
  modified: "yellow",
  added: "green",
  deleted: "red",
  untracked: "gray",
};

const FILE_STATUS_ICONS: Record<string, string> = {
  modified: "M",
  added: "A",
  deleted: "D",
  untracked: "?",
};

interface FilesTabProps {
  files: SidebarFile[];
  onSelect?: (path: string) => void;
}

function FilesTab({ files, onSelect }: FilesTabProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const handleKey = (data: Buffer) => {
      const key = data.toString();

      if (key === "\x1b[A" || key === "k") {
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      } else if (key === "\x1b[B" || key === "j") {
        setSelectedIndex((prev) => Math.min(files.length - 1, prev + 1));
      } else if (key === "\r" || key === "\n" || key === "l") {
        const file = files[selectedIndex];
        if (file) {
          onSelect?.(file.path);
        }
      }
    };

    process.stdin.on("data", handleKey);
    return () => {
      process.stdin.off("data", handleKey);
    };
  }, [files, selectedIndex, onSelect]);

  if (files.length === 0) {
    return (
      <Box paddingX={1}>
        <Text dimColor>No modified files</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {files.slice(0, 15).map((file, index) => {
        const isSelected = index === selectedIndex;
        const color = FILE_STATUS_COLORS[file.status];
        const icon = FILE_STATUS_ICONS[file.status];

        return (
          <Box key={file.path} paddingX={1}>
            {isSelected && <Text color="cyan">→ </Text>}
            {!isSelected && <Text>  </Text>}
            <Text color={color} bold>{icon} </Text>
            <Text color={isSelected ? "cyan" : "white"}>
              {truncatePath(file.path, 25)}
            </Text>
            {file.lineCount && (
              <Text dimColor> ({file.lineCount} lines)</Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

// ============================================
// TODOS TAB
// ============================================

const TODO_STATUS_COLORS: Record<string, string> = {
  pending: "gray",
  in_progress: "yellow",
  completed: "green",
};

const TODO_STATUS_ICONS: Record<string, string> = {
  pending: "○",
  in_progress: "◐",
  completed: "●",
};

interface TodosTabProps {
  todos: SidebarTodo[];
  onToggle?: (todoId: string) => void;
}

function TodosTab({ todos, onToggle }: TodosTabProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const handleKey = (data: Buffer) => {
      const key = data.toString();

      if (key === "\x1b[A" || key === "k") {
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      } else if (key === "\x1b[B" || key === "j") {
        setSelectedIndex((prev) => Math.min(todos.length - 1, prev + 1));
      } else if (key === "\r" || key === "\n" || key === " " || key === "l") {
        const todo = todos[selectedIndex];
        if (todo) {
          onToggle?.(todo.id);
        }
      }
    };

    process.stdin.on("data", handleKey);
    return () => {
      process.stdin.off("data", handleKey);
    };
  }, [todos, selectedIndex, onToggle]);

  if (todos.length === 0) {
    return (
      <Box paddingX={1}>
        <Text dimColor>No active todos</Text>
      </Box>
    );
  }

  const pending = todos.filter((t) => t.status === "pending").length;
  const completed = todos.filter((t) => t.status === "completed").length;

  return (
    <Box flexDirection="column">
      <Box paddingX={1} marginBottom={1}>
        <Text dimColor>
          {completed}/{todos.length} completed · {pending} pending
        </Text>
      </Box>
      {todos.slice(0, 15).map((todo, index) => {
        const isSelected = index === selectedIndex;
        const color = TODO_STATUS_COLORS[todo.status];
        const icon = TODO_STATUS_ICONS[todo.status];

        return (
          <Box key={todo.id} paddingX={1}>
            {isSelected && <Text color="cyan">→ </Text>}
            {!isSelected && <Text>  </Text>}
            <Text color={color}>{icon} </Text>
            <Text
              color={isSelected ? "cyan" : "white"}
              dimColor={todo.status === "completed"}
              strikethrough={todo.status === "completed"}
            >
              {truncateText(todo.text, 28)}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}

// ============================================
// TOOLS TAB
// ============================================

const TOOL_STATUS_COLORS: Record<string, string> = {
  available: "green",
  running: "yellow",
  error: "red",
};

const TOOL_STATUS_ICONS: Record<string, string> = {
  available: "●",
  running: "◐",
  error: "○",
};

interface ToolsTabProps {
  tools: SidebarTool[];
  onSelect?: (toolName: string) => void;
}

function ToolsTab({ tools, onSelect }: ToolsTabProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const handleKey = (data: Buffer) => {
      const key = data.toString();

      if (key === "\x1b[A" || key === "k") {
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      } else if (key === "\x1b[B" || key === "j") {
        setSelectedIndex((prev) => Math.min(tools.length - 1, prev + 1));
      } else if (key === "\r" || key === "\n" || key === "l") {
        const tool = tools[selectedIndex];
        if (tool) {
          onSelect?.(tool.name);
        }
      }
    };

    process.stdin.on("data", handleKey);
    return () => {
      process.stdin.off("data", handleKey);
    };
  }, [tools, selectedIndex, onSelect]);

  if (tools.length === 0) {
    return (
      <Box paddingX={1}>
        <Text dimColor>No tools available</Text>
      </Box>
    );
  }

  // Group by server
  const byServer = tools.reduce((acc, tool) => {
    const server = tool.server;
    if (!acc[server]) acc[server] = [];
    acc[server].push(tool);
    return acc;
  }, {} as Record<string, SidebarTool[]>);

  return (
    <Box flexDirection="column">
      {Object.entries(byServer).map(([server, serverTools]) => (
        <Box key={server} flexDirection="column" marginBottom={1}>
          <Box paddingX={1}>
            <Text dimColor bold>{server}</Text>
          </Box>
          {serverTools.slice(0, 10).map((tool) => {
            const index = tools.indexOf(tool);
            const isSelected = index === selectedIndex;
            const color = TOOL_STATUS_COLORS[tool.status];
            const icon = TOOL_STATUS_ICONS[tool.status];

            return (
              <Box key={tool.name} paddingX={1}>
                {isSelected && <Text color="cyan">→ </Text>}
                {!isSelected && <Text>  </Text>}
                <Text color={color}>{icon} </Text>
                <Text color={isSelected ? "cyan" : "white"}>
                  {tool.name}
                </Text>
              </Box>
            );
          })}
        </Box>
      ))}
    </Box>
  );
}

// ============================================
// MAIN SIDEBAR COMPONENT
// ============================================

export function Sidebar({
  isOpen,
  activeTab = "sessions",
  width = 30,
  sessions = [],
  files = [],
  todos = [],
  tools = [],
  currentSessionId,
  onTabChange,
  onSessionSelect,
  onFileSelect,
  onTodoToggle,
  onToolSelect,
  onClose,
}: SidebarProps) {
  const [internalTab, setInternalTab] = useState<SidebarTab>(activeTab);
  const { stdout } = useStdout();

  useEffect(() => {
    setInternalTab(activeTab);
  }, [activeTab]);

  // Tab change handler
  const handleTabChange = useCallback((tab: SidebarTab) => {
    setInternalTab(tab);
    onTabChange?.(tab);
  }, [onTabChange]);

  if (!isOpen) {
    return (
      <Box width={3} borderStyle="single" borderColor="gray">
        <Text dimColor>│</Text>
      </Box>
    );
  }

  const sidebarWidth = Math.min(width, (stdout.columns || 80) - 20);

  return (
    <Box
      flexDirection="column"
      width={sidebarWidth}
      borderStyle="single"
      borderColor="gray"
    >
      {/* Header */}
      <Box borderBottom borderStyle="single" borderColor="gray" paddingX={1}>
        <Text bold color="cyan">Coder</Text>
        <Text dimColor> | </Text>
        <Text dimColor>Ctrl+B to close</Text>
      </Box>

      {/* Tab bar */}
      <TabBar activeTab={internalTab} onTabChange={handleTabChange} />

      {/* Tab content */}
      <Box flexDirection="column" flexGrow={1} paddingY={1}>
        {internalTab === "sessions" && (
          <SessionsTab
            sessions={sessions}
            currentSessionId={currentSessionId}
            onSelect={onSessionSelect}
          />
        )}
        {internalTab === "files" && (
          <FilesTab files={files} onSelect={onFileSelect} />
        )}
        {internalTab === "todos" && (
          <TodosTab todos={todos} onToggle={onTodoToggle} />
        )}
        {internalTab === "tools" && (
          <ToolsTab tools={tools} onSelect={onToolSelect} />
        )}
      </Box>

      {/* Footer */}
      <Box borderTop borderStyle="single" borderColor="gray" paddingX={1}>
        <Text dimColor>
          Tab: switch | ↑↓: nav | Enter: select
        </Text>
      </Box>
    </Box>
  );
}

// ============================================
// HELPERS
// ============================================

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function truncatePath(path: string, maxLength: number): string {
  if (path.length <= maxLength) return path;

  const filename = path.split("/").pop() || path;
  if (filename.length >= maxLength - 3) {
    return `...${filename.slice(-(maxLength - 3))}`;
  }

  const parts = path.split("/");
  const firstPart = parts[0];
  const remaining = parts.slice(1).join("/");

  if (firstPart && remaining) {
    return `${firstPart}/.../${parts.pop()}`;
  }

  return `...${path.slice(-(maxLength - 3))}`;
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

export default Sidebar;
