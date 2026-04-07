# Hangman 3D

A modern, immersive 3D hangman game built with Three.js featuring multiplayer support, particle effects, and full accessibility.

## Table of Contents

- [Core Gameplay Mechanics](#core-gameplay-mechanics)
- [Multiplayer Turn Rotation](#multiplayer-turn-rotation)
- [Particle Effects System](#particle-effects-system)
- [Accessibility Features](#accessibility-features)
- [Installation](#installation)
- [Development](#development)

---

## Core Gameplay Mechanics

### Game State Machine

The game is built around a pure state machine (`src/hangman-logic.ts`) that manages the core game loop without UI dependencies.

#### Round State

```typescript
interface Round {
  word: string;              // The word to guess (uppercase)
  category: string;          // Word category (e.g., "animals", "technology")
  difficulty: number;        // Difficulty level (1-5)
  revealedLetters: Set<string>;  // Letters that have been correctly guessed
  wrongGuesses: number;      // Count of incorrect guesses (max 6)
  guessedLetters: Set<string>;   // All letters that have been guessed
  isComplete: boolean;       // Whether the round has ended
  isWon: boolean;            // Whether the player won the round
}
```

#### Guess Processing

1. **Letter Normalization**: All input is converted to uppercase
2. **Idempotency Check**: Repeated guesses are silently ignored
3. **Correct Guess**: Letter is added to `revealedLetters`, check for win condition
4. **Wrong Guess**: Increment `wrongGuesses`, check for loss condition (6 wrong = game over)

#### Win/Loss Conditions

- **Win**: All letters in the word are revealed
- **Loss**: 6 wrong guesses reached

#### Scoring System

| Action | Points |
|--------|--------|
| Correct letter guess | +10 per letter instance |
| Wrong guess penalty | -5 |
| Hint penalty | -5 |
| Minimum score per round | 10 |

#### Difficulty Progression

- Difficulty increases after every 3 consecutive wins
- Maximum difficulty level: 5
- Higher difficulty = longer, more obscure words

---

## Multiplayer Turn Rotation

### Room Management

The multiplayer system (`src/multiplayer/room.ts`) supports up to 8 players per room with spectator support.

#### Room States

```
waiting → playing → finished
```

#### Turn Rotation Rules

1. **Initial Turn**: The player at index 0 (room creator by default) starts
2. **Correct Guess**: The same player continues guessing
3. **Wrong Guess**: Turn passes to the next player in sequence
4. **Round End**: Turn index advances by 1 for the next round

```typescript
// Turn rotation logic
if (!isCorrect && !round.isComplete) {
  room.currentTurnIndex = (room.currentTurnIndex + 1) % playerIds.length;
  round.currentGuesserId = playerIds[room.currentTurnIndex];
}
```

#### Player Roles

| Role | Permissions |
|------|-------------|
| Host | Start game, kick players, change settings |
| Player | Guess letters, use hints, chat |
| Spectator | Watch game, chat (no guessing) |

#### Host Transfer

When the host leaves:
1. First remaining player becomes new host
2. Turn order is preserved
3. Game state is maintained

#### Scoring in Multiplayer

- All players share the same word
- Points awarded to ALL players when word is solved
- Score = `word.length × 10` distributed to each player
- Individual performance tracked via rounds won/played

---

## Particle Effects System

The particle effects system (`src/particle-effects.ts`) provides visual feedback using Three.js.

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
| Gravity | -4 (falls faster) |

#### Ambient Glow Particles

- Emitted continuously behind the hangman figure
- Colors: Cyan, Purple, Blue, White
- Emission rate: ~6-7 particles per second
- Lifetime: 3-5 seconds
- Features pulsing glow effect

### Particle Shapes

Randomly selected for variety:
- **Cubes** (50% probability)
- **Spheres** (30% probability)
- **Tetrahedrons** (20% probability)

### API Methods

```typescript
// Basic emissions
particleEffects.emitWin(position);    // Celebration burst
particleEffects.emitLose(position);   // Somber ash effect

// Advanced emissions
particleEffects.emitConfettiBurst(centerY);  // Multi-point burst
particleEffects.emitSpiral(position, color); // Spiral pattern

// Lifecycle
particleEffects.update(deltaTime, hangmanPosition);  // Animation frame
particleEffects.clear();    // Remove all particles
particleEffects.getActiveCount();  // Current particle count
```

### Configuration

Custom particle effects can be created with:

```typescript
interface ParticleConfig {
  count: number;
  color: number | number[];  // Single color or array
  size: number;
  lifetime: number;          // Milliseconds
  velocity: { x: number; y: number; z: number };
  spread: number;            // Position randomization
  gravity: number;
}
```

---

## Accessibility Features

The accessibility module (`src/accessibility.ts`) provides full keyboard navigation and screen reader support.

### ARIA Live Regions

Three live regions announce game state changes:

| Region | Role | Purpose |
|--------|------|---------|
| `word-display-announcer` | `status` (polite) | Letter reveals, word progress |
| `hangman-description` | `img` | Hangman figure state |
| `game-status-announcer` | `alert` (assertive) | Win/lose announcements |

### Keyboard Navigation

#### Direct Letter Input
- Press any letter key (A-Z) to guess immediately
- Works anywhere on the page (except input fields)

#### On-Screen Keyboard Navigation
- **Tab**: Move between letter buttons
- **Enter/Space**: Select focused letter
- **Arrow Keys**: Navigate between buttons (optional enhancement)

#### Focus Management

```typescript
// Focus trap for modals
const cleanup = createFocusTrap(modalElement);

// Focus first available letter
accessibilityManager.focusFirstUnused();

// Move focus programmatically
accessibilityManager.moveFocusTo(element);
```

### Screen Reader Announcements

#### Letter Selection
```
"Letter A, not guessed"
"Letter B, correct, already guessed"
"Letter C, wrong, already guessed"
```

#### Game Progress
```
"Revealed letter: E. Word now shows: blank, E, blank, blank, E"
"Wrong guess! Head and body now visible. 4 guesses remaining."
```

#### Hangman Figure Description
```
"Hangman figure: head, body, left arm, and right arm visible. 
 4 of 6 wrong guesses used, 2 remaining."
```

#### Game Over
```
"Congratulations! You won! The word was: HELLO"
"Game over! You lost. The word was: GOODBYE"
```

### Visual Accessibility

#### Button States

| State | Background | Border | Opacity |
|-------|------------|--------|---------|
| Unused | Teal (10%) | Teal | 100% |
| Correct | Green (60%) | Green | 80% |
| Wrong | Red (60%) | Red | 80% |

#### Focus Indicators
- 3px yellow outline with 2px offset
- Scale transform on hover (1.1x)
- High contrast colors throughout

### WCAG Compliance

- All interactive elements have descriptive ARIA labels
- Color is not the only indicator of state
- Focus order follows logical reading sequence
- Live regions use appropriate politeness levels

---

## Installation

```bash
# Install dependencies
bun install

# Build the project
bun run build

# Run tests
bun test
```

## Development

```bash
# Start development server
bun run dev

# Run type checking
bun run typecheck

# Run linter
bun run lint
```

---

## Project Structure

```
src/
├── accessibility.ts      # ARIA labels, keyboard navigation
├── config.ts             # Centralized configuration
├── hangman-logic.ts      # Core game state machine
├── particle-effects.ts   # Visual effects system
├── types.ts              # Shared type definitions
├── multiplayer/
│   ├── room.ts           # Room management & turn rotation
│   ├── types.ts          # Multiplayer-specific types
│   ├── sync.ts           # State synchronization
│   └── lobby-ui.ts       # Lobby interface
├── __tests__/            # Unit tests
└── ...
```

---

## License

MIT
