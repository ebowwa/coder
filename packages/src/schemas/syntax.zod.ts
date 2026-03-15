/**
 * Syntax Highlighting Schemas
 * Zod schemas for syntax highlighting
 */

import { z } from "zod";

// ============================================
// SYNTAX LANGUAGE SCHEMAS
// ============================================

export const SyntaxLanguageSchema = z.enum([
  "typescript",
  "javascript",
  "python",
  "rust",
  "go",
  "bash",
  "json",
  "yaml",
  "markdown",
  "html",
  "css",
  "sql",
  "shell",
]);

// ============================================
// SYNTAX TOKEN SCHEMAS
// ============================================

export const SyntaxTokenKindSchema = z.enum([
  "keyword",
  "string",
  "number",
  "comment",
  "function",
  "variable",
  "type",
  "operator",
  "punctuation",
  "constant",
  "property",
]);

export const SyntaxTokenSchema = z.object({
  kind: SyntaxTokenKindSchema,
  start: z.number(),
  end: z.number(),
  text: z.string(),
});

// ============================================
// SYNTAX HIGHLIGHT RESULT SCHEMAS
// ============================================

export const SyntaxHighlightResultSchema = z.object({
  language: SyntaxLanguageSchema,
  tokens: z.array(SyntaxTokenSchema),
  html: z.string().optional(),
  css: z.string().optional(),
});

// ============================================
// SYNTAX HIGHLIGHT CONFIG SCHEMAS
// ============================================

export const SyntaxHighlightConfigSchema = z.object({
  theme: z.enum(["dark", "light", "ansi"]).optional(),
  includeLineNumbers: z.boolean().optional(),
  tabWidth: z.number().optional(),
  wrapLines: z.boolean().optional(),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type SyntaxLanguage = z.infer<typeof SyntaxLanguageSchema>;
export type SyntaxTokenKind = z.infer<typeof SyntaxTokenKindSchema>;
export type SyntaxToken = z.infer<typeof SyntaxTokenSchema>;
export type SyntaxHighlightResult = z.infer<typeof SyntaxHighlightResultSchema>;
export type SyntaxHighlightConfig = z.infer<typeof SyntaxHighlightConfigSchema>;
