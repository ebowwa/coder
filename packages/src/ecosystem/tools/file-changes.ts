/**
 * File Change Inference - Derive file system changes from tool invocations
 *
 * Single source of truth for mapping tool calls to file modifications.
 * Used by eval runners (offline + online) and telemetry.
 */

export interface FileChange {
  path: string;
  action: "create" | "modify" | "delete";
}

/**
 * Infer file changes from a tool call's name and input.
 * Handles Write (create), Edit (modify), MultiEdit (modify per file).
 */
export function inferFileChangesFromToolCall(
  toolName: string,
  input: Record<string, unknown>
): FileChange[] {
  const changes: FileChange[] = [];

  switch (toolName) {
    case "Write": {
      if (input.file_path) {
        changes.push({ path: input.file_path as string, action: "create" });
      }
      break;
    }

    case "Edit": {
      if (input.file_path) {
        changes.push({ path: input.file_path as string, action: "modify" });
      }
      break;
    }

    case "MultiEdit": {
      if (Array.isArray(input.edits)) {
        const seen = new Set<string>();
        for (const edit of input.edits as Array<{ file_path?: string }>) {
          if (edit.file_path && !seen.has(edit.file_path)) {
            seen.add(edit.file_path);
            changes.push({ path: edit.file_path, action: "modify" });
          }
        }
      }
      break;
    }
  }

  return changes;
}
