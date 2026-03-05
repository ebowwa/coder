# Claude Code Skills - Exhaustive Research Document

## Research Started
- Date: 2026-01-13
- Purpose: Comprehensive investigation of Claude Code skills system

---

## Table of Contents
1. [Initial Context](#initial-context)
2. [Codebase Findings](#codebase-findings)
3. [Internet Research](#internet-research)
4. [Official Documentation](#official-documentation)
5. [Skill Types & Patterns](#skill-types--patterns)
6. [Implementation Examples](#implementation-examples)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)
9. [Advanced Usage](#advanced-usage)
10. [Summary & Conclusions](#summary--conclusions)

---

## Initial Context

Claude Code skills are reusable, triggerable capabilities that extend Claude's functionality. They can be triggered automatically based on file patterns, file types, or always-on behavior, or invoked manually via slash commands.

---

## Codebase Findings

### Local Type Definitions

From `app/shared/types.ts:80-89`, the codebase defines skills as:

```typescript
/**
 * Claude Code skill configuration
 */
export interface ClaudeCodeSkill {
  name: string;
  description?: string;
  instructions?: string;
  trigger?: {
    patterns?: string[];
    fileTypes?: string[];
    always?: boolean;
  };
}
```

**Key observations:**
- Skills have a name, description, and optional instructions
- Trigger configuration supports three modes:
  - `patterns`: Array of regex/string patterns to match
  - `fileTypes`: Array of file extensions to trigger on
  - `always`: Boolean for always-active skills
- Skills are part of the plugin configuration system
- Environment metadata includes skills with enabled/disabled state

### UI Components

The frontend includes a skills management interface:
- `app/frontend/components/EnvironmentDetails.tsx:39-667`
- Skills can be added, toggled on/off, and configured per environment
- Visual display shows skill badges with enabled/disabled states

---

## Internet Research

### What Are Claude Code Skills?

**Skills are modular, self-contained packages** that extend Claude's capabilities with:
- Specialized knowledge
- Custom workflows
- Reusable tools

They transform **"Claude from a general-purpose agent into a specialized agent equipped with procedural knowledge."**

Think of skills as **"onboarding guides for specific domains or tasks"** - they teach Claude how to handle particular situations automatically.

### Skills vs Commands vs Subagents

| Feature | Skills | Slash Commands | Subagents |
|---------|--------|----------------|-----------|
| **Trigger** | Automatic (Claude recognizes when to use) | Manual (you type `/command`) | Automatic or manual delegation |
| **Purpose** | Teach specific knowledge/patterns | Perform specific actions | Specialized workers with context |
| **Control** | Claude decides | You decide | Claude delegates |
| **Best For** | Team standards, API patterns, conventions | Specific workflows, repeatable actions | Parallel processing, context isolation |
| **Analogy** | Like recipes | Like macros | Like specialized coworkers |

### Key Resources

**Official Documentation:**
- [Agent Skills - Claude Code Docs](https://code.claude.com/docs/en/skills)
- [Create plugins - Claude Code Docs](https://code.claude.com/docs/en/plugins)
- [Skill authoring best practices - Claude Docs](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- [Claude Code: Best practices for agentic coding](https://www.anthropic.com/engineering/claude-code-best-practices)

**Tutorials & Guides:**
- [How to Build Claude Skills: Lesson Plan Generator Tutorial](https://www.codecademy.com/article/how-to-build-claude-skills)
- [How to Create Claude Code Skills: The Complete Guide](https://websearchapi.ai/blog/how-to-create-claude-code-skills)
- [CLAUDE.md, skills, subagents explained](https://alexop.dev/posts/claude-code-customization-guide-claudemd-skills-subagents/)
- [Understanding Claude Code: Skills vs Commands vs Subagents](https://www.youngleaders.tech/p/claude-skills-commands-subagents-plugins)
- [Skills vs Slash Commands: A Developer's Guide](https://rewire.it/blog/claude-code-agents-skills-slash-commands/)

**Examples & Repositories:**
- [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) - Curated list of resources
- [wshobson/commands](https://github.com/wshobson/commands) - 57 production-ready slash commands
- [travisvn/awesome-claude-skills](https://github.com/travisvn/awesome-claude-skills) - Curated skills list
- [alirezarezvani/claude-code-skill-factory](https://github.com/alirezarezvani/claude-code-skill-factory)
- [Claude Code Skills Hub](https://claudecodeplugins.io/) - 549 skills in 282 plugins

**In-Depth Articles:**
- [Claude Code Skills Deep Dive Part 1](https://medium.com/spillwave-solutions/claude-code-skills-deep-dive-part-1-82b572ad9450)
- [Claude Code Skills Deep Dive Part 2](https://medium.com/spillwave-solutions/claude-code-skills-deep-dive-part-2-8cc7a34511a2)
- [Inside Claude Code Skills: Structure, prompts, invocation](https://mikhail.io/2025/10/claude-code-skills/)
- [Claude Agent Skills: A First Principles Deep Dive](https://leehanchung.github.io/blogs/2025/10/26/claude-skills-deep-dive/)
- [Ultimate guide to extending Claude Code with skills](https://gist.github.com/alirezarezvani/a0f6e0a984d4a4adc4842bbe124c5935)

**Community:**
- [Reddit: Understanding CLAUDE.md vs Skills vs Slash Commands](https://www.reddit.com/r/ClaudeAI/comments/1ped515/understanding_claudemd_vs_skills_vs_slash/)
- [Reddit: Difference between Skills and Subagents](https://www.reddit.com/r/ClaudeCode/comments/1o8t6xe/difference_between_skills_and_these_subagents/)
- [Reddit: When should I use a Skill, Command, or Subagent?](https://www.reddit.com/r/ClaudeAI/comments/1orozs4/when_should_i_use_a_skill_a_slash_command_or_a/)
- [Reddit: I built 3 Claude Code Skills while migrating](https://www.reddit.com/r/ClaudeAI/comments/1p9ho4l/i_built_3_claude_code_skills_while_migrating_my/)

**Video Tutorials:**
- [Mastering Claude Code Skills (This Changes EVERYTHING)](https://www.youtube.com/watch?v=EwAd-fqQfJ8)
- [There's a better way to build Claude skills](https://www.youtube.com/watch?v=sv-yJFi8A7U)
- [Claude Code Skills just Built me an AI Agent Team](https://www.youtube.com/watch?v=OdtGN27LchE)

**Chinese Resources:**
- [万字深度解析Claude Code Skills](https://zhuanlan.zhihu.com/p/1966486877088506681)
- [Claude Code五件套一篇全解](https://zhuanlan.zhihu.com/p/1966486877088506681)
- [一文搞懂Claude Skills和SubAgents](https://blog.csdn.net/significantfrank/article/details/156317224)

---

## Official Documentation

### Skill Structure

Every skill requires this directory structure:

```
skill-name/
├── SKILL.md (required)
└── bundled-resources/ (optional)
    ├── scripts/          # Executable code
    ├── references/       # Documentation
    └── assets/           # Output files
```

**Required:** `SKILL.md`
**Optional:** Scripts, references, assets (bundled resources)

### SKILL.md Format

#### Frontmatter (YAML)

```yaml
---
name: Skill Name
description: This skill should be used when the user asks to "specific phrase 1", "specific phrase 2"
version: 0.1.0
---
```

**Required fields:**
- `name`: The skill name
- `description`: The **primary triggering mechanism** - tells Claude when to use the skill

**Description requirements:**
- Must use **third-person format**
- Must include **specific trigger phrases** users would actually say
- Should explain both what the skill does AND when to use it
- All "when to use" information goes here (body loads only after triggering)

**Example description:**
```yaml
description: This skill provides expertise in React component development. Use it when the user asks to "create a React component", "build a UI", "design a component interface", or work on React/Next.js frontend architecture.
```

#### Body (Markdown)

Contains instructions and guidance. Best practices:
- Use **imperative/infinitive form** (verb-first)
- ✓ "Create a hook by defining the event type"
- ✗ "You should create a hook..."
- Keep lean (<5k words, ideally 1,500-2,000)
- Reference supporting files clearly

### Progressive Disclosure System

Skills use a three-level loading system to manage context:

1. **Metadata** (~100 words)
   - Always loaded
   - Name + description only
   - Claude uses this to decide if skill is relevant

2. **SKILL.md body** (<5k words)
   - Loads when skill triggers
   - Contains instructions and guidance
   - Should be concise and focused

3. **Bundled resources** (as needed)
   - Scripts, references, assets
   - Loaded only when referenced
   - Keeps context efficient

### Trigger Configuration

Skills can trigger in three ways:

#### 1. Pattern Matching
```yaml
trigger:
  patterns:
    - "create.*component"
    - "build.*UI"
    - "design.*interface"
```

#### 2. File Types
```yaml
trigger:
  fileTypes:
    - "ts"
    - "tsx"
    - "jsx"
```

#### 3. Always On
```yaml
trigger:
  always: true
```

### Degrees of Freedom

Choose specificity based on task variability:

| Freedom Level | When to Use | Example |
|---------------|-------------|---------|
| **High** (text instructions) | Multiple valid approaches, context-dependent decisions | Code architecture decisions |
| **Medium** (pseudocode/scripts with parameters) | Preferred pattern exists, some variation acceptable | API endpoint structure |
| **Low** (specific scripts) | Fragile/error-prone operations, consistency critical | Database migrations |

### Resource Types

**Scripts/** - Executable code for:
- Deterministic reliability
- Repeatedly rewritten code
- May execute without loading into context

**References/** - Documentation for:
- Database schemas
- API documentation
- Domain knowledge
- Avoid duplication with SKILL.md

**Assets/** - Files for output:
- Templates
- Images
- Boilerplate code
- Used in output, not context

---

## Skill Types & Patterns

### Trigger Pattern Types

#### 1. Always-On Skills
```yaml
---
name: Project Standards
description: Always applies project coding standards and conventions
trigger:
  always: true
---
```

**Use cases:**
- Project-wide coding standards
- Team conventions
- Architecture guidelines
- Always-applicable best practices

#### 2. File Type Skills
```yaml
---
name: TypeScript Expert
description: Expert TypeScript development patterns and best practices
trigger:
  fileTypes:
    - "ts"
    - "tsx"
---
```

**Use cases:**
- Language-specific expertise
- Framework patterns
- File format conventions

#### 3. Pattern-Based Skills
```yaml
---
name: API Development
description: Use when creating REST APIs, GraphQL endpoints, or web services
trigger:
  patterns:
    - "create.*API"
    - "build.*endpoint"
    - "design.*service"
---
```

**Use cases:**
- Specific task patterns
- Domain-specific workflows
- Recognizable user intents

### Common Skill Categories

#### Development Skills
- React/Next.js components
- API endpoints
- Database schemas
- Testing setup
- Deployment configurations

#### Language Skills
- TypeScript patterns
- Python best practices
- Rust ownership
- Go concurrency

#### Framework Skills
- Django models
- Rails controllers
- Express middleware
- FastAPI endpoints

#### Domain Skills
- Security review
- Performance optimization
- Database design
- API documentation

---

## Implementation Examples

### Example 1: React Component Skill

**File:** `.claude/skills/react-component/SKILL.md`

```yaml
---
name: React Component Builder
description: Use this skill when creating React components, building UI interfaces, designing component props, or working with React/Next.js frontend architecture
version: 1.0.0
---

# React Component Development

## Component Structure

Create functional components with this structure:

```tsx
interface ComponentNameProps {
  // Prop definitions
}

export function ComponentName({ props }: ComponentNameProps) {
  return (
    <div>
      {/* Component JSX */}
    </div>
  )
}
```

## Best Practices

1. Use TypeScript for all components
2. Define clear prop interfaces
3. Use composition over inheritance
4. Implement proper error boundaries
5. Include loading and error states

## Hooks Usage

- `useState` for local state
- `useEffect` for side effects
- `useContext` for context access
- Custom hooks for reusable logic

See `references/react-hooks.md` for detailed patterns.
```

### Example 2: API Development Skill

**File:** `.claude/skills/api-development/SKILL.md`

```yaml
---
name: API Developer
description: Use when creating REST APIs, building GraphQL endpoints, designing web services, or implementing API authentication and validation
version: 1.0.0
---

# API Development Guide

## REST API Structure

```
app/
├── routes/
│   ├── index.ts
│   ├── users.ts
│   └── posts.ts
├── controllers/
├── services/
└── middleware/
```

## Endpoint Design

1. Use noun-based routes (`/users`, not `/getUsers`)
2. Implement proper HTTP methods
3. Return appropriate status codes
4. Include pagination for lists
5. Add filtering and sorting

## Authentication

Use `scripts/auth-setup.sh` to add JWT authentication to new endpoints.

## Validation

Follow validation patterns in `references/api-validation.md`.

## Error Handling

All endpoints must return consistent error format:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```
```

### Example 3: Database Schema Skill

**File:** `.claude/skills/database-schema/SKILL.md`

```yaml
---
name: Database Schema Designer
description: Use when designing database tables, creating migrations, defining relationships, or optimizing database queries
trigger:
  patterns:
    - "create.*table"
    - "design.*schema"
    - "add.*migration"
version: 1.0.0
---

# Database Schema Design

## Table Design Principles

1. Use snake_case for column names
2. Include `created_at` and `updated_at` timestamps
3. Add foreign key constraints
4. Use appropriate indexes
5. Consider soft deletes

## Migration Template

Use `scripts/migration-template.sql`:

```sql
-- Migration: description
-- Date: YYYY-MM-DD

BEGIN;

-- Alter table statements

COMMIT;
```

## Relationship Patterns

See `references/relationships.md` for:
- One-to-many relationships
- Many-to-many with junction tables
- Polymorphic associations
```

### Example 4: Always-On Coding Standards

**File:** `.claude/skills/coding-standards/SKILL.md`

```yaml
---
name: Team Coding Standards
description: Always applies team coding standards, conventions, and best practices
trigger:
  always: true
version: 1.0.0
---

# Team Coding Standards

## Code Style

- Use 2 spaces for indentation
- Maximum line length: 100 characters
- Use semicolons
- Prefer `const` over `let`
- Use template literals for strings

## Naming Conventions

- Variables: camelCase
- Constants: UPPER_SNAKE_CASE
- Classes: PascalCase
- Files: kebab-case
- Private members: _prefix

## File Organization

```
src/
├── components/  # UI components
├── lib/         # Utilities
├── services/    # Business logic
├── types/       # TypeScript types
└── tests/       # Test files
```

## Required Standards

All code must:
1. Pass TypeScript strict mode
2. Include unit tests
3. Have JSDoc comments for exports
4. Follow ESLint rules
5. Use Prettier formatting
```

### Example 5: Complete Skill with Resources

**Directory Structure:**
```
.claude/skills/rest-api/
├── SKILL.md
├── scripts/
│   ├── create-endpoint.sh
│   └── add-auth.sh
├── references/
│   ├── http-status-codes.md
│   └── validation-patterns.md
└── assets/
    └── endpoint-template.ts
```

**SKILL.md:**
```yaml
---
name: REST API Builder
description: Use when creating RESTful APIs, building HTTP endpoints, implementing API authentication, or designing resource-oriented architectures
version: 2.0.0
---

# REST API Development

## Quick Start

To create a new endpoint:
```bash
./scripts/create-endpoint.sh <resource-name>
```

This creates the route, controller, and service files.

## Resource Design

Follow REST principles:
- Use nouns for resources (`/users`, `/posts`)
- Use HTTP methods correctly (GET, POST, PUT, DELETE)
- Return appropriate status codes (see `references/http-status-codes.md`)
- Implement HATEOAS for links

## Authentication

Add authentication to endpoints:
```bash
./scripts/add-auth.sh <endpoint-path>
```

## Validation

Use validation patterns from `references/validation-patterns.md`

## Template

New endpoints follow the structure in `assets/endpoint-template.ts`
```

---

## Best Practices

### DO ✅

1. **Write clear, specific descriptions**
   ```yaml
   description: Use for React components, UI building, interface design
   ```

2. **Keep SKILL.md lean**
   - Target 1,500-2,000 words
   - Move detailed content to references/
   - Focus on what makes this skill unique

3. **Use imperative mood**
   - ✓ "Create a component with props"
   - ✗ "You should create a component"

4. **Include specific trigger phrases**
   ```yaml
   description: Use when user asks to "create API", "build endpoint", "add route"
   ```

5. **Reference bundled resources clearly**
   - "See `references/patterns.md` for details"
   - "Use `scripts/setup.sh` to initialize"

6. **Choose appropriate freedom level**
   - High freedom for creative tasks
   - Low freedom for critical operations

7. **Test trigger descriptions**
   - Would you actually say this phrase?
   - Is it specific enough?
   - Does it cover the skill's scope?

### DON'T ❌

1. **Don't include auxiliary files**
   - No README.md (in skill directory)
   - No INSTALLATION_GUIDE.md
   - No CHANGELOG.md
   - These waste context tokens

2. **Don't duplicate content**
   - Put detailed info in references/, not SKILL.md
   - Don't repeat basics Claude already knows

3. **Don't use vague descriptions**
   - ✗ "Helps with development"
   - ✓ "Use for React component development"

4. **Don't make skills too broad**
   - Break large skills into focused ones
   - Each skill should have a clear purpose

5. **Don't forget trigger patterns**
   - Always tell Claude WHEN to use the skill
   - Put this in the description field

6. **Don't include installation instructions**
   - Skills are auto-loaded
   - No setup required for the user

7. **Don't use second-person ("you should")**
   - Use imperative form
   - Direct instructions work better

---

## Troubleshooting

### Common Issues

#### 1. Skill Not Triggering

**Symptoms:** Claude doesn't use the skill when it should

**Solutions:**
- Check description includes specific trigger phrases
- Verify patterns match user language
- Test with exact phrases from description
- Consider adding more trigger variations

#### 2. Skill Triggering Too Often

**Symptoms:** Claude uses skill in inappropriate contexts

**Solutions:**
- Make description more specific
- Add negative constraints to description
- Use patterns instead of always: true
- Narrow the skill's scope

#### 3. SKILL.md Too Long

**Symptoms:** Warning about skill length, context overflow

**Solutions:**
- Move detailed content to references/
- Keep only essential info in SKILL.md
- Aim for 1,500-2,000 words
- Split into multiple focused skills

#### 4. Resources Not Loading

**Symptoms:** Claude can't find referenced files

**Solutions:**
- Verify file paths are correct
- Check files are in proper directories (scripts/, references/, assets/)
- Ensure references are mentioned clearly in SKILL.md
- Test by explicitly asking about the resource

#### 5. Conflicting Skills

**Symptoms:** Multiple skills trigger for same request

**Solutions:**
- Make descriptions more distinct
- Add scope constraints
- Use patterns to differentiate
- Consider merging related skills

### Debug Mode

Enable verbose output to see skill loading:
```bash
claude --verbose
```

Check which skills are loaded:
```bash
claude /skills
```

### Testing Skills

1. **Test trigger phrases:**
   ```
   "Create a React component" → Should trigger React skill
   "Build an API endpoint" → Should trigger API skill
   ```

2. **Test resource loading:**
   ```
   "What are the React hooks patterns?" → Should load references/
   ```

3. **Test always-on skills:**
   ```
   Always-on skills should apply to every request
   ```

---

## Advanced Usage

### Skill Combinations

Skills work together seamlessly:
```yaml
# skill-1: React patterns
# skill-2: TypeScript best practices
# skill-3: Testing standards

# When creating a React component, all three apply
```

### Hierarchical Skills

Create general and specific skills:
```yaml
# General: Web Development
name: Web Development
description: Use for any web development task

# Specific: React Components
name: React Components
description: Use specifically for React component creation
```

### Cross-Referencing Skills

Skills can reference other skills:
```markdown
# In API skill:
For database changes, also apply the Database Schema skill patterns.
```

### Dynamic Resource Loading

Skills can conditionally reference resources:
```markdown
## Advanced Patterns

For complex scenarios, see:
- `references/advanced-patterns.md` - Multi-table relationships
- `scripts/complex-migration.sh` - Large-scale migrations
```

### Skill Versioning

Track skill evolution:
```yaml
---
version: 2.0.0
description: Updated for Next.js 15 App Router patterns
---
```

### Environment-Specific Skills

Different skills for different environments:
```
.claude/
├── skills/
│   ├── development/  # Dev environment skills
│   └── production/   # Production environment skills
```

---

## Summary & Conclusions

### What Are Claude Code Skills?

Skills are **modular, self-contained packages** that extend Claude with specialized knowledge and workflows. They transform Claude from a general-purpose assistant into a specialized agent that automatically recognizes and applies domain expertise.

### Key Takeaways

1. **Three Trigger Modes**
   - `always`: Always active
   - `fileTypes`: Trigger on file extensions
   - `patterns`: Trigger on regex/string matches

2. **Progressive Disclosure**
   - Metadata (100 words) - Always loaded
   - SKILL.md body (<5k words) - Loads on trigger
   - Bundled resources - Loaded as needed

3. **Skill Structure**
   - SKILL.md (required) - YAML frontmatter + markdown body
   - scripts/ - Executable code
   - references/ - Documentation
   - assets/ - Output templates

4. **Description is Critical**
   - Primary triggering mechanism
   - Must include specific user phrases
   - Tells Claude WHEN to use the skill
   - Third-person format required

5. **Degrees of Freedom**
   - High: Text instructions (context-dependent)
   - Medium: Pseudocode/scripts (some variation)
   - Low: Specific scripts (consistency critical)

### When to Use Skills

**Ideal Use Cases:**
- Team coding standards and conventions
- Framework-specific patterns
- API documentation and schemas
- Repeated architectural patterns
- Domain-specific best practices
- Organization-specific workflows

**Not Suitable For:**
- One-off tasks (use slash commands)
- Complex multi-step workflows (use subagents)
- Tasks requiring user control (use commands)
- Highly variable situations (use general instructions)

### Skills vs Alternatives

| Use Case | Best Tool |
|----------|-----------|
| Automatic expertise application | **Skills** |
| Manual workflow control | **Slash Commands** |
| Parallel processing | **Subagents** |
| Code standards enforcement | **Skills** |
| Specific repeatable actions | **Slash Commands** |
| Context isolation | **Subagents** |

### Resources Recap

**Official:**
- [Agent Skills - Claude Code Docs](https://code.claude.com/docs/en/skills)
- [Create plugins - Claude Code Docs](https://code.claude.com/docs/en/plugins)
- [Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)

**Examples:**
- [wshobson/commands](https://github.com/wshobson/commands) - 57 production-ready commands
- [travisvn/awesome-claude-skills](https://github.com/travisvn/awesome-claude-skills)
- [Claude Code Skills Hub](https://claudecodeplugins.io/) - 549 skills in 282 plugins

**Learning:**
- [How to Build Claude Skills Tutorial](https://www.codecademy.com/article/how-to-build-claude-skills)
- [Skills Deep Dive Part 1](https://medium.com/spillwave-solutions/claude-code-skills-deep-dive-part-1-82b572ad9450)
- [Inside Claude Code Skills](https://mikhail.io/2025/10/claude-code-skills/)

---

**Research Document Last Updated:** 2026-01-13
**Total Sources Cited:** 40+ resources across official docs, tutorials, examples, and community discussions

---

