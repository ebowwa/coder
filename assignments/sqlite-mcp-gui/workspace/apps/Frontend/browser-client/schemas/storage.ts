/**
 * Zod schemas for localStorage data validation
 */

import { z } from 'zod'

/**
 * Activity entry schema for localStorage validation
 */
export const ActivityEntrySchema = z.object({
  id: z.string(),
  timestamp: z.union([z.date(), z.string().datetime()]),
  action: z.string(),
  environment: z.string(),
  details: z.string().default(''),
})

/**
 * Activity entries array schema
 */
export const ActivityEntriesSchema = z.array(ActivityEntrySchema)

/**
 * Parse and validate activities from localStorage
 */
export function parseActivities(data: unknown): Array<{
  id: string
  timestamp: Date
  action: string
  environment: string
  details: string
}> {
  const result = ActivityEntriesSchema.safeParse(data)
  if (!result.success) {
    console.warn('Invalid activities data in localStorage:', result.error.issues)
    return []
  }

  // Convert timestamp strings back to Date objects
  return result.data.map(activity => ({
    id: activity.id,
    timestamp: activity.timestamp instanceof Date
      ? activity.timestamp
      : new Date(activity.timestamp),
    action: activity.action,
    environment: activity.environment,
    details: activity.details ?? '',
  }))
}

/**
 * Stringify activities for localStorage
 */
export function stringifyActivities(activities: z.infer<typeof ActivityEntrySchema>[]): string {
  return JSON.stringify(activities)
}
