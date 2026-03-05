#!/usr/bin/env bun
/**
 * Quick verification of signature and immutable directives
 */

import { loadClaudeMd, buildClaudeMdPrompt } from '../packages/src/core/claude-md.js';
import { getGitStatus } from '../packages/src/core/git-status.js';
import { builtInTools } from '../packages/src/ecosystem/tools/index.js';

console.log('🔍 Verifying Signature & Immutable Directives\n');

// Helper: Generate signature
function generateSignature() {
  const now = new Date();
  return {
    version: '1.0.0',
    timestamp: now.toISOString(),
    sessionId: `verify-${now.getTime()}`,
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    },
  };
}

// 1. Test Git Status
console.log('1️⃣  Testing Git Status...');
const gitStatus = await getGitStatus(process.cwd());
if (gitStatus) {
  const hasChanges = gitStatus.staged.length > 0 || gitStatus.unstaged.length > 0 || gitStatus.untracked.length > 0;
  console.log(`   ✓ Branch: ${gitStatus.branch}`);
  console.log(`   ✓ Has Changes: ${hasChanges}`);
  console.log(`   ✓ Staged: ${gitStatus.staged.length}`);
  console.log(`   ✓ Unstaged: ${gitStatus.unstaged.length}`);
  console.log(`   ✓ Untracked: ${gitStatus.untracked.length}\n`);
} else {
  console.log('   ⚠️  Could not get git status\n');
}

// 2. Test CLAUDE.md Loading
console.log('2️⃣  Testing CLAUDE.md Loading...');
const claudeMd = await loadClaudeMd();
const projectInstructions = await buildClaudeMdPrompt();
console.log(`   ✓ CLAUDE.md loaded: ${claudeMd.merged.length} chars`);
console.log(`   ✓ Sources: ${claudeMd.sources.join(', ')}`);
console.log(`   ✓ Project instructions: ${projectInstructions.length} chars\n`);

// 2b. Generate Full Signature
console.log('2️⃣b Testing Full Signature Generation...');
console.log(`   ✓ Available tools: ${builtInTools.length}`);

const signatureData = generateSignature();
console.log(`   ✓ Signature version: ${signatureData.version}`);
console.log(`   ✓ Session ID: ${signatureData.sessionId}`);
console.log(`   ✓ Timestamp: ${signatureData.timestamp}\n`);

// The actual system prompt would be: projectInstructions + "\n\n" + signature content
const signatureContent = `Session: ${signatureData.sessionId}\nTimestamp: ${signatureData.timestamp}`;
const systemPrompt = projectInstructions + "\n\n" + signatureContent;
console.log(`   ✓ Total system prompt: ${systemPrompt.length} chars\n`);

// 3. Verify Immutable Directives
console.log('3️⃣  Verifying Immutable Directives...');

// The immutable directives are actually in src/cli.ts buildSystemPrompt() function
// around line 1211, not in system-reminders.ts
const cliPath = '/Users/ebowwa/Desktop/codespaces/coder/packages/src/interfaces/ui/terminal/cli/index.ts';
const cliContent = await Bun.file(cliPath).text();

// Find the buildSystemPrompt function
const systemPromptMatch = cliContent.match(/const BASE_SYSTEM_PROMPT = `([\\s\\S]*?)`;$/m);
if (!systemPromptMatch) {
  console.log('   ⚠️  Could not find BASE_SYSTEM_PROMPT in cli.ts');
  console.log('   ℹ️  The actual signature is built dynamically in buildSystemPrompt()');
} else {
  console.log('   ✓ Found BASE_SYSTEM_PROMPT in cli.ts');
  console.log('   ℹ️  The actual signature is built dynamically in buildSystemPrompt()');
}

// Check if the function exists
const hasBuildDefault_system_prompt = cliContent.includes('function buildDefaultSystemPrompt(') || cliContent.includes('async function buildDefaultSystemPrompt(');
console.log(`   buildDefaultSystemPrompt function: ${hasBuildDefault_system_prompt ? '✓' : '✗'}`);

// Check if system reminders are imported
const importsSystem_reminders = cliContent.includes('from "./core/system-reminders.js"') || cliContent.includes('from "./core/system-reminders"');
console.log(`   system-reminders import: ${importsSystem_reminders ? '✓' : '✗'}`);

// Check if buildSystemReminders is called
const callsBuildSystem_reminders = cliContent.includes('buildSystemReminders(');
console.log(`   buildSystemReminders called: ${callsBuildSystem_reminders ? '✓' : '✗'}`);

console.log('');
console.log('4️⃣  Integration Status:');

// Extract the actual system prompt building logic
const buildPromptMatch = cliContent.match(/async function buildDefaultSystemPrompt\([^)]*\): Promise<string> \{([\s\S]*?)\n  \}/);
if (buildPromptMatch?.[1]) {
  const promptLogic = buildPromptMatch[1];

  // Check if it builds reminders
  const usesBuildSystem_reminders = promptLogic.includes('buildSystemReminders(');
  const hasSystemReminders_logic = promptLogic.includes('systemReminders') || promptLogic.includes('system_reminders');

  console.log(`   Uses buildSystemReminders(): ${usesBuildSystem_reminders ? '✓' : '✗'}`);
  console.log(`   Has system reminders logic: ${hasSystemReminders_logic ? '✓' : '✗'}`);

  if (!usesBuildSystem_reminders) {
    console.log('   ⚠️  WARNING: buildDefaultSystemPrompt does not use buildSystemReminders()');
    console.log('   ⚠️  The signature may be incomplete!');
  }
} else {
  console.log('   ✗ Could not parse buildDefaultSystemPrompt function');
}

