# Hangman Project Visual Documentation

## Project Overview

The Hangman project is a comprehensive 3D spelling prediction game built with TypeScript and Three.js. It features both single-player and multiplayer modes with a full SaaS platform architecture.

![Hangman Game Visualization](visualization.html)

## Key Features

### 🎮 Game Modes
- **Single Player**: Progressive difficulty, hints system, particle effects
- **Multiplayer**: Real-time WebSocket sync, turn-based gameplay, tournaments

### 🏗️ SaaS Platform
- User authentication
- Dashboard with stats and leaderboard
- Friends system
- Profile management
- Tournament brackets

### ♿ Accessibility
- Full keyboard navigation
- Screen reader support
- ARIA labels
- Focus management

## Architecture

```
src/
├── main.ts                    # Entry point & game initialization
├── dashboard.ts               # Home page (no tests)
├── word-display.ts           # 3D word display (no tests)
├── letter-tiles.ts            # Interactive letter board
├── hangman-logic.ts           # Core game logic
├── multiplayer/               # Multiplayer features
├── components/                # UI components
└── types.ts                   # TypeScript definitions
```

## Technology Stack
- **Three.js** - 3D graphics and animations
- **Bun** - Runtime and bundler
- **TypeScript** - Type safety
- **WebSocket** - Real-time multiplayer
- **Vitest** - Testing framework
- **jsdom** - DOM testing environment

## Build Status
✅ Build passes (bun run build)
⚠️ TypeScript errors in test files (不影响构建)
🎯 Server running at http://localhost:3000

## 2026-04-14T20:19:18.421Z -- Task `task_1776197270128_vx7uoc` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 399061ms

![auth-mobile](visuals/auth-mobile-2026-04-14T20-12-39-348Z.png)

> (no analysis)

---

## 2026-04-14T20:19:49.351Z -- Task `task_1776196987466_lkfi5z` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 69610ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-14T20-18-39-704Z.png)

> The UI for route "#leaderboard" is not rendered; this image shows a "Multiplayer Mode" setup screen instead. Visible components include name input, color selectors, "Create New Room", "Join as Player/Spectator", and "Play Single Player" buttons. Error: Incorrect route displayed (not "#leaderboard").

---

## 2026-04-14T20:20:52.845Z -- Task `task_1776197270128_vx7uoc` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 94374ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-14T20-19-18-448Z.png)

> (no analysis)

---

## 2026-04-14T20:23:37.494Z -- Task `task_1776196987466_lkfi5z` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 119405ms

![game-mobile](visuals/game-mobile-2026-04-14T20-21-38-067Z.png)

> The UI is rendered. Visible components include "Hangman" title, "Multiplayer Mode" subtitle, name input, color selection circles, "Create New Room" button, "OR" text, room code input, "Join as Player"/"Join as Spectator"/"Play Single Player" buttons, and "Not connected" status. No errors detected.

---

## 2026-04-14T20:23:38.336Z -- Task `task_1776197270128_vx7uoc` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 74238ms

![lobby-desktop](visuals/lobby-desktop-2026-04-14T20-22-24-098Z.png)

> Visible components: Name input, color selector, "Create New Room" button, "OR" divider, room code input, "Join as Player", "Join as Spectator", "Play Single Player" buttons. No rendering errors; all elements display properly.

---

## 2026-04-14T20:24:06.531Z -- Task `task_1776197270128_vx7uoc` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 28190ms

![lobby-mobile](visuals/lobby-mobile-2026-04-14T20-23-38-336Z.png)

> The UI is not rendered (shows connection error). Visible components: error icon, “This site can’t be reached” text, “localhost refused to connect” message, troubleshooting steps, error code, and “Details” button. Error: Connection refused (ERR_CONNECTION_REFUSED), so lobby content isn’t displayed.

---

## 2026-04-14T20:24:25.061Z -- Task `task_1776197270128_vx7uoc` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 18478ms

![profile-desktop](visuals/profile-desktop-2026-04-14T20-24-06-545Z.png)

> The UI is not rendered; the browser displays a connection error page instead of the profile route. Visible components include the error message ("This site can’t be reached"), "localhost refused to connect," troubleshooting steps, "ERR_CONNECTION_REFUSED," and "Details"/"Reload" buttons.

---

## 2026-04-14T20:25:55.084Z -- Task `task_1776197270128_vx7uoc` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 30890ms

![friends-desktop](visuals/friends-desktop-2026-04-14T20-25-24-194Z.png)

> Visible components: Error icon, “This site can’t be reached” text, “localhost refused to connect.” message, bullet points (“Checking the connection”, “Checking the proxy and the firewall”), “ERR_CONNECTION_REFUSED” code, “Details” and “Reload” buttons.  
> Errors: Site failed to load (connection refused); no app UI for “#friends” route is rendered.

---

## 2026-04-14T20:26:54.411Z -- Task `task_1776197270128_vx7uoc` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 59224ms

![friends-mobile](visuals/friends-mobile-2026-04-14T20-25-55-100Z.png)

