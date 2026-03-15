/**
 * Todo List Schemas
 * Zod schemas for todo/task management
 */

import { z } from "zod";

// ============================================
// TODO STATUS SCHEMAS
// ============================================

export const TodoStatusSchema = z.enum([
  "pending",
  "in_progress",
  "completed",
  "failed",
  "blocked",
]);

// ============================================
// TODO PRIORITY SCHEMAS
// ============================================

export const TodoPrioritySchema = z.enum([
  "low",
  "normal",
  "high",
  "critical",
]);

// ============================================
// TODO ITEM SCHEMAS
// ============================================

export const TodoItemSchema = z.object({
  id: z.string(),
  subject: z.string(),
  description: z.string().optional(),
  status: TodoStatusSchema,
  priority: TodoPrioritySchema.optional(),
  assignee: z.string().optional(),
  blockedBy: z.array(z.string()).optional(),
  blocks: z.array(z.string()).optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
  completedAt: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================
// TODO LIST SCHEMAS
// ============================================

export const TodoListSchema = z.object({
  items: z.array(TodoItemSchema),
  metadata: z.object({
    total: z.number(),
    pending: z.number(),
    inProgress: z.number(),
    completed: z.number(),
    failed: z.number(),
    blocked: z.number(),
  }),
});

// ============================================
// TODO OPERATION SCHEMAS
// ============================================

export const TodoOperationSchema = z.enum([
  "create",
  "update",
  "delete",
  "complete",
  "block",
  "unblock",
]);

export const TodoOperationResultSchema = z.object({
  success: z.boolean(),
  operation: TodoOperationSchema,
  item: TodoItemSchema.optional(),
  error: z.string().optional(),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type TodoStatus = z.infer<typeof TodoStatusSchema>;
export type TodoPriority = z.infer<typeof TodoPrioritySchema>;
export type TodoItem = z.infer<typeof TodoItemSchema>;
export type TodoList = z.infer<typeof TodoListSchema>;
export type TodoOperation = z.infer<typeof TodoOperationSchema>;
export type TodoOperationResult = z.infer<typeof TodoOperationResultSchema>;
