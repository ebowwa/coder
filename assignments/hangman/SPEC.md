# Spelling Prediction Hangman — Three.js

## Concept
A 3D hangman game where the player guesses letters to reveal a hidden word.
Before each guess the player commits a **prediction**: "I think this letter IS / IS NOT in the word."
Correct predictions earn bonus points; wrong predictions cost points independent of the hangman penalty.
This turns vanilla hangman into a two-layered decision: pick the letter AND bet on the outcome.

## Tech Stack
- **Runtime / bundler:** Bun
- **Language:** TypeScript (strict)
- **3D:** Three.js (vanilla, no React-Three-Fiber)
- **Server:** Bun HTTP server — serves static files, provides word list API
- **Storage:** in-memory (no DB)

## Architecture

```
hangman/
├── server/
│   └── index.ts            # Bun HTTP: serves /dist + /api/word
├── src/
│   ├── main.ts             # entry — boots Three.js scene + game loop
│   ├── scene.ts            # Three.js scene, camera, renderer, lights, resize
│   ├── gallows.ts          # 3D gallows model (boxes/cylinders)
│   ├── hangman-figure.ts   # 3D body parts, added one-by-one on wrong guess
│   ├── letter-tiles.ts     # 3D letter tiles (A-Z) the player clicks to guess
│   ├── word-display.ts     # 3D text meshes showing _ _ _ pattern + revealed letters
│   ├── prediction-ui.ts    # Overlay: before guess commits, "IN / NOT IN" toggle + confirm
│   ├── scoreboard.ts       # HUD: score, streak, lives remaining, round number
│   ├── game-state.ts       # Pure logic: word selection, guess processing, scoring, win/lose
│   ├── words.ts            # Built-in word list (500+ English words, categorised by difficulty)
│   └── types.ts            # Shared types
├── public/
│   └── index.html          # Shell HTML — loads /dist/main.js
├── package.json
└── tsconfig.json
```

## Game Rules

1. A random word is chosen. Difficulty increases each round (longer words, rarer letters).
2. The 3D scene shows an empty gallows and 26 clickable letter tiles orbiting below.
3. Player clicks a letter tile. Before the guess resolves, a modal asks:
   - "Do you predict **[letter]** IS in the word or NOT in the word?"
   - Two buttons: **IN** / **NOT IN**
4. After prediction:
   - If letter IS in the word → reveal all instances, letter tile turns green.
   - If letter is NOT in the word → one body part is added to the hangman, tile turns red.
5. Scoring:
   - Correct letter guess: +10 per revealed instance
   - Correct prediction: +5 bonus
   - Wrong prediction: −3 penalty
   - Solve the word: +50
   - Each remaining life at solve: +10
6. 6 wrong letter guesses = hanged = game over for that round.
7. After win or loss, "Next Round" advances difficulty. Score carries across rounds.

## 3D Requirements

- **Gallows:** static geometry (base, upright, beam, support strut, rope) from box/cylinder primitives.
- **Hangman figure:** head (sphere), body (cylinder), 2 arms (cylinders), 2 legs (cylinders) — 6 parts matching 6 lives. Each part fades in with a short scale tween.
- **Letter tiles:** 26 floating rounded-box tiles with extruded text. Arranged in a curved arc. On hover: glow outline. On click: triggers prediction flow. After use: green (correct) / red (wrong) + sink away.
- **Word display:** row of box pedestals with extruded letter mesh. Unrevealed = pedestal only. Revealed = letter rises from pedestal with bounce.
- **Camera:** slight orbit (auto-rotate) with damped orbit controls so the player can look around.
- **Lighting:** hemisphere light + directional with soft shadows on the gallows platform.
- **Background:** dark gradient (CSS) or subtle skybox.

## Server

`GET /api/word?difficulty=1..5` → `{ word: string; category: string; difficulty: number }`

Picks a random word from the built-in list filtered by difficulty tier:
- 1: 3-4 letter common words
- 2: 5-6 letters
- 3: 7-8 letters
- 4: 9-10 letters
- 5: 11+ letters

Static file serving for everything under `/dist` and `/public`.

## Build

```bash
bun install
bun build src/main.ts --outdir dist --target browser --minify
bun run server/index.ts
# → http://localhost:3000
```

## Constraints
- Zero external UI frameworks — DOM overlays for prediction modal + scoreboard are vanilla TS.
- Three.js geometries only — no GLTF loading, no external model files.
- Must work in Chrome/Safari/Firefox latest.
- All game state is client-side. Server only provides words.
