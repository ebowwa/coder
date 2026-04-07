# Hangman 3D

A modern, immersive 3D hangman game built with Three.js featuring multiplayer support, particle effects, tournament brackets, replay system, and full accessibility.

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Installation](#installation)
- [Development](#development)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [Game Mechanics](#game-mechanics)
- [Multiplayer System](#multiplayer-system)
- [Tournament System](#tournament-system)
- [Replay System](#replay-system)
- [Visual Effects](#visual-effects)
- [Sound Effects](#sound-effects)
- [Accessibility](#accessibility)
- [API Reference](#api-reference)
- [License](#license)

---

## Project Overview

Hangman 3D is a browser-based word guessing game rendered in immersive 3D using Three.js. Players guess letters to reveal a hidden word while a 3D hangman figure is progressively drawn with each wrong guess. The game supports:

- **Single-player mode** with progressive difficulty
- **Multiplayer mode** with up to 8 players per room
- **Tournament brackets** for 4, 8, or 16 players
- **Replay recording and playback** for reviewing games
- **Full accessibility** with screen reader support and keyboard navigation

### Technology Stack

| Component | Technology |
|-----------|------------|
| 3D Rendering | Three.js v0.172 |
| Runtime | Bun (ESM) |
| Testing | Vitest + jsdom |
| Real-time | WebSocket (ws v8.20) |
| Language | TypeScript 5.7 |

---

## Features

### Core Gameplay

- **3D Hangman Figure**: Animated gallows and body parts rendered in real-time
- **Dynamic Word Selection**: Categorized word lists with difficulty progression
- **Letter Tile Keyboard**: Interactive 3D letter tiles arranged in an arc
- **Prediction UI**: Modal for guessing whether letters are in the word
- **Scoring System**: Points for correct guesses, penalties for wrong guesses

### Multiplayer

- **Room System**: Create/join rooms with 4-digit codes
- **Turn Rotation**: Wrong guesses pass turn to next player
- **Spectator Mode**: Watch games without participating
- **Player Avatars**: Colored avatars with score display
- **Real-time Sync**: WebSocket-based state synchronization

### Tournament Mode

- **Bracket Sizes**: 4, 8, or 16 player single-elimination tournaments
- **Seeded Matching**: Proper tournament seeding (1v8, 4v5, 2v7, 3v6, etc.)
- **Difficulty Settings**: Easy, Medium, Hard configurations
- **Champion Tracking**: Crown the tournament winner

### Visual & Audio

- **Particle Effects**: Confetti celebrations, ash effects for losses, ambient glow
- **Screen Transitions**: Smooth fade, slide, and scale animations
- **Sound Effects**: Synthesized audio using Web Audio API
- **3D Word Display**: Letter blocks on pedestals with reveal animations

### Accessibility

- **ARIA Live Regions**: Screen reader announcements for game events
- **Keyboard Navigation**: Full keyboard support for all interactions
- **Focus Management**: Focus traps for modals, focus restoration
- **High Contrast**: Visible focus indicators and state differentiation

---

## Installation

### Prerequisites

- [Bun](https://bun.sh) v1.0 or later
- Modern browser with WebGL support

### Setup

```bash
# Clone the repository
cd hangman

# Install dependencies
bun install

# Start development server
bun run dev
```

### Build

```bash
# Production build
bun run build

# Output: dist/ directory
```

---

## Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server with hot reload |
| `bun run build` | Build for production (minified) |
| `bun run typecheck` | Run TypeScript type checking |
| `bun run test` | Run tests once |
| `bun run test:watch` | Run tests in watch mode |

### Project Structure

```
hangman/
├── src/
│   ├── main.ts                 # Application entry point
│   ├── config.ts               # Centralized configuration
│   ├── types.ts                # Shared type definitions
│   ├── hangman-logic.ts        # Core game state machine
│   ├── accessibility.ts        # ARIA labels, keyboard nav
│   ├── particle-effects.ts     # Three.js particle system
│   ├── sound-effects.ts        # Web Audio API sounds
│   ├── screen-transitions.ts   # UI transition animations
│   ├── word-display.ts         # 3D word rendering
│   ├── letter-tiles.ts         # 3D keyboard tiles
│   ├── category-ui.ts          # Category selection UI
│   ├── prediction-ui.ts        # Prediction modal (DOM)
│   ├── prediction-ui-3d.ts     # Prediction modal (3D)
│   ├── wordLists.ts            # Word database by category
│   ├── words.ts                # Word selection utilities
│   │
│   ├── multiplayer/
│   │   ├── room.ts             # Room management & turn rotation
│   │   ├── types.ts            # Multiplayer types
│   │   ├── sync.ts             # State synchronization
│   │   ├── lobby-ui.ts         # Lobby interface
│   │   ├── player-avatars.ts   # Avatar rendering
│   │   └── tournament-ui.ts    # Tournament bracket UI
│   │
│   └── __tests__/              # Unit tests
│       ├── room.test.ts
│       ├── tournament.test.ts
│       ├── replays.test.ts
│       ├── leaderboard.test.ts
│       └── ...
│
├── server/
│   ├── index.ts                # Dev server entry
│   ├── replays.ts              # Replay recording system
│   ├── tournament.ts           # Tournament bracket logic
│   └── leaderboard.ts          # Score tracking
│
├── package.json
├── tsconfig.json
└── README.md
```

---

## Architecture

### Core Modules

#### `hangman-logic.ts` - Game State Machine

Pure state machine managing the core game loop without UI dependencies.

```typescript
interface Round {
  word: string;              // The word to guess (uppercase)
  category: string;          // Word category
  difficulty: number;        // Difficulty level (1-5)
  revealedLetters: Set<string>;
  wrongGuesses: number;      // Count (max 6)
  guessedLetters: Set<string>;
  isComplete: boolean;
  isWon: boolean;
}
```

#### `config.ts` - Configuration Hub

Centralized configuration for all game parameters:

- `GAME_CONFIG` - Core gameplay (max wrong guesses, scoring)
- `SCENE_CONFIG` - Three.js scene (camera, lighting)
- `HANGMAN_CONFIG` - 3D figure dimensions
- `LETTER_TILES_CONFIG` - Keyboard layout
- `WORD_DISPLAY_CONFIG` - Word rendering
- `PREDICTION_UI_CONFIG` - Prediction modal
- `UI_CONFIG` - Element positioning

#### `particle-effects.ts` - Visual Effects

Three.js-based particle system supporting:

- **Win particles**: Confetti burst (100 particles, multi-color)
- **Lose particles**: Ash effect (50 particles, gray tones)
- **Ambient glow**: Continuous emission behind hangman

#### `multiplayer/room.ts` - Room Management

Handles multiplayer game state:

```typescript
interface Room {
  code: string;           // 4-digit room code
  hostId: string;         // Room creator
  status: 'waiting' | 'playing' | 'finished';
  players: Map<string, PlayerInfo>;
  spectators: Map<string, SpectatorInfo>;
  currentTurnIndex: number;
  rounds: Round[];
}
```

### Data Flow

```
User Input → Game Logic → State Update → UI Render → Particle/Sound Effects
     ↓
WebSocket Sync (multiplayer)
```

---

## Configuration

### Game Mechanics (`GAME_CONFIG`)

| Property | Default | Description |
|----------|---------|-------------|
| `maxWrongGuesses` | 6 | Maximum wrong guesses before loss |
| `difficultyIncrementWins` | 3 | Wins needed to increase difficulty |
| `maxDifficulty` | 5 | Maximum difficulty level |
| `roundDelayMs` | 3000 | Delay between rounds |
| `baseScoreMultiplier` | 10 | Score = word.length × multiplier |
| `wrongGuessPenalty` | 5 | Points deducted per wrong guess |
| `hintPenalty` | 5 | Points deducted for using hint |
| `minimumScore` | 10 | Minimum score per won round |

### 3D Scene (`SCENE_CONFIG`)

| Property | Default | Description |
|----------|---------|-------------|
| `backgroundColor` | 0x1a1a2e | Dark blue background |
| `camera.fov` | 60 | Field of view (degrees) |
| `camera.near/far` | 0.1/1000 | Clipping planes |
| `lighting.ambientIntensity` | 0.4 | Ambient light level |

### Hangman Figure (`HANGMAN_CONFIG`)

| Property | Default | Description |
|----------|---------|-------------|
| `materialColor` | 0x8b4513 | Brown (gallows) |
| `bodyColor` | 0xffdbac | Skin tone (body parts) |
| `headRadius` | 0.3 | Head sphere radius |
| `bodyHeight` | 1 | Torso height |

### Letter Tiles (`LETTER_TILES_CONFIG`)

| Property | Default | Description |
|----------|---------|-------------|
| `tileWidth/Height/Depth` | 0.8/1/0.2 | Tile dimensions |
| `tilesPerRow` | 13 | Keyboard layout |
| `correctColor` | 0x4caf50 | Green (correct) |
| `wrongColor` | 0xf44336 | Red (wrong) |

---

## Game Mechanics

### Round Flow

1. **Word Selection**: Random word from category based on difficulty
2. **Guess Processing**: Letter normalized to uppercase, idempotent
3. **Correct Guess**: Add to `revealedLetters`, check win
4. **Wrong Guess**: Increment `wrongGuesses`, check loss
5. **Round End**: Show result, emit particles, schedule next round

### Scoring

| Action | Points |
|--------|--------|
| Correct letter guess | +10 per letter instance |
| Wrong guess penalty | -5 |
| Hint penalty | -5 |
| Minimum score per round | 10 |

### Win/Loss Conditions

- **Win**: All letters in word are revealed
- **Loss**: 6 wrong guesses reached

### Difficulty Progression

- Difficulty increases after every 3 consecutive wins
- Maximum difficulty level: 5
- Higher difficulty = longer, more obscure words

---

## Multiplayer System

### Room States

```
waiting → playing → finished
```

### Turn Rotation Rules

1. **Initial Turn**: Player at index 0 (room creator) starts
2. **Correct Guess**: Same player continues
3. **Wrong Guess**: Turn passes to next player in sequence
4. **Round End**: Turn index advances by 1

```typescript
// Turn rotation logic (src/multiplayer/room.ts)
if (!isCorrect && !round.isComplete) {
  room.currentTurnIndex = (room.currentTurnIndex + 1) % playerIds.length;
  round.currentGuesserId = playerIds[room.currentTurnIndex];
}
```

### Player Roles

| Role | Permissions |
|------|-------------|
| Host | Start game, kick players, change settings |
| Player | Guess letters, use hints, chat |
| Spectator | Watch game, chat (no guessing) |

### Host Transfer

When host leaves:
1. First remaining player becomes new host
2. Turn order preserved
3. Game state maintained

---

## Tournament System

### Bracket Sizes

| Players | Rounds | Matches per Round |
|---------|--------|-------------------|
| 4 | 2 | 2 → 1 |
| 8 | 3 | 4 → 2 → 1 |
| 16 | 4 | 8 → 4 → 2 → 1 |

### Seeding

Standard tournament seeding ensures top seeds face bottom seeds:

- **4 players**: 1v4, 2v3
- **8 players**: 1v8, 4v5, 2v7, 3v6
- **16 players**: 1v16, 8v9, 4v13, 5v12, 2v15, 7v10, 3v14, 6v11

### Difficulty Settings

| Level | Max Wrong | Word Difficulty |
|-------|-----------|-----------------|
| Easy | 8 | 1-2 |
| Medium | 6 | 2-3 |
| Hard | 4 | 3-5 |

---

## Replay System

### Recording

All guesses are recorded with:
- Player ID and name
- Letter guessed
- Correct/incorrect status
- Wrong guess count after
- Timestamp

### API

```typescript
// Start recording a round
replayManager.startRound(roomCode);

// Record each guess
replayManager.recordGuess(roomCode, playerId, playerName, letter, isCorrect, wrongCount);

// Store completed round
const replay = replayManager.storeReplay(roomCode, round, players);

// Retrieve replays
const replays = replayManager.getReplays(roomCode);
const timeline = replayManager.getReplayTimeline(replayId);
const recent = replayManager.getRecentReplays(limit);
```

### Storage

- Maximum 500 replays stored
- Replays keyed by room code and round ID
- Player-specific replay queries available

---

## Visual Effects

### Particle Types

#### Win Particles (Confetti)

| Property | Value |
|----------|-------|
| Count | 100 particles |
| Colors | Cyan, Yellow, Coral, Mint, Rose |
| Size | 0.15 units |
| Lifetime | 3 seconds |
| Velocity | Upward (y: 5) |
| Gravity | -2 |

#### Lose Particles (Ash)

| Property | Value |
|----------|-------|
| Count | 50 particles |
| Colors | Dark grays (#333, #555, #666) |
| Size | 0.1 units |
| Lifetime | 2 seconds |
| Velocity | Slow upward (y: 2) |
| Gravity | -4 |

#### Ambient Glow

- Continuous emission behind hangman
- Colors: Cyan, Purple, Blue, White
- Rate: ~6-7 particles/second
- Lifetime: 3-5 seconds

### Screen Transitions

Available transition types:
- `fade` - Simple opacity transition
- `slide-left` / `slide-right` - Horizontal slide
- `slide-up` / `slide-down` - Vertical slide
- `scale` - Scale from 0.8 to 1
- `fade-scale` - Combined fade and scale

---

## Sound Effects

Synthesized using Web Audio API:

| Sound | Description |
|-------|-------------|
| `correct` | Ascending arpeggio (C5-E5-G5) |
| `wrong` | Descending sawtooth buzz |
| `win` | Triumphant fanfare with sparkle |
| `lose` | Sad descending tones (G4-F4-E4-C4) |
| `click` | Quick click feedback |
| `join` | Quick ascending chime |
| `leave` | Quick descending chime |

### API

```typescript
import { soundEffects } from './sound-effects';

// Enable/disable sounds
soundEffects.setEnabled(true);

// Set volume (0-1)
soundEffects.setVolume(0.3);

// Play sound
soundEffects.play('correct');
```

---

## Accessibility

### ARIA Live Regions

| Region | Role | Purpose |
|--------|------|---------|
| `word-display-announcer` | `status` (polite) | Letter reveals, word progress |
| `hangman-description` | `img` | Hangman figure state |
| `game-status-announcer` | `alert` (assertive) | Win/lose announcements |

### Keyboard Navigation

- **A-Z**: Direct letter input
- **Tab**: Navigate between buttons
- **Enter/Space**: Select focused element
- **1**: Select "IN" in prediction modal
- **2**: Select "NOT IN" in prediction modal
- **Escape**: Close modals

### Screen Reader Announcements

```
"Letter A, not guessed"
"Revealed letter: E. Word now shows: _ E _ _ E"
"Wrong guess! Head and body now visible. 4 guesses remaining."
"Congratulations! You won! The word was: HELLO"
```

### Visual Accessibility

| State | Background | Border | Opacity |
|-------|------------|--------|---------|
| Unused | Teal (10%) | Teal | 100% |
| Correct | Green (60%) | Green | 80% |
| Wrong | Red (60%) | Red | 80% |

Focus indicators: 3px yellow outline with 2px offset

---

## API Reference

### Core Exports

```typescript
// Game logic
export { createRound, processGuess, calculateScore } from './hangman-logic';
export type { Round, GameConfig } from './hangman-logic';

// Configuration
export {
  GAME_CONFIG,
  SCENE_CONFIG,
  HANGMAN_CONFIG,
  LETTER_TILES_CONFIG,
  WORD_DISPLAY_CONFIG,
  PREDICTION_UI_CONFIG,
  UI_CONFIG,
} from './config';

// Particle effects
export { ParticleEffects } from './particle-effects';

// Sound effects
export { soundEffects } from './sound-effects';
export type { SoundType } from './sound-effects';

// Multiplayer
export { RoomManager } from './multiplayer/room';
export type { Room, PlayerInfo, SpectatorInfo } from './multiplayer/types';

// Prediction UI
export { PredictionUI } from './prediction-ui';
export type { Prediction } from './prediction-ui';

// Screen transitions
export {
  transitionIn,
  transitionOut,
  crossFade,
  slideTransition,
} from './screen-transitions';
```

---

## License

MIT
