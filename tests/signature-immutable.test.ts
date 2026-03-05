#!/usr/bin/env bun
/**
 * Test Suite: Signature & Immutable Directives
 *
 * This test verifies:
 * 1. System signature is properly formatted and readable
 * 2. CLAUDE.md files are loaded and merged correctly
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import { loadClaudeMd, generateSystemSignature } from '../packages/src/core/claude-md.js';
import { existsSync } from 'fs';
import { join } from 'path';

// Global variables for test data
let globalInstructions: string;
let projectInstructions: string;
let claudeMdData: ReturnType<typeof loadClaudeMd> extends Promise<infer T> ? T : never;
let signature: ReturnType<typeof generateSystemSignature>;

beforeAll(async () => {
  // Load global instructions
  const globalPath = join(process.env.HOME || '', '.claude/CLAUDE.md');
  if (existsSync(globalPath)) {
    globalInstructions = await Bun.file(globalPath).text();
  }

  // Load project instructions
  const projectPath = '.claude/CLAUDE.md';
  const altPath = './CLAUDE.md';
  if (existsSync(projectPath)) {
    projectInstructions = await Bun.file(projectPath).text();
  } else if (existsSync(altPath)) {
    projectInstructions = await Bun.file(altPath).text();
  }

  // Load using the actual function
  claudeMdData = await loadClaudeMd();

  // Generate signature
  signature = generateSystemSignature();
});

describe('System Signature', () => {
  test('should have required signature fields', () => {
    expect(signature).toBeDefined();
    expect(signature.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(signature.projectId).toBeDefined();
    expect(signature.sessionId).toBeDefined();
    expect(signature.timestamp).toBeDefined();
  });

  test('should include environment information', () => {
    expect(signature.environment).toBeDefined();
    expect(signature.environment.platform).toBeDefined();
    expect(signature.environment.shell).toBeDefined();
  });

  test('should include git status', () => {
    expect(signature.gitStatus).toBeDefined();
    expect(signature.gitStatus.branch).toBeDefined();
    expect(signature.gitStatus.hasChanges).toBeDefined();
  });

  test('should include tool availability', () => {
    expect(signature.tools).toBeDefined();
    expect(Array.isArray(signature.tools.available)).toBe(true);
    expect(signature.tools.mcpServers).toBeDefined();
  });
});

describe('CLAUDE.md Loading', () => {
  test('should load global instructions', () => {
    expect(globalInstructions).toBeDefined();
    expect(globalInstructions.length).toBeGreaterThan(0);
  });

  test('should load project instructions', () => {
    expect(projectInstructions).toBeDefined();
    expect(projectInstructions.length).toBeGreaterThan(0);
  });

  test('should include project-specific content', () => {
    expect(projectInstructions).toMatch(/Coder/i);
    expect(projectInstructions).toMatch(/Architecture/i);
    expect(projectInstructions).toMatch(/MCP Integration/i);
  });

  test('should merge global and project instructions', () => {
    expect(claudeMdData).toBeDefined();
    expect(claudeMdData.merged).toBeDefined();
    expect(claudeMdData.merged.length).toBeGreaterThan(0);
  });

  test('should track source files', () => {
    expect(claudeMdData.sources).toBeDefined();
    expect(Array.isArray(claudeMdData.sources)).toBe(true);
    expect(claudeMdData.sources.length).toBeGreaterThan(0);
  });
});

describe('Merged Content Structure', () => {
  test('should include global instructions in merged content', () => {
    if (globalInstructions) {
      // Check for key content from global instructions
      expect(claudeMdData.merged).toContain('USER is token rich');
      expect(claudeMdData.merged).toContain('ALWAYS USE TEAMMATES NOT AGENTS');
    }
  });

  test('should include project instructions in merged content', () => {
    if (projectInstructions) {
      // Check for key content from project instructions
      expect(claudeMdData.merged).toContain('Coder');
      expect(claudeMdData.merged).toContain('TypeScript + Rust');
      expect(claudeMdData.merged).toContain('MCP Integration');
    }
  });

  test('should separate sections with delimiter', () => {
    expect(claudeMdData.merged).toMatch(/Global Instructions/);
    expect(claudeMdData.merged).toMatch(/Project Instructions/);
  });
});

describe('Signature Information', () => {
  test('should have valid environment info', () => {
    expect(signature.environment.platform).toMatch(/^(darwin|linux|win32)$/);
    expect(signature.environment.nodeVersion).toBeDefined();
    expect(typeof signature.environment.homeDir).toBe('string');
  });

  test('should have git status info', () => {
    expect(typeof signature.gitStatus.branch).toBe('string');
    expect(typeof signature.gitStatus.hasChanges).toBe('boolean');
    expect(typeof signature.gitStatus.staged).toBe('number');
    expect(typeof signature.gitStatus.unstaged).toBe('number');
    expect(typeof signature.gitStatus.untracked).toBe('number');
  });

  test('should have tools info', () => {
    expect(Array.isArray(signature.tools.available)).toBe(true);
    expect(Array.isArray(signature.tools.mcpServers)).toBe(true);
  });

  test('should have unique IDs', () => {
    expect(signature.projectId).toBeDefined();
    expect(signature.sessionId).toBeDefined();
    expect(signature.projectId).not.toBe(signature.sessionId);
  });

  test('should have reasonable timestamp', () => {
    const now = Date.now();
    const diff = now - signature.timestamp;
    expect(diff).toBeGreaterThanOrEqual(0);
    expect(diff).toBeLessThan(10000); // Less than 10 seconds
  });
});
