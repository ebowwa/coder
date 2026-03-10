/**
 * Context Constants - Configuration values for context compaction
 */

/** Approximate characters per token (rough estimate for Claude models) */
export const CHARS_PER_TOKEN = 4;

/** Default number of recent messages to keep during compaction */
export const DEFAULT_KEEP_LAST = 5;

/** Default number of initial messages to keep (usually just the first user query) */
export const DEFAULT_KEEP_FIRST = 1;

/** Minimum messages required before compaction is possible */
export const MIN_MESSAGES_FOR_COMPACTION = 8;

/** Default threshold for proactive compaction (90% of max tokens) */
export const DEFAULT_COMPACTION_THRESHOLD = 0.9;

/** Maximum length for summary text before truncation */
export const MAX_SUMMARY_LENGTH = 8000;

/** Maximum tokens for summary output */
export const SUMMARY_MAX_TOKENS = 2000;

/** System prompt for summarization */
export const SUMMARIZATION_SYSTEM_PROMPT = `You are a context summarizer. Your job is to create concise, information-dense summaries of conversation history.

Guidelines:
- Preserve all important decisions, file changes, and key information
- Keep track of what tools were used and their outcomes
- Note any errors encountered and how they were resolved
- Maintain chronological flow
- Be extremely concise - use bullet points and short sentences
- Focus on information that would be needed to continue the conversation
- Do not include pleasantries or filler text

Format your summary as:
## Summary
[Brief overview of what was discussed]

## Key Actions
- [Action 1]
- [Action 2]

## Files Modified
- [file]: [what changed]

## Important Context
[Any critical information needed going forward]`;

/** User prompt template for summarization */
export const SUMMARIZATION_PROMPT = `Summarize the following conversation messages for context compaction. Preserve all important information in a concise format.

Messages to summarize:
{{MESSAGES}}

Provide a dense, information-rich summary that captures everything needed to continue this conversation.`;
