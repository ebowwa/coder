/**
 * Repetition Detector - Detects when model output gets stuck in loops
 *
 * Used to force early turn completion when the model repeats the same
 * phrases or patterns, preventing token waste.
 *
 * @module core/repetition-detector
 */

export interface RepetitionDetectorOptions {
  /** Maximum consecutive identical phrases before triggering (default: 3) */
  maxConsecutiveRepeats: number;
  /** Window size in characters to check for patterns (default: 100) */
  windowSize: number;
  /** Minimum phrase length to consider (default: 20 chars) */
  minPhraseLength: number;
  /** Enable debug logging */
  debug?: boolean;
}

export interface RepetitionResult {
  /** Whether repetition was detected */
  detected: boolean;
  /** The repeated phrase if detected */
  phrase?: string;
  /** Number of times the phrase was repeated */
  count?: number;
  /** Type of repetition detected */
  type?: "exact" | "pattern" | "semantic";
}

const DEFAULT_OPTIONS: RepetitionDetectorOptions = {
  maxConsecutiveRepeats: 3,
  windowSize: 100,
  minPhraseLength: 20,
  debug: false,
};

/**
 * Creates a repetition detector for streaming text
 */
export function createRepetitionDetector(
  options: Partial<RepetitionDetectorOptions> = {}
): {
  /** Process incoming text chunk, returns true if repetition detected */
  process: (text: string) => RepetitionResult;
  /** Get full buffered text */
  getBuffer: () => string;
  /** Reset detector state */
  reset: () => void;
  /** Get detected repetitions for logging */
  getStats: () => { totalRepeats: number; lastPhrase: string | null };
} {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let buffer = "";
  let totalRepeats = 0;
  let lastPhrase: string | null = null;

  /**
   * Find repeated phrases in text
   */
  function findRepeats(text: string): RepetitionResult {
    // Check for exact consecutive repeats
    const sentences = text.split(/[.!?]\s+/);
    const phraseCounts = new Map<string, number>();

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed.length < opts.minPhraseLength) continue;

      // Normalize for comparison (lowercase, remove extra spaces)
      const normalized = trimmed.toLowerCase().replace(/\s+/g, " ");

      // Skip if too short after normalization
      if (normalized.length < opts.minPhraseLength) continue;

      const count = (phraseCounts.get(normalized) || 0) + 1;
      phraseCounts.set(normalized, count);

      if (count >= opts.maxConsecutiveRepeats) {
        return {
          detected: true,
          phrase: trimmed.slice(0, 100),
          count,
          type: "exact",
        };
      }
    }

    // Check for pattern repeats (e.g., "Let me X" repeated)
    const patterns = [
      /Let me (\w+)/gi,
      /I (?:will|need to|should) (\w+)/gi,
      /I'll (\w+)/gi,
      /I need to (\w+)/gi,
      /I should (\w+)/gi,
      /I have to (\w+)/gi,
    ];

    const patternCounts = new Map<string, number>();

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const key = match[0].toLowerCase();
        const count = (patternCounts.get(key) || 0) + 1;
        patternCounts.set(key, count);

        if (count >= opts.maxConsecutiveRepeats) {
          return {
            detected: true,
            phrase: match[0],
            count,
            type: "pattern",
          };
        }
      }
    }

    // Check for n-gram repetition (overlapping phrases)
    const words = text.split(/\s+/);
    if (words.length >= 10) {
      const trigrams = new Map<string, number>();

      for (let i = 0; i < words.length - 2; i++) {
        const trigram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`.toLowerCase();
        const count = (trigrams.get(trigram) || 0) + 1;
        trigrams.set(trigram, count);

        if (count >= opts.maxConsecutiveRepeats + 1) {
          return {
            detected: true,
            phrase: trigram,
            count,
            type: "pattern",
          };
        }
      }
    }

    return { detected: false };
  }

  return {
    process(text: string): RepetitionResult {
      buffer += text;

      // Only check recent window to avoid false positives on long responses
      const windowText = buffer.slice(-opts.windowSize * 10);

      const result = findRepeats(windowText);

      if (result.detected) {
        totalRepeats++;
        lastPhrase = result.phrase || null;

        if (opts.debug) {
          console.log(
            `\x1b[33m[RepetitionDetector] Detected ${result.type} repeat: "${result.phrase?.slice(0, 50)}..." (x${result.count})\x1b[0m`
          );
        }
      }

      return result;
    },

    getBuffer(): string {
      return buffer;
    },

    reset(): void {
      buffer = "";
      totalRepeats = 0;
      lastPhrase = null;
    },

    getStats(): { totalRepeats: number; lastPhrase: string | null } {
      return { totalRepeats, lastPhrase };
    },
  };
}

/**
 * Default detector instance for simple use cases
 */
let defaultDetector: ReturnType<typeof createRepetitionDetector> | null = null;

export function getDefaultDetector(): ReturnType<typeof createRepetitionDetector> {
  if (!defaultDetector) {
    defaultDetector = createRepetitionDetector();
  }
  return defaultDetector;
}

export function resetDefaultDetector(): void {
  defaultDetector?.reset();
}
