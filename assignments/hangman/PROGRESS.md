# Progress
> Auto-maintained by daemon. Do not edit manually.
> Updated: 2026-04-05T18:39:32.034Z

## File Tree
```
public/
  index.html  (17 lines, 0.5KB)
server/
  index.ts  (92 lines, 2.5KB)
src/
  __tests__/
    letter-tiles.test.ts  (153 lines, 3.5KB)
    prediction-ui.test.ts  (115 lines, 3.3KB)
    word-display.test.ts  (139 lines, 3.3KB)
  config.ts  (208 lines, 3.8KB)
  letter-tiles.ts  (247 lines, 7.8KB)
  main.ts  (479 lines, 13.8KB)
  prediction-ui.ts  (114 lines, 3.6KB)
  types.ts  (76 lines, 1.4KB)
  word-display.ts  (147 lines, 4.1KB)
  words.ts  (189 lines, 9.1KB)
package.json  (22 lines, 0.5KB)
PROGRESS.md  (43 lines, 1.2KB)
SPEC.md  (96 lines, 4.4KB)
tasks.txt  (2.0KB)
tsconfig.json  (22 lines, 0.5KB)
vitest.config.ts  (8 lines, 0.1KB)
```

## Tasks
1 done, 15 pending
Next uncompleted:
  [ ] Create src/types.ts with all shared interfaces: GameState, LetterStatus, Prediction, Round, ScoreEntry
  [ ] Implement src/words.ts — 500+ categorised English words, getDifficulty(tier) filter, random picker
  [ ] Implement src/game-state.ts — pure game logic: newRound, guessLetter, applyPrediction, scoring, win/lose detection

## Modified This Session
- `./src/main.ts`
- `./package.json`
- `./src/word-display.ts`

## Current Work
Editing ./src/word-display.ts
