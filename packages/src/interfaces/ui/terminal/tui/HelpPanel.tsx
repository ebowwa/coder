/** @jsx React.createElement */
/**
 * Help Panel Component
 * Displays contextual help with tabbed sections
 */

import React, { useState, useEffect } from "react";
import { Box, Text, useStdout } from "ink";
import chalk from "chalk";

/**
 * Help section definition
 */
export interface HelpSection {
  id: string;
  title: string;
  content: string;
}

/**
 * Help panel props
 */
export interface HelpPanelProps {
  activeSection?: string;
  onClose?: () => void;
}

/**
 * General help section - basic usage
 */
const GENERAL_HELP: string = `
${chalk.bold.cyan("Claude understands your codebase, makes edits with your permission,")}
${chalk.bold.cyan("and executes commands — right from your terminal.")}

${chalk.gray("─").repeat(60)}

${chalk.yellow("Input Features:")}
  ${chalk.green("@")} <path>       ${chalk.gray("Reference files or directories")}
  ${chalk.green("&")}              ${chalk.gray("Run command in background")}
  ${chalk.green("#")} <memory>     ${chalk.gray("Add to persistent memory")}

${chalk.yellow("Keyboard Shortcuts:")}
  ${chalk.cyan("ctrl + o")}        ${chalk.gray("Toggle verbose output")}
  ${chalk.cyan("meta + o")}        ${chalk.gray("Toggle fast mode")}
  ${chalk.cyan("shift + ⏎")}       ${chalk.gray("Insert newline")}
  ${chalk.cyan("ctrl + c")}        ${chalk.gray("Exit session")}
  ${chalk.cyan("ctrl + b")}        ${chalk.gray("Background task menu")}

${chalk.gray("─").repeat(60)}

${chalk.dim("For more help:")} ${chalk.blue.underline("https://code.claude.com/docs/en/overview")}
`;

/**
 * Commands help section
 */
const COMMANDS_HELP: string = `
${chalk.bold.yellow("Session Commands:")}
  ${chalk.green("/help")}, ${chalk.green("/?")}     Show this help
  ${chalk.green("/exit")}, ${chalk.green("/q")}     Exit the session
  ${chalk.green("/new")}              Start a fresh session
  ${chalk.green("/clear")}            Clear conversation history
  ${chalk.green("/status")}           Show session status
  ${chalk.green("/cost")}             Show total cost

${chalk.bold.yellow("Model Commands:")}
  ${chalk.green("/model")} <name>     Switch model
  ${chalk.green("/models")}           List available models
  ${chalk.green("/tools")}            List available tools

${chalk.bold.yellow("Context Commands:")}
  ${chalk.green("/compact")}          Force context compaction
  ${chalk.green("/export")} [fmt]     Export session (json/md/jsonl)

${chalk.bold.yellow("Session Management:")}
  ${chalk.green("/resume")} [id]      Resume session
  ${chalk.green("/sessions")}         List recent sessions
`;

/**
 * Checkpoint commands help section
 */
const CHECKPOINTS_HELP: string = `
${chalk.bold.magenta("Checkpoint Commands:")}
${chalk.gray("Save and restore conversation + code state")}

  ${chalk.green("/checkpoint")} <label>   Save checkpoint
  ${chalk.green("/checkpoints")}          List saved checkpoints
  ${chalk.green("/restore")} <id>         Restore checkpoint
  ${chalk.green("/restore-chat")} <id>    Restore chat only
  ${chalk.green("/undo")}                 Go back to previous state
  ${chalk.green("/redo")}                 Go forward
  ${chalk.green("/cps-status")}           Navigation status

${chalk.gray("─").repeat(60)}

${chalk.dim("Checkpoints capture:")}
  ${chalk.gray("• Conversation history")}
  ${chalk.gray("• File snapshots")}
  ${chalk.gray("• Git state")}
  ${chalk.gray("• Cost/tokens used")}
`;

/**
 * Custom commands help section
 */
const CUSTOM_HELP: string = `
${chalk.bold.blue("Custom Commands & Skills:")}
${chalk.gray("Extend Coder with your own commands")}

${chalk.yellow("Skills:")}
  ${chalk.green("/commit")}            Create a git commit
  ${chalk.green("/review-pr")}         Review a pull request
  ${chalk.green("/git")}               Git workflow helper
  ${chalk.green("/mcp-builder")}       Build MCP servers

${chalk.yellow("Configuration:")}
  ${chalk.cyan("~/.claude/CLAUDE.md")}     ${chalk.gray("Global instructions")}
  ${chalk.cyan(".claude/CLAUDE.md")}       ${chalk.gray("Project instructions")}
  ${chalk.cyan("~/.claude.json")}          ${chalk.gray("MCP servers config")}
  ${chalk.cyan("~/.claude/settings.json")} ${chalk.gray("Hooks & permissions")}
  ${chalk.cyan("~/.claude/keybindings.json")} ${chalk.gray("Custom keybindings")}

${chalk.gray("─").repeat(60)}

${chalk.dim("Create custom skills in:")} ${chalk.cyan("~/.claude/skills/")}
`;