> The UI is not rendered as intended; instead, a connection error page appears. Visible components include the error icon, “This site can’t be reached” text, “localhost refused to connect” message, troubleshooting steps, error code (ERR_CONNECTION_REFUSED), and a “Details” button. Error: Connection refused, preventing access to the #friends route content.

---

## 2026-04-14T20:27:58.953Z -- Task `task_1776197270128_vx7uoc` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 64334ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-14T20-26-54-615Z.png)

> The UI is not rendered as expected; instead, a connection error page appears. Visible components include the error message “This site can’t be reached”, “localhost refused to connect”, troubleshooting steps, “ERR_CONNECTION_REFUSED” code, “Details” and “Reload” buttons. Error: Connection failure prevents accessing the leaderboard route.

---

## 2026-04-14T20:28:33.793Z -- Task `task_1776197270128_vx7uoc` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 34819ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-14T20-27-58-972Z.png)

> The UI is not rendered as intended; an error page appears. Visible components: error icon, “This site can’t be reached” text, “localhost refused to connect” message, “Try:” section with bullet points, error code, and “Details” button. Error: Connection refused (ERR_CONNECTION_REFUSED) prevents loading the #leaderboard UI.

---

## 2026-04-14T20:29:17.829Z -- Task `task_1776197270128_vx7uoc` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 44019ms

![game-desktop](visuals/game-desktop-2026-04-14T20-28-33-801Z.png)

> No, the UI for route "#game" is not rendered—it displays a "This site can’t be reached" error page. Visible components include the error icon, message text, bullet points ("Checking the connection," "Checking the proxy and the firewall"), "ERR_CONNECTION_REFUSED" code, and "Details"/"Reload" buttons. Error: Connection refused (site unreachable).

---

## 2026-04-14T20:31:41.821Z -- Task `task_1776197544233_3a19sn` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 92497ms

![home-mobile](visuals/home-mobile-2026-04-14T20-30-09-322Z.png)

> The UI is not rendered; it shows a browser error page. Visible components: error icon, “This site can’t be reached” text, “localhost refused to connect” message, “Try:” section with bullet points, error code, and “Details” button.

---

## 2026-04-14T20:32:26.856Z -- Task `task_1776197544233_3a19sn` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 44994ms

![auth-desktop](visuals/auth-desktop-2026-04-14T20-31-41-829Z.png)

> The UI for route "#auth" is not rendered; instead, a connection error page appears. Visible components include the error icon, "This site can’t be reached" text, "localhost refused to connect" message, troubleshooting steps, "ERR_CONNECTION_REFUSED" code, and "Details"/"Reload" buttons. Error: Connection failure prevents auth UI from loading.

---

## 2026-04-14T20:33:11.915Z -- Task `task_1776197544233_3a19sn` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 45049ms

![auth-mobile](visuals/auth-mobile-2026-04-14T20-32-26-865Z.png)

> The UI is not rendered (shows connection error). Visible components: error icon, “This site can’t be reached” text, “localhost refused to connect”, “Try:” section (bullets), “ERR_CONNECTION_REFUSED”, “Details” button. Error: Connection refused, so auth route UI failed to load.

---

## 2026-04-14T20:33:49.745Z -- Task `task_1776197544233_3a19sn` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 37815ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-14T20-33-11-927Z.png)

> The UI is not rendered; it shows a connection error page. Visible components: error icon, “This site can’t be reached” text, “localhost refused to connect” message, troubleshooting steps, ERR_CONNECTION_REFUSED code, Details button, Reload button. Error: Connection refused (ERR_CONNECTION_REFUSED).

---

## 2026-04-14T20:34:20.555Z -- Task `task_1776197544233_3a19sn` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 30799ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-14T20-33-49-755Z.png)

> The UI for #dashboard is not rendered; an error page displays instead. Visible components: error icon, “This site can’t be reached” text, “localhost refused to connect.” message, “Try:” section (bullet points), “ERR_CONNECTION_REFUSED”, and a “Details” button. Error: Connection refused, preventing dashboard load.

---

## 2026-04-14T20:34:51.801Z -- Task `task_1776197544233_3a19sn` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 31233ms

![lobby-desktop](visuals/lobby-desktop-2026-04-14T20-34-20-566Z.png)

> The UI is not rendered; it shows a connection error page. Visible components: error icon, “This site can’t be reached” text, “localhost refused to connect” message, troubleshooting steps, ERR_CONNECTION_REFUSED code, Details button, Reload button. Error: Connection refused (site unreachable).

---

## 2026-04-14T20:35:32.954Z -- Task `task_1776197544233_3a19sn` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 41111ms

![lobby-mobile](visuals/lobby-mobile-2026-04-14T20-34-51-832Z.png)

> The UI is not the intended lobby; it’s an error page. Visible components: error icon, “This site can’t be reached” text, “localhost refused to connect” message, troubleshooting steps, error code, and “Details” button. Error: Connection refused (ERR_CONNECTION_REFUSED), so lobby content isn’t rendered.

