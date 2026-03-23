/**
 * Built-in Policies
 *
 * Default policies that ship with Coder.
 * These provide baseline safety for common operations.
 */

import type { PolicyDocument } from "./types.js";

/**
 * Git Safety Policy
 *
 * Protects against dangerous git operations.
 */
export const gitSafetyPolicy: PolicyDocument = {
  meta: {
    name: "git-safety",
    version: "1.0.0",
    description: "Git safety constraints",
    scope: "global",
    tags: ["git", "safety", "critical"],
  },

  constraints: [
    {
      id: "never-force-main",
      description: "Never force push to main/master branches",
      reason: "Force pushing to main destroys history and breaks team collaboration",
      severity: "fatal",
      pattern: {
        tool: "Bash",
        command_pattern: "git\\s+push.*(--force|-f).*\\b(main|master)\\b",
      },
      suggestion: "Create a feature branch and push normally, or use --force-with-lease",
    },
    {
      id: "no-amend-pushed",
      description: "Don't amend commits that have been pushed",
      reason: "Amending pushed commits rewrites history that others may depend on",
      severity: "block",
      pattern: {
        tool: "Bash",
        command_pattern: "git\\s+commit\\s+--amend",
      },
      suggestion: "Create a new commit instead",
    },
    {
      id: "protect-main-branch",
      description: "Don't delete or reset main/master branches",
      reason: "Main branches are protected and should not be deleted",
      severity: "fatal",
      pattern: {
        tool: "Bash",
        command_pattern: "git\\s+(branch\\s+-D|reset\\s+--hard).*\\b(main|master)\\b",
      },
      suggestion: "Use a feature branch instead",
    },
    {
      id: "no-secrets-in-commits",
      description: "Don't commit files that may contain secrets",
      reason: "Secrets in git history are exposed and difficult to remove",
      severity: "block",
      pattern: {
        tool: ["Write", "Edit"],
        content_pattern: "(api_key|apikey|secret|password|token|credential)\\s*[=:]\\s*['\"][^'\"]+['\"]",
      },
      suggestion: "Use environment variables or secret management instead",
      auto_fixable: true,
      auto_fix: {
        type: "sanitize",
        description: "Replace secret value with environment variable reference",
        params: { replacement: "process.env.SECRET_NAME" },
      },
    },
  ],

  permissions: [
    {
      id: "git-read",
      domain: "git",
      actions: ["read", "pull", "branch"],
      requires_approval: "never",
    },
    {
      id: "git-write-dev",
      domain: "git",
      actions: ["commit", "push", "merge"],
      branches: {
        allow: ["feat/*", "fix/*", "chore/*", "dev", "develop"],
        deny: ["main", "master", "production", "release/*"],
        require_pr: ["main", "master", "production"],
      },
      requires_approval: "never",
    },
  ],

  teaching: [
    {
      id: "force-push-explanation",
      trigger: ["force push", "push --force", "why can't I force push"],
      response: "Force pushing rewrites git history. This breaks other developers' work and can cause data loss. Use --force-with-lease for safer force pushing, or better yet, create a new commit.",
      reason: "History rewriting is destructive",
      examples: [
        {
          input: "force push to main",
          output: "I can't force push to main. This would rewrite history that others depend on. Would you like me to create a feature branch instead?",
          explanation: "Protecting shared branches from history rewrites",
        },
      ],
    },
  ],
};

/**
 * Filesystem Safety Policy
 *
 * Protects against dangerous file operations.
 */