/**
 * Keybindings help section
 */
const KEYBINDINGS_HELP: string = `
${chalk.bold.green("Keyboard Shortcuts")}

${chalk.yellow("Input Editing:")}
  ${chalk.cyan("← →")}                 Move cursor
  ${chalk.cyan("Home / End")}          Jump to start/end
  ${chalk.cyan("ctrl + a")}            Jump to start
  ${chalk.cyan("ctrl + e")}            Jump to end
  ${chalk.cyan("ctrl + u")}            Clear line
  ${chalk.cyan("ctrl + w")}            Delete word

${chalk.yellow("Navigation:")}
  ${chalk.cyan("Page Up / Down")}      Scroll messages
  ${chalk.cyan("shift + ↑ ↓")}         Scroll one line
  ${chalk.cyan("tab")}                 Cycle help sections
  ${chalk.cyan("← →")}                 Cycle sections (in help)

${chalk.yellow("Session:")}
  ${chalk.cyan("ctrl + c")}            Exit session
  ${chalk.cyan("ctrl + d")}            Exit (alternative)
  ${chalk.cyan("ctrl + b")}            Background tasks

${chalk.gray("─").repeat(60)}

${chalk.dim("Customize:")} ${chalk.green("/keybindings")}
`;

/**
 * All help sections
 */
const HELP_SECTIONS: HelpSection[] = [
  { id: "general", title: "general", content: GENERAL_HELP },
  { id: "commands", title: "commands", content: COMMANDS_HELP },
  { id: "checkpoints", title: "checkpoints", content: CHECKPOINTS_HELP },
  { id: "custom", title: "custom-commands", content: CUSTOM_HELP },
  { id: "keybindings", title: "keybindings", content: KEYBINDINGS_HELP },
];

/**
 * Help Panel Component
 */
export function HelpPanel({ activeSection = "general", onClose }: HelpPanelProps) {
  const [currentSection, setCurrentSection] = useState(0);
  const { stdout } = useStdout();

  // Find initial section index
  useEffect(() => {
    const index = HELP_SECTIONS.findIndex(s => s.id === activeSection);
    if (index >= 0) {
      setCurrentSection(index);
    }
  }, [activeSection]);

  const section = HELP_SECTIONS[currentSection];
  if (!section) return null;

  // Build tab bar
  const tabBar = HELP_SECTIONS.map((s, i) => {
    const isActive = i === currentSection;
    const label = s.title;
    if (isActive) {
      return chalk.bgCyan.black(` ${label} `);
    }
    return chalk.dim(` ${label} `);
  }).join(chalk.gray("│"));

  // Navigation hint
  const navHint = chalk.dim("←/→ or tab to cycle");

  return (
    <Box flexDirection="column" width={stdout.columns || 80}>
      {/* Header */}
      <Box>
        <Text>
          {chalk.gray("─").repeat(3)}
          {chalk.bold.cyan(" Coder ")}
          {chalk.gray("v0.2.0 ─ ")}
          {tabBar}
          {chalk.gray(" ─ ")}
          {navHint}
          {chalk.gray("─".repeat(Math.max(0, (stdout.columns || 80) - 60)))}
        </Text>
      </Box>

      {/* Content */}
      <Box flexDirection="column" paddingX={1}>
        <Text>{section.content}</Text>
      </Box>

      {/* Footer */}
      <Box>
        <Text dimColor>
          {chalk.gray("─").repeat(Math.min((stdout.columns || 80), 80))}
        </Text>
      </Box>
    </Box>
  );
}

/**
 * Get all help sections
 */
export function getHelpSections(): HelpSection[] {
  return HELP_SECTIONS;
}

/**
 * Get help text for a specific section (for non-interactive display)
 */
export function getHelpText(section?: string): string {
  if (section) {
    const s = HELP_SECTIONS.find(s => s.id === section || s.title === section);
    if (s) return s.content;
  }

  // Return all sections combined
  return HELP_SECTIONS.map(s => s.content).join("\n");
}

/**
 * Get compact help text (single line per command)
 */
export function getCompactHelpText(): string {
  return `
Commands: /help /exit /new /clear /compact /model /models /tools /cost /status /resume
Checkpoints: /checkpoint /checkpoints /restore /undo /redo /cps-status
Export: /export [json|md|jsonl]
`;
}

export default HelpPanel;