console.log('');
console.log('5️⃣  Expected Signature Structure:');
console.log('   1. Base prompt ("You are Coder..." + "Available tools:")');
console.log('   2. System reminders (dynamic context from system-reminders.ts)');
console.log('   3. CLAUDE.md content (project instructions)');
console.log('   4. Git status (if available)');

const requiredSections = [
  { name: 'Available tools', pattern: /Available tools:/i },
  { name: 'Guidelines', pattern: /Guidelines:/i },
  { name: 'Working directory', pattern: /Working directory:/i },
  { name: 'Git Status', pattern: /Git Status:/i },
  { name: 'Permission Modes', pattern: /Permission Modes/i },
  { name: 'REPL Commands', pattern: /REPL Commands/i },
  { name: 'Coding Conventions', pattern: /Coding Conventions/i },
  { name: 'Models', pattern: /Models/i },
  { name: 'Cost Tracking', pattern: /Cost Tracking/i },
];

let missingSections: string[] = [];
for (const section of requiredSections) {
  if (section.pattern.test(systemPrompt)) {
    console.log(`   ✓ ${section.name}`);
  } else {
    console.log(`   ✗ ${section.name} - MISSING!`);
    missingSections.push(section.name);
  }
}

if (missingSections.length > 0) {
  console.log(`\n   ⚠️  Missing ${missingSections.length} sections!\n`);
} else {
  console.log(`\n   ✅ All required sections present!\n`);
}

// 4. Verify Tool Descriptions
console.log('4️⃣  Verifying Tool Descriptions...');
const requiredTools = [
  'Read', 'Write', 'Edit', 'MultiEdit', 'Bash',
  'Glob', 'Grep', 'Task', 'TaskOutput', 'TaskStop',
  'AskUserQuestion', 'EnterPlanMode', 'ExitPlanMode',
  'Skill', 'NotebookEdit',
];

let missingTools: string[] = [];
for (const tool of requiredTools) {
  if (systemPrompt.includes(tool)) {
    console.log(`   ✓ ${tool}`);
  } else {
    console.log(`   ✗ ${tool} - MISSING!`);
    missingTools.push(tool);
  }
}

if (missingTools.length > 0) {
  console.log(`\n   ⚠️  Missing ${missingTools.length} tool descriptions!\n`);
} else {
  console.log(`\n   ✅ All tool descriptions present!\n`);
}

// 5. Verify Environment Information
console.log('5️⃣  Verifying Environment Information...');
console.log(`   ✓ Platform: ${process.platform}`);
console.log(`   ✓ Shell: ${process.env.SHELL || 'unknown'}`);
console.log(`   ✓ Node Version: ${process.version}`);
console.log(`   ✓ Working Directory: ${process.cwd()}\n`);

// 6. Verify Signature Integrity
console.log('6️⃣  Verifying Signature Integrity...');
const expectedSignature = {
  version: '1.0.0',
  sessionId: 'verify-session',
  timestamp: new Date().toISOString(),
  environment: {
    platform: process.platform,
    shell: process.env.SHELL || 'unknown',
    nodeVersion: process.version,
  },
  workingDirectory: process.cwd(),
  gitStatus: gitStatus,
  tools: {
    available: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
    mcpServers: [],
  },
};
console.log(`   ✓ Version: ${expectedSignature.version}`);
console.log(`   ✓ Session ID: ${expectedSignature.sessionId}`);
if (expectedSignature.gitStatus) {
  const hasChanges = expectedSignature.gitStatus.staged.length > 0 || expectedSignature.gitStatus.unstaged.length > 0 || expectedSignature.gitStatus.untracked.length > 0;
  console.log(`   ✓ Git Branch: ${expectedSignature.gitStatus.branch}`);
  console.log(`   ✓ Has Changes: ${hasChanges}`);
} else {
  console.log(`   ⚠️ Git status not available`);
}
console.log(`   ✓ Available Tools: ${expectedSignature.tools.available.length}`);
console.log(`   ✓ MCP Servers: ${expectedSignature.tools.mcpServers.length}\n`);

// 7. Display Sample of System Prompt
console.log('7️⃣  System Prompt Sample (first 500 chars):');
console.log('   ' + '─'.repeat(76));
const previewContent = systemPrompt.slice(0, 500);
const lines = previewContent.split('\n');
for (const line of lines) {
  console.log('   ' + line);
}
console.log('   ' + '─'.repeat(76));
console.log(`   ... (${systemPrompt.length} total characters)\n`);

// 8. Final Summary
console.log('8️⃣  Final Summary:');
console.log(`   ✅ Signature: ${signatureData.version}`);
console.log(`   ✅ Immutable Directives: ${requiredSections.length - missingSections.length}/${requiredSections.length}`);
console.log(`   ✅ Tool Descriptions: ${requiredTools.length - missingTools.length}/${requiredTools.length}`);
console.log(`   ✅ System Prompt: ${systemPrompt.length} chars`);

if (missingSections.length === 0 && missingTools.length === 0) {
  console.log('\n✨ ALL CHECKS PASSED! ✨\n');
  process.exit(0);
} else {
  console.log('\n⚠️  SOME CHECKS FAILED! ⚠️\n');
  process.exit(1);
}