export const filesystemSafetyPolicy: PolicyDocument = {
  meta: {
    name: "filesystem-safety",
    version: "1.0.0",
    description: "Filesystem safety constraints",
    scope: "global",
    tags: ["filesystem", "safety"],
  },

  constraints: [
    {
      id: "no-rm-rf-root",
      description: "Never run rm -rf on root or home directories",
      reason: "This would delete everything and is irreversible",
      severity: "fatal",
      pattern: {
        tool: "Bash",
        command_pattern: "rm\\s+(-[rf]+\\s+)*(/|~|\\$HOME)",
      },
    },
    {
      id: "no-write-system-dirs",
      description: "Don't write to system directories",
      reason: "System directories are managed by the OS and should not be modified",
      severity: "block",
      pattern: {
        tool: ["Write", "Edit", "Bash"],
        path_pattern: "^/(usr|bin|etc|var|sys|proc|dev)/",
      },
      suggestion: "Write to your project directory instead",
    },
    {
      id: "protect-dotenv",
      description: "Be careful with .env files",
      reason: ".env files contain sensitive configuration",
      severity: "warn",
      pattern: {
        tool: ["Write", "Edit"],
        path_pattern: "\\.env($|\\.)",
      },
      suggestion: "Consider using Doppler for secrets management",
    },
    {
      id: "no-delete-node-modules",
      description: "Don't delete node_modules via Write tool",
      reason: "Use rm -rf for large directory deletion",
      severity: "warn",
      pattern: {
        tool: "Bash",
        command_pattern: "rm\\s+(-[rf]+\\s+)*node_modules",
      },
      suggestion: "This is allowed but may take a while",
    },
  ],

  permissions: [
    {
      id: "project-read",
      domain: "filesystem",
      actions: ["read"],
      paths: ["**"],
      requires_approval: "never",
    },
    {
      id: "project-write",
      domain: "filesystem",
      actions: ["write", "create", "modify"],
      paths: ["src/**", "tests/**", "docs/**", "packages/**", "*.ts", "*.js", "*.json", "*.md"],
      requires_approval: "never",
    },
    {
      id: "config-write",
      domain: "filesystem",
      actions: ["write", "modify"],
      paths: [".claude/**", ".github/**", "*.config.*"],
      requires_approval: "sensitive",
    },
  ],
};

/**
 * Network Safety Policy
 *
 * Protects against dangerous network operations.
 */
export const networkSafetyPolicy: PolicyDocument = {
  meta: {
    name: "network-safety",
    version: "1.0.0",
    description: "Network safety constraints",
    scope: "global",
    tags: ["network", "security"],
  },

  constraints: [
    {
      id: "no-internal-network",
      description: "Don't access internal network addresses",
      reason: "Internal network access may expose sensitive services",
      severity: "block",
      pattern: {
        tool: ["Bash", "mcp__*"],
        content_pattern: "(localhost|127\\.0\\.0\\.1|10\\.\\d+\\.\\d+\\.\\d+|172\\.(1[6-9]|2\\d|3[01])\\.\\d+\\.\\d+|192\\.168\\.\\d+\\.\\d+)",
      },
      suggestion: "Use public endpoints or configure allowed internal hosts",
    },
    {
      id: "no-credential-urls",
      description: "Don't put credentials in URLs",
      reason: "Credentials in URLs are logged and visible",
      severity: "block",
      pattern: {
        tool: ["Bash", "Write", "Edit"],
        content_pattern: "https?://[^:]+:[^@]+@",
      },
      suggestion: "Use environment variables or config files for credentials",
    },
  ],

  permissions: [
    {
      id: "public-api",
      domain: "network",
      actions: ["read"],
      requires_approval: "never",
    },
    {
      id: "external-api-write",
      domain: "external",
      actions: ["write", "execute"],
      requires_approval: "sensitive",
    },
  ],
};

/**
 * Code Quality Policy
 *
 * Enforces code quality standards.
 */
