# Claude Code Hooks - Exhaustive Research Document

## Research Started
- Date: 2026-01-13
- Purpose: Comprehensive investigation of Claude Code hooks system

---

## Table of Contents
1. [Initial Context](#initial-context)
2. [Codebase Findings](#codebase-findings)
3. [Internet Research](#internet-research)
4. [Official Documentation](#official-documentation)
5. [Hook Types & Events](#hook-types--events)
6. [Implementation Examples](#implementation-examples)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)
9. [Advanced Usage](#advanced-usage)
10. [Summary & Conclusions](#summary--conclusions)

---

## Initial Context

Claude Code hooks are a powerful feature that allows users to execute custom scripts at specific points during the Claude Code lifecycle. This research explores the complete hooks ecosystem.

---

## Codebase Findings

### Local Type Definitions

From `app/shared/types.ts`, the codebase defines these hook types:

```typescript
/**
 * Claude Code hook event types
 */
export type HookEventType =
  | "SessionStart"
  | "UserPromptSubmit"
  | "PreToolUse"
  | "PostToolUse"
  | "PreCommand"
  | "PostCommand"
  | "Stop"
  | "Error"
  | "FileChange";

/**
 * Claude Code hook configuration
 */
export interface ClaudeCodeHook {
  event: HookEventType;
  description?: string;
  command?: string;
  output?: {
    allow?: boolean;
    context?: string;
    modifyInput?: string;
  };
}
```

**Key observations:**
- 9 different hook event types are defined
- Hooks support output modification via `allow`, `context`, and `modifyInput`
- Hooks are part of the plugin configuration system
- Environment metadata includes plugin hooks configuration

---

## Internet Research

### What Are Claude Code Hooks?

Hooks provide **deterministic control** over Claude Code's behavior, ensuring certain actions always happen rather than relying on the LLM to choose to run them. They are essentially event-driven scripts that execute at specific points during the Claude Code lifecycle.

### Two Types of Hooks

#### 1. Prompt-Based Hooks
- **Leverage LLM reasoning** for context-aware decisions
- **Recommended for most use cases**
- **Benefits:**
  - Flexible evaluation logic without bash scripting
  - Better edge case handling
  - Can understand context and nuance

#### 2. Command Hooks
- **Execute bash commands** for deterministic checks
- **Best suited for:**
  - Fast validations
  - File system operations
  - External tool integrations
  - Performance-critical scenarios

### Key Resources

**Official Documentation:**
- [Hooks reference - Claude Code Docs](https://code.claude.com/docs/en/hooks)
- [Get started with Claude Code hooks](https://code.claude.com/docs/en/hooks-guide)
- [Chinese version: Hooks 参考](https://code.claude.com/docs/zh-CN/hooks)

**Tutorials & Guides:**
- [Hooks in Cursor and Claude Code: A Step-by-Step Guide](https://mlearning.substack.com/p/hooks-in-cursor-and-claude-code-a-step-by-step-guide)
- [A developer's hooks reference for Claude Code](https://www.eesel.ai/en/blog/hooks-reference-claude-code)
- [A complete guide to hooks in Claude Code: Automating](https://www.eesel.ai/en/blog/hooks-in-claude-code)
- [Configure Claude Code Hooks to Automate Your Workflow](https://www.gend.co/blog/configure-claude-code-hooks-automation)

**Examples & Implementations:**
- [GitHub: johnlindquist/claude-hooks](https://github.com/johnlindquist/claude-hooks) - TypeScript-based hooks
- [GitHub: disler/claude-code-hooks-mastery](https://github.com/disler/claude-code-hooks-mastery)
- [bash_command_validator_example.py](https://github.com/anthropics/claude-code/blob/main/examples/hooks/bash_command_validator_example.py) - Official example
- [A UserPromptSubmit hook example gist](https://gist.github.com/ljw1004/34b58090c16ee6d5e6f13fce07463a31)

**Video Tutorials:**
- [How Claude Code Hooks Save Me HOURS Daily](https://www.youtube.com/watch?v=Q4gsvJvRjCU)
- [Claude Code Hooks Tutorial: Build a Bash Command Logger](https://www.youtube.com/watch?v=PA8O6d-bKx4)

**Articles:**
- [Claude Code Hooks: The Feature You're Ignoring](https://medium.com/@lakshminp/claude-code-hooks-the-feature-youre-ignoring-while-babysitting-your-ai-789d39b46f6c)
- [How I'm Using Claude Code Hooks To Fully Automate My Workflow](https://medium.com/@joe.njenga/use-claude-code-hooks-newest-feature-to-fully-automate-your-workflow-341b9400cfbe)
- [Automate Your AI Workflows with Claude Code Hooks](https://blog.gitbutler.com/automate-your-ai-workflows-with-claude-code-hooks)
- [Pre-Prompt Middleware with Claude Code Hooks](https://debugg.ai/resources/pre-prompt-middleware-claude-code-hooks-enforce-pm-and-coding-standards)
- [Claude Code — Use Hooks to Enforce End-of-Turn Quality Gates](https://jpcaparas.medium.com/claude-code-use-hooks-to-enforce-end-of-turn-quality-gates-5bed84e89a0d)

**Chinese Resources:**
- [万字深度解析Claude Code的hook系统](https://zhuanlan.zhihu.com/p/1950634615065809103)
- [Claude Code Hooks 从入门到实战](https://www.51cto.com/article/829071.html)
- [怕AI 乱改代码？教你用Hooks 给Claude Code 戴上"紧箍咒"](https://juejin.cn/post/7592062873829867570)
- [Hooks才是Claude Code CLI 的革命性更新](https://zhuanlan.zhihu.com/p/1961858543805248206)

**Community:**
- [Reddit: Python > Bash for writing Claude Code Hooks](https://www.reddit.com/r/ClaudeAI/comments/1n1o29s/python_bash_for_writing_claude-code_hooks_with_4/)
- [Reddit: New hook: UserPromptSubmit](https://www.reddit.com/r/ClaudeAI/comments/1m31k7b/new_hook_userpromptsubmit/)
- [Reddit: Auto append/prepend to requests](https://www.reddit.com/r/ClaudeCode/comments/1mz2cd1/is_there_a_way_to_automatically_appendprepend/)

---

## Official Documentation

### Hook Configuration Formats

#### Plugin Format (`hooks/hooks.json`)

Plugin configurations require a wrapper structure:

```json
{
  "description": "Brief explanation (optional)",
  "hooks": {
    "PreToolUse": [...],
    "Stop": [...],
    "SessionStart": [...]
  }
}
```

**Key points:**
- The `hooks` field is **mandatory** as a container for actual hook events
- `description` is optional but recommended for clarity
- Each hook event contains an array of hook definitions

#### Settings Format (`.claude/settings.json`)

User settings employ a direct format without wrapper structures:

```json
{
  "hooks": {
    "PreToolUse": [...],
    "Stop": [...]
  }
}
```

### Environment Variables

Hooks have access to these special environment variables:

| Variable | Purpose |
|----------|---------|
| `$CLAUDE_PROJECT_DIR` | Project root directory |
| `$CLAUDE_PLUGIN_ROOT` | Plugin directory path (essential for portability) |
| `$CLAUDE_ENV_FILE` | SessionStart environment persistence |
| `$CLAUDE_CODE_REMOTE` | Remote context detection |

**Important:** Always use `${CLAUDE_PLUGIN_ROOT}` for portable paths in hook commands.

### Output Format

Hooks can return structured JSON with these fields:

| Field | Type | Purpose |
|-------|------|---------|
| `continue` | boolean | Halt processing when `false` |
| `suppressOutput` | boolean | Hide transcript entries |
| `systemMessage` | string | Provide context to Claude |
| `decision` | string | For Stop hooks: `"block"` or `"allow"` |
| `reason` | string | Explanation for the decision |
| `prompt` | string | For Stop hooks: prompt to feed back |

**Exit codes matter:**
- `0` - Success
- `2` - Blocking errors

---

## Hook Types & Events

### Complete Event List

| Event | Timing | Primary Purpose | Hook Type Support |
|-------|--------|-----------------|-------------------|
| **SessionStart** | When Claude Code session begins | Load context and set environment | Command |
| **UserPromptSubmit** | When user submits a prompt | Add context, validate, or block prompts | Prompt + Command |
| **PreToolUse** | Before tool execution | Approve, deny, or modify tool calls | Prompt + Command |
| **PostToolUse** | After tool completion | React to results, provide feedback, log | Command |
| **PreCommand** | Before bash command execution | Validate or modify commands | Command |
| **PostCommand** | After bash command completes | Log or react to command results | Command |
| **Stop** | When main agent considers stopping | Validate completeness | Prompt + Command |
| **Error** | When errors occur | Handle errors, provide recovery | Command |
| **FileChange** | When files are modified | Trigger actions on file changes | Command |
| **SubagentStop** | When subagent considers stopping | Ensure subagent task completion | Prompt + Command |
| **SessionEnd** | When session ends | Cleanup, logging, state preservation | Command |
| **PreCompact** | Before context compaction | Preserve critical information | Command |
| **Notification** | When Claude sends notifications | React to user notifications | Command |

### Detailed Event Explanations

#### SessionStart
- **Fires:** When a Claude Code session begins
- **Use cases:**
  - Load environment variables
  - Initialize project context
  - Validate development environment
  - Set up logging
- **Example:**
  ```bash
  #!/bin/bash
  # Load environment variables from .env
  if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
  fi
  ```

#### UserPromptSubmit
- **Fires:** When user submits a prompt, but **before** the AI processes it
- **Use cases:**
  - Automatically add extra context
  - Validate prompts before submission
  - Inject project-specific information
  - Enforce coding standards
  - Pre-pend instructions or guidelines
- **Example use cases:**
  - Inject Definition of Done
  - Add acceptance criteria
  - Enforce coding standards
  - Append project-specific context

#### PreToolUse
- **Fires:** Before any tool execution (Read, Write, Edit, Bash, etc.)
- **Use cases:**
  - Approve or deny tool calls
  - Modify tool parameters
  - Log tool usage
  - Validate file access
  - Protect sensitive files
- **Common implementation:** Bash command validator

#### PostToolUse
- **Fires:** After tool execution completes
- **Use cases:**
  - React to tool results
  - Provide feedback
  - Log actions
  - Trigger follow-up tasks
  - Auto-format code after edits

#### Stop (Advanced API)
- **Fires:** When main agent considers stopping
- **Special:** Has advanced API with stdin JSON input
- **Use cases:**
  - Validate completeness
  - Block exit with feedback
  - Feed same prompt back (Ralph Loop)
  - Ensure quality gates
- **Input format (via stdin):**
  ```json
  {
    "transcript_path": "/path/to/transcript.jsonl",
    ...
  }
  ```
- **Output format:**
  ```json
  {
    "decision": "block",
    "reason": "Task not complete - continue",
    "systemMessage": "Iteration 5"
  }
  ```

#### SubagentStop
- **Fires:** When a subagent considers stopping
- **Use cases:**
  - Ensure subagent task completion
  - Validate subagent output
  - Block incomplete subagent exits

#### SessionEnd
- **Fires:** When session ends
- **Use cases:**
  - Cleanup operations
  - Save state
  - Generate reports
  - Close connections

#### Error
- **Fires:** When errors occur
- **Use cases:**
  - Handle errors gracefully
  - Provide recovery suggestions
  - Log errors for debugging
  - Notify external systems

#### FileChange
- **Fires:** When files are modified
- **Use cases:**
  - Trigger linting
  - Run tests
  - Update documentation
  - Notify team members

---

## Implementation Examples

### Example 1: Bash Command Logger (PostToolUse)

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash",
        "type": "command",
        "command": "echo \"[$(date -Iseconds)] Bash: ${CLAUDE_TOOL_INPUT}\" >> ~/.claude-bash-log.txt"
      }
    ]
  }
}
```

### Example 2: Protect .env Files (PreToolUse)

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Read|Edit|Write",
        "type": "prompt",
        "prompt": "If the tool is trying to access .env, .env.local, .env.production, or any file containing secrets, DENY the request. These files should never be modified by Claude."
      }
    ]
  }
}
```

### Example 3: Auto-format TypeScript (PostToolUse)

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "type": "command",
        "command": "if [[ \"${CLAUDE_TOOL_FILE}\" == *.ts || \"${CLAUDE_TOOL_FILE}\" == *.tsx ]]; then bunx prettier --write \"${CLAUDE_TOOL_FILE}\"; fi"
      }
    ]
  }
}
```

### Example 4: UserPromptSubmit - Add Context

```bash
#!/bin/bash
# hooks/user-prompt-submit.sh

# Read the user's prompt from stdin
USER_PROMPT=$(cat)

# Append project context
cat <<EOF
${USER_PROMPT}

---
Project Context:
- This is a Bun-based TypeScript project
- Use Bun for all package management
- Run tests with 'bun test'
- Build with 'bun run build'
EOF
```

### Example 5: Bash Command Validator (PreToolUse)

```python
#!/usr/bin/env python3
# hooks/bash_validator.py
import sys
import json
import subprocess

def validate_command(command):
    # Prevent dangerous commands
    dangerous = ['rm -rf /', 'rm -rf .*', '> /dev/', ':(){:|:&};:']

    for pattern in dangerous:
        if pattern in command:
            return {
                "continue": False,
                "reason": f"Dangerous command detected: {pattern}"
            }

    # Modify grep calls to be more efficient
    if 'grep' in command and '--color=auto' not in command:
        modified = command.replace('grep', 'grep --color=auto')
        return {
            "modifyInput": modified
        }

    return {"continue": True}

if __name__ == "__main__":
    command = sys.stdin.read()
    result = validate_command(command)
    print(json.dumps(result))
```

### Example 6: Stop Hook - Quality Gate

```bash
#!/bin/bash
# hooks/stop-hook.sh

HOOK_INPUT=$(cat)

# Check if tests pass
if bun test 2>&1 | grep -q "failing"; then
  jq -n \
    --arg msg "Tests are failing - cannot stop" \
    '{
      "decision": "block",
      "reason": $msg,
      "systemMessage": "Run tests to see what needs fixing"
    }'
  exit 0
fi

# Allow exit if tests pass
exit 0
```

### Example 7: Complete Plugin Configuration

```json
{
  "description": "My Claude Code Hooks",
  "hooks": {
    "SessionStart": [
      {
        "type": "command",
        "command": "${CLAUDE_PLUGIN_ROOT}/scripts/load-env.sh"
      }
    ],
    "UserPromptSubmit": [
      {
        "type": "prompt",
        "prompt": "Always consider the project's coding standards defined in docs/CODING_STANDARDS.md before responding."
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "type": "command",
        "command": "${CLAUDE_PLUGIN_ROOT}/hooks/validate-bash.sh"
      },
      {
        "matcher": "Read|Write|Edit",
        "type": "prompt",
        "prompt": "If accessing node_modules/, .git/, or dist/ directories, DENY the request as these should not be modified directly."
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "type": "command",
        "command": "if [[ \"${CLAUDE_TOOL_FILE}\" == *.ts || \"${CLAUDE_TOOL_FILE}\" == *.tsx ]]; then bunx prettier --write \"${CLAUDE_TOOL_FILE}\" 2>&1; fi"
      }
    ],
    "Stop": [
      {
        "type": "command",
        "command": "${CLAUDE_PLUGIN_ROOT}/hooks/quality-gate.sh"
      }
    ]
  }
}
```

---

## Best Practices

### DO ✅

1. **Use ${CLAUDE_PLUGIN_ROOT} for portable paths**
   ```bash
   command": "${CLAUDE_PLUGIN_ROOT}/scripts/my-script.sh"
   ```

2. **Make hook scripts executable**
   ```bash
   chmod +x hooks/*.sh
   ```

3. **Use prompt-based hooks for complex logic**
   - Better at handling edge cases
   - Can understand context
   - No bash scripting required

4. **Use command-based hooks for performance**
   - Faster execution
   - Deterministic behavior
   - External tool integration

5. **Test hooks thoroughly**
   - Test in isolation first
   - Consider edge cases
   - Have rollback plans

6. **Use matchers to target specific tools**
   ```json
   "matcher": "Bash"           // Only Bash tool
   "matcher": "Read|Write"     // Multiple tools
   "matcher": "*"              // All tools
   "matcher": "/regex.*/"      // Regex pattern
   ```

7. **Return valid JSON only**
   - No explanatory text before/after JSON
   - Proper JSON formatting
   - All required fields present

### DON'T ❌

1. **Don't modify hook configs during active session**
   - Changes require restart
   - No hot-swapping support

2. **Don't assume hook execution order**
   - Matching hooks run in parallel
   - Non-deterministic order
   - Design for independence

3. **Don't use blocking operations unnecessarily**
   - Hooks should be fast
   - Consider async for long tasks
   - Don't block Claude unnecessarily

4. **Don't forget error handling**
   - Always handle errors gracefully
   - Provide useful error messages
   - Use appropriate exit codes

5. **Don't ignore environment variables**
   - Use provided variables for portability
   - Check for required dependencies
   - Handle missing variables

6. **Don't create infinite loops**
   - Especially with Stop hooks
   - Always have exit conditions
   - Test thoroughly before trusting

---

## Troubleshooting

### Common Issues

#### 1. Hook Not Executing
**Symptoms:** Hook script never runs
**Solutions:**
- Verify file permissions: `chmod +x hooks/script.sh`
- Check shebang: `#!/bin/bash` or `#!/usr/bin/env python3`
- Restart Claude Code (configs load at session start)
- Verify JSON syntax
- Check matcher pattern matches tool being used

#### 2. JSON Output Not Captured
**Symptoms:** Hook returns JSON but Claude ignores it
**GitHub Issue:** #10875
**Solutions:**
- Ensure ONLY JSON is output (no text before/after)
- Validate JSON with `jq .`
- Check stderr isn't mixed with stdout
- Use `echo '{"key":"value"}'` not `echo "The result is: {...}"`

#### 3. Stop Hook Not Blocking
**Symptoms:** Stop hook allows exit when it shouldn't
**GitHub Issue:** #11947
**Solutions:**
- Verify `decision: "block"` is set
- Check JSON is valid
- Ensure exit code is 0
- Test with simple blocking script first

#### 4. Hook Executes Multiple Times
**Symptoms:** Hook runs more than expected
**Solutions:**
- Remember matching hooks run in parallel
- Use specific matchers instead of `*`
- Check if multiple hook definitions match

#### 5. Environment Variables Not Set
**Symptoms:** `$CLAUDE_PLUGIN_ROOT` or similar not available
**Solutions:**
- Use full paths as fallback
- Check session type (some vars only in specific contexts)
- Debug with: `echo "Vars: $(env | grep CLAUDE)" >&2`

### Debug Mode

Enable verbose output:
```bash
claude --verbose
```

Add debug logging to hooks:
```bash
echo "DEBUG: Hook triggered with input: $(cat)" >&2
```

### Test Hooks in Isolation

```bash
# Test script directly
./hooks/my-hook.sh < test-input.json

# Validate JSON output
echo '{"test":"value"}' | jq .

# Check syntax
python3 -m json.tool hooks.json
```

---

## Advanced Usage

### Matcher Patterns

**Exact match:**
```json
{"matcher": "Bash"}
```

**Multiple tools:**
```json
{"matcher": "Read|Write|Edit"}
```

**All tools:**
```json
{"matcher": "*"}
```

**Regex pattern:**
```json
{"matcher": "/.*File.*/"}
```

### Chaining Hooks

Hooks can't directly see each other's output, but you can chain them via files:

```bash
# Hook 1: Write state
echo "status=in_progress" > /tmp/claude-hook-state

# Hook 2: Read state
if grep -q "status=in_progress" /tmp/claude-hook-state; then
  # Do something
fi
```

### Long-Running Background Tasks

```bash
#!/bin/bash
# Start background task
nohup ${CLAUDE_PLUGIN_ROOT}/scripts/long-task.sh > /tmp/task.log 2>&1 &

# Return immediately
echo '{"continue": true}'
```

### Integration with External Tools

```bash
#!/bin/bash
# Call external API
RESULT=$(curl -s -X POST https://api.example.com/validate \
  -H "Content-Type: application/json" \
  -d "{\"command\": \"$(cat | jq -Rs .)\"}")

# Return result
echo "${RESULT}"
```

### Conditional Hook Logic

```bash
#!/bin/bash
INPUT=$(cat)

# Only process for specific files
if echo "$INPUT" | jq -r '.file' | grep -q "^src/"; then
  # Process src files
  echo '{"continue": true, "context": "Source file processed"}'
else
  # Skip other files
  echo '{"continue": true}'
fi
```

---

## Summary & Conclusions

### What Are Claude Code Hooks?

Claude Code hooks are event-driven scripts that execute at specific points during the Claude Code lifecycle, providing deterministic control over behavior without relying on LLM decision-making.

### Key Takeaways

1. **Two Types of Hooks**
   - **Prompt-based:** Use LLM reasoning, best for complex logic
   - **Command-based:** Execute bash scripts, best for performance

2. **13 Hook Events**
   - SessionStart, UserPromptSubmit, PreToolUse, PostToolUse
   - PreCommand, PostCommand, Stop, Error, FileChange
   - SubagentStop, SessionEnd, PreCompact, Notification

3. **Configuration**
   - Plugin format: Wrapper with `hooks` object
   - Settings format: Direct hooks object
   - Changes require session restart

4. **Best Uses For Hooks**
   - Enforce coding standards
   - Auto-format code
   - Log commands
   - Protect sensitive files
   - Validate inputs
   - Quality gates
   - Context injection

5. **Common Patterns**
   - Bash command logging (PostToolUse)
   - .env file protection (PreToolUse)
   - TypeScript auto-format (PostToolUse)
   - Quality gates (Stop)
   - Context injection (UserPromptSubmit)

### When to Use Hooks

**Ideal Use Cases:**
- Enforce consistent coding standards
- Automate repetitive tasks
- Add safety checks
- Integrate external tools
- Log and audit actions
- Quality gates and validation

**Not Suitable For:**
- Tasks requiring LLM judgment (use prompt-based instead)
- Complex multi-step workflows (use subagents)
- User interaction (hooks are non-interactive)

### Resources Recap

**Official:**
- [Hooks reference - Claude Code Docs](https://code.claude.com/docs/en/hooks)
- [Get started with Claude Code hooks](https://code.claude.com/docs/en/hooks-guide)

**Examples:**
- [bash_command_validator_example.py](https://github.com/anthropics/claude-code/blob/main/examples/hooks/bash_command_validator_example.py)
- [johnlindquist/claude-hooks](https://github.com/johnlindquist/claude-hooks)
- [disler/claude-code-hooks-mastery](https://github.com/disler/claude-code-hooks-mastery)

**Tutorials:**
- [Claude Code Hooks Tutorial: Build a Bash Command Logger](https://www.youtube.com/watch?v=PA8O6d-bKx4)
- [Configure Claude Code Hooks to Automate Your Workflow](https://www.gend.co/blog/configure-claude-code-hooks-automation)

---

**Research Document Last Updated:** 2026-01-13
**Total Sources Cited:** 30+ resources across official docs, community examples, tutorials, and articles

---

