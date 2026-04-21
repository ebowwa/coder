/**
 * Client-side game replay storage and playback system.
 * Records game events (guesses, category selections, player joins, round lifecycle)
 * and provides retrieval / deletion of stored replays.
 */

import type { PlayerInfo } from './multiplayer/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RecordedEventType =
  | 'guess'
  | 'category_select'
  | 'player_join'
  | 'round_start'
  | 'round_end';

export interface RecordedEvent {
  type: RecordedEventType;
  timestamp: number;
  payload: unknown;
}

export interface ReplayMetadata {
  roomId: string;
  date: number;
  duration: number;
  winner: string | null;
  playerCount: number;
}

interface StoredReplay {
  metadata: ReplayMetadata;
  players: PlayerInfo[];
  events: RecordedEvent[];
}

// ---------------------------------------------------------------------------
// ReplaySystem
// ---------------------------------------------------------------------------

export class ReplaySystem {
  private replays: Map<string, StoredReplay> = new Map();

  /** Active recording state – only one recording at a time. */
  private activeRoomId: string | null = null;
  private activeEvents: RecordedEvent[] = [];
  private activePlayers: PlayerInfo[] = [];
  private activeStartTime: number = 0;
  private activeWinner: string | null = null;

  // ---- Recording lifecycle -------------------------------------------------

  /**
   * Begin capturing events for a given room.
   * If a recording is already in progress it is finalized first.
   */
  startRecording(roomId: string, players: PlayerInfo[]): void {
    // Finalize any in-progress recording
    if (this.activeRoomId !== null) {
      this.stopRecording();
    }

    this.activeRoomId = roomId;
    this.activePlayers = players.map(p => ({ ...p }));
    this.activeEvents = [];
    this.activeStartTime = Date.now();
    this.activeWinner = null;

    // Automatically record the implicit round_start event
    this.record({
      type: 'round_start',
      payload: { players: this.activePlayers },
    });
  }

  /**
   * Record a single event. Timestamp is assigned automatically.
   * Silently no-ops when no recording is in progress.
   */
  record(event: Omit<RecordedEvent, 'timestamp'>): void {
    if (this.activeRoomId === null) return;

    // Track the winner when a round_end event is recorded
    if (event.type === 'round_end') {
      const p = event.payload as { winner?: string | null } | undefined;
      if (p && p.winner) {
        this.activeWinner = p.winner;
      }
    }

    this.activeEvents.push({
      ...event,
      timestamp: Date.now(),
    });
  }

  /**
   * Finalize the current recording and persist it.
   * Returns the stored replay metadata, or `null` if nothing was being recorded.
   */
  stopRecording(): ReplayMetadata | null {
    if (this.activeRoomId === null) return null;

    const roomId = this.activeRoomId;
    const duration = Date.now() - this.activeStartTime;

    const metadata: ReplayMetadata = {
      roomId,
      date: this.activeStartTime,
      duration,
      winner: this.activeWinner,
      playerCount: this.activePlayers.length,
    };

    this.replays.set(roomId, {
      metadata,
      players: this.activePlayers,
      events: [...this.activeEvents],
    });

    // Reset active state
    this.activeRoomId = null;
    this.activeEvents = [];
    this.activePlayers = [];
    this.activeStartTime = 0;
    this.activeWinner = null;

    return metadata;
  }

  // ---- Retrieval -----------------------------------------------------------

  /**
   * Retrieve the full stored replay for a room (including events),
   * or `null` if no replay exists for that room.
   */
  getReplay(roomId: string): StoredReplay | null {
    return this.replays.get(roomId) ?? null;
  }

  /**
   * List metadata for every stored replay.
   */
  listReplays(): ReplayMetadata[] {
    const result: ReplayMetadata[] = [];
    for (const replay of this.replays.values()) {
      result.push(replay.metadata);
    }
    return result;
  }

  // ---- Deletion ------------------------------------------------------------

  /**
   * Remove a stored replay. Returns `true` if a replay was actually deleted.
   */
  deleteReplay(roomId: string): boolean {
    return this.replays.delete(roomId);
  }
}