export const codeQualityPolicy: PolicyDocument = {
  meta: {
    name: "code-quality",
    version: "1.0.0",
    description: "Code quality constraints",
    scope: "project",
    tags: ["code", "quality"],
  },

  constraints: [
    {
      id: "no-console-log-prod",
      description: "Avoid console.log in production code",
      reason: "console.log statements can leak sensitive data and clutter logs",
      severity: "warn",
      pattern: {
        tool: ["Write", "Edit"],
        path_pattern: "src/.*\\.ts$",
        content_pattern: "console\\.(log|debug|info)\\(",
      },
      suggestion: "Use a proper logging library with log levels",
    },
    {
      id: "no-any-type",
      description: "Avoid 'any' type in TypeScript",
      reason: "'any' defeats type safety",
      severity: "warn",
      pattern: {
        tool: ["Write", "Edit"],
        path_pattern: "src/.*\\.ts$",
        content_pattern: ":\\s*any[\\s,;)\\]]",
      },
      suggestion: "Use 'unknown' or a specific type",
    },
    {
      id: "require-types-first",
      description: "Types should be defined before implementation",
      reason: "Types-first development improves design",
      severity: "warn",
      pattern: {
        tool: "Write",
        path_pattern: "src/.*\\.ts$",
      },
      suggestion: "Consider creating a types.ts file first",
    },
  ],

  teaching: [
    {
      id: "types-first-explanation",
      trigger: ["why types first", "types-first", "define types"],
      response: "Defining types first forces you to think about the API contract before implementation. This leads to better design and fewer refactors.",
      reason: "Types-first development improves code quality",
    },
  ],
};

/**
 * Development Workflow Policy
 *
 * Enforces development workflow conventions.
 */
export const devWorkflowPolicy: PolicyDocument = {
  meta: {
    name: "dev-workflow",
    version: "1.0.0",
    description: "Development workflow constraints",
    scope: "project",
    tags: ["workflow", "git", "development"],
  },

  constraints: [
    {
      id: "branch-from-dev",
      description: "Feature branches should fork from dev, not main",
      reason: "dev is the integration branch; main is for releases",
      severity: "warn",
      pattern: {
        tool: "Bash",
        command_pattern: "git\\s+checkout\\s+-b\\s+(feat|fix|chore)/",
      },
      suggestion: "Ensure you're on dev branch before creating feature branches",
    },
    {
      id: "small-commits",
      description: "Prefer small, focused commits",
      reason: "Small commits are easier to review and revert",
      severity: "warn",
      pattern: {
        tool: "Bash",
        command_pattern: "git\\s+add\\s+(-A|\\.)",
      },
      suggestion: "Consider adding specific files instead of all changes",
    },
  ],

  teaching: [
    {
      id: "workflow-explanation",
      trigger: ["how to branch", "git workflow", "development process"],
      response: "We use a three-branch workflow: main (stable releases), dev (integration), and feat/* (features). Always branch from dev and PR back to dev. Main only receives merges from dev.",
      reason: "Consistent workflow reduces merge conflicts",
      examples: [
        {
          input: "create a feature branch",
          output: "I'll create a feature branch from dev: git checkout dev && git pull && git checkout -b feat/my-feature",
          explanation: "Following the dev-first branching strategy",
        },
      ],
    },
  ],
};

// ============================================
// COLLECTIONS
// ============================================

/**
 * All built-in policies
 */
export const builtInPolicies: PolicyDocument[] = [
  gitSafetyPolicy,
  filesystemSafetyPolicy,
  networkSafetyPolicy,
  codeQualityPolicy,
  devWorkflowPolicy,
];

/**
 * Critical policies only (fatal/block constraints)
 */
export const criticalPolicies: PolicyDocument[] = [
  gitSafetyPolicy,
  filesystemSafetyPolicy,
  networkSafetyPolicy,
];

/**
 * Development policies (warnings + teaching)
 */
export const developmentPolicies: PolicyDocument[] = [
  codeQualityPolicy,
  devWorkflowPolicy,
];

/**
 * Get all policies with optional filtering
 */
export function getAllPolicies(options?: {
  includeCritical?: boolean;
  includeDevelopment?: boolean;
}): PolicyDocument[] {
  const { includeCritical = true, includeDevelopment = true } = options || {};

  const policies: PolicyDocument[] = [];

  if (includeCritical) {
    policies.push(...criticalPolicies);
  }

  if (includeDevelopment) {
    policies.push(...developmentPolicies);
  }

  return policies;
}