---

## 2026-04-14T20:36:00.780Z -- Task `task_1776197544233_3a19sn` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 27725ms

![profile-desktop](visuals/profile-desktop-2026-04-14T20-35-33-046Z.png)

> The UI is not rendered; only an error page with “This site can’t be reached” message, “Details” and “Reload” buttons are visible. Error: ERR_CONNECTION_REFUSED (localhost refused to connect).

---

## 2026-04-14T20:36:29.791Z -- Task `task_1776197544233_3a19sn` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 28981ms

![profile-mobile](visuals/profile-mobile-2026-04-14T20-36-00-801Z.png)

> The UI is not rendered; an error page appears instead. Visible components: error message ("This site can’t be reached"), suggestions (checking connection, proxy/firewall), error code (ERR_CONNECTION_REFUSED), and a "Details" button. Error: Connection refused, preventing the profile UI from loading.

---

## 2026-04-14T20:36:57.719Z -- Task `task_1776197544233_3a19sn` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 27852ms

![friends-desktop](visuals/friends-desktop-2026-04-14T20-36-29-814Z.png)

> The UI is not rendered (shows connection error). Visible components: error icon, “This site can’t be reached” text, “localhost refused to connect” message, bullet points, “ERR_CONNECTION_REFUSED”, Details button, Reload button. Error: Connection refused, so app UI failed to load.

---

## 2026-04-14T20:37:11.355Z -- Task `task_1776197544233_3a19sn` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 13579ms

![friends-mobile](visuals/friends-mobile-2026-04-14T20-36-57-763Z.png)

> The UI is not rendered as intended; an error page appears. Visible components: error icon, “This site can’t be reached” text, “localhost refused to connect.” message, “Try:” section (with bullet points), “ERR_CONNECTION_REFUSED” code, and “Details” button. Error: Connection failure prevents loading the #friends route UI.

---

## 2026-04-14T20:37:36.149Z -- Task `task_1776197544233_3a19sn` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 24767ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-14T20-37-11-379Z.png)

> No, the UI is not rendered; it shows a connection error page. Visible components: error icon, “This site can’t be reached” text, “localhost refused to connect.” message, bullet points (“Checking the connection”, “Checking the proxy and the firewall”), “ERR_CONNECTION_REFUSED” code, “Details” and “Reload” buttons. Error: Connection refused (ERR_CONNECTION_REFUSED).

---

## 2026-04-14T20:38:12.017Z -- Task `task_1776197544233_3a19sn` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 35854ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-14T20-37-36-153Z.png)

> The UI is not rendered as intended; an error page appears instead. Visible components include the error icon, “This site can’t be reached” text, “localhost refused to connect” message, troubleshooting steps, error code, and a “Details” button. Error: The site failed to load, preventing the leaderboard UI from displaying.

---

## 2026-04-14T20:38:36.593Z -- Task `task_1776197544233_3a19sn` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 24490ms

![game-desktop](visuals/game-desktop-2026-04-14T20-38-12-079Z.png)

> No, the UI is not rendered; the browser shows a connection error page. Visible components: error icon, “This site can’t be reached” text, “localhost refused to connect” message, troubleshooting steps, ERR_CONNECTION_REFUSED code, Details button, Reload button. Error: Connection refused prevents loading the game UI.

---

## 2026-04-14T20:38:54.762Z -- Task `task_1776197544233_3a19sn` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 18142ms

![game-mobile](visuals/game-mobile-2026-04-14T20-38-36-620Z.png)

> Yes, but it’s an error page. Visible components: error icon, “This site can’t be reached” text, “localhost refused to connect” message, “Try:” bullet points, “ERR_CONNECTION_REFUSED” code, and “Details” button. Error: connection refused, so the intended game UI isn’t loaded.

---

## 2026-04-14T20:44:41.991Z -- Task `task_1776198736620_7ge1ff` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 29087ms

![home-desktop](visuals/home-desktop-2026-04-14T20-44-12-893Z.png)

> Visible components: Name input, color selector, "Create New Room" button, "OR" divider, room code input, "Join as Player", "Join as Spectator", "Play Single Player" buttons. No rendering errors observed.

---

## 2026-04-14T20:45:00.075Z -- Task `task_1776198736620_7ge1ff` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 18042ms

![home-mobile](visuals/home-mobile-2026-04-14T20-44-42-003Z.png)

> Yes, UI is rendered. Visible components: Hangman title, Multiplayer Mode subtitle, name input, color circles, “Create New Room” button, “OR” text, room code input, “Join as Player/Spectator” buttons, “Play Single Player” button, “Not connected” status. No errors.

---

## 2026-04-14T20:45:38.599Z -- Task `task_1776198736620_7ge1ff` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 38419ms

![auth-desktop](visuals/auth-desktop-2026-04-14T20-45-00-179Z.png)

> Visible components: Name input, color selector, "Create New Room" button, "OR" separator, room code input, "Join as Player", "Join as Spectator", "Play Single Player" buttons. No rendering errors detected.

---
