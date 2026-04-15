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

## 2026-04-14T20:45:53.533Z -- Task `task_1776198736620_7ge1ff` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 14930ms

![auth-mobile](visuals/auth-mobile-2026-04-14T20-45-38-603Z.png)

> Yes, UI is rendered. Visible components: Hangman title, Multiplayer Mode subtitle, name input, color picker, Create New Room button, OR divider, room code input, Join as Player/Join as Spectator/Play Single Player buttons, Not connected status. No errors.

---

## 2026-04-14T20:51:14.247Z -- Task `task_1776198736620_7ge1ff` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 320693ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-14T20-45-53-534Z.png)

> The UI does not render the expected #dashboard; it shows a multiplayer setup interface. Visible components include name input, color selector, “Create New Room” button, room code input, “Join as Player,” “Join as Spectator,” and “Play Single Player.” Error: Route mismatch (incorrect UI for #dashboard).

---

## 2026-04-15T03:53:31.947Z -- Task `task_1776198736620_7ge1ff` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 67950ms

![profile-mobile](visuals/profile-mobile-2026-04-15T03-52-23-969Z.png)

> (no analysis)

---

## 2026-04-15T03:55:37.415Z -- Task `task_1776198736620_7ge1ff` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 80346ms

![friends-mobile](visuals/friends-mobile-2026-04-15T03-54-17-062Z.png)

> (no analysis)

---

## 2026-04-15T16:49:13.811Z -- Task `task_1776227469843_xg7ywl` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 10679ms

![home-desktop](visuals/home-desktop-2026-04-15T16-49-03-132Z.png)

> Visible components: Name input ("LuckyTiger12"), color selector, "Create New Room" button, "OR" divider, room code input, "Join as Player"/"Join as Spectator"/"Play Single Player" buttons. No rendering errors detected.

---

## 2026-04-15T16:49:22.925Z -- Task `task_1776227469843_xg7ywl` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 9112ms

![home-mobile](visuals/home-mobile-2026-04-15T16-49-13-814Z.png)

> Yes, UI is rendered. Visible components: Hangman title, Multiplayer Mode subtitle, name input (SwiftDragon14), color circles, Create New Room button, OR text, room code input, Join as Player/Join as Spectator buttons, Play Single Player button, Not connected status. No errors.

---

## 2026-04-15T16:49:31.320Z -- Task `task_1776227469843_xg7ywl` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 8394ms

![auth-desktop](visuals/auth-desktop-2026-04-15T16-49-22-926Z.png)

> Visible components: Name input, color selector, "Create New Room" button, "OR" divider, room code input, "Join as Player", "Join as Spectator", "Play Single Player" buttons. No rendering errors; all elements display properly.

---

## 2026-04-15T16:49:40.165Z -- Task `task_1776227469843_xg7ywl` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 8845ms

![auth-mobile](visuals/auth-mobile-2026-04-15T16-49-31-320Z.png)

> Visible components: Title "Hangman", subtitle "Multiplayer Mode", name input ("BraveLion62"), color picker (7 colors), "Create New Room" button, "OR" divider, room code input, "Join as Player"/"Spectator" buttons, "Play Single Player" button, "Not connected" status. No rendering errors.

---

## 2026-04-15T16:49:50.904Z -- Task `task_1776227469843_xg7ywl` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 10739ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T16-49-40-165Z.png)

> The UI is rendered but may not match the "#dashboard" route (shows multiplayer setup instead). Visible components: name input, color selector, "Create New Room", "Join as Player", "Join as Spectator", "Play Single Player" buttons, room code input. Error: Incorrect route content (expected dashboard, got multiplayer setup).

---

## 2026-04-15T16:50:00.406Z -- Task `task_1776227469843_xg7ywl` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 9501ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T16-49-50-905Z.png)

> The UI is not the expected "#dashboard"—it’s a Hangman multiplayer setup screen. Visible components include the title, name/color inputs, buttons (Create New Room, Join as Player/Spectator, Play Single Player), and connection status. Error: Route mismatch (shows Hangman instead of dashboard).

---

## 2026-04-15T16:50:08.292Z -- Task `task_1776227469843_xg7ywl` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 7883ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T16-50-00-408Z.png)

> Yes, the UI is rendered. Visible components include a name input field, color selection circles, "Create New Room" button, "OR" divider, room code input, "Join as Player", "Join as Spectator", and "Play Single Player" buttons. No errors observed.

---

## 2026-04-15T16:50:17.216Z -- Task `task_1776227469843_xg7ywl` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 8923ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T16-50-08-292Z.png)

> The UI is rendered. Visible components: "Hangman" title, "Multiplayer Mode" subtitle, name input ("MightyTiger99"), color selector, "Create New Room" button, "OR" text, room code input, "Join as Player"/"Join as Spectator"/"Play Single Player" buttons, "Not connected" status. No errors detected.

---

## 2026-04-15T16:50:26.928Z -- Task `task_1776227469843_xg7ywl` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 9711ms

![profile-desktop](visuals/profile-desktop-2026-04-15T16-50-17-216Z.png)

> The UI renders a multiplayer setup screen (not profile). Visible: name input, color circles, “Create New Room”/“Join as Player”/etc. buttons. Error: Content mismatches “#profile” route (shows multiplayer setup instead).

---

## 2026-04-15T16:50:40.740Z -- Task `task_1776227469843_xg7ywl` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 13812ms

![profile-mobile](visuals/profile-mobile-2026-04-15T16-50-26-928Z.png)

> Yes, UI is rendered. Visible components: “Hangman” title, “Multiplayer Mode” subtitle, name input, color circles, action buttons, room code field, and connection status; no errors detected.

---

## 2026-04-15T16:50:55.296Z -- Task `task_1776227469843_xg7ywl` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 14555ms

![friends-desktop](visuals/friends-desktop-2026-04-15T16-50-40-741Z.png)

> Got it, let's check the problem. The user is asking about the "#friends" route on desktop 1280x720. First, I need to see if the UI is rendered. Wait, the image provided shows a multiplayer mode screen with name input, color selection, create/join room buttons. But the question is about the "#friends" route—maybe there's a mismatch? Wait, no, maybe the image is for a different route? Wait, the user said "Route '#friends'", but the image shows a multiplayer setup. So first, is the UI rendered? The image has components: name input (CleverPanda74), color circles, Create New Room button, OR text, Room Code input, Join as Player/ Spectator buttons, Play Single Player. But wait, is this the #friends route? Maybe the image is not matching the route. But the user might have a mistake, but we need to answer based on the given info. Wait, the question says "Is the UI rendered?"—yes, because there are visible components. Then list visible components: Name input field, color selection circles, Create New Room button, OR separator, Room Code input field, Join as Player button, Join as Spectator button, Play Single Player button. Errors? Maybe the route doesn't match (since it's showing multiplayer instead of friends), but the user asked for errors. Wait, maybe the image is correct, but the route is wrong? Or maybe the UI is rendered but the content is for a different route. But the user wants concise answers. Let me structure:
> 
> First sentence: Yes, UI is rendered. Visible components include name input, color selector, Create New Room button, OR divider, room code input, join player/spectator buttons, play single player button.
> 
> Second sentence: No obvious rendering errors, but content may not align with "#friends" route (shows multiplayer setup instead).
> 
> Wait, but the user said "any errors"—so maybe the route is incorrect, but that's a content error. Alternatively, maybe the image is for a different route, so the UI is rendered but the content is wrong. But the user wants to know if the UI is rendered (yes) and list components, then errors. Let me make sure:
> 
> Visible components: Your Name input (with value CleverPanda74), Your Color circle options, Create New Room button, OR text, Room Code (4 digits) input, Join as Player button, Join as Spectator button, Play Single Player

---

## 2026-04-15T16:51:06.253Z -- Task `task_1776227469843_xg7ywl` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 10957ms

![friends-mobile](visuals/friends-mobile-2026-04-15T16-50-55-296Z.png)

> The UI for route "#friends" is not rendered; the current view shows "Hangman Multiplayer Mode" instead. Visible components include name/color inputs, room creation/joining options, and single-player button—mismatched with the "#friends" route.

---

## 2026-04-15T16:51:16.186Z -- Task `task_1776227469843_xg7ywl` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 9932ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T16-51-06-254Z.png)

> The UI shown is not the #leaderboard route; it displays a multiplayer setup screen. Visible components include name/color inputs, create/join room buttons, and single-player option. Error: Incorrect route rendered (not leaderboard).

---

## 2026-04-15T16:51:26.221Z -- Task `task_1776227469843_xg7ywl` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 10035ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T16-51-16-186Z.png)

> The UI shown is for Hangman Multiplayer Mode, not the #leaderboard route. Visible components include the title, name/color inputs, buttons (Create New Room, Join as Player/Spectator, Play Single Player), and connection status. Error: Incorrect route content (shows multiplayer setup instead of leaderboard).

---

## 2026-04-15T16:51:34.750Z -- Task `task_1776227469843_xg7ywl` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 8528ms

![game-desktop](visuals/game-desktop-2026-04-15T16-51-26-222Z.png)

> Visible components: Name input ("CleverDragon14"), color selector, "Create New Room" button, "OR" text, room code input, "Join as Player", "Join as Spectator", "Play Single Player" buttons. No rendering errors—all elements display properly.

---

## 2026-04-15T16:51:42.811Z -- Task `task_1776227469843_xg7ywl` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 8060ms

![game-mobile](visuals/game-mobile-2026-04-15T16-51-34-751Z.png)

> The UI is rendered. Visible components include title, name input, color options, buttons (Create New Room, Join as Player/Spectator, Play Single Player), room code field, and connection status. No errors detected.

---

## 2026-04-15T16:53:17.638Z -- Task `task_1776271844862_6tgkc3` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 8218ms

![home-desktop](visuals/home-desktop-2026-04-15T16-53-09-420Z.png)

> Visible components: Name input (QuickPhoenix78), color selector, "Create New Room" button, "OR" divider, room code input, "Join as Player", "Join as Spectator", "Play Single Player" buttons. No rendering errors.

---

## 2026-04-15T16:53:26.548Z -- Task `task_1776271844862_6tgkc3` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 8906ms

![home-mobile](visuals/home-mobile-2026-04-15T16-53-17-642Z.png)

> Yes, UI is rendered. Visible components: "Hangman" title, "Multiplayer Mode" subtitle, name input ("CleverEagle15"), color selection circles, "Create New Room" button, "OR" separator, room code input, "Join as Player"/"Join as Spectator"/"Play Single Player" buttons, "Not connected" status. No errors detected.

---

## 2026-04-15T16:53:34.740Z -- Task `task_1776271844862_6tgkc3` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 8192ms

![auth-desktop](visuals/auth-desktop-2026-04-15T16-53-26-548Z.png)

> Visible components: Name input, color selector, “Create New Room” button, “OR” divider, room code input, “Join as Player,” “Join as Spectator,” “Play Single Player” buttons. No rendering errors; all elements display properly.

---

## 2026-04-15T16:53:44.161Z -- Task `task_1776271844862_6tgkc3` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 9420ms

![auth-mobile](visuals/auth-mobile-2026-04-15T16-53-34-741Z.png)

> Visible components: Title “Hangman”, “Multiplayer Mode” subtitle, name input (“BraveBear45”), color selector, “Create New Room” button, “OR” text, room code input, “Join as Player/Spectator” buttons, “Play Single Player” button, “Not connected” status. No rendering errors—all elements display properly.

---

## 2026-04-15T16:53:53.070Z -- Task `task_1776271844862_6tgkc3` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 8908ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T16-53-44-162Z.png)

> Visible components: Name input (MightyWolf89), color selection circles, "Create New Room" button, "OR" divider, room code input, "Join as Player", "Join as Spectator", "Play Single Player" buttons. No rendering errors.

---

## 2026-04-15T16:54:01.791Z -- Task `task_1776271844862_6tgkc3` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 8720ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T16-53-53-071Z.png)

> The UI is rendered. Visible components include the "Hangman" title, name/color inputs, buttons ("Create New Room", "Join as Player", etc.), and "Not connected" status. No errors detected.

---

## 2026-04-15T16:54:09.968Z -- Task `task_1776271844862_6tgkc3` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 8173ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T16-54-01-795Z.png)

> Visible components: Name input, color selector, "Create New Room" button, "OR" divider, room code input, "Join as Player", "Join as Spectator", "Play Single Player" buttons. No rendering errors; all elements display properly.

---

## 2026-04-15T16:54:18.796Z -- Task `task_1776271844862_6tgkc3` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 8826ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T16-54-09-969Z.png)

> The UI is rendered. Visible components include the "Hangman" title, name/color inputs, color circles, "Create New Room"/"Join as Player"/etc. buttons, and "Not connected" status. No errors detected.

---

## 2026-04-15T16:54:29.117Z -- Task `task_1776271844862_6tgkc3` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 10321ms

![profile-desktop](visuals/profile-desktop-2026-04-15T16-54-18-796Z.png)

> The UI shows a multiplayer setup screen (not profile) with components: name input, color selector, "Create New Room" button, room code input, and join/play buttons. Error: Mismatched route—#profile renders multiplayer setup instead of profile content.

---

## 2026-04-15T16:54:38.947Z -- Task `task_1776271844862_6tgkc3` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 9829ms

![profile-mobile](visuals/profile-mobile-2026-04-15T16-54-29-118Z.png)

> The UI is rendered. Visible components: "Hangman" title, "Multiplayer Mode" subtitle, name input field ("HappyDragon23"), color selection circles, "Create New Room" button, "OR" text, room code input, "Join as Player"/"Spectator" buttons, "Play Single Player" button, "Not connected" status. No errors.

---

## 2026-04-15T16:54:53.284Z -- Task `task_1776271844862_6tgkc3` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 14336ms

![friends-desktop](visuals/friends-desktop-2026-04-15T16-54-38-948Z.png)

> Yes, the UI is rendered. Visible components: name input ("CleverLion23"), color selection circles, "Create New Room" button, "OR" divider, room code input, "Join as Player"/"Join as Spectator" buttons, "Play Single Player" button. No obvious rendering errors, though the displayed content (multiplayer setup) may not align with the "#friends" route intent.

---

## 2026-04-15T16:55:01.887Z -- Task `task_1776271844862_6tgkc3` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 8601ms

![friends-mobile](visuals/friends-mobile-2026-04-15T16-54-53-285Z.png)

> Visible components: Hangman title, Multiplayer Mode subtitle, name input, color selector, Create New Room button, OR text, room code input, Join as Player/Join as Spectator buttons, Play Single Player button, Not connected status. No rendering errors observed.

---

## 2026-04-15T16:55:12.638Z -- Task `task_1776271844862_6tgkc3` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 10751ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T16-55-01-887Z.png)

> The UI for "#leaderboard" is not rendered (current view is multiplayer room setup). Visible components: name input, color circles, "Create New Room", "Join as Player", etc. Error: Route mismatch (shows room setup instead of leaderboard).

---

## 2026-04-15T16:55:26.823Z -- Task `task_1776271844862_6tgkc3` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 14184ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T16-55-12-639Z.png)

> The UI is not rendering the #leaderboard route; instead, it shows a Hangman multiplayer setup screen. Visible components include the title, name/color inputs, buttons (Create New Room, Join as Player/Spectator, Play Single Player), and status text. Error: Incorrect route displayed (not leaderboard).

---

## 2026-04-15T16:55:34.759Z -- Task `task_1776271844862_6tgkc3` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 7933ms

![game-desktop](visuals/game-desktop-2026-04-15T16-55-26-825Z.png)

> Visible components: Name input, color selector, "Create New Room" button, "OR" divider, room code input, "Join as Player", "Join as Spectator", "Play Single Player" buttons. No rendering errors; all elements display properly.

---

## 2026-04-15T16:55:38.827Z -- Task `task_1776272091801_vwu2q5` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 16034ms

![home-desktop](visuals/home-desktop-2026-04-15T16-55-22-793Z.png)

> Yes, the UI is rendered. Visible components include a name input field ("HappyWolf31"), color selection circles, "Create New Room" button, "OR" separator, room code input, "Join as Player", "Join as Spectator", and "Play Single Player" buttons. No errors observed.

---

## 2026-04-15T16:55:47.761Z -- Task `task_1776271844862_6tgkc3` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 13002ms

![game-mobile](visuals/game-mobile-2026-04-15T16-55-34-759Z.png)

> Yes, UI is rendered. Visible components: "Hangman" title, "Multiplayer Mode" subtitle, name input ("LuckyPanda31"), color selection circles, "Create New Room" button, "OR" text, room code input, "Join as Player"/"Join as Spectator"/"Play Single Player" buttons, "Not connected" status. No errors observed.

---

## 2026-04-15T16:55:47.840Z -- Task `task_1776272091801_vwu2q5` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 9013ms

![home-mobile](visuals/home-mobile-2026-04-15T16-55-38-827Z.png)

> The UI is rendered. Visible components include "Hangman" title, "Multiplayer Mode" text, name input, color selection circles, "Create New Room" button, "OR" separator, room code input, "Join as Player"/"Join as Spectator"/"Play Single Player" buttons, and "Not connected" status. No errors detected.

---

## 2026-04-15T16:55:54.625Z -- Task `task_1776272091801_vwu2q5` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 6785ms

![auth-desktop](visuals/auth-desktop-2026-04-15T16-55-47-840Z.png)

> The UI is not rendered; the browser shows a connection error page instead of the auth interface. Visible components: error icon, “This site can’t be reached” text, “localhost refused to connect” message, troubleshooting steps, “ERR_CONNECTION_REFUSED” code, “Details” and “Reload” buttons. Error: Connection refused, preventing auth UI from loading.

---

## 2026-04-15T16:56:01.281Z -- Task `task_1776272091801_vwu2q5` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 6655ms

![auth-mobile](visuals/auth-mobile-2026-04-15T16-55-54-626Z.png)

> The UI is not rendered (shows connection error). Visible components: error icon, “This site can’t be reached” text, “localhost refused to connect”, “Try:” section (bullets), “ERR_CONNECTION_REFUSED”, Details button. Error: Connection refused, so auth UI fails to load.

---

## 2026-04-15T16:56:07.425Z -- Task `task_1776272091801_vwu2q5` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 6143ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T16-56-01-282Z.png)

> The UI is not rendered; it shows a connection error page. Visible components: error icon, “This site can’t be reached” text, “localhost refused to connect” message, troubleshooting steps, ERR_CONNECTION_REFUSED code, Details and Reload buttons. Error: Connection refused.

---

## 2026-04-15T16:56:14.081Z -- Task `task_1776272091801_vwu2q5` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 6656ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T16-56-07-425Z.png)

> The UI for "#dashboard" is not rendered; instead, an error page appears. Visible components include the error icon, "This site can’t be reached" text, "localhost refused to connect" message, troubleshooting steps, and a "Details" button. Error: Connection refused (ERR_CONNECTION_REFUSED).

---

## 2026-04-15T16:56:20.225Z -- Task `task_1776272091801_vwu2q5` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 6143ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T16-56-14-082Z.png)

> The UI is not rendered as intended; it shows a connection error page instead. Visible components: error icon, "This site can’t be reached" text, "localhost refused to connect" message, troubleshooting steps, ERR_CONNECTION_REFUSED code, Details button, Reload button. Error: Connection refused (ERR_CONNECTION_REFUSED).

---

## 2026-04-15T16:56:27.086Z -- Task `task_1776272091801_vwu2q5` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 6861ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T16-56-20-225Z.png)

> The UI is not rendered; it shows a connection error page instead of the lobby interface. Visible components include the error message “This site can’t be reached”, “localhost refused to connect” text, troubleshooting steps, “ERR_CONNECTION_REFUSED” code, and a “Details” button. Error: The lobby UI failed to load, displaying a connection refusal error.

---

## 2026-04-15T16:56:34.051Z -- Task `task_1776272091801_vwu2q5` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 6963ms

![profile-desktop](visuals/profile-desktop-2026-04-15T16-56-27-087Z.png)

> The UI for route "#profile" is not rendered; instead, an error page displays. Visible components: error icon, "This site can’t be reached" text, "localhost refused to connect" message, troubleshooting steps, ERR_CONNECTION_REFUSED code, Details button, Reload button. Error: Connection refused (ERR_CONNECTION_REFUSED).

---

## 2026-04-15T16:56:41.524Z -- Task `task_1776272091801_vwu2q5` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 7473ms

![profile-mobile](visuals/profile-mobile-2026-04-15T16-56-34-051Z.png)

> The UI is not rendered; an error page appears instead. Visible components: error icon, “This site can’t be reached” text, “localhost refused to connect” message, troubleshooting steps, ERR_CONNECTION_REFUSED code, and a “Details” button. Error: Connection refused, preventing profile page loading.

---

## 2026-04-15T16:56:47.977Z -- Task `task_1776272091801_vwu2q5` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 6452ms

![friends-desktop](visuals/friends-desktop-2026-04-15T16-56-41-525Z.png)

> The UI is not rendered as intended; instead, a connection error page appears. Visible components include the error icon, “This site can’t be reached” text, bullet points, and “Details/Reload” buttons. Error: Site connection refused (ERR_CONNECTION_REFUSED), preventing the #friends route UI from loading.

---

## 2026-04-15T16:56:56.375Z -- Task `task_1776272091801_vwu2q5` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 8397ms

![friends-mobile](visuals/friends-mobile-2026-04-15T16-56-47-978Z.png)

> The UI is not rendered; an error page appears instead. Visible components: error message ("This site can’t be reached"), suggestions (checking connection, proxy/firewall), ERR_CONNECTION_REFUSED, and a Details button. Error: Connection refused by localhost, preventing the intended friends route UI from loading.

---

## 2026-04-15T16:57:03.031Z -- Task `task_1776272091801_vwu2q5` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 6655ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T16-56-56-376Z.png)

> The UI is not rendered; the page shows a connection error instead of the leaderboard. Visible components: error icon, “This site can’t be reached” text, “localhost refused to connect” message, troubleshooting steps, ERR_CONNECTION_REFUSED code, Details and Reload buttons. Error: Connection refused (ERR_CONNECTION_REFUSED).

---

## 2026-04-15T16:57:09.585Z -- Task `task_1776272091801_vwu2q5` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 6554ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T16-57-03-031Z.png)

> The UI is not rendered as intended; an error page appears instead. Visible components include the error message “This site can’t be reached”, suggestions (“Checking the connection”, “Checking the proxy and the firewall”), the error code “ERR_CONNECTION_REFUSED”, and a “Details” button. The error indicates a connection issue preventing the leaderboard from loading.

---

## 2026-04-15T16:57:16.446Z -- Task `task_1776272091801_vwu2q5` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 6860ms

![game-desktop](visuals/game-desktop-2026-04-15T16-57-09-586Z.png)

> The UI is not the intended game interface; it shows a connection error page. Visible components: error icon, “This site can’t be reached” text, “localhost refused to connect” message, bullet points (“Checking the connection,” “Checking the proxy and the firewall”), “ERR_CONNECTION_REFUSED” code, “Details” and “Reload” buttons. Error: Connection refused by localhost.

---

## 2026-04-15T16:57:23.066Z -- Task `task_1776272091801_vwu2q5` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 6619ms

![game-mobile](visuals/game-mobile-2026-04-15T16-57-16-447Z.png)

> The UI is not rendered (shows browser error). Visible components: error icon, “This site can’t be reached” text, “localhost refused to connect” subtext, bullet points (“Checking the connection”, “Checking the proxy and the firewall”), “Details” button. Error: ERR_CONNECTION_REFUSED (site unreachable).

---

## 2026-04-15T16:57:41.228Z -- Task `task_1776272221793_qqtwvd` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 7901ms

![home-desktop](visuals/home-desktop-2026-04-15T16-57-33-327Z.png)

> Visible components: Name input, color selectors, “Create New Room” button, “OR” text, room code input, “Join as Player”, “Join as Spectator”, “Play Single Player” buttons. No rendering errors observed.

---

## 2026-04-15T16:57:49.831Z -- Task `task_1776272221793_qqtwvd` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 8601ms

![home-mobile](visuals/home-mobile-2026-04-15T16-57-41-230Z.png)

> The UI is rendered. Visible components include "Hangman" title, "Multiplayer Mode" subtitle, name input ("BraveBear5"), color selection circles, "Create New Room" button, "OR" text, room code input, "Join as Player"/"Join as Spectator"/"Play Single Player" buttons, and "Not connected" status. No errors detected.

---

## 2026-04-15T16:57:58.381Z -- Task `task_1776272221793_qqtwvd` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 8549ms

![auth-desktop](visuals/auth-desktop-2026-04-15T16-57-49-832Z.png)

> The UI is rendered. Visible components include a name input field, color selection circles, “Create New Room” button, “OR” separator, room code input, “Join as Player,” “Join as Spectator,” and “Play Single Player” buttons. No errors observed.

---

## 2026-04-15T16:58:07.033Z -- Task `task_1776272221793_qqtwvd` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 8651ms

![auth-mobile](visuals/auth-mobile-2026-04-15T16-57-58-382Z.png)

> Yes, UI is rendered. Visible components: Hangman title, Multiplayer Mode subtitle, name input, color circles, Create New Room button, OR text, room code input, Join as Player/Join as Spectator/Play Single Player buttons, Not connected status. No errors.

---

## 2026-04-15T16:58:17.892Z -- Task `task_1776272221793_qqtwvd` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 10859ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T16-58-07-033Z.png)

> The UI is rendered. Visible components include name input, color selector, “Create New Room” button, room code input, “Join as Player,” “Join as Spectator,” and “Play Single Player” buttons. No errors observed.

---

## 2026-04-15T16:58:27.096Z -- Task `task_1776272221793_qqtwvd` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 9203ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T16-58-17-893Z.png)

> Visible components: Title "Hangman", subtitle "Multiplayer Mode", name input ("SwiftDragon88"), color selector (7 colors), "Create New Room" button, "OR" text, room code input, "Join as Player"/"Join as Spectator"/"Play Single Player" buttons, "Not connected" status. No rendering errors.

---

## 2026-04-15T16:58:36.062Z -- Task `task_1776272221793_qqtwvd` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 8966ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T16-58-27-096Z.png)

> Visible components: Name input, color selector, "Create New Room" button, "OR" text, room code input, "Join as Player", "Join as Spectator", "Play Single Player" buttons. No rendering errors; all elements display properly.

---

## 2026-04-15T16:58:45.075Z -- Task `task_1776272221793_qqtwvd` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 9012ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T16-58-36-063Z.png)

> Yes, UI is rendered. Visible components: Title “Hangman”, “Multiplayer Mode” subtitle, name input (“MightyLion17”), color circles, “Create New Room” button, “OR” text, room code input, “Join as Player/Spectator” buttons, “Play Single Player” button, “Not connected” status. No errors.

---

## 2026-04-15T16:58:55.109Z -- Task `task_1776272221793_qqtwvd` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 10033ms

![profile-desktop](visuals/profile-desktop-2026-04-15T16-58-45-076Z.png)

> The UI for route "#profile" is not rendered; the current view shows a multiplayer setup screen. Visible components include name input, color selectors, "Create New Room" button, room code input, and join buttons. Error: Incorrect route displayed (not #profile).

---

## 2026-04-15T16:59:07.396Z -- Task `task_1776272221793_qqtwvd` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 12286ms

![profile-mobile](visuals/profile-mobile-2026-04-15T16-58-55-110Z.png)

> Yes, UI is rendered. Visible components: Title “Hangman”, “Multiplayer Mode” subtitle, name input, color options, “Create New Room”/“Join as Player”/etc. buttons, room code input, “Not connected” status. Error: Route “#profile” displays multiplayer setup instead of profile content.

---

## 2026-04-15T16:59:19.938Z -- Task `task_1776272221793_qqtwvd` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 12542ms

![friends-desktop](visuals/friends-desktop-2026-04-15T16-59-07-396Z.png)

> Yes, UI is rendered. Visible components: Name input, color selector, “Create New Room” button, Room Code input, “Join as Player/Spectator” buttons, “Play Single Player” button. Error: Route “#friends” mismatches displayed multiplayer setup.

---

## 2026-04-15T16:59:28.388Z -- Task `task_1776272221793_qqtwvd` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 8450ms

![friends-mobile](visuals/friends-mobile-2026-04-15T16-59-19-938Z.png)

> Visible components: Title “Hangman”, “Multiplayer Mode” subtitle, name input (SwiftWolf55), color selector, “Create New Room” button, “OR” text, room code input, “Join as Player/Spectator” buttons, “Play Single Player” button, “Not connected” status. No rendering errors—all elements display properly.

---

## 2026-04-15T16:59:39.450Z -- Task `task_1776272221793_qqtwvd` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 11061ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T16-59-28-389Z.png)

> No, the UI for "#leaderboard" is not rendered; the current view shows a multiplayer setup page. Visible components include name/color inputs, "Create New Room", room code input, and join buttons. Error: Incorrect page displayed (not leaderboard).

---

## 2026-04-15T16:59:49.749Z -- Task `task_1776272221793_qqtwvd` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 10298ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T16-59-39-451Z.png)

> The UI for the "#leaderboard" route is not rendered in the provided image (which shows the "Hangman Multiplayer Mode" setup screen instead). Visible components are those of the multiplayer setup (name input, color selector, room creation/join options) — no leaderboard-specific elements are present.

---

## 2026-04-15T16:59:57.470Z -- Task `task_1776272221793_qqtwvd` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 7721ms

![game-desktop](visuals/game-desktop-2026-04-15T16-59-49-749Z.png)

> Visible components: Name input, color selector, "Create New Room" button, "OR" divider, room code input, "Join as Player", "Join as Spectator", "Play Single Player" buttons. No rendering errors detected.

---

## 2026-04-15T17:00:06.277Z -- Task `task_1776272221793_qqtwvd` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 8807ms

![game-mobile](visuals/game-mobile-2026-04-15T16-59-57-470Z.png)

> Yes, UI is rendered. Visible components: Hangman title, Multiplayer Mode subtitle, name input (QuickDragon62), color circles, Create New Room button, OR text, room code input, Join as Player/Join as Spectator/Play Single Player buttons, Not connected status. No errors.

---

## 2026-04-15T17:00:58.196Z -- Task `task_1776272351522_11jn6n` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 8251ms

![home-desktop](visuals/home-desktop-2026-04-15T17-00-49-945Z.png)

> Yes, UI is rendered. Visible components: name input, color selector, "Create New Room" button, "OR" text, room code input, "Join as Player", "Join as Spectator", "Play Single Player" buttons. No errors observed.

---

## 2026-04-15T17:01:07.103Z -- Task `task_1776272351522_11jn6n` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 8906ms

![home-mobile](visuals/home-mobile-2026-04-15T17-00-58-197Z.png)

> Visible components: Title "Hangman", "Multiplayer Mode" subtitle, name input ("HappyEagle25"), color selection circles, "Create New Room" button, "OR" text, room code input, "Join as Player"/"Join as Spectator"/"Play Single Player" buttons, "Not connected" status. No rendering errors—all elements display properly.

---

## 2026-04-15T17:01:15.808Z -- Task `task_1776272351522_11jn6n` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 8705ms

![auth-desktop](visuals/auth-desktop-2026-04-15T17-01-07-103Z.png)

> Visible components: Name input (BraveEagle81), color selector, “Create New Room” button, “OR” divider, room code input, “Join as Player”, “Join as Spectator”, “Play Single Player” buttons. No rendering errors observed.

---

## 2026-04-15T17:01:24.717Z -- Task `task_1776272351522_11jn6n` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 8908ms

![auth-mobile](visuals/auth-mobile-2026-04-15T17-01-15-809Z.png)

> The UI is rendered. Visible components include the title “Hangman”, “Multiplayer Mode” subtitle, name input field, color selection circles, “Create New Room”/“Join as Player”/“Join as Spectator”/“Play Single Player” buttons, room code input, and “Not connected” status. No errors detected.

---

## 2026-04-15T17:01:33.728Z -- Task `task_1776272351522_11jn6n` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 9010ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T17-01-24-718Z.png)

> The UI for "#dashboard" is not rendered; the current view shows a multiplayer setup page. Visible components include name input, color selector, "Create New Room" button, room code field, and join/spectate/single player options. Error: Incorrect route rendering (not dashboard).

---

## 2026-04-15T17:01:43.911Z -- Task `task_1776272351522_11jn6n` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 10182ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T17-01-33-729Z.png)

> The UI is rendered. Visible components: "Hangman" title, "Multiplayer Mode" subtitle, name input, color circles, "Create New Room" button, "OR" text, room code input, "Join as Player"/"Spectator"/"Single Player" buttons, "Not connected" status. Error: Route may not align (shows multiplayer setup, not dashboard).

---

## 2026-04-15T17:01:51.543Z -- Task `task_1776272351522_11jn6n` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 7631ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T17-01-43-912Z.png)

> The UI is rendered. Visible components: name input (CleverTiger84), color selector, “Create New Room” button, room code input, “Join as Player”, “Join as Spectator”, “Play Single Player” buttons. No errors observed.

---

## 2026-04-15T17:01:59.224Z -- Task `task_1776272351522_11jn6n` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 7680ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T17-01-51-544Z.png)

> Yes, UI is rendered. Visible components: "Hangman" title, "Multiplayer Mode" subtitle, name input ("BraveLion87"), color selection circles, "Create New Room" button, "OR" text, room code input, "Join as Player"/"Join as Spectator"/"Play Single Player" buttons, "Not connected" status. No errors observed.

---

## 2026-04-15T17:02:14.866Z -- Task `task_1776272351522_11jn6n` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 15642ms

![profile-desktop](visuals/profile-desktop-2026-04-15T17-01-59-224Z.png)

> Yes, UI is rendered. Visible components: name input ("MightyBear42"), color selection circles, "Create New Room" button, "OR" separator, room code input, "Join as

---

## 2026-04-15T17:02:23.597Z -- Task `task_1776272351522_11jn6n` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 8731ms

![profile-mobile](visuals/profile-mobile-2026-04-15T17-02-14-866Z.png)

> Visible components: Title ("Hangman"), subtitle ("Multiplayer Mode"), name input ("BravePhoenix31"), color selector, "Create New Room" button, "OR" text, room code input, "Join as Player"/"Spectator" buttons, "Play Single Player" button, "Not connected" status. No rendering errors—all elements display properly.

---

## 2026-04-15T17:02:37.930Z -- Task `task_1776272351522_11jn6n` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 14332ms

![friends-desktop](visuals/friends-desktop-2026-04-15T17-02-23-598Z.png)

> UI is rendered. Visible components: Name input field, color selection circles, “Create New Room” button, “OR” separator, room code input, “Join as Player,” “Join as Spectator,” and “Play Single Player” buttons. Error: Route likely mismatched (expected #friends but displays multiplayer setup).

---

## 2026-04-15T17:02:48.067Z -- Task `task_1776272351522_11jn6n` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 10136ms

![friends-mobile](visuals/friends-mobile-2026-04-15T17-02-37-931Z.png)

> The UI is rendered. Visible components include title “Hangman”, “Multiplayer Mode” subtitle, name/color inputs, buttons (“Create New Room”, “Join as Player”, etc.), and status “Not connected”. Error: Content does not align with “#friends” route (shows multiplayer setup instead).

---

## 2026-04-15T17:02:59.279Z -- Task `task_1776272351522_11jn6n` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 11212ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T17-02-48-067Z.png)

> No, the UI for "#leaderboard" is not rendered. Visible components are from a multiplayer setup route (name input, color selectors, "Create New Room"/"Join" buttons), indicating a routing error.

---

## 2026-04-15T17:03:09.438Z -- Task `task_1776272351522_11jn6n` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 10159ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T17-02-59-279Z.png)

> The UI rendered is not the "#leaderboard" route (shows Hangman multiplayer setup instead). Visible components: "Hangman" title, "Multiplayer Mode" subtitle, name input ("LuckyWolf94"), color selector, "Create New Room" button, "OR" text, room code input, "Join as Player"/"Join as Spectator"/"Play Single Player" buttons, "Not connected" status. Error: Mismatched route (expected leaderboard, got multiplayer setup).

---

## 2026-04-15T17:03:20.632Z -- Task `task_1776272351522_11jn6n` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 11194ms

![game-desktop](visuals/game-desktop-2026-04-15T17-03-09-438Z.png)

> Visible components: Name input, color selector, "Create New Room" button, "OR" divider, room code input, "Join as Player", "Join as Spectator", "Play Single Player" buttons. No rendering errors; all elements display properly.

---

## 2026-04-15T17:03:35.925Z -- Task `task_1776272547605_rdc1sj` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 11238ms

![home-desktop](visuals/home-desktop-2026-04-15T17-03-24-687Z.png)

> Visible components: Name input (SwiftBear40), color selector, "Create New Room" button, "OR" text, room code input, "Join as Player", "Join as Spectator", "Play Single Player" buttons. No rendering errors detected.

---

## 2026-04-15T17:03:40.935Z -- Task `task_1776272351522_11jn6n` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 20302ms

![game-mobile](visuals/game-mobile-2026-04-15T17-03-20-633Z.png)

> Yes, UI is rendered. Visible components: Hangman title, multiplayer mode text, name input, color circles, Create New Room button, OR text, room code input, Join as Player/ Spectator buttons, Play Single Player button, Not connected status. No errors.

---

## 2026-04-15T17:03:45.650Z -- Task `task_1776272547605_rdc1sj` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 9724ms

![home-mobile](visuals/home-mobile-2026-04-15T17-03-35-926Z.png)

> Yes, UI is rendered. Visible components: "Hangman" title, "Multiplayer Mode" subtitle, name input (QuickEagle47), color selection circles, "Create New Room" button, "OR" text, room code input, "Join as Player"/"Spectator" buttons, "Play Single Player" button, "Not connected" status. No errors.

---

## 2026-04-15T17:03:52.008Z -- Task `task_1776272547605_rdc1sj` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 6357ms

![auth-desktop](visuals/auth-desktop-2026-04-15T17-03-45-651Z.png)

> The UI for route "#auth" is not rendered; instead, a connection error page is displayed. Visible components include the error message "This site can’t be reached", "Details" and "Reload" buttons, with an error of "ERR_CONNECTION_REFUSED".

---

## 2026-04-15T17:03:58.724Z -- Task `task_1776272547605_rdc1sj` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 6716ms

![auth-mobile](visuals/auth-mobile-2026-04-15T17-03-52-008Z.png)

> Visible components: Error icon, “This site can’t be reached” text, “localhost refused to connect” message, “Try:” section with bullet points, “ERR_CONNECTION_REFUSED” code, “Details” button. Errors: Connection refused (site not reachable, auth UI not rendered).

---

## 2026-04-15T17:04:05.174Z -- Task `task_1776272547605_rdc1sj` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 6450ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T17-03-58-724Z.png)

> No, the UI is not rendered; it shows a connection error page. Visible components: error icon, “This site can’t be reached” text, “localhost refused to connect” message, troubleshooting steps, ERR_CONNECTION_REFUSED code, Details and Reload buttons. Error: Connection refused (site unreachable).

---

## 2026-04-15T17:04:11.798Z -- Task `task_1776272547605_rdc1sj` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 6623ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T17-04-05-175Z.png)

> No, the UI for #dashboard is not rendered; the screen shows a connection error. Visible components: error icon, “This site can’t be reached” text, “localhost refused to connect” message, troubleshooting steps, and “Details” button. Error: ERR_CONNECTION_REFUSED (site unreachable).

---

## 2026-04-15T17:04:18.487Z -- Task `task_1776272547605_rdc1sj` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 6689ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T17-04-11-798Z.png)

> The UI for "#lobby" is not rendered; the browser displays a connection error page. Visible components: error icon, "This site can’t be reached" text, "localhost refused to connect" message, troubleshooting steps, "ERR_CONNECTION_REFUSED" code, "Details" and "Reload" buttons. Error: Connection refused by localhost.

---

## 2026-04-15T17:04:25.000Z -- Task `task_1776272547605_rdc1sj` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 6513ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T17-04-18-487Z.png)

> The UI is not rendered as intended; an error page displays instead. Visible components include the error message, troubleshooting steps, error code, and a “Details” button. Error: Connection refused (ERR_CONNECTION_REFUSED) prevents loading the lobby interface.

---

## 2026-04-15T17:04:31.833Z -- Task `task_1776272547605_rdc1sj` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 6832ms

![profile-desktop](visuals/profile-desktop-2026-04-15T17-04-25-001Z.png)

> The UI for the #profile route is not rendered; instead, a connection error page is displayed. Visible components include the error icon, “This site can’t be reached” text, “localhost refused to connect” message, troubleshooting steps, ERR_CONNECTION_REFUSED code, “Details” and “Reload” buttons. Error: Connection refused (ERR_CONNECTION_REFUSED).

---

## 2026-04-15T17:04:37.942Z -- Task `task_1776272547605_rdc1sj` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 6109ms

![profile-mobile](visuals/profile-mobile-2026-04-15T17-04-31-833Z.png)

> The UI is not rendered; an error page appears instead. Visible components: error message ("This site can’t be reached"), connection refusal details, troubleshooting steps, error code (ERR_CONNECTION_REFUSED), and a "Details" button. Error: Connection to localhost failed, preventing the profile UI from loading.

---

## 2026-04-15T17:04:44.600Z -- Task `task_1776272547605_rdc1sj` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 6657ms

![friends-desktop](visuals/friends-desktop-2026-04-15T17-04-37-943Z.png)

> The UI is not rendered as intended; instead, a connection error page appears. Visible components: error icon, “This site can’t be reached” text, “localhost refused to connect” message, troubleshooting steps, ERR_CONNECTION_REFUSED code, “Details” and “Reload” buttons. Error: Connection refused (site unreachable).

---

## 2026-04-15T17:04:52.585Z -- Task `task_1776272547605_rdc1sj` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 7984ms

![friends-mobile](visuals/friends-mobile-2026-04-15T17-04-44-601Z.png)

> The UI is not rendered as intended; an error page displays. Visible components: error icon, “This site can’t be reached” text, connection details, bullet points, “ERR_CONNECTION_REFUSED”, and “Details” button. Error: Connection refused (site unreachable).

---

## 2026-04-15T17:04:58.729Z -- Task `task_1776272547605_rdc1sj` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 6144ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T17-04-52-585Z.png)

> The UI is not rendered; only an error page with “This site can’t be reached” message, “Details” and “Reload” buttons is visible. Error: ERR_CONNECTION_REFUSED (localhost refused to connect).

---

## 2026-04-15T17:05:06.307Z -- Task `task_1776272547605_rdc1sj` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 7577ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T17-04-58-730Z.png)

> The UI is not rendered as intended; it shows a connection error instead of the leaderboard. Visible components include the error icon, “This site can’t be reached” text, “localhost refused to connect” message, troubleshooting steps, and a “Details” button. Error: Site failed to load due to connection refusal.

---

## 2026-04-15T17:05:12.861Z -- Task `task_1776272547605_rdc1sj` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 6553ms

![game-desktop](visuals/game-desktop-2026-04-15T17-05-06-308Z.png)

> No, the UI is not rendered (shows connection error). Visible components: error icon, “This site can’t be reached” text, bullet points, “ERR_CONNECTION_REFUSED”, Details/Reload buttons. Error: localhost connection refused, preventing game UI load.

---

## 2026-04-15T17:05:19.592Z -- Task `task_1776272547605_rdc1sj` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 6731ms

![game-mobile](visuals/game-mobile-2026-04-15T17-05-12-861Z.png)

> Yes, the UI is rendered (error page). Visible components: error icon, “This site can’t be reached” title, “localhost refused to connect” message, “Try:” section with bullet points, “ERR_CONNECTION_REFUSED” code, and “Details” button. Error: Connection refused, not the expected game interface.

---

## 2026-04-15T17:06:10.102Z -- Task `task_1776272698116_td3sl6` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 8259ms

![home-desktop](visuals/home-desktop-2026-04-15T17-06-01-843Z.png)

> Yes, UI is rendered. Visible components: name input ("QuickTiger64"), color selector (8 circles), "Create New Room" button, "OR" text, room code input, "Join as Player", "Join as Spectator", "Play Single Player" buttons. No errors observed.

---

## 2026-04-15T17:06:19.830Z -- Task `task_1776272698116_td3sl6` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 9727ms

![home-mobile](visuals/home-mobile-2026-04-15T17-06-10-103Z.png)

> Yes, UI is rendered. Visible components: Hangman title, multiplayer mode label, name input, color options, Create New Room button, OR divider, room code input, Join as Player/Join as Spectator buttons, Play Single Player button, Not connected status. No errors.

---

## 2026-04-15T17:06:28.841Z -- Task `task_1776272698116_td3sl6` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 9010ms

![auth-desktop](visuals/auth-desktop-2026-04-15T17-06-19-831Z.png)

> Yes, the UI is rendered. Visible components include a name input field, color selection circles, "Create New Room" button, "OR" separator, room code input, "Join as Player", "Join as Spectator", and "Play Single Player" buttons. No rendering errors observed.

---

## 2026-04-15T17:06:38.467Z -- Task `task_1776272698116_td3sl6` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 9626ms

![auth-mobile](visuals/auth-mobile-2026-04-15T17-06-28-841Z.png)

> Yes, UI is rendered. Visible components: Title ("Hangman", "Multiplayer Mode"), name input, color selector, "Create New Room" button, "OR" text, room code input, "Join as Player"/"Spectator" buttons, "Play Single Player" button, "Not connected" status. No errors detected.

---

## 2026-04-15T17:06:52.160Z -- Task `task_1776272698116_td3sl6` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 13692ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T17-06-38-468Z.png)

> The UI is rendered. Visible components: name input field, color selector (8 colors), “Create New Room,” “Join as Player,” “Join as Spectator,” “Play Single Player” buttons, and room code input. Error: Route mismatch (shows multiplayer lobby, not dashboard).

---

## 2026-04-15T17:07:03.862Z -- Task `task_1776272698116_td3sl6` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 11702ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T17-06-52-160Z.png)

> The UI is rendered. Visible components: "Hangman" title, "Multiplayer Mode" subtitle, name input ("LuckyLion4"), color options, "Create New Room" button, "OR" text, room code input, "Join as Player"/"Spectator" buttons, "Play Single Player" button, "Not connected" status. Error: Route mismatch (shows Hangman, not dashboard).

---

## 2026-04-15T17:07:12.975Z -- Task `task_1776272698116_td3sl6` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 9112ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T17-07-03-863Z.png)

> Visible components: Name input, color selector, "Create New Room" button, "OR" divider, room code input, "Join as Player", "Join as Spectator", "Play Single Player" buttons. No rendering errors detected.

---

## 2026-04-15T17:07:22.192Z -- Task `task_1776272698116_td3sl6` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 9216ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T17-07-12-976Z.png)

> The UI is rendered. Visible components include the title "Hangman", "Multiplayer Mode" subtitle, name input (with "HappyWolf94"), color selector, "Create New Room" button, "OR" separator, room code input, "Join as Player"/"Spectator" buttons, "Play Single Player" button, and "Not connected" status. No errors detected.

---

## 2026-04-15T17:07:33.250Z -- Task `task_1776272698116_td3sl6` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 11058ms

![profile-desktop](visuals/profile-desktop-2026-04-15T17-07-22-192Z.png)

> The UI is rendered but does not match the "#profile" route (displays multiplayer setup instead). Visible components: name input, color selector, "Create New Room", "Join as Player", "Join as Spectator", "Play Single Player" buttons, and room code input. Error: Incorrect route rendering (not profile page).

---

## 2026-04-15T17:07:43.592Z -- Task `task_1776272698116_td3sl6` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 10341ms

![profile-mobile](visuals/profile-mobile-2026-04-15T17-07-33-251Z.png)

> Visible components: Title "Hangman", subtitle "Multiplayer Mode", name input ("MightyEagle61"), color circles, "Create New Room" button, "OR" text, room code input, "Join as Player"/"Spectator" buttons, "Play Single Player" button, "Not connected" status. No errors—all elements render correctly.

---

## 2026-04-15T17:07:58.999Z -- Task `task_1776272698116_td3sl6` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 15406ms

![friends-desktop](visuals/friends-desktop-2026-04-15T17-07-43-593Z.png)

> UI is rendered. Visible components: name input, color circles, “Create New Room” button, “OR” text, room code input, “Join as Player”, “

---

## 2026-04-15T17:13:17.895Z -- Task `task_1776272698116_td3sl6` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 318893ms

![friends-mobile](visuals/friends-mobile-2026-04-15T17-07-58-999Z.png)

> The UI is not rendering the correct route (#friends); visible components include "Hangman" title, name input, color selector, "Create New Room"/"Join as Player" etc. buttons, but no friends-specific elements (e.g., friend list) are present.

---

## 2026-04-15T17:14:09.017Z -- Task `task_1776272698116_td3sl6` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 51088ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T17-13-17-928Z.png)

> The UI is not rendering the correct route ("#leaderboard" shows a multiplayer setup instead). Visible components include name input, color picker, "Create New Room"/"Join as Player" buttons; error is incorrect route rendering.

---

## 2026-04-15T17:14:41.211Z -- Task `task_1776272698116_td3sl6` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 32163ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T17-14-09-041Z.png)

> The UI does not render the "#leaderboard" content; it shows a multiplayer setup screen. Visible components: "Hangman" title, name input, color picker, "Create New Room" button, room code field, "Join as Player"/"Spectator" buttons, "Play Single Player" button, and "Not connected" status.

---

## 2026-04-15T17:15:10.251Z -- Task `task_1776272873525_01hxjp` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 31690ms

![home-desktop](visuals/home-desktop-2026-04-15T17-14-38-500Z.png)

> Yes, UI is rendered. Visible components: name input, color options, “Create New Room” button, “OR” separator, room code input, “Join as Player”, “Join as Spectator”, “Play Single Player” buttons. No errors detected.

---

## 2026-04-15T17:15:10.655Z -- Task `task_1776272698116_td3sl6` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 29403ms

![game-desktop](visuals/game-desktop-2026-04-15T17-14-41-229Z.png)

> Visible components: Name input (BraveLion47), color selector, "Create New Room" button, "OR" divider, room code input, "Join as Player", "Join as Spectator", "Play Single Player" buttons. No rendering errors; all elements display properly.

---

## 2026-04-15T17:15:31.975Z -- Task `task_1776272873525_01hxjp` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 21664ms

![home-mobile](visuals/home-mobile-2026-04-15T17-15-10-310Z.png)

> Yes, UI is rendered. Visible components: "Hangman" title, "Multiplayer Mode" subtitle, name input ("LuckyLion70"), color picker, "Create New Room" button, "OR" text, room code input, "Join as Player"/"Join as Spectator"/"Play Single Player" buttons, "Not connected" status. No errors.

---

## 2026-04-15T17:15:32.374Z -- Task `task_1776272698116_td3sl6` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 21718ms

![game-mobile](visuals/game-mobile-2026-04-15T17-15-10-656Z.png)

> Yes, UI is rendered. Visible components: "Hangman" title, "Multiplayer Mode" subtitle, name input ("MightyEagle96"), color picker, "Create New Room" button, "OR" text, room code input, "Join as Player"/"Spectator" buttons, "Play Single Player" button, "Not connected" status. No errors.

---

## 2026-04-15T17:15:42.123Z -- Task `task_1776272873525_01hxjp` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 10128ms

![auth-desktop](visuals/auth-desktop-2026-04-15T17-15-31-990Z.png)

> The UI for route "#auth" is not rendered; the browser displays a connection error page. Visible components include the error message ("This site can’t be reached"), "Details" and "Reload" buttons, with an ERR_CONNECTION_REFUSED error.

---

## 2026-04-15T17:15:50.804Z -- Task `task_1776272873525_01hxjp` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 8678ms

![auth-mobile](visuals/auth-mobile-2026-04-15T17-15-42-126Z.png)

> The UI is not rendered (shows connection error). Visible components: error icon, “This site can’t be reached” text, “localhost refused to connect” message, troubleshooting steps, error code, and “Details” button. Error: Connection refused (ERR_CONNECTION_REFUSED), so auth page failed to load.

---

## 2026-04-15T17:16:01.261Z -- Task `task_1776272873525_01hxjp` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 10403ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T17-15-50-851Z.png)

> The UI for #dashboard is not rendered due to a connection error. Visible components include an error icon, “This site can’t be reached” message, “localhost refused to connect” text, troubleshooting steps, ERR_CONNECTION_REFUSED error code, “Details” and “Reload” buttons; error is the failed connection preventing dashboard display.

---

## 2026-04-15T17:16:11.472Z -- Task `task_1776272873525_01hxjp` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 10207ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T17-16-01-265Z.png)

> No, the UI is not rendered as intended; it shows a connection error page. Visible components include an error icon, “This site can’t be reached” text, “localhost refused to connect” message, troubleshooting steps, error code, and a “Details” button. Error: Connection refused (ERR_CONNECTION_REFUSED) prevents loading the dashboard.

---

## 2026-04-15T17:16:22.754Z -- Task `task_1776272873525_01hxjp` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 11279ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T17-16-11-475Z.png)

> The lobby UI is not rendered; a connection error page is displayed. Visible components: error icon, “This site can’t be reached” text, “localhost refused to connect” message, troubleshooting steps, “ERR_CONNECTION_REFUSED” code, and “Details/Reload” buttons. Error: Connection refusal prevents lobby UI from loading.

---

## 2026-04-15T17:16:31.079Z -- Task `task_1776272873525_01hxjp` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 8304ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T17-16-22-757Z.png)

> The UI is not rendered as intended; instead, an error page appears. Visible components include the error icon, “This site can’t be reached” text, “localhost refused to connect” message, troubleshooting steps, error code, and “Details” button. Error: Connection failure prevents loading the lobby UI.

---

## 2026-04-15T17:16:39.119Z -- Task `task_1776272873525_01hxjp` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 8038ms

![profile-desktop](visuals/profile-desktop-2026-04-15T17-16-31-081Z.png)

> The UI for route "#profile" is not rendered; instead, a connection error page is displayed. Visible components include the error icon, "This site can’t be reached" text, "localhost refused to connect" message, troubleshooting steps, ERR_CONNECTION_REFUSED code, "Details" button, and "Reload" button.

---

## 2026-04-15T17:16:47.331Z -- Task `task_1776272873525_01hxjp` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 8199ms

![profile-mobile](visuals/profile-mobile-2026-04-15T17-16-39-123Z.png)

> The UI shows an error page (not the intended profile page). Visible components: error icon, “This site can’t be reached” text, “localhost refused to connect.”, “Try:” section with bullet points, “ERR_CONNECTION_REFUSED”, and “Details” button. Error: Connection refused (site unreachable).

---

## 2026-04-15T17:17:24.485Z -- Task `task_1776272873525_01hxjp` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 37107ms

![friends-desktop](visuals/friends-desktop-2026-04-15T17-16-47-376Z.png)

> No, the UI is not rendered (shows connection error). Visible components: error icon, “This site can’t be reached” text, bullet points, “ERR_CONNECTION_REFUSED”, Details/Reload buttons. Error: localhost refused connection, preventing the #friends route UI from loading.

---

## 2026-04-15T17:18:04.227Z -- Task `task_1776272873525_01hxjp` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 39735ms

![friends-mobile](visuals/friends-mobile-2026-04-15T17-17-24-492Z.png)

> The UI is not rendered as intended; an error page appears instead. Visible components: error icon, “This site can’t be reached” text, “localhost refused to connect.” message, “Try:” section (with bullet points), “ERR_CONNECTION_REFUSED”, and “Details” button. Error: Connection refused by localhost.

---

## 2026-04-15T17:18:43.215Z -- Task `task_1776272873525_01hxjp` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 38910ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T17-18-04-235Z.png)

> No, the UI is not rendered as expected; the page shows a connection error instead. Visible components: error icon, “This site can’t be reached” text, “localhost refused to connect” message, troubleshooting steps, “Details” and “Reload” buttons. Error: ERR_CONNECTION_REFUSED (connection failed).

---

## 2026-04-15T17:18:51.826Z -- Task `task_1776273379432_vfo0ps` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 26581ms

![home-desktop](visuals/home-desktop-2026-04-15T17-18-25-221Z.png)

> Visible components: Name input ("BraveBear45"), color selector, "Create New Room" button, "OR" text, room code input, "Join as Player", "Join as Spectator", and "Play Single Player" buttons. No rendering errors observed.

---

## 2026-04-15T17:19:05.156Z -- Task `task_1776272873525_01hxjp` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 21899ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T17-18-43-257Z.png)

> No visible components; UI not rendered (all-black screen). Error: Content fails to load/display.

---

## 2026-04-15T17:19:06.482Z -- Task `task_1776273379432_vfo0ps` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 14294ms

![home-mobile](visuals/home-mobile-2026-04-15T17-18-52-187Z.png)

> No, the UI is not rendered—only a black screen is visible. No components are displayed, indicating a rendering issue.

---

## 2026-04-15T17:19:11.806Z -- Task `task_1776272873525_01hxjp` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 6643ms

![game-desktop](visuals/game-desktop-2026-04-15T17-19-05-163Z.png)

> No, the UI is not rendered—only a black screen is visible. No components are displayed; this indicates a rendering error or missing content.

---

## 2026-04-15T17:19:13.860Z -- Task `task_1776273379432_vfo0ps` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 7360ms

![auth-desktop](visuals/auth-desktop-2026-04-15T17-19-06-500Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render for route "#auth".

---

## 2026-04-15T17:19:15.602Z -- Task `task_1776272873525_01hxjp` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 3794ms

![game-mobile](visuals/game-mobile-2026-04-15T17-19-11-808Z.png)

> No visible components; UI not rendered (blank screen).

---

## 2026-04-15T17:19:18.710Z -- Task `task_1776273379432_vfo0ps` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4849ms

![auth-mobile](visuals/auth-mobile-2026-04-15T17-19-13-860Z.png)

> No visible components are rendered; the screen is entirely black, indicating a rendering error or missing content for the "#auth" route on mobile 375x812.

---

## 2026-04-15T17:19:52.895Z -- Task `task_1776273379432_vfo0ps` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 34178ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T17-19-18-710Z.png)

> The UI is not rendered; it shows a connection error page instead of the dashboard. Visible components include an error icon, text messages ("This site can’t be reached", "localhost refused to connect."), bullet points, the error code "ERR_CONNECTION_REFUSED", and "Details"/"Reload" buttons. Error: Connection refused (ERR_CONNECTION_REFUSED).

---

## 2026-04-15T17:20:33.168Z -- Task `task_1776273379432_vfo0ps` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 40227ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T17-19-52-935Z.png)

> No, the dashboard UI is not rendered; the page shows a connection error. Visible components: error icon, “This site can’t be reached” text, “localhost refused to connect” message, troubleshooting steps, error code, and “Details” button. Error: Connection refused (ERR_CONNECTION_REFUSED) prevents dashboard loading.

---

## 2026-04-15T17:21:01.750Z -- Task `task_1776273379432_vfo0ps` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 28577ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T17-20-33-172Z.png)

> The UI for "#lobby" is not rendered; the browser displays a connection error page. Visible components: error icon, "This site can’t be reached" text, "localhost refused to connect" message, troubleshooting steps, "Details" and "Reload" buttons. Error: ERR_CONNECTION_REFUSED.

---

## 2026-04-15T17:22:07.463Z -- Task `task_1776273379432_vfo0ps` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 65693ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T17-21-01-770Z.png)

> The UI is not rendered; an error page appears instead. Visible components: error icon, “This site can’t be reached” text, “localhost refused to connect” message, troubleshooting steps, error code, and “Details” button. Error: Connection refused, so lobby UI fails to load.

---

## 2026-04-15T17:22:35.374Z -- Task `task_1776273379432_vfo0ps` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 27782ms

![profile-desktop](visuals/profile-desktop-2026-04-15T17-22-07-592Z.png)

> The UI is not rendered (shows connection error). Visible components: error icon, “This site can’t be reached” text, “localhost refused to connect” message, bullet points, “ERR_CONNECTION_REFUSED”, Details button, Reload button. Error: Connection refused, preventing profile page load.

---

## 2026-04-15T17:22:56.401Z -- Task `task_1776273379432_vfo0ps` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 21016ms

![profile-mobile](visuals/profile-mobile-2026-04-15T17-22-35-383Z.png)

> The UI is not properly rendered as it shows a connection error instead of the profile content. Visible components include the error icon, “This site can’t be reached” text, connection details, and a “Details” button; the main issue is ERR_CONNECTION_REFUSED preventing the profile from loading.

---

## 2026-04-15T17:23:26.484Z -- Task `task_1776273379432_vfo0ps` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 22703ms

![friends-mobile](visuals/friends-mobile-2026-04-15T17-23-03-750Z.png)

> The UI is rendered as an error page (not the intended #friends route). Visible components: error icon, “This site can’t be reached” text, “localhost refused to connect”, “Try:” list (checking connection, proxy/firewall), ERR_CONNECTION_REFUSED, Details button. Error: connection refused, so the #friends UI didn’t load.

---

## 2026-04-15T17:23:54.524Z -- Task `task_1776273379432_vfo0ps` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 27428ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T17-23-27-092Z.png)

> The UI is not rendered; the page shows a connection error instead of the leaderboard. Visible components: error icon, “This site can’t be reached” text, “localhost refused to connect” message, troubleshooting steps, ERR_CONNECTION_REFUSED code, Details button, Reload button. Error: Connection refused (site unreachable).

---

## 2026-04-15T17:24:21.816Z -- Task `task_1776273379432_vfo0ps` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 27266ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T17-23-54-542Z.png)

> The UI is not rendered; an error page appears instead. Visible components: error icon, “This site can’t be reached” text, “localhost refused to connect” message, troubleshooting steps, ERR_CONNECTION_REFUSED code, and a “Details” button. Error: Connection refused, preventing the leaderboard UI from loading.

---

## 2026-04-15T17:24:44.849Z -- Task `task_1776273379432_vfo0ps` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 22884ms

![game-desktop](visuals/game-desktop-2026-04-15T17-24-21-962Z.png)

> The UI is not rendered; an error page is shown. Visible components: error icon, “This site can’t be reached” text, “localhost refused to connect.” message, bullet points (“Checking the connection”, “Checking the proxy and the firewall”), “ERR_CONNECTION_REFUSED” code, “Details” and “Reload” buttons. Error: Site connection failed (ERR_CONNECTION_REFUSED).

---

## 2026-04-15T17:25:01.235Z -- Task `task_1776273379432_vfo0ps` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 16376ms

![game-mobile](visuals/game-mobile-2026-04-15T17-24-44-859Z.png)

> The UI is rendered as an error page, not the intended game interface. Visible components: error icon, “This site can’t be reached” text, “localhost refused to connect” message, troubleshooting steps, error code, and “Details” button. Error: Connection refused (ERR_CONNECTION_REFUSED) prevents loading the game UI.

---

## 2026-04-15T17:39:00.600Z -- Task `task_1776273628160_giocug` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 21309ms

![home-desktop](visuals/home-desktop-2026-04-15T17-38-39-275Z.png)

> No UI components are rendered; the screen is entirely black, indicating a rendering failure.

---

## 2026-04-15T17:39:09.692Z -- Task `task_1776273628160_giocug` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 9047ms

![home-mobile](visuals/home-mobile-2026-04-15T17-39-00-619Z.png)

> No UI elements are visible; the screen is entirely black. Error: No content is rendered for the specified route and device.

---

## 2026-04-15T17:39:15.582Z -- Task `task_1776273628160_giocug` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 5861ms

![auth-desktop](visuals/auth-desktop-2026-04-15T17-39-09-721Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T17:39:27.265Z -- Task `task_1776273628160_giocug` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 11609ms

![auth-mobile](visuals/auth-mobile-2026-04-15T17-39-15-582Z.png)

> No visible components; UI not rendered (black screen indicates rendering issue).

---

## 2026-04-15T17:39:34.709Z -- Task `task_1776273628160_giocug` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 7406ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T17-39-27-303Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T17:39:40.058Z -- Task `task_1776273628160_giocug` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 5328ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T17-39-34-713Z.png)

> No, the UI is not rendered; the screen is entirely black with no visible components. Error: Blank/black screen indicates failed rendering or missing content.

---

## 2026-04-15T17:39:46.547Z -- Task `task_1776273628160_giocug` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 6455ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T17-39-40-092Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank/black screen).

---

## 2026-04-15T17:39:52.319Z -- Task `task_1776273628160_giocug` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 5772ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T17-39-46-547Z.png)

> No visible components are rendered; the screen is entirely black. Error: UI not displayed (blank screen).

---

## 2026-04-15T17:39:57.525Z -- Task `task_1776273628160_giocug` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 5205ms

![profile-desktop](visuals/profile-desktop-2026-04-15T17-39-52-319Z.png)

> No UI elements are visible; the screen is entirely black. This indicates a rendering error or missing content for the #profile route.

---

## 2026-04-15T17:40:16.780Z -- Task `task_1776273628160_giocug` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 19099ms

![profile-mobile](visuals/profile-mobile-2026-04-15T17-39-57-607Z.png)

> No UI components are visible; the screen is entirely black, indicating the UI is not rendered.

---

## 2026-04-15T17:40:29.888Z -- Task `task_1776273628160_giocug` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 12877ms

![friends-desktop](visuals/friends-desktop-2026-04-15T17-40-17-011Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T17:40:37.480Z -- Task `task_1776273628160_giocug` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 7582ms

![friends-mobile](visuals/friends-mobile-2026-04-15T17-40-29-893Z.png)

> No visible components; UI not rendered (blank screen).

---

## 2026-04-15T17:42:46.905Z -- Task `task_1776273628160_giocug` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 129413ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T17-40-37-480Z.png)

> No UI components are visible; the screen is entirely black. Error: No content renders for the #leaderboard route.

---

## 2026-04-15T17:43:26.474Z -- Task `task_1776273628160_giocug` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 39498ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T17-42-46-971Z.png)

> No visible components are rendered; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T17:43:55.845Z -- Task `task_1776273628160_giocug` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 29361ms

![game-desktop](visuals/game-desktop-2026-04-15T17-43-26-484Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T17:44:14.904Z -- Task `task_1776273628160_giocug` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 18972ms

![game-mobile](visuals/game-mobile-2026-04-15T17-43-55-847Z.png)

> No UI components are rendered; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T17:44:55.266Z -- Task `task_1776274822703_w6ckje` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 42317ms

![home-desktop](visuals/home-desktop-2026-04-15T17-44-12-891Z.png)

> Visible components: Error icon, “This site can’t be reached” title, “localhost refused to connect.” message, bullet points (“Checking the connection”, “Checking the proxy and the firewall”), “ERR_CONNECTION_REFUSED” code, “Details” and “Reload” buttons. Error: Site failed to load (connection refused).

---

## 2026-04-15T17:45:29.554Z -- Task `task_1776274822703_w6ckje` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 34218ms

![home-mobile](visuals/home-mobile-2026-04-15T17-44-55-298Z.png)

> Yes, the UI is rendered. Visible components include an error icon, “This site can’t be reached” title, “localhost refused to connect” text, bullet points (“Checking the connection,” “Checking the proxy and the firewall”), “ERR_CONNECTION_REFUSED” error code, and a “Details” button. Error: Connection refused by localhost.

---

## 2026-04-15T17:45:47.837Z -- Task `task_1776274822703_w6ckje` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 18252ms

![auth-desktop](visuals/auth-desktop-2026-04-15T17-45-29-582Z.png)

> The UI is not rendered (shows connection error). Visible components: error icon, “This site can’t be reached” text, “localhost refused to connect” message, bullet points, “ERR_CONNECTION_REFUSED”, Details and Reload buttons. Error: Connection refused, so auth UI failed to load.

---

## 2026-04-15T17:46:26.908Z -- Task `task_1776274822703_w6ckje` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 39067ms

![auth-mobile](visuals/auth-mobile-2026-04-15T17-45-47-840Z.png)

> The UI is not rendered (shows connection error). Visible components: error icon, “This site can’t be reached” text, “localhost refused to connect.” message, “Try:” section with bullet points, “ERR_CONNECTION_REFUSED”, and “Details” button. Error: Connection refused, so auth page didn’t load.

---

## 2026-04-15T17:47:28.839Z -- Task `task_1776274822703_w6ckje` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 61906ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T17-46-26-912Z.png)

> No, the UI is not rendered; it shows a connection error page. Visible components include the error icon, error message text, troubleshooting steps, and “Details”/“Reload” buttons. Error: Connection refused (ERR_CONNECTION_REFUSED) prevents loading the dashboard.

---

## 2026-04-15T17:48:17.040Z -- Task `task_1776274822703_w6ckje` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 48135ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T17-47-28-897Z.png)

> The UI is not rendered due to a connection error. Visible components include the error icon, “This site can’t be reached” text, connection details, and a “Details” button; error is ERR_CONNECTION_REFUSED preventing dashboard display.

---

## 2026-04-15T17:48:45.742Z -- Task `task_1776274822703_w6ckje` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 28677ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T17-48-17-065Z.png)

> The UI for "#lobby" is not rendered; instead, an error page appears. Visible components: error icon, "This site can’t be reached" text, "localhost refused to connect" message, troubleshooting steps, "ERR_CONNECTION_REFUSED" code, "Details" and "Reload" buttons. Error: Connection refused, preventing lobby content from loading.

---

## 2026-04-15T17:49:04.955Z -- Task `task_1776274822703_w6ckje` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 19202ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T17-48-45-753Z.png)

> The UI for "#lobby" is not rendered; instead, an error page appears. Visible components: error icon, "This site can’t be reached" text, "localhost refused to connect" message, troubleshooting steps, and "Details" button. Error: Connection refused (ERR_CONNECTION_REFUSED), so lobby content fails to load.

---

## 2026-04-15T17:50:30.079Z -- Task `task_1776274822703_w6ckje` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 85069ms

![profile-desktop](visuals/profile-desktop-2026-04-15T17-49-04-973Z.png)

> The UI for route "#profile" is not rendered; the screen shows a connection error instead. Visible components: error icon, "This site can’t be reached" text, "localhost refused to connect" message, troubleshooting steps, "ERR_CONNECTION_REFUSED" code, "Details" and "Reload" buttons. Error: Connection refused (site unreachable).

---

## 2026-04-15T17:53:22.259Z -- Task `task_1776274822703_w6ckje` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 171958ms

![profile-mobile](visuals/profile-mobile-2026-04-15T17-50-30-281Z.png)

> The UI is not rendered as intended; it shows a connection error page instead of the profile content. Visible components include the error icon, “This site can’t be reached” text, “localhost refused to connect” message, troubleshooting steps, error code, and “Details” button. Error: Connection failure prevents profile page from loading.

---

## 2026-04-15T17:54:46.745Z -- Task `task_1776274822703_w6ckje` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 84469ms

![friends-desktop](visuals/friends-desktop-2026-04-15T17-53-22-276Z.png)

> The UI is not rendered (shows connection error). Visible components: error icon, “This site can’t be reached” text, “localhost refused to connect” message, bullet points (“Checking the connection”, “Checking the proxy and the firewall”), “ERR_CONNECTION_REFUSED” code, “Details” and “Reload” buttons. Error: Site failed to load due to connection refusal.

---

## 2026-04-15T17:57:43.495Z -- Task `task_1776274822703_w6ckje` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 176652ms

![friends-mobile](visuals/friends-mobile-2026-04-15T17-54-46-763Z.png)

> The UI for route "#friends" is not rendered; instead, a connection error page appears. Visible components include the error icon, "This site can’t be reached" text, "localhost refused to connect" message, troubleshooting steps, and "Details" button. Error: ERR_CONNECTION_REFUSED.

---

## 2026-04-15T17:59:07.660Z -- Task `task_1776274822703_w6ckje` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 83584ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T17-57-43-670Z.png)

> (no analysis)

---

## 2026-04-15T17:59:08.247Z -- Task `task_1776275157701_wqi9ce` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 69901ms

![home-desktop](visuals/home-desktop-2026-04-15T17-57-58-343Z.png)

> (no analysis)

---

## 2026-04-15T17:59:19.422Z -- Task `task_1776274822703_w6ckje` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 11503ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T17-59-07-916Z.png)

> No, the UI is not rendered—the screen is entirely black with no visible components. Error: Blank/black screen suggests rendering failure or missing content.

---

## 2026-04-15T17:59:36.040Z -- Task `task_1776274822703_w6ckje` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 16579ms

![game-desktop](visuals/game-desktop-2026-04-15T17-59-19-452Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T17:59:36.046Z -- Task `task_1776275157701_wqi9ce` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 27766ms

![home-mobile](visuals/home-mobile-2026-04-15T17-59-08-280Z.png)

> No visible components; the UI shows a solid black screen, indicating a rendering issue or empty state.

---

## 2026-04-15T17:59:41.055Z -- Task `task_1776274822703_w6ckje` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 5013ms

![game-mobile](visuals/game-mobile-2026-04-15T17-59-36-041Z.png)

> No UI components are rendered (screen is entirely black). Error: No visible elements detected, indicating a rendering issue.

---

## 2026-04-15T17:59:43.919Z -- Task `task_1776275157701_wqi9ce` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 7865ms

![auth-desktop](visuals/auth-desktop-2026-04-15T17-59-36-054Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T17:59:48.378Z -- Task `task_1776275157701_wqi9ce` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4459ms

![auth-mobile](visuals/auth-mobile-2026-04-15T17-59-43-919Z.png)

> No UI components are rendered; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T17:59:54.369Z -- Task `task_1776275157701_wqi9ce` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 5991ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T17-59-48-378Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T17:59:58.807Z -- Task `task_1776275157701_wqi9ce` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4438ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T17-59-54-369Z.png)

> No UI components are visible; the screen is entirely black. The UI failed to render, showing a blank/black screen instead of dashboard content.

---

## 2026-04-15T18:00:03.686Z -- Task `task_1776275157701_wqi9ce` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4879ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T17-59-58-807Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T18:00:09.424Z -- Task `task_1776275157701_wqi9ce` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 5734ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T18-00-03-690Z.png)

> No visible components are rendered; the screen is entirely black. Error: No UI elements displayed on the route "#lobby".

---

## 2026-04-15T18:00:14.472Z -- Task `task_1776275157701_wqi9ce` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 5047ms

![profile-desktop](visuals/profile-desktop-2026-04-15T18-00-09-425Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T18:00:18.803Z -- Task `task_1776275157701_wqi9ce` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4331ms

![profile-mobile](visuals/profile-mobile-2026-04-15T18-00-14-472Z.png)

> No UI components are visible; the screen is entirely black. The UI fails to render on this route.

---

## 2026-04-15T18:00:23.855Z -- Task `task_1776275157701_wqi9ce` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 5046ms

![friends-desktop](visuals/friends-desktop-2026-04-15T18-00-18-806Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render for the "#friends" route.

---

## 2026-04-15T18:00:29.914Z -- Task `task_1776275157701_wqi9ce` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 6054ms

![friends-mobile](visuals/friends-mobile-2026-04-15T18-00-23-859Z.png)

> No visible components; the screen is entirely black. Error: No UI elements are rendered for the "#friends" route.

---

## 2026-04-15T18:00:36.804Z -- Task `task_1776275157701_wqi9ce` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 6890ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T18-00-29-914Z.png)

> The UI is not rendered; no visible components are present. Error: Blank screen with no leaderboard content displayed.

---

## 2026-04-15T18:00:42.401Z -- Task `task_1776275157701_wqi9ce` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 5597ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T18-00-36-804Z.png)

> No visible components; screen is entirely black. Error—UI not rendered (no content displayed).

---

## 2026-04-15T18:00:49.011Z -- Task `task_1776275157701_wqi9ce` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 6603ms

![game-desktop](visuals/game-desktop-2026-04-15T18-00-42-401Z.png)

> No, the UI is not rendered—only a black screen is visible. No components are displayed; this indicates a rendering failure or missing content.

---

## 2026-04-15T18:01:24.724Z -- Task `task_1776275157701_wqi9ce` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 35654ms

![game-mobile](visuals/game-mobile-2026-04-15T18-00-49-011Z.png)

> No, the UI is not rendered—only a solid black screen is visible with no components displayed. Error: No visible elements or content, indicating a rendering issue.

---

## 2026-04-15T18:04:36.864Z -- Task `task_1776275984924_u0y7oy` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 13323ms

![home-desktop](visuals/home-desktop-2026-04-15T18-04-23-541Z.png)

> No, the UI is not rendered—only a blank black screen is visible. No components are present; this indicates a rendering issue (e.g., missing content or failed load).

---

## 2026-04-15T18:04:42.425Z -- Task `task_1776275984924_u0y7oy` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 5482ms

![home-mobile](visuals/home-mobile-2026-04-15T18-04-36-935Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering error or missing content.

---

## 2026-04-15T18:04:48.289Z -- Task `task_1776275984924_u0y7oy` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 5850ms

![auth-desktop](visuals/auth-desktop-2026-04-15T18-04-42-429Z.png)

> No UI elements are rendered; the screen is entirely black. Possible rendering error or missing content for the auth route.

---

## 2026-04-15T18:04:58.844Z -- Task `task_1776275984924_u0y7oy` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 10552ms

![auth-mobile](visuals/auth-mobile-2026-04-15T18-04-48-292Z.png)

> No UI elements are visible; the screen is entirely black. This indicates a rendering issue (e.g., missing content or failed load).

---

## 2026-04-15T18:05:07.457Z -- Task `task_1776275984924_u0y7oy` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 8586ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T18-04-58-871Z.png)

> No UI is rendered; the screen is entirely black. No visible components exist, indicating a rendering failure.

---

## 2026-04-15T18:05:13.690Z -- Task `task_1776275984924_u0y7oy` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 6202ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T18-05-07-486Z.png)

> No, the UI is not rendered—the screen is entirely black with no visible components. Error: Likely failed component loading or missing content for the "#dashboard" route.

---

## 2026-04-15T18:05:18.618Z -- Task `task_1776275984924_u0y7oy` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4927ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T18-05-13-691Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T18:05:22.856Z -- Task `task_1776275984924_u0y7oy` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 4233ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T18-05-18-623Z.png)

> No visible components; UI not rendered (blank screen).

---

## 2026-04-15T18:05:27.278Z -- Task `task_1776275984924_u0y7oy` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4422ms

![profile-desktop](visuals/profile-desktop-2026-04-15T18-05-22-856Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T18:05:32.241Z -- Task `task_1776275984924_u0y7oy` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4959ms

![profile-mobile](visuals/profile-mobile-2026-04-15T18-05-27-281Z.png)

> No visible components are rendered; the screen is entirely black, indicating a failure to display the profile UI.

---

## 2026-04-15T18:05:42.934Z -- Task `task_1776275984924_u0y7oy` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 10692ms

![friends-desktop](visuals/friends-desktop-2026-04-15T18-05-32-242Z.png)

> No UI components are visible; the screen is entirely black. The UI failed to render, showing a blank state instead of expected elements for the "#friends" route.

---

## 2026-04-15T18:05:47.846Z -- Task `task_1776275984924_u0y7oy` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 4897ms

![friends-mobile](visuals/friends-mobile-2026-04-15T18-05-42-949Z.png)

> No visible components; UI not rendered (black screen). Error: No content displayed for the "#friends" route.

---

## 2026-04-15T18:05:53.281Z -- Task `task_1776275984924_u0y7oy` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 5428ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T18-05-47-853Z.png)

> No UI components are rendered; the screen is entirely black. Error: No visible elements or content displayed for the #leaderboard route.

---

## 2026-04-15T18:06:01.207Z -- Task `task_1776275984924_u0y7oy` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 7925ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T18-05-53-281Z.png)

> No visible components are rendered; the screen is entirely black. Error: UI fails to display any content for the "#leaderboard" route.

---

## 2026-04-15T18:06:13.634Z -- Task `task_1776275984924_u0y7oy` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 12421ms

![game-desktop](visuals/game-desktop-2026-04-15T18-06-01-213Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering or loading error.

---

## 2026-04-15T18:06:19.815Z -- Task `task_1776275984924_u0y7oy` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 6161ms

![game-mobile](visuals/game-mobile-2026-04-15T18-06-13-654Z.png)

> No visible components; UI not rendered (black screen).

---

## 2026-04-15T18:07:51.501Z -- Task `task_1776276366700_k1wdlo` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 8095ms

![home-desktop](visuals/home-desktop-2026-04-15T18-07-43-406Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T18:07:56.558Z -- Task `task_1776276366700_k1wdlo` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 4941ms

![home-mobile](visuals/home-mobile-2026-04-15T18-07-51-616Z.png)

> No, the UI is not rendered—only a black screen is visible. No components are displayed, indicating a rendering issue.

---

## 2026-04-15T18:08:06.590Z -- Task `task_1776276366700_k1wdlo` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 10012ms

![auth-desktop](visuals/auth-desktop-2026-04-15T18-07-56-558Z.png)

> No visible components; UI appears unrendered (black screen). Possible error in component loading or display logic.

---

## 2026-04-15T18:08:15.001Z -- Task `task_1776276366700_k1wdlo` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 8401ms

![auth-mobile](visuals/auth-mobile-2026-04-15T18-08-06-600Z.png)

> No visible components are rendered; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T18:08:21.081Z -- Task `task_1776276366700_k1wdlo` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 6049ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T18-08-15-032Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T18:08:26.789Z -- Task `task_1776276366700_k1wdlo` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 5707ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T18-08-21-082Z.png)

> No UI elements are visible; the screen is entirely black. This indicates a rendering issue where the dashboard content failed to load or display.

---

## 2026-04-15T18:08:31.104Z -- Task `task_1776276366700_k1wdlo` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4314ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T18-08-26-789Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T18:08:37.062Z -- Task `task_1776276366700_k1wdlo` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 5935ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T18-08-31-116Z.png)

> No UI elements are visible; the screen is entirely black. Error—no content rendered for the #lobby route.

---

## 2026-04-15T18:08:43.375Z -- Task `task_1776276366700_k1wdlo` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 6305ms

![profile-desktop](visuals/profile-desktop-2026-04-15T18-08-37-070Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (blank screen).

---

## 2026-04-15T18:08:48.700Z -- Task `task_1776276366700_k1wdlo` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 5324ms

![profile-mobile](visuals/profile-mobile-2026-04-15T18-08-43-375Z.png)

> No UI components are visible; the screen is entirely black. Error: The UI fails to render, showing a blank display.

---

## 2026-04-15T18:08:53.499Z -- Task `task_1776276366700_k1wdlo` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 4751ms

![friends-desktop](visuals/friends-desktop-2026-04-15T18-08-48-748Z.png)

> No UI components are visible; the screen is entirely black. The UI failed to render for the "#friends" route.

---

## 2026-04-15T18:08:57.887Z -- Task `task_1776276366700_k1wdlo` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 4388ms

![friends-mobile](visuals/friends-mobile-2026-04-15T18-08-53-499Z.png)

> No visible components; the screen is entirely black, indicating a rendering issue where the UI failed to display any content.

---

## 2026-04-15T18:09:03.505Z -- Task `task_1776276366700_k1wdlo` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 5618ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T18-08-57-887Z.png)

> No UI components are visible; the screen is entirely black. Error: Leaderboard content did not render or load.

---

## 2026-04-15T18:09:09.261Z -- Task `task_1776276366700_k1wdlo` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 5756ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T18-09-03-505Z.png)

> No visible components; UI not rendered (all-black screen indicates rendering issue).

---

## 2026-04-15T18:09:24.152Z -- Task `task_1776276366700_k1wdlo` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 14885ms

![game-desktop](visuals/game-desktop-2026-04-15T18-09-09-263Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T18:09:29.433Z -- Task `task_1776276366700_k1wdlo` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 5268ms

![game-mobile](visuals/game-mobile-2026-04-15T18-09-24-163Z.png)

> No visible components are rendered. Error: The UI is not displayed (entire screen is black).

---

## 2026-04-15T18:15:58.965Z -- Task `task_1776276574563_2u8mpk` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 37275ms

![home-desktop](visuals/home-desktop-2026-04-15T18-15-21-681Z.png)

> No UI components are visible; the screen is entirely black. The UI failed to render, indicating an error.

---

## 2026-04-15T18:16:13.375Z -- Task `task_1776276574563_2u8mpk` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 14384ms

![home-mobile](visuals/home-mobile-2026-04-15T18-15-58-984Z.png)

> No visible components; the screen is entirely black, indicating a rendering issue or empty state.

---

## 2026-04-15T18:16:20.311Z -- Task `task_1776276574563_2u8mpk` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 6912ms

![auth-desktop](visuals/auth-desktop-2026-04-15T18-16-13-399Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T18:16:25.034Z -- Task `task_1776276574563_2u8mpk` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 4723ms

![auth-mobile](visuals/auth-mobile-2026-04-15T18-16-20-311Z.png)

> No visible components; UI not rendered (black screen indicates rendering issue).

---

## 2026-04-15T18:16:30.621Z -- Task `task_1776276574563_2u8mpk` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 5569ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T18-16-25-052Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render on route "#dashboard".

---

## 2026-04-15T18:16:35.754Z -- Task `task_1776276574563_2u8mpk` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 5114ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T18-16-30-640Z.png)

> No visible components; UI not rendered (all-black screen). Error: Content failed to load or render.

---

## 2026-04-15T18:16:40.981Z -- Task `task_1776276574563_2u8mpk` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 5226ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T18-16-35-755Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T18:16:46.679Z -- Task `task_1776276574563_2u8mpk` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 5696ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T18-16-40-981Z.png)

> No visible components are rendered. Error: The UI is not displayed (completely black screen).

---

## 2026-04-15T18:17:11.727Z -- Task `task_1776276574563_2u8mpk` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 25042ms

![profile-desktop](visuals/profile-desktop-2026-04-15T18-16-46-685Z.png)

> No UI components are visible; the screen is entirely black. Error: No content rendered for the "#profile" route.

---

## 2026-04-15T18:17:35.780Z -- Task `task_1776276574563_2u8mpk` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 24010ms

![profile-mobile](visuals/profile-mobile-2026-04-15T18-17-11-769Z.png)

> No visible components; UI not rendered (black screen). Error: Content failed to load or render.

---

## 2026-04-15T18:17:44.978Z -- Task `task_1776276574563_2u8mpk` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 9187ms

![friends-desktop](visuals/friends-desktop-2026-04-15T18-17-35-791Z.png)

> No visible components are rendered; the screen is entirely black, indicating a potential rendering error or missing content.

---

## 2026-04-15T18:17:54.979Z -- Task `task_1776276574563_2u8mpk` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 10000ms

![friends-mobile](visuals/friends-mobile-2026-04-15T18-17-44-978Z.png)

> No visible components; UI not rendered (entirely black screen).

---

## 2026-04-15T18:18:00.354Z -- Task `task_1776276574563_2u8mpk` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 5366ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T18-17-54-988Z.png)

> No, the UI is not rendered. No visible components; error: blank/black screen indicates missing or failed rendering of leaderboard content.

---

## 2026-04-15T18:18:11.544Z -- Task `task_1776276574563_2u8mpk` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 11187ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T18-18-00-354Z.png)

> No UI components are visible; the screen is entirely black. Error: Leaderboard content did not render or load.

---

## 2026-04-15T18:18:20.157Z -- Task `task_1776276574563_2u8mpk` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 8600ms

![game-desktop](visuals/game-desktop-2026-04-15T18-18-11-557Z.png)

> No UI components are rendered; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T18:18:25.162Z -- Task `task_1776276574563_2u8mpk` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4995ms

![game-mobile](visuals/game-mobile-2026-04-15T18-18-20-165Z.png)

> No UI components are rendered; the screen is entirely black. This indicates a rendering error where expected elements (e.g., game interface, buttons) are missing.

---

## 2026-04-15T18:27:51.155Z -- Task `task_1776277036705_yhzpjx` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 38134ms

![home-mobile](visuals/home-mobile-2026-04-15T18-27-13-021Z.png)

> No visible components; the UI appears as a blank (black) screen, indicating a potential rendering error or missing content.

---

## 2026-04-15T18:28:04.949Z -- Task `task_1776277036705_yhzpjx` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 13748ms

![auth-desktop](visuals/auth-desktop-2026-04-15T18-27-51-201Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank/black screen).

---

## 2026-04-15T18:30:16.123Z -- Task `task_1776277036705_yhzpjx` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 131166ms

![auth-mobile](visuals/auth-mobile-2026-04-15T18-28-04-952Z.png)

> No visible components; UI not rendered (blank screen).

---

## 2026-04-15T18:32:31.978Z -- Task `task_1776277036705_yhzpjx` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 135657ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T18-30-16-321Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T18:32:44.353Z -- Task `task_1776277036705_yhzpjx` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 12369ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T18-32-31-984Z.png)

> No, the UI is not rendered—only a black screen is visible. No components are displayed; this indicates a rendering error or missing content.

---

## 2026-04-15T18:32:49.596Z -- Task `task_1776277036705_yhzpjx` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 5229ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T18-32-44-367Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank display).

---

## 2026-04-15T18:32:54.929Z -- Task `task_1776277036705_yhzpjx` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 5296ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T18-32-49-632Z.png)

> No visible components; UI not rendered (blank screen).

---

## 2026-04-15T18:32:59.906Z -- Task `task_1776277036705_yhzpjx` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4976ms

![profile-desktop](visuals/profile-desktop-2026-04-15T18-32-54-929Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering error or missing content.

---

## 2026-04-15T18:34:34.272Z -- Task `task_1776277036705_yhzpjx` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 94358ms

![profile-mobile](visuals/profile-mobile-2026-04-15T18-32-59-910Z.png)

> No, the UI is not rendered—screen is entirely black with no visible components. Error: Missing profile-related content (e.g., header, avatar, stats) due to failed rendering.

---

## 2026-04-15T18:34:59.718Z -- Task `task_1776277036705_yhzpjx` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 25387ms

![friends-desktop](visuals/friends-desktop-2026-04-15T18-34-34-327Z.png)

> No UI components are rendered; the screen is entirely black. Error: No visible elements or content displayed for the "#friends" route.

---

## 2026-04-15T18:35:17.375Z -- Task `task_1776277036705_yhzpjx` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 17657ms

![friends-mobile](visuals/friends-mobile-2026-04-15T18-34-59-718Z.png)

> The UI is not rendered; the screen is entirely black with no visible components. Error: Blank/black screen indicates failed rendering or missing content.

---

## 2026-04-15T18:35:28.129Z -- Task `task_1776277036705_yhzpjx` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 10748ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T18-35-17-379Z.png)

> No UI components are visible; the screen is entirely black. Error—no leaderboard content or elements are rendered.

---

## 2026-04-15T18:35:35.470Z -- Task `task_1776277036705_yhzpjx` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 7336ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T18-35-28-133Z.png)

> No visible components; UI not rendered (blank screen). Error: No content displayed for "#leaderboard" route.

---

## 2026-04-15T18:35:43.541Z -- Task `task_1776277036705_yhzpjx` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 8068ms

![game-desktop](visuals/game-desktop-2026-04-15T18-35-35-473Z.png)

> No UI components are rendered; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T18:35:53.689Z -- Task `task_1776277036705_yhzpjx` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 10143ms

![game-mobile](visuals/game-mobile-2026-04-15T18-35-43-546Z.png)

> No, the UI is not rendered—only a black screen is visible. No components are displayed, indicating a rendering issue.

---

## 2026-04-15T18:35:54.067Z -- Task `task_1776277667845_5pd15e` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 10747ms

![home-desktop](visuals/home-desktop-2026-04-15T18-35-43-319Z.png)

> No visible UI components; screen is entirely black. No rendering errors detected as no content is displayed.

---

## 2026-04-15T18:36:33.170Z -- Task `task_1776277667845_5pd15e` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 39102ms

![home-mobile](visuals/home-mobile-2026-04-15T18-35-54-067Z.png)

> The UI shown is a browser error page, not the app’s intended UI. Visible components: error icon, “This site can’t be reached” header, “localhost refused to connect” text, “Try:” section with bullet points, “ERR_CONNECTION_REFUSED”, and “Details” button. Error: Network connection issue (site unreachable).

---

## 2026-04-15T18:36:52.219Z -- Task `task_1776277667845_5pd15e` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 19033ms

![auth-desktop](visuals/auth-desktop-2026-04-15T18-36-33-174Z.png)

> The UI for route "#auth" is not rendered; a connection error page is displayed instead. Visible components include the error icon, "This site can’t be reached" text, "localhost refused to connect" message, troubleshooting steps, ERR_CONNECTION_REFUSED code, Details button, and Reload button. Error: Connection refused (ERR_CONNECTION_REFUSED).

---

## 2026-04-15T18:37:17.039Z -- Task `task_1776277667845_5pd15e` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 24800ms

![auth-mobile](visuals/auth-mobile-2026-04-15T18-36-52-230Z.png)

> The UI is not rendered; an error page appears instead. Visible components: error icon, “This site can’t be reached” text, “localhost refused to connect” subtitle, bullet points (“Checking the connection,” “Checking the proxy and the firewall”), “ERR_CONNECTION_REFUSED” code, and “Details” button. Error: Connection refused, preventing auth UI from loading.

---

## 2026-04-15T18:37:40.712Z -- Task `task_1776277667845_5pd15e` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 23663ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T18-37-17-049Z.png)

> No, the UI is not rendered (shows connection error). Visible components: error icon, “This site can’t be reached” text, “localhost refused to connect” message, troubleshooting steps, “ERR_CONNECTION_REFUSED” code, “Details” and “Reload” buttons. Error: Connection refused, preventing dashboard content from loading.

---

## 2026-04-15T18:38:57.562Z -- Task `task_1776277667845_5pd15e` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 76832ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T18-37-40-725Z.png)

> No, the UI is not rendered (shows connection error). Visible components: error icon, “This site can’t be reached” text, “localhost refused to connect” message, troubleshooting steps, ERR_CONNECTION_REFUSED code, and Details button. Error: Connection refused, no dashboard content loaded.

---

## 2026-04-15T18:39:32.859Z -- Task `task_1776277667845_5pd15e` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 35269ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T18-38-57-590Z.png)

> The UI is not rendered due to a connection error. Visible components: error icon, “This site can’t be reached” text, “localhost refused to connect.” text, “Try:” bullet points, “ERR_CONNECTION_REFUSED” text, “Details” and “Reload” buttons. Error: Connection refused (site unreachable).

---

## 2026-04-15T18:39:39.683Z -- Task `task_1776278252823_okoz4q` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 10390ms

![home-desktop](visuals/home-desktop-2026-04-15T18-39-29-293Z.png)

> No UI elements are visible; the screen is entirely black. Likely a rendering error or missing content.

---

## 2026-04-15T18:39:41.411Z -- Task `task_1776277667845_5pd15e` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 8539ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T18-39-32-872Z.png)

> No visible components; UI not rendered (blank screen).

---

## 2026-04-15T18:39:44.983Z -- Task `task_1776278252823_okoz4q` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 5295ms

![home-mobile](visuals/home-mobile-2026-04-15T18-39-39-688Z.png)

> No, the UI is not rendered. No visible components are present; the screen is entirely black, indicating a rendering issue.

---

## 2026-04-15T18:39:47.148Z -- Task `task_1776277667845_5pd15e` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 5736ms

![profile-desktop](visuals/profile-desktop-2026-04-15T18-39-41-412Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render on route "#profile".

---

## 2026-04-15T18:39:50.458Z -- Task `task_1776278252823_okoz4q` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 5474ms

![auth-desktop](visuals/auth-desktop-2026-04-15T18-39-44-984Z.png)

> No UI components are rendered; the screen is entirely black. Error: No content displayed for the #auth route.

---

## 2026-04-15T18:39:54.312Z -- Task `task_1776277667845_5pd15e` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 7162ms

![profile-mobile](visuals/profile-mobile-2026-04-15T18-39-47-150Z.png)

> No, the UI is not rendered—the screen is entirely black with no visible components. Error: Blank/black screen suggests rendering failure or missing content.

---

## 2026-04-15T18:39:56.000Z -- Task `task_1776278252823_okoz4q` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 5540ms

![auth-mobile](visuals/auth-mobile-2026-04-15T18-39-50-460Z.png)

> No visible components; UI not rendered (blank screen).

---

## 2026-04-15T18:40:00.208Z -- Task `task_1776277667845_5pd15e` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 5868ms

![friends-desktop](visuals/friends-desktop-2026-04-15T18-39-54-338Z.png)

> No UI components are visible; the screen is entirely black. The UI failed to render for the "#friends" route on desktop 1280x720.

---

## 2026-04-15T18:40:03.494Z -- Task `task_1776278252823_okoz4q` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 7492ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T18-39-56-001Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render on route "#dashboard".

---

## 2026-04-15T18:40:05.907Z -- Task `task_1776277667845_5pd15e` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 5691ms

![friends-mobile](visuals/friends-mobile-2026-04-15T18-40-00-215Z.png)

> No UI components are visible; the screen is entirely black. The UI failed to render, showing no content for the "#friends" route.

---

## 2026-04-15T18:40:08.247Z -- Task `task_1776278252823_okoz4q` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4751ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T18-40-03-495Z.png)

> No visible components are rendered; the screen is entirely black, indicating a failure to display the dashboard UI.

---

## 2026-04-15T18:40:10.422Z -- Task `task_1776277667845_5pd15e` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4514ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T18-40-05-908Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T18:40:13.020Z -- Task `task_1776278252823_okoz4q` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4773ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T18-40-08-247Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering error or missing content.

---

## 2026-04-15T18:40:15.421Z -- Task `task_1776277667845_5pd15e` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 4997ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T18-40-10-423Z.png)

> No, the UI is not rendered—only a black screen is visible. No components are displayed, indicating a rendering error.

---

## 2026-04-15T18:40:18.024Z -- Task `task_1776278252823_okoz4q` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 4979ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T18-40-13-045Z.png)

> No visible components are rendered. Error: The UI is not displayed (completely black screen).

---

## 2026-04-15T18:40:20.222Z -- Task `task_1776277667845_5pd15e` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4800ms

![game-desktop](visuals/game-desktop-2026-04-15T18-40-15-422Z.png)

> No UI components are rendered; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T18:40:24.268Z -- Task `task_1776278252823_okoz4q` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 6243ms

![profile-desktop](visuals/profile-desktop-2026-04-15T18-40-18-025Z.png)

> No UI components are visible; the screen is entirely black. Error: No profile page content is rendered.

---

## 2026-04-15T18:40:26.425Z -- Task `task_1776277667845_5pd15e` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 6202ms

![game-mobile](visuals/game-mobile-2026-04-15T18-40-20-223Z.png)

> No, the UI is not rendered—only a solid black screen is visible with no components displayed. Error: No UI elements appear, indicating a rendering issue or missing content.

---

## 2026-04-15T18:40:29.342Z -- Task `task_1776278252823_okoz4q` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 5074ms

![profile-mobile](visuals/profile-mobile-2026-04-15T18-40-24-268Z.png)

> No visible components are rendered; the screen is entirely black. Error: UI failed to render any content for the "#profile" route.

---

## 2026-04-15T18:40:34.970Z -- Task `task_1776278252823_okoz4q` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 5620ms

![friends-desktop](visuals/friends-desktop-2026-04-15T18-40-29-350Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering error where content failed to display.

---

## 2026-04-15T18:40:43.381Z -- Task `task_1776278252823_okoz4q` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 8387ms

![friends-mobile](visuals/friends-mobile-2026-04-15T18-40-34-971Z.png)

> No UI elements are visible; the screen is entirely black. The route "#friends" fails to render any content on the mobile 375x812 viewport.

---

## 2026-04-15T18:40:48.471Z -- Task `task_1776278252823_okoz4q` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 5087ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T18-40-43-384Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T18:40:54.125Z -- Task `task_1776278252823_okoz4q` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 5654ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T18-40-48-471Z.png)

> No UI components are visible; the screen is entirely black. Error: No content renders for the #leaderboard route.

---

## 2026-04-15T18:41:03.465Z -- Task `task_1776278252823_okoz4q` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 9338ms

![game-desktop](visuals/game-desktop-2026-04-15T18-40-54-126Z.png)

> The UI is not rendered; no visible components are present. Error: No content displayed on the screen.

---

## 2026-04-15T18:41:09.294Z -- Task `task_1776278252823_okoz4q` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 5827ms

![game-mobile](visuals/game-mobile-2026-04-15T18-41-03-467Z.png)

> No UI elements are visible; the screen is entirely black. Error: No content renders for the "#game" route.

---

## 2026-04-15T18:47:25.139Z -- Task `task_1776278473353_4mx0k7` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 8230ms

![home-desktop](visuals/home-desktop-2026-04-15T18-47-16-906Z.png)

> No UI elements are visible; the screen is entirely black. Likely a rendering error or missing content.

---

## 2026-04-15T18:47:30.511Z -- Task `task_1776278473353_4mx0k7` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 5365ms

![home-mobile](visuals/home-mobile-2026-04-15T18-47-25-143Z.png)

> No, the UI is not rendered—only a black screen is visible with no components displayed. Error: No content loaded or rendered on the page.

---

## 2026-04-15T18:47:35.539Z -- Task `task_1776278473353_4mx0k7` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 5021ms

![auth-desktop](visuals/auth-desktop-2026-04-15T18-47-30-516Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T18:47:41.376Z -- Task `task_1776278473353_4mx0k7` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 5833ms

![auth-mobile](visuals/auth-mobile-2026-04-15T18-47-35-543Z.png)

> No UI components are visible; the screen is entirely black. Error: No content rendered for the "#auth" route.

---

## 2026-04-15T18:47:47.851Z -- Task `task_1776278473353_4mx0k7` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 6442ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T18-47-41-408Z.png)

> No UI elements are visible; the screen is entirely black. No renderable components detected, indicating a potential loading issue or blank state.

---

## 2026-04-15T18:47:53.380Z -- Task `task_1776278473353_4mx0k7` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 5527ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T18-47-47-851Z.png)

> No UI components are visible; the screen is entirely black. This indicates a rendering error or missing content for the "#dashboard" route on mobile 375x812.

---

## 2026-04-15T18:47:59.933Z -- Task `task_1776278473353_4mx0k7` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 6550ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T18-47-53-383Z.png)

> No UI components are visible; the screen is entirely black. The UI fails to render for the "#lobby" route on desktop 1280x720.

---

## 2026-04-15T18:48:05.561Z -- Task `task_1776278473353_4mx0k7` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 5619ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T18-47-59-936Z.png)

> No visible components are rendered. Error: The UI is not displayed (screen is entirely black).

---

## 2026-04-15T18:48:12.670Z -- Task `task_1776278473353_4mx0k7` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 7105ms

![profile-desktop](visuals/profile-desktop-2026-04-15T18-48-05-563Z.png)

> No UI components are visible; the screen is entirely black. Error: No content renders for the #profile route.

---

## 2026-04-15T18:48:21.606Z -- Task `task_1776278473353_4mx0k7` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 8932ms

![profile-mobile](visuals/profile-mobile-2026-04-15T18-48-12-673Z.png)

> No, the UI is not rendered—the screen is entirely black with no visible components. Error: Complete lack of visual content indicates a rendering failure or missing UI elements.

---

## 2026-04-15T18:48:27.286Z -- Task `task_1776278473353_4mx0k7` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 5672ms

![friends-desktop](visuals/friends-desktop-2026-04-15T18-48-21-614Z.png)

> No UI components are visible; the screen is entirely black. The UI failed to render for the "#friends" route on desktop 1280x720.

---

## 2026-04-15T18:48:33.679Z -- Task `task_1776278473353_4mx0k7` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 6392ms

![friends-mobile](visuals/friends-mobile-2026-04-15T18-48-27-287Z.png)

> No UI components are visible; the screen is entirely black. Error: No content rendered for the "#friends" route.

---

## 2026-04-15T18:48:40.919Z -- Task `task_1776278473353_4mx0k7` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 7233ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T18-48-33-682Z.png)

> No UI components are rendered; the screen is entirely black. Error: No visible leaderboard elements or content displayed.

---

## 2026-04-15T18:48:53.196Z -- Task `task_1776278473353_4mx0k7` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 12275ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T18-48-40-921Z.png)

> No UI components are visible; the screen is entirely black. Error: The leaderboard UI failed to render, displaying a blank/black screen instead of expected elements like titles or entries.

---

## 2026-04-15T18:49:00.398Z -- Task `task_1776278473353_4mx0k7` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 7201ms

![game-desktop](visuals/game-desktop-2026-04-15T18-48-53-197Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering error or missing content.

---

## 2026-04-15T18:49:07.256Z -- Task `task_1776278473353_4mx0k7` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 6835ms

![game-mobile](visuals/game-mobile-2026-04-15T18-49-00-421Z.png)

> No UI components are rendered; the screen is entirely black. This indicates a rendering error or missing content for the "#game" route on mobile 375x812.

---

## 2026-04-15T19:03:05.303Z -- Task `task_1776278939439_uvb4ft` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 22959ms

![home-desktop](visuals/home-desktop-2026-04-15T19-02-42-326Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T19:03:13.657Z -- Task `task_1776278939439_uvb4ft` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 8339ms

![home-mobile](visuals/home-mobile-2026-04-15T19-03-05-318Z.png)

> No visible components; the screen is entirely black. Error—UI failed to render content (blank/black screen).

---

## 2026-04-15T19:03:28.497Z -- Task `task_1776278939439_uvb4ft` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 14838ms

![auth-desktop](visuals/auth-desktop-2026-04-15T19-03-13-659Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T19:03:34.549Z -- Task `task_1776278939439_uvb4ft` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 6052ms

![auth-mobile](visuals/auth-mobile-2026-04-15T19-03-28-497Z.png)

> No visible components; screen is entirely black. Error—UI not rendered (no content displayed).

---

## 2026-04-15T19:03:40.372Z -- Task `task_1776278939439_uvb4ft` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 5818ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T19-03-34-549Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering issue or missing content.

---

## 2026-04-15T19:03:45.599Z -- Task `task_1776278939439_uvb4ft` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 5224ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T19-03-40-375Z.png)

> No UI components are visible; the screen is entirely black. The UI failed to render, showing a blank (black) display with no elements.

---

## 2026-04-15T19:03:51.751Z -- Task `task_1776278939439_uvb4ft` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 6143ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T19-03-45-604Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank screen).

---

## 2026-04-15T19:03:57.161Z -- Task `task_1776278939439_uvb4ft` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 5409ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T19-03-51-752Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T19:04:03.813Z -- Task `task_1776278939439_uvb4ft` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 6652ms

![profile-desktop](visuals/profile-desktop-2026-04-15T19-03-57-161Z.png)

> No UI elements are visible; the screen is entirely black, indicating a rendering issue or missing content.

---

## 2026-04-15T19:04:09.658Z -- Task `task_1776278939439_uvb4ft` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 5838ms

![profile-mobile](visuals/profile-mobile-2026-04-15T19-04-03-820Z.png)

> No visible components; the screen is entirely black. Error: UI not rendered (blank/black screen).

---

## 2026-04-15T19:04:22.854Z -- Task `task_1776278939439_uvb4ft` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 13196ms

![friends-desktop](visuals/friends-desktop-2026-04-15T19-04-09-658Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (blank/black screen).

---

## 2026-04-15T19:04:30.709Z -- Task `task_1776278939439_uvb4ft` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 7804ms

![friends-mobile](visuals/friends-mobile-2026-04-15T19-04-22-905Z.png)

> No visible components; the screen is entirely black, indicating a rendering issue or missing content.

---

## 2026-04-15T19:04:37.504Z -- Task `task_1776278939439_uvb4ft` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 6780ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T19-04-30-723Z.png)

> No UI components are visible; the screen is entirely black. Likely a rendering error or missing content for the leaderboard route.

---

## 2026-04-15T19:04:44.092Z -- Task `task_1776278939439_uvb4ft` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 6587ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T19-04-37-505Z.png)

> No, the UI is not rendered—the screen is entirely black with no visible components. Error: Blank screen suggests a rendering failure or missing content.

---

## 2026-04-15T19:04:52.353Z -- Task `task_1776278939439_uvb4ft` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 8260ms

![game-desktop](visuals/game-desktop-2026-04-15T19-04-44-093Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T19:04:59.138Z -- Task `task_1776278939439_uvb4ft` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 6781ms

![game-mobile](visuals/game-mobile-2026-04-15T19-04-52-357Z.png)

> No visible components; the screen is entirely black, indicating a rendering issue or empty state.

---

## 2026-04-15T19:08:55.811Z -- Task `task_1776279869630_d7xp0d` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 27298ms

![home-desktop](visuals/home-desktop-2026-04-15T19-08-28-425Z.png)

> No visible components; UI not rendered. Possible rendering error or missing content.

---

## 2026-04-15T19:09:05.387Z -- Task `task_1776279869630_d7xp0d` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 9430ms

![home-mobile](visuals/home-mobile-2026-04-15T19-08-55-934Z.png)

> No visible components; UI not rendered (black screen). Error: No content displayed.

---

## 2026-04-15T19:09:15.564Z -- Task `task_1776279869630_d7xp0d` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 10028ms

![auth-desktop](visuals/auth-desktop-2026-04-15T19-09-05-536Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank screen).

---

## 2026-04-15T19:09:20.512Z -- Task `task_1776279869630_d7xp0d` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4946ms

![auth-mobile](visuals/auth-mobile-2026-04-15T19-09-15-566Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T19:09:25.455Z -- Task `task_1776279869630_d7xp0d` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 4942ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T19-09-20-512Z.png)

> No, the UI is not rendered. No visible components; error: blank/black screen (no content displayed).

---

## 2026-04-15T19:09:30.899Z -- Task `task_1776279869630_d7xp0d` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 5444ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T19-09-25-455Z.png)

> No, the UI is not rendered—only a black screen is visible. No components are present; error: UI failed to load/render for route "#dashboard".

---

## 2026-04-15T19:09:38.025Z -- Task `task_1776279869630_d7xp0d` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 7122ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T19-09-30-903Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank/black screen).

---

## 2026-04-15T19:09:42.328Z -- Task `task_1776279869630_d7xp0d` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 4302ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T19-09-38-026Z.png)

> No visible components; UI is not rendered (blank screen).

---

## 2026-04-15T19:09:48.188Z -- Task `task_1776279869630_d7xp0d` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 5852ms

![profile-desktop](visuals/profile-desktop-2026-04-15T19-09-42-329Z.png)

> No UI components are visible; the screen is entirely black. Error: The profile page failed to render content (likely a loading issue or missing assets).

---

## 2026-04-15T19:09:55.743Z -- Task `task_1776279869630_d7xp0d` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 7542ms

![profile-mobile](visuals/profile-mobile-2026-04-15T19-09-48-201Z.png)

> No UI components are visible; the screen is entirely black. Error: No content renders for the #profile route.

---

## 2026-04-15T19:10:10.747Z -- Task `task_1776279869630_d7xp0d` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 14988ms

![friends-desktop](visuals/friends-desktop-2026-04-15T19-09-55-759Z.png)

> No UI components are visible; the screen is entirely black. Error: Content failed to render (blank/black screen).

---

## 2026-04-15T19:10:17.386Z -- Task `task_1776279869630_d7xp0d` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 6614ms

![friends-mobile](visuals/friends-mobile-2026-04-15T19-10-10-772Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering error or blank state.

---

## 2026-04-15T19:10:22.475Z -- Task `task_1776279869630_d7xp0d` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 5089ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T19-10-17-386Z.png)

> No visible components are rendered; the screen is entirely black. Error: No UI elements or content displayed for the leaderboard route.

---

## 2026-04-15T19:10:27.941Z -- Task `task_1776279869630_d7xp0d` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 5465ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T19-10-22-476Z.png)

> No visible components; the screen is entirely black. Error: UI not rendered (no content displayed).

---

## 2026-04-15T19:10:32.705Z -- Task `task_1776279869630_d7xp0d` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4756ms

![game-desktop](visuals/game-desktop-2026-04-15T19-10-27-949Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank display).

---

## 2026-04-15T19:10:42.837Z -- Task `task_1776279869630_d7xp0d` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 10132ms

![game-mobile](visuals/game-mobile-2026-04-15T19-10-32-705Z.png)

> No, the UI is not rendered—only a black screen is visible with no components displayed. Error: No content appears; the screen is entirely dark.

---

## 2026-04-15T19:11:46.425Z -- Task `task_1776280209969_43giqn` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 23054ms

![home-desktop](visuals/home-desktop-2026-04-15T19-11-23-285Z.png)

> No UI elements are visible; the screen is entirely black. Possible rendering error or missing content.

---

## 2026-04-15T19:12:30.669Z -- Task `task_1776280209969_43giqn` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 43934ms

![home-mobile](visuals/home-mobile-2026-04-15T19-11-46-508Z.png)

> No, the UI is not rendered—only a black screen is visible with no components displayed. Error: No content loaded or rendered on the screen.

---

## 2026-04-15T19:12:46.552Z -- Task `task_1776280209969_43giqn` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 15641ms

![auth-desktop](visuals/auth-desktop-2026-04-15T19-12-30-887Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (blank/black screen).

---

## 2026-04-15T19:13:07.384Z -- Task `task_1776280209969_43giqn` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 20801ms

![auth-mobile](visuals/auth-mobile-2026-04-15T19-12-46-577Z.png)

> No visible components are rendered. The UI fails to display any content, indicating a rendering error.

---

## 2026-04-15T19:13:21.086Z -- Task `task_1776280209969_43giqn` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 13690ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T19-13-07-396Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T19:13:28.068Z -- Task `task_1776280209969_43giqn` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 6978ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T19-13-21-090Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering error where the dashboard content failed to load.

---

## 2026-04-15T19:13:37.938Z -- Task `task_1776280209969_43giqn` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 9869ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T19-13-28-069Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank/black screen).

---

## 2026-04-15T19:13:43.224Z -- Task `task_1776280209969_43giqn` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 5223ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T19-13-38-001Z.png)

> No visible components; UI not rendered (entirely black screen).

---

## 2026-04-15T19:13:49.849Z -- Task `task_1776280209969_43giqn` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 6625ms

![profile-desktop](visuals/profile-desktop-2026-04-15T19-13-43-224Z.png)

> No UI elements are visible; the screen is entirely black. No renderable components or errors detected as nothing is displayed.

---

## 2026-04-15T19:13:55.029Z -- Task `task_1776280209969_43giqn` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 5178ms

![profile-mobile](visuals/profile-mobile-2026-04-15T19-13-49-851Z.png)

> No UI elements are visible; the screen is entirely black. Error: No content rendered for the #profile route.

---

## 2026-04-15T19:14:01.252Z -- Task `task_1776280209969_43giqn` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 6212ms

![friends-desktop](visuals/friends-desktop-2026-04-15T19-13-55-036Z.png)

> No UI elements are rendered; the screen is entirely black. Error: No content displayed for the #friends route.

---

## 2026-04-15T19:14:39.296Z -- Task `task_1776280209969_43giqn` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 38041ms

![friends-mobile](visuals/friends-mobile-2026-04-15T19-14-01-255Z.png)

> No visible components; UI not rendered (black screen). Error: No content displayed for the "#friends" route.

---

## 2026-04-15T19:14:48.881Z -- Task `task_1776280209969_43giqn` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 9580ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T19-14-39-301Z.png)

> No visible components; UI appears blank (error: content not rendered).

---

## 2026-04-15T19:15:06.111Z -- Task `task_1776280209969_43giqn` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 17222ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T19-14-48-889Z.png)

> No visible components; the screen is entirely black. Error: No UI elements are rendered for the #leaderboard route.

---

## 2026-04-15T19:15:12.964Z -- Task `task_1776280209969_43giqn` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 6850ms

![game-desktop](visuals/game-desktop-2026-04-15T19-15-06-114Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T19:15:20.754Z -- Task `task_1776280209969_43giqn` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 7744ms

![game-mobile](visuals/game-mobile-2026-04-15T19-15-13-010Z.png)

> No visible components; UI not rendered (black screen). Error: No content displayed.

---

## 2026-04-15T19:26:01.383Z -- Task `task_1776280392792_6mypkx` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 33954ms

![home-desktop](visuals/home-desktop-2026-04-15T19-25-27-422Z.png)

> No visible components; UI not rendered (black screen). Error: No content displayed.

---

## 2026-04-15T19:26:24.196Z -- Task `task_1776280392792_6mypkx` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 22785ms

![home-mobile](visuals/home-mobile-2026-04-15T19-26-01-411Z.png)

> No visible components; the screen is entirely black, indicating a rendering issue or missing content.

---

## 2026-04-15T19:26:32.249Z -- Task `task_1776280392792_6mypkx` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 7955ms

![auth-desktop](visuals/auth-desktop-2026-04-15T19-26-24-294Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T19:26:37.772Z -- Task `task_1776280392792_6mypkx` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 5510ms

![auth-mobile](visuals/auth-mobile-2026-04-15T19-26-32-258Z.png)

> No visible components are rendered; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T19:26:44.330Z -- Task `task_1776280392792_6mypkx` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 6556ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T19-26-37-774Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T19:26:51.115Z -- Task `task_1776280392792_6mypkx` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 6775ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T19-26-44-340Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering error where the dashboard content failed to load or display.

---

## 2026-04-15T19:27:01.983Z -- Task `task_1776280392792_6mypkx` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 10834ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T19-26-51-148Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank/black screen).

---

## 2026-04-15T19:27:09.592Z -- Task `task_1776280392792_6mypkx` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 7597ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T19-27-01-992Z.png)

> No visible components; UI not rendered (all-black screen). Error: Content failed to load or render.

---

## 2026-04-15T19:27:16.136Z -- Task `task_1776280392792_6mypkx` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 6522ms

![profile-desktop](visuals/profile-desktop-2026-04-15T19-27-09-614Z.png)

> No, the UI is not rendered—only a black screen is visible. No components are displayed; this indicates a rendering error or missing content.

---

## 2026-04-15T19:27:21.585Z -- Task `task_1776280392792_6mypkx` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 5413ms

![profile-mobile](visuals/profile-mobile-2026-04-15T19-27-16-172Z.png)

> No visible components; UI not rendered (black screen). Error: Content failed to load/display.

---

## 2026-04-15T19:27:27.670Z -- Task `task_1776280392792_6mypkx` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 6085ms

![friends-desktop](visuals/friends-desktop-2026-04-15T19-27-21-585Z.png)

> No UI components are rendered; the screen is entirely black, indicating a rendering error or missing content.

---

## 2026-04-15T19:27:34.274Z -- Task `task_1776280392792_6mypkx` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 6601ms

![friends-mobile](visuals/friends-mobile-2026-04-15T19-27-27-671Z.png)

> No visible components; UI fails to render content for the "#friends" route.

---

## 2026-04-15T19:27:41.238Z -- Task `task_1776280392792_6mypkx` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 6959ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T19-27-34-278Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T19:27:47.460Z -- Task `task_1776280392792_6mypkx` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 6222ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T19-27-41-238Z.png)

> No visible UI components are rendered; the screen is entirely black. Error: The leaderboard route fails to display any content or interactive elements.

---

## 2026-04-15T19:27:52.258Z -- Task `task_1776280392792_6mypkx` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4795ms

![game-desktop](visuals/game-desktop-2026-04-15T19-27-47-463Z.png)

> No UI components are rendered; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T19:27:57.460Z -- Task `task_1776280392792_6mypkx` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 5202ms

![game-mobile](visuals/game-mobile-2026-04-15T19-27-52-258Z.png)

> No visible components; UI not rendered (entirely black screen). Error: No content displayed.

---

## 2026-04-15T19:30:42.828Z -- Task `task_1776281234157_zoi357` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 15452ms

![home-desktop](visuals/home-desktop-2026-04-15T19-30-27-374Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T19:30:49.344Z -- Task `task_1776281234157_zoi357` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 6353ms

![home-mobile](visuals/home-mobile-2026-04-15T19-30-42-991Z.png)

> No UI elements are visible; the screen is entirely black. Possible rendering error or missing content.

---

## 2026-04-15T19:30:54.679Z -- Task `task_1776281234157_zoi357` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 5335ms

![auth-desktop](visuals/auth-desktop-2026-04-15T19-30-49-344Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (blank screen).

---

## 2026-04-15T19:31:00.424Z -- Task `task_1776281234157_zoi357` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 5744ms

![auth-mobile](visuals/auth-mobile-2026-04-15T19-30-54-679Z.png)

> No UI components are visible; the screen is entirely black. Error: No content renders, suggesting a rendering failure or missing assets.

---

## 2026-04-15T19:31:06.884Z -- Task `task_1776281234157_zoi357` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 6460ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T19-31-00-424Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T19:31:16.835Z -- Task `task_1776281234157_zoi357` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 9949ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T19-31-06-885Z.png)

> No, the UI is not rendered—only a black screen is visible with no components displayed. Error: No UI elements are shown, indicating a rendering issue.

---

## 2026-04-15T19:31:23.453Z -- Task `task_1776281234157_zoi357` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 6591ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T19-31-16-862Z.png)

> No visible components; UI not rendered (black screen). Error: Content failed to load or render.

---

## 2026-04-15T19:31:29.221Z -- Task `task_1776281234157_zoi357` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 5765ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T19-31-23-454Z.png)

> No visible components; screen is entirely black. Possible rendering error or empty state not displayed correctly.

---

## 2026-04-15T19:31:37.680Z -- Task `task_1776281234157_zoi357` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 8422ms

![profile-desktop](visuals/profile-desktop-2026-04-15T19-31-29-223Z.png)

> No, the UI is not rendered. No visible components; the screen is entirely black, indicating a rendering issue.

---

## 2026-04-15T19:31:46.839Z -- Task `task_1776281234157_zoi357` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 9135ms

![profile-mobile](visuals/profile-mobile-2026-04-15T19-31-37-704Z.png)

> No UI elements are visible; the screen is entirely black. Error: No content rendered for the #profile route.

---

## 2026-04-15T19:31:53.653Z -- Task `task_1776281234157_zoi357` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 6771ms

![friends-desktop](visuals/friends-desktop-2026-04-15T19-31-46-857Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T19:32:09.973Z -- Task `task_1776281234157_zoi357` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 16256ms

![friends-mobile](visuals/friends-mobile-2026-04-15T19-31-53-716Z.png)

> No visible components; the screen is entirely black, indicating a rendering error where content failed to load or display.

---

## 2026-04-15T19:32:19.654Z -- Task `task_1776281234157_zoi357` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 9673ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T19-32-09-981Z.png)

> No UI components are rendered; the screen is entirely black. Error: No visible elements or content displayed for the leaderboard route.

---

## 2026-04-15T19:33:00.567Z -- Task `task_1776281234157_zoi357` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 40883ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T19-32-19-677Z.png)

> No visible components; UI not rendered (black screen). Error: Content fails to load/display.

---

## 2026-04-15T19:35:31.619Z -- Task `task_1776281234157_zoi357` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 151030ms

![game-desktop](visuals/game-desktop-2026-04-15T19-33-00-583Z.png)

> No UI components are rendered; the screen is entirely black. Error: No visible elements present, indicating a rendering issue.

---

## 2026-04-15T19:35:55.755Z -- Task `task_1776281234157_zoi357` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 24119ms

![game-mobile](visuals/game-mobile-2026-04-15T19-35-31-636Z.png)

> No, the UI is not rendered—only a solid black screen is visible with no components displayed. Error: No UI elements are shown, indicating a rendering issue or missing content.

---

## 2026-04-15T19:53:59.790Z -- Task `task_1776281534423_iozwdj` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 6915ms

![home-desktop](visuals/home-desktop-2026-04-15T19-53-52-875Z.png)

> No UI elements are visible; the screen is entirely black. This indicates a rendering issue (e.g., missing content or failed load).

---

## 2026-04-15T19:54:04.154Z -- Task `task_1776281534423_iozwdj` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4363ms

![home-mobile](visuals/home-mobile-2026-04-15T19-53-59-791Z.png)

> No visible components; the UI appears as a solid black screen, indicating a rendering issue or empty state.

---

## 2026-04-15T19:54:09.191Z -- Task `task_1776281534423_iozwdj` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 5036ms

![auth-desktop](visuals/auth-desktop-2026-04-15T19-54-04-155Z.png)

> No visible UI components; screen is entirely black. Possible rendering error or missing content.

---

## 2026-04-15T19:54:14.513Z -- Task `task_1776281534423_iozwdj` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 5322ms

![auth-mobile](visuals/auth-mobile-2026-04-15T19-54-09-191Z.png)

> The UI is not rendered; the screen is entirely black with no visible components. Error: No content displayed, suggesting rendering failure or missing assets.

---

## 2026-04-15T19:54:18.711Z -- Task `task_1776281534423_iozwdj` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4198ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T19-54-14-513Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T19:54:22.955Z -- Task `task_1776281534423_iozwdj` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4243ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T19-54-18-712Z.png)

> No UI components are visible; the screen is entirely black. The UI failed to render, showing a blank (black) display with no interactive elements or content.

---

## 2026-04-15T19:54:27.467Z -- Task `task_1776281534423_iozwdj` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4512ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T19-54-22-955Z.png)

> No, the UI is not rendered—screen is entirely black. No visible components; error: missing lobby content.

---

## 2026-04-15T19:54:31.922Z -- Task `task_1776281534423_iozwdj` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4454ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T19-54-27-468Z.png)

> No visible components; the screen is entirely black. Error: No UI elements are rendered on the "#lobby" route.

---

## 2026-04-15T19:54:37.128Z -- Task `task_1776281534423_iozwdj` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 5205ms

![profile-desktop](visuals/profile-desktop-2026-04-15T19-54-31-923Z.png)

> No, the UI is not rendered; the screen is entirely black with no visible components. Error: Blank/black screen indicates failed rendering or missing content.

---

## 2026-04-15T19:54:40.956Z -- Task `task_1776281534423_iozwdj` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 3827ms

![profile-mobile](visuals/profile-mobile-2026-04-15T19-54-37-129Z.png)

> No visible components; UI not rendered (entirely black screen).

---

## 2026-04-15T19:54:45.749Z -- Task `task_1776281534423_iozwdj` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 4791ms

![friends-desktop](visuals/friends-desktop-2026-04-15T19-54-40-958Z.png)

> No visible components are rendered; the UI appears completely blank, indicating a rendering error.

---

## 2026-04-15T19:54:51.014Z -- Task `task_1776281534423_iozwdj` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 5265ms

![friends-mobile](visuals/friends-mobile-2026-04-15T19-54-45-749Z.png)

> No visible UI components are rendered; the screen is entirely black. Error: Blank screen with no content displayed for the "#friends" route.

---

## 2026-04-15T19:54:55.784Z -- Task `task_1776281534423_iozwdj` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 4769ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T19-54-51-014Z.png)

> No, the UI is not rendered—only a black screen is visible. No components are displayed; this indicates a rendering error or missing content.

---

## 2026-04-15T19:54:59.978Z -- Task `task_1776281534423_iozwdj` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4194ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T19-54-55-784Z.png)

> No visible components; the screen is entirely black, indicating a rendering issue or missing content.

---

## 2026-04-15T19:55:04.413Z -- Task `task_1776281534423_iozwdj` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4434ms

![game-desktop](visuals/game-desktop-2026-04-15T19-54-59-979Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T19:55:08.426Z -- Task `task_1776281534423_iozwdj` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 4012ms

![game-mobile](visuals/game-mobile-2026-04-15T19-55-04-413Z.png)

> No, the UI is not rendered—only a solid black screen is visible. No components are displayed, indicating a rendering issue.

---

## 2026-04-15T19:59:34.165Z -- Task `task_1776282926104_q6z8lr` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 11457ms

![home-desktop](visuals/home-desktop-2026-04-15T19-59-22-708Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T19:59:38.807Z -- Task `task_1776282926104_q6z8lr` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4641ms

![home-mobile](visuals/home-mobile-2026-04-15T19-59-34-165Z.png)

> No UI elements are visible; the screen is entirely black. Possible rendering error or missing content.

---

## 2026-04-15T19:59:42.915Z -- Task `task_1776282926104_q6z8lr` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4108ms

![auth-desktop](visuals/auth-desktop-2026-04-15T19-59-38-807Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T19:59:46.815Z -- Task `task_1776282926104_q6z8lr` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 3899ms

![auth-mobile](visuals/auth-mobile-2026-04-15T19-59-42-916Z.png)

> No visible components; UI not rendered (all-black screen).

---

## 2026-04-15T19:59:51.003Z -- Task `task_1776282926104_q6z8lr` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4188ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T19-59-46-815Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T19:59:54.935Z -- Task `task_1776282926104_q6z8lr` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 3932ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T19-59-51-003Z.png)

> No UI components are visible; the screen is entirely black. The UI fails to render, indicating a potential loading issue or display error.

---

## 2026-04-15T19:59:58.977Z -- Task `task_1776282926104_q6z8lr` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4042ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T19-59-54-935Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:00:03.371Z -- Task `task_1776282926104_q6z8lr` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 4394ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T19-59-58-977Z.png)

> No, the UI is not rendered—only a solid black screen is visible. No components are displayed, indicating a rendering issue or missing content.

---

## 2026-04-15T20:00:07.820Z -- Task `task_1776282926104_q6z8lr` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 4449ms

![profile-desktop](visuals/profile-desktop-2026-04-15T20-00-03-371Z.png)

> No, the UI is not rendered. No visible components; entire screen is black, indicating a rendering issue or missing content.

---

## 2026-04-15T20:00:12.609Z -- Task `task_1776282926104_q6z8lr` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4788ms

![profile-mobile](visuals/profile-mobile-2026-04-15T20-00-07-821Z.png)

> No UI elements are visible; the screen is entirely black. Rendering error (blank/black screen) prevents displaying profile content.

---

## 2026-04-15T20:00:16.740Z -- Task `task_1776282926104_q6z8lr` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 4131ms

![friends-desktop](visuals/friends-desktop-2026-04-15T20-00-12-609Z.png)

> No, the UI is not rendered—only a black screen is visible. No components are displayed, indicating a rendering error.

---

## 2026-04-15T20:00:20.786Z -- Task `task_1776282926104_q6z8lr` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 4046ms

![friends-mobile](visuals/friends-mobile-2026-04-15T20-00-16-740Z.png)

> No visible components; UI not rendered (entire screen is black). Error: Content fails to load/display.

---

## 2026-04-15T20:00:24.783Z -- Task `task_1776282926104_q6z8lr` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 3997ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T20-00-20-786Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank/black screen).

---

## 2026-04-15T20:00:29.288Z -- Task `task_1776282926104_q6z8lr` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4504ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T20-00-24-784Z.png)

> No visible components; screen is entirely black. Error—UI not rendered (no content displayed).

---

## 2026-04-15T20:00:33.512Z -- Task `task_1776282926104_q6z8lr` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4223ms

![game-desktop](visuals/game-desktop-2026-04-15T20-00-29-289Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no elements displayed).

---

## 2026-04-15T20:00:37.686Z -- Task `task_1776282926104_q6z8lr` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4174ms

![game-mobile](visuals/game-mobile-2026-04-15T20-00-33-512Z.png)

> No visible components are rendered; the screen is entirely black. Error: UI failed to render any content on the mobile 375x812 viewport.

---

## 2026-04-15T20:01:04.001Z -- Task `task_1776283248438_htsfay` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4238ms

![home-desktop](visuals/home-desktop-2026-04-15T20-00-59-763Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:01:08.093Z -- Task `task_1776283248438_htsfay` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 4091ms

![home-mobile](visuals/home-mobile-2026-04-15T20-01-04-002Z.png)

> No visible components; UI not rendered (all-black screen). Error: No content displayed.

---

## 2026-04-15T20:01:13.889Z -- Task `task_1776283248438_htsfay` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 5796ms

![auth-desktop](visuals/auth-desktop-2026-04-15T20-01-08-093Z.png)

> No UI elements are rendered; the screen is entirely black. Error—no authentication interface components (e.g., login form, buttons) are visible.

---

## 2026-04-15T20:01:18.456Z -- Task `task_1776283248438_htsfay` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4567ms

![auth-mobile](visuals/auth-mobile-2026-04-15T20-01-13-889Z.png)

> No visible components; screen is entirely black. Error—UI not rendered or content missing.

---

## 2026-04-15T20:01:22.433Z -- Task `task_1776283248438_htsfay` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 3977ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T20-01-18-456Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:01:27.450Z -- Task `task_1776283248438_htsfay` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 5017ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T20-01-22-433Z.png)

> The UI is not rendered; the screen is entirely black with no visible components. Error: No content is displayed, indicating a potential rendering failure or empty state.

---

## 2026-04-15T20:01:31.365Z -- Task `task_1776283248438_htsfay` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 3915ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T20-01-27-450Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank/black screen).

---

## 2026-04-15T20:01:35.129Z -- Task `task_1776283248438_htsfay` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 3764ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T20-01-31-365Z.png)

> No visible components; UI not rendered (blank screen).

---

## 2026-04-15T20:01:39.533Z -- Task `task_1776283248438_htsfay` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4404ms

![profile-desktop](visuals/profile-desktop-2026-04-15T20-01-35-129Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render for route "#profile".

---

## 2026-04-15T20:01:44.346Z -- Task `task_1776283248438_htsfay` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4813ms

![profile-mobile](visuals/profile-mobile-2026-04-15T20-01-39-533Z.png)

> No UI components are visible; the screen is entirely black. Error: Content failed to render or load.

---

## 2026-04-15T20:01:48.544Z -- Task `task_1776283248438_htsfay` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 4198ms

![friends-desktop](visuals/friends-desktop-2026-04-15T20-01-44-346Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank/black screen).

---

## 2026-04-15T20:01:52.434Z -- Task `task_1776283248438_htsfay` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 3890ms

![friends-mobile](visuals/friends-mobile-2026-04-15T20-01-48-544Z.png)

> No visible components; UI not rendered (black screen). Error: Content fails to load/display.

---

## 2026-04-15T20:01:56.404Z -- Task `task_1776283248438_htsfay` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 3970ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T20-01-52-434Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (blank display).

---

## 2026-04-15T20:02:00.503Z -- Task `task_1776283248438_htsfay` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 4098ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T20-01-56-405Z.png)

> No visible components are rendered. The UI fails to display any elements, indicating a rendering error.

---

## 2026-04-15T20:02:04.415Z -- Task `task_1776283248438_htsfay` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 3912ms

![game-desktop](visuals/game-desktop-2026-04-15T20-02-00-503Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no elements displayed).

---

## 2026-04-15T20:02:08.306Z -- Task `task_1776283248438_htsfay` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 3891ms

![game-mobile](visuals/game-mobile-2026-04-15T20-02-04-415Z.png)

> No visible components are rendered; the screen is entirely black. Error: UI fails to display any content on the specified route and device dimensions.

---

## 2026-04-15T20:03:00.439Z -- Task `task_1776283341358_lysgai` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4510ms

![home-desktop](visuals/home-desktop-2026-04-15T20-02-55-929Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:03:04.726Z -- Task `task_1776283341358_lysgai` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4285ms

![home-mobile](visuals/home-mobile-2026-04-15T20-03-00-441Z.png)

> No UI elements are visible; the screen is entirely black. Error: No content rendered on the specified route and device.

---

## 2026-04-15T20:03:08.875Z -- Task `task_1776283341358_lysgai` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4149ms

![auth-desktop](visuals/auth-desktop-2026-04-15T20-03-04-726Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:03:12.917Z -- Task `task_1776283341358_lysgai` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4042ms

![auth-mobile](visuals/auth-mobile-2026-04-15T20-03-08-875Z.png)

> No visible components are rendered; the screen is entirely black. Error: UI failed to render any content for the "#auth" route.

---

## 2026-04-15T20:03:16.815Z -- Task `task_1776283341358_lysgai` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 3897ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T20-03-12-918Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:03:20.804Z -- Task `task_1776283341358_lysgai` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 3989ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T20-03-16-815Z.png)

> No UI components are visible; the screen is entirely black. The UI failed to render, showing a blank/black screen instead of dashboard elements.

---

## 2026-04-15T20:03:24.797Z -- Task `task_1776283341358_lysgai` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 3993ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T20-03-20-804Z.png)

> No UI elements are rendered; the screen is entirely black. Error: No visible components loaded for the "#lobby" route.

---

## 2026-04-15T20:03:28.574Z -- Task `task_1776283341358_lysgai` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 3777ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T20-03-24-797Z.png)

> No visible components; UI is not rendered (blank black screen).

---

## 2026-04-15T20:03:32.784Z -- Task `task_1776283341358_lysgai` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4210ms

![profile-desktop](visuals/profile-desktop-2026-04-15T20-03-28-574Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:03:37.770Z -- Task `task_1776283341358_lysgai` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4986ms

![profile-mobile](visuals/profile-mobile-2026-04-15T20-03-32-784Z.png)

> No visible components are rendered; the screen is entirely black. Error: No UI elements or content are displayed for the #profile route.

---

## 2026-04-15T20:03:41.791Z -- Task `task_1776283341358_lysgai` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 4021ms

![friends-desktop](visuals/friends-desktop-2026-04-15T20-03-37-770Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (blank/black screen).

---

## 2026-04-15T20:03:45.573Z -- Task `task_1776283341358_lysgai` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 3782ms

![friends-mobile](visuals/friends-mobile-2026-04-15T20-03-41-791Z.png)

> No visible components; UI not rendered (black screen). Error: Content failed to load or render.

---

## 2026-04-15T20:03:50.479Z -- Task `task_1776283341358_lysgai` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 4905ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T20-03-45-574Z.png)

> The UI is not rendered; no visible components (e.g., leaderboard title, entries) are present. Error: Complete blank screen indicates a rendering failure or missing content.

---

## 2026-04-15T20:03:54.800Z -- Task `task_1776283341358_lysgai` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 4321ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T20-03-50-479Z.png)

> No visible components; the UI appears unrendered (completely black screen). Error: No content displayed for the leaderboard route.

---

## 2026-04-15T20:03:58.930Z -- Task `task_1776283341358_lysgai` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4130ms

![game-desktop](visuals/game-desktop-2026-04-15T20-03-54-800Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no elements displayed).

---

## 2026-04-15T20:04:02.889Z -- Task `task_1776283341358_lysgai` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 3959ms

![game-mobile](visuals/game-mobile-2026-04-15T20-03-58-930Z.png)

> No visible components are rendered; the screen is entirely black. Error: UI fails to display any content on the specified route.

---

## 2026-04-15T20:04:40.060Z -- Task `task_1776283451798_h07uro` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4356ms

![home-desktop](visuals/home-desktop-2026-04-15T20-04-35-704Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:04:43.892Z -- Task `task_1776283451798_h07uro` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 3831ms

![home-mobile](visuals/home-mobile-2026-04-15T20-04-40-061Z.png)

> No visible components; UI not rendered (black screen). Error: No content displayed on route "/".

---

## 2026-04-15T20:04:49.074Z -- Task `task_1776283451798_h07uro` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 5182ms

![auth-desktop](visuals/auth-desktop-2026-04-15T20-04-43-892Z.png)

> No UI components are visible; the screen is entirely black. Likely a rendering error or missing content for the auth route.

---

## 2026-04-15T20:04:52.783Z -- Task `task_1776283451798_h07uro` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 3709ms

![auth-mobile](visuals/auth-mobile-2026-04-15T20-04-49-074Z.png)

> No visible components; UI not rendered (blank screen).

---

## 2026-04-15T20:04:56.990Z -- Task `task_1776283451798_h07uro` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4207ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T20-04-52-783Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:05:01.254Z -- Task `task_1776283451798_h07uro` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4264ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T20-04-56-990Z.png)

> No UI components are visible; the screen is entirely black. The UI failed to render, indicating an error in loading or displaying the dashboard content.

---

## 2026-04-15T20:05:05.350Z -- Task `task_1776283451798_h07uro` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4095ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T20-05-01-255Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank/black screen).

---

## 2026-04-15T20:05:09.548Z -- Task `task_1776283451798_h07uro` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 4198ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T20-05-05-350Z.png)

> No visible components; UI not rendered (black screen). Error: Content failed to load/display.

---

## 2026-04-15T20:05:13.699Z -- Task `task_1776283451798_h07uro` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4150ms

![profile-desktop](visuals/profile-desktop-2026-04-15T20-05-09-549Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render for the "#profile" route.

---

## 2026-04-15T20:05:18.167Z -- Task `task_1776283451798_h07uro` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 4468ms

![profile-mobile](visuals/profile-mobile-2026-04-15T20-05-13-699Z.png)

> No visible components; UI is not rendered (blank screen). Error: No content displayed on the profile route.

---

## 2026-04-15T20:05:22.450Z -- Task `task_1776283451798_h07uro` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 4283ms

![friends-desktop](visuals/friends-desktop-2026-04-15T20-05-18-167Z.png)

> No, the UI is not rendered; the screen is entirely black with no visible components. Error: No content displayed (blank/black screen).

---

## 2026-04-15T20:05:26.128Z -- Task `task_1776283451798_h07uro` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 3677ms

![friends-mobile](visuals/friends-mobile-2026-04-15T20-05-22-451Z.png)

> No visible components; UI not rendered (blank screen).

---

## 2026-04-15T20:05:30.336Z -- Task `task_1776283451798_h07uro` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4207ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T20-05-26-129Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (blank display).

---

## 2026-04-15T20:05:35.168Z -- Task `task_1776283451798_h07uro` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4832ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T20-05-30-336Z.png)

> No UI components are visible; the screen is entirely black. Error: The leaderboard page failed to render any content.

---

## 2026-04-15T20:05:39.167Z -- Task `task_1776283451798_h07uro` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 3999ms

![game-desktop](visuals/game-desktop-2026-04-15T20-05-35-168Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no elements displayed).

---

## 2026-04-15T20:05:42.809Z -- Task `task_1776283451798_h07uro` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 3642ms

![game-mobile](visuals/game-mobile-2026-04-15T20-05-39-167Z.png)

> No visible components; UI not rendered (entirely black screen).

---

## 2026-04-15T20:06:33.122Z -- Task `task_1776283556500_xtv3ob` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4170ms

![home-desktop](visuals/home-desktop-2026-04-15T20-06-28-951Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:06:37.202Z -- Task `task_1776283556500_xtv3ob` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4080ms

![home-mobile](visuals/home-mobile-2026-04-15T20-06-33-122Z.png)

> No UI elements are visible; the screen is entirely black, indicating a rendering issue or missing content.

---

## 2026-04-15T20:06:46.318Z -- Task `task_1776283556500_xtv3ob` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 9116ms

![auth-desktop](visuals/auth-desktop-2026-04-15T20-06-37-202Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:06:50.411Z -- Task `task_1776283556500_xtv3ob` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 4092ms

![auth-mobile](visuals/auth-mobile-2026-04-15T20-06-46-319Z.png)

> No visible components; UI not rendered (all-black screen indicates rendering failure).

---

## 2026-04-15T20:06:54.607Z -- Task `task_1776283556500_xtv3ob` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4196ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T20-06-50-411Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:06:59.934Z -- Task `task_1776283556500_xtv3ob` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 5326ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T20-06-54-607Z.png)

> No, the UI is not rendered—there are no visible components. The screen displays a solid black background with no interactive elements or content, indicating an issue with rendering.

---

## 2026-04-15T20:07:04.362Z -- Task `task_1776283556500_xtv3ob` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4428ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T20-06-59-934Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank/black screen).

---

## 2026-04-15T20:07:08.127Z -- Task `task_1776283556500_xtv3ob` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 3765ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T20-07-04-362Z.png)

> No visible components; UI not rendered (blank screen).

---

## 2026-04-15T20:07:20.314Z -- Task `task_1776283556500_xtv3ob` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 12187ms

![profile-desktop](visuals/profile-desktop-2026-04-15T20-07-08-127Z.png)

> No, the UI is not rendered. No visible components; the screen is entirely black, indicating a rendering issue or missing content.

---

## 2026-04-15T20:07:33.035Z -- Task `task_1776283556500_xtv3ob` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 12721ms

![profile-mobile](visuals/profile-mobile-2026-04-15T20-07-20-314Z.png)

> No UI elements are visible; the screen is entirely black. Error: No content is rendered for the "#profile" route.

---

## 2026-04-15T20:07:37.308Z -- Task `task_1776283556500_xtv3ob` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 4273ms

![friends-desktop](visuals/friends-desktop-2026-04-15T20-07-33-035Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:07:41.406Z -- Task `task_1776283556500_xtv3ob` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 4098ms

![friends-mobile](visuals/friends-mobile-2026-04-15T20-07-37-308Z.png)

> No visible components; UI not rendered (all-black screen).

---

## 2026-04-15T20:07:46.936Z -- Task `task_1776283556500_xtv3ob` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 5530ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T20-07-41-406Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (no content displayed).

---

## 2026-04-15T20:07:52.555Z -- Task `task_1776283556500_xtv3ob` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 5619ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T20-07-46-937Z.png)

> No, the UI is not rendered as the screen is entirely black with no visible components. Error: No content displayed (blank/black screen).

---

## 2026-04-15T20:07:57.376Z -- Task `task_1776283556500_xtv3ob` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4820ms

![game-desktop](visuals/game-desktop-2026-04-15T20-07-52-556Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:08:01.494Z -- Task `task_1776283556500_xtv3ob` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 4118ms

![game-mobile](visuals/game-mobile-2026-04-15T20-07-57-376Z.png)

> No visible components; UI not rendered (blank screen).

---

## 2026-04-15T20:09:24.425Z -- Task `task_1776283687784_qcba6w` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4989ms

![home-desktop](visuals/home-desktop-2026-04-15T20-09-19-436Z.png)

> No UI elements are visible; the screen is entirely black. Likely a rendering error or missing content.

---

## 2026-04-15T20:09:28.930Z -- Task `task_1776283687784_qcba6w` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4505ms

![home-mobile](visuals/home-mobile-2026-04-15T20-09-24-425Z.png)

> No UI components are visible; the screen is entirely black, indicating the UI is not rendered. Error: No content displayed on the route.

---

## 2026-04-15T20:09:33.233Z -- Task `task_1776283687784_qcba6w` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4303ms

![auth-desktop](visuals/auth-desktop-2026-04-15T20-09-28-930Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:09:37.634Z -- Task `task_1776283687784_qcba6w` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4401ms

![auth-mobile](visuals/auth-mobile-2026-04-15T20-09-33-233Z.png)

> No visible components are rendered; the screen is entirely black. Error: UI fails to render any content for the "#auth" route.

---

## 2026-04-15T20:09:41.833Z -- Task `task_1776283687784_qcba6w` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4199ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T20-09-37-634Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:09:46.620Z -- Task `task_1776283687784_qcba6w` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4787ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T20-09-41-833Z.png)

> No, the UI is not rendered. No visible components; the screen is entirely black (blank), indicating a rendering issue or missing content.

---

## 2026-04-15T20:09:50.844Z -- Task `task_1776283687784_qcba6w` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4224ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T20-09-46-620Z.png)

> No UI elements are visible; the screen is entirely black. Error: No components rendered for the "#lobby" route.

---

## 2026-04-15T20:09:54.529Z -- Task `task_1776283687784_qcba6w` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 3685ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T20-09-50-844Z.png)

> No visible components; UI not rendered (blank screen).

---

## 2026-04-15T20:09:59.650Z -- Task `task_1776283687784_qcba6w` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 5120ms

![profile-desktop](visuals/profile-desktop-2026-04-15T20-09-54-530Z.png)

> No, the UI is not rendered; the screen is entirely black with no visible components. Error: Blank screen indicates failed rendering or missing content.

---

## 2026-04-15T20:10:03.661Z -- Task `task_1776283687784_qcba6w` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 4011ms

![profile-mobile](visuals/profile-mobile-2026-04-15T20-09-59-650Z.png)

> No visible components are rendered. The UI fails to display any content, indicating a rendering error.

---

## 2026-04-15T20:10:07.841Z -- Task `task_1776283687784_qcba6w` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 4180ms

![friends-desktop](visuals/friends-desktop-2026-04-15T20-10-03-661Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:10:11.938Z -- Task `task_1776283687784_qcba6w` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 4097ms

![friends-mobile](visuals/friends-mobile-2026-04-15T20-10-07-841Z.png)

> No visible components; UI not rendered (entirely black screen). Error: Content failed to load/display.

---

## 2026-04-15T20:10:16.136Z -- Task `task_1776283687784_qcba6w` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4198ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T20-10-11-938Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:10:20.788Z -- Task `task_1776283687784_qcba6w` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4651ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T20-10-16-136Z.png)

> No UI components are visible; the screen is entirely black. Error: The leaderboard page failed to render any content.

---

## 2026-04-15T20:10:24.737Z -- Task `task_1776283687784_qcba6w` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 3949ms

![game-desktop](visuals/game-desktop-2026-04-15T20-10-20-788Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank/black screen).

---

## 2026-04-15T20:10:28.629Z -- Task `task_1776283687784_qcba6w` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 3892ms

![game-mobile](visuals/game-mobile-2026-04-15T20-10-24-737Z.png)

> No visible components; UI not rendered (all-black screen). Error: Content fails to display.

---

## 2026-04-15T20:16:11.458Z -- Task `task_1776283841736_dnshqq` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 5109ms

![home-desktop](visuals/home-desktop-2026-04-15T20-16-06-349Z.png)

> No UI elements are visible; the screen is entirely black. This indicates a rendering issue (e.g., missing content or failed load).

---

## 2026-04-15T20:16:15.451Z -- Task `task_1776283841736_dnshqq` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 3992ms

![home-mobile](visuals/home-mobile-2026-04-15T20-16-11-459Z.png)

> No visible components are rendered; the screen is entirely black, indicating a failure to display the UI.

---

## 2026-04-15T20:16:19.912Z -- Task `task_1776283841736_dnshqq` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4461ms

![auth-desktop](visuals/auth-desktop-2026-04-15T20-16-15-451Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank/black screen).

---

## 2026-04-15T20:16:24.770Z -- Task `task_1776283841736_dnshqq` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4858ms

![auth-mobile](visuals/auth-mobile-2026-04-15T20-16-19-912Z.png)

> No visible components; screen is entirely black. Error: UI not rendered (no content displayed).

---

## 2026-04-15T20:16:29.379Z -- Task `task_1776283841736_dnshqq` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 4609ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T20-16-24-770Z.png)

> No, the UI is not rendered—only a black screen is visible. No components are displayed; error: missing dashboard content.

---

## 2026-04-15T20:16:36.033Z -- Task `task_1776283841736_dnshqq` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 6654ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T20-16-29-379Z.png)

> No, the UI is not rendered—the screen is entirely black with no visible components. Errors: No components are displayed, indicating a failure to render content.

---

## 2026-04-15T20:16:40.345Z -- Task `task_1776283841736_dnshqq` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4311ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T20-16-36-034Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:16:44.203Z -- Task `task_1776283841736_dnshqq` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 3858ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T20-16-40-345Z.png)

> No visible components; UI not rendered (blank screen).

---

## 2026-04-15T20:16:48.454Z -- Task `task_1776283841736_dnshqq` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4251ms

![profile-desktop](visuals/profile-desktop-2026-04-15T20-16-44-203Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render for the "#profile" route.

---

## 2026-04-15T20:16:52.687Z -- Task `task_1776283841736_dnshqq` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4233ms

![profile-mobile](visuals/profile-mobile-2026-04-15T20-16-48-454Z.png)

> No UI components are visible; the screen is entirely black. The UI fails to render, indicating a potential loading issue or display error.

---

## 2026-04-15T20:16:57.232Z -- Task `task_1776283841736_dnshqq` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 4545ms

![friends-desktop](visuals/friends-desktop-2026-04-15T20-16-52-687Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render for the "#friends" route on desktop 1280x720.

---

## 2026-04-15T20:17:01.224Z -- Task `task_1776283841736_dnshqq` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 3992ms

![friends-mobile](visuals/friends-mobile-2026-04-15T20-16-57-232Z.png)

> No visible components; UI not rendered (entirely black screen).

---

## 2026-04-15T20:17:06.196Z -- Task `task_1776283841736_dnshqq` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4972ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T20-17-01-224Z.png)

> No visible components are rendered; the UI appears entirely black, indicating a rendering issue or missing content.

---

## 2026-04-15T20:17:10.645Z -- Task `task_1776283841736_dnshqq` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4449ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T20-17-06-196Z.png)

> No visible components; the screen is entirely black, indicating a rendering issue or empty state.

---

## 2026-04-15T20:17:14.939Z -- Task `task_1776283841736_dnshqq` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4294ms

![game-desktop](visuals/game-desktop-2026-04-15T20-17-10-645Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:17:18.838Z -- Task `task_1776283841736_dnshqq` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 3899ms

![game-mobile](visuals/game-mobile-2026-04-15T20-17-14-939Z.png)

> No, the UI is not rendered—only a black screen is visible. No components are displayed, indicating a rendering issue.

---

## 2026-04-15T20:18:42.864Z -- Task `task_1776284250407_ym1szd` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 4049ms

![home-desktop](visuals/home-desktop-2026-04-15T20-18-38-815Z.png)

> No, the UI is not rendered—only a black screen is visible. No components are displayed, indicating a rendering issue.

---

## 2026-04-15T20:18:46.876Z -- Task `task_1776284250407_ym1szd` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4012ms

![home-mobile](visuals/home-mobile-2026-04-15T20-18-42-864Z.png)

> No UI elements are visible; the screen is entirely black, indicating a rendering issue or missing content.

---

## 2026-04-15T20:18:50.791Z -- Task `task_1776284250407_ym1szd` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 3914ms

![auth-desktop](visuals/auth-desktop-2026-04-15T20-18-46-877Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:18:55.193Z -- Task `task_1776284250407_ym1szd` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4402ms

![auth-mobile](visuals/auth-mobile-2026-04-15T20-18-50-791Z.png)

> No visible components; screen is entirely black. Error—UI not rendered (no content displayed).

---

## 2026-04-15T20:18:59.128Z -- Task `task_1776284250407_ym1szd` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 3935ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T20-18-55-193Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:19:02.962Z -- Task `task_1776284250407_ym1szd` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 3834ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T20-18-59-128Z.png)

> No UI components are visible; the screen is entirely black. Error: No content rendered on the dashboard route.

---

## 2026-04-15T20:19:06.868Z -- Task `task_1776284250407_ym1szd` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 3906ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T20-19-02-962Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:19:10.560Z -- Task `task_1776284250407_ym1szd` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 3692ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T20-19-06-868Z.png)

> No visible components; UI not rendered (black screen).

---

## 2026-04-15T20:19:14.445Z -- Task `task_1776284250407_ym1szd` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 3884ms

![profile-desktop](visuals/profile-desktop-2026-04-15T20-19-10-561Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:19:19.462Z -- Task `task_1776284250407_ym1szd` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 5016ms

![profile-mobile](visuals/profile-mobile-2026-04-15T20-19-14-446Z.png)

> No, the UI is not rendered—the screen is entirely black with no visible components. Error: Blank screen suggests a rendering failure or missing content.

---

## 2026-04-15T20:19:24.787Z -- Task `task_1776284250407_ym1szd` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 5324ms

![friends-desktop](visuals/friends-desktop-2026-04-15T20-19-19-463Z.png)

> No UI components are visible; the screen is entirely black. Error: Content for the #friends route did not render or load.

---

## 2026-04-15T20:19:28.678Z -- Task `task_1776284250407_ym1szd` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 3891ms

![friends-mobile](visuals/friends-mobile-2026-04-15T20-19-24-787Z.png)

> No visible components; UI not rendered (entire screen is black). Error: Content fails to load/display.

---

## 2026-04-15T20:19:34.288Z -- Task `task_1776284250407_ym1szd` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 5609ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T20-19-28-679Z.png)

> No UI elements are rendered; the screen is entirely black. Missing leaderboard-specific components (headers, rankings, scores) expected for this route.

---

## 2026-04-15T20:19:39.737Z -- Task `task_1776284250407_ym1szd` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 5449ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T20-19-34-288Z.png)

> No visible components are rendered; the screen is entirely black. Error: No UI elements or content are displayed for the #leaderboard route.

---

## 2026-04-15T20:19:43.628Z -- Task `task_1776284250407_ym1szd` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 3891ms

![game-desktop](visuals/game-desktop-2026-04-15T20-19-39-737Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:19:47.686Z -- Task `task_1776284250407_ym1szd` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4058ms

![game-mobile](visuals/game-mobile-2026-04-15T20-19-43-628Z.png)

> No visible components are rendered; the screen is entirely black. Error: UI failed to render any content.

---

## 2026-04-15T20:20:28.479Z -- Task `task_1776284403763_loaeoz` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 3753ms

![home-desktop](visuals/home-desktop-2026-04-15T20-20-24-726Z.png)

> No, the UI is not rendered. No visible components; entire screen is black (rendering error).

---

## 2026-04-15T20:20:32.466Z -- Task `task_1776284403763_loaeoz` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 3987ms

![home-mobile](visuals/home-mobile-2026-04-15T20-20-28-479Z.png)

> No UI elements are visible; the screen is entirely black, indicating a rendering issue or missing content.

---

## 2026-04-15T20:20:36.466Z -- Task `task_1776284403763_loaeoz` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 3999ms

![auth-desktop](visuals/auth-desktop-2026-04-15T20-20-32-467Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank/black screen).

---

## 2026-04-15T20:20:41.028Z -- Task `task_1776284403763_loaeoz` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4562ms

![auth-mobile](visuals/auth-mobile-2026-04-15T20-20-36-466Z.png)

> No visible UI components are rendered; the screen is entirely black. Possible rendering error or missing content for the auth route.

---

## 2026-04-15T20:20:45.000Z -- Task `task_1776284403763_loaeoz` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 3971ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T20-20-41-029Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:20:49.542Z -- Task `task_1776284403763_loaeoz` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 4542ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T20-20-45-000Z.png)

> The UI is not rendered; no visible components are present. Error: Blank/black screen indicates a rendering failure.

---

## 2026-04-15T20:20:53.668Z -- Task `task_1776284403763_loaeoz` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4126ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T20-20-49-542Z.png)

> No, the UI is not rendered—screen is entirely black. No visible components; error likely due to missing content or rendering issue.

---

## 2026-04-15T20:20:57.867Z -- Task `task_1776284403763_loaeoz` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4199ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T20-20-53-668Z.png)

> No visible components are rendered; the screen is entirely black. Error: UI fails to display any elements for the "#lobby" route.

---

## 2026-04-15T20:21:02.269Z -- Task `task_1776284403763_loaeoz` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4402ms

![profile-desktop](visuals/profile-desktop-2026-04-15T20-20-57-867Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (blank/black screen).

---

## 2026-04-15T20:21:06.571Z -- Task `task_1776284403763_loaeoz` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4302ms

![profile-mobile](visuals/profile-mobile-2026-04-15T20-21-02-269Z.png)

> No UI elements are visible; the screen is entirely black. Error: No content rendered for the #profile route.

---

## 2026-04-15T20:21:11.571Z -- Task `task_1776284403763_loaeoz` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 5000ms

![friends-desktop](visuals/friends-desktop-2026-04-15T20-21-06-571Z.png)

> No UI components are visible; the screen is entirely black. Error: Content for the #friends route did not render or load.

---

## 2026-04-15T20:21:23.671Z -- Task `task_1776284403763_loaeoz` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 12100ms

![friends-mobile](visuals/friends-mobile-2026-04-15T20-21-11-571Z.png)

> No visible components; UI not rendered (all-black screen). Error: Content fails to load/display.

---

## 2026-04-15T20:21:28.893Z -- Task `task_1776284403763_loaeoz` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 5222ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T20-21-23-671Z.png)

> The UI is not rendered; no visible components are present. Error: Complete lack of displayed content for the leaderboard route.

---

## 2026-04-15T20:21:33.052Z -- Task `task_1776284403763_loaeoz` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4159ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T20-21-28-893Z.png)

> No visible components are rendered; the screen is entirely black. Error: UI fails to display any content for the "#leaderboard" route.

---

## 2026-04-15T20:21:36.983Z -- Task `task_1776284403763_loaeoz` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 3930ms

![game-desktop](visuals/game-desktop-2026-04-15T20-21-33-053Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:21:41.491Z -- Task `task_1776284403763_loaeoz` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4508ms

![game-mobile](visuals/game-mobile-2026-04-15T20-21-36-983Z.png)

> No visible components are rendered; the screen is entirely black. Error: UI fails to display any content on the specified route and device dimensions.

---

## 2026-04-15T20:22:34.941Z -- Task `task_1776284517358_gkv4i2` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 5120ms

![home-desktop](visuals/home-desktop-2026-04-15T20-22-29-821Z.png)

> No, the UI is not rendered; no visible components are present. Error: Blank/black screen suggests rendering failure or missing content.

---

## 2026-04-15T20:22:39.447Z -- Task `task_1776284517358_gkv4i2` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4505ms

![home-mobile](visuals/home-mobile-2026-04-15T20-22-34-941Z.png)

> No UI elements are visible; the screen is entirely black. Possible rendering error or missing content.

---

## 2026-04-15T20:22:43.426Z -- Task `task_1776284517358_gkv4i2` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 3979ms

![auth-desktop](visuals/auth-desktop-2026-04-15T20-22-39-447Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (blank/black screen).

---

## 2026-04-15T20:22:47.412Z -- Task `task_1776284517358_gkv4i2` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 3986ms

![auth-mobile](visuals/auth-mobile-2026-04-15T20-22-43-426Z.png)

> No visible components are rendered; the screen is entirely black. Error: UI failed to render any content for the "#auth" route.

---

## 2026-04-15T20:22:51.429Z -- Task `task_1776284517358_gkv4i2` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4017ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T20-22-47-412Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:22:56.032Z -- Task `task_1776284517358_gkv4i2` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4603ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T20-22-51-429Z.png)

> No UI components are visible; the screen is entirely black. This indicates a rendering error or missing content for the dashboard route.

---

## 2026-04-15T20:23:00.028Z -- Task `task_1776284517358_gkv4i2` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 3996ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T20-22-56-032Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank screen).

---

## 2026-04-15T20:23:03.881Z -- Task `task_1776284517358_gkv4i2` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 3853ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T20-23-00-028Z.png)

> No visible components; UI is entirely black, indicating a rendering error.

---

## 2026-04-15T20:23:08.220Z -- Task `task_1776284517358_gkv4i2` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4339ms

![profile-desktop](visuals/profile-desktop-2026-04-15T20-23-03-881Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:23:12.965Z -- Task `task_1776284517358_gkv4i2` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4745ms

![profile-mobile](visuals/profile-mobile-2026-04-15T20-23-08-220Z.png)

> No, the UI is not rendered as the screen is entirely black with no visible components. Error: Blank/black screen indicates a failure to display profile content.

---

## 2026-04-15T20:23:17.231Z -- Task `task_1776284517358_gkv4i2` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 4266ms

![friends-desktop](visuals/friends-desktop-2026-04-15T20-23-12-965Z.png)

> No UI components are visible; the screen is entirely black. The UI failed to render for the "#friends" route.

---

## 2026-04-15T20:23:21.030Z -- Task `task_1776284517358_gkv4i2` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 3798ms

![friends-mobile](visuals/friends-mobile-2026-04-15T20-23-17-232Z.png)

> No visible components; UI not rendered (all-black screen). Error: Content failed to load/display.

---

## 2026-04-15T20:23:25.424Z -- Task `task_1776284517358_gkv4i2` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4393ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T20-23-21-031Z.png)

> No UI components are visible; the screen is entirely black. Error: No leaderboard content or elements rendered.

---

## 2026-04-15T20:23:30.646Z -- Task `task_1776284517358_gkv4i2` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 5222ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T20-23-25-424Z.png)

> No, the UI is not rendered; the screen is entirely black with no visible components. Error: Missing leaderboard content (no headers, lists, or interactive elements displayed).

---

## 2026-04-15T20:23:34.742Z -- Task `task_1776284517358_gkv4i2` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4096ms

![game-desktop](visuals/game-desktop-2026-04-15T20-23-30-646Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no elements displayed).

---

## 2026-04-15T20:23:38.326Z -- Task `task_1776284517358_gkv4i2` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 3583ms

![game-mobile](visuals/game-mobile-2026-04-15T20-23-34-743Z.png)

> No visible components; UI not rendered (black screen).

---

## 2026-04-15T20:24:33.606Z -- Task `task_1776284629946_de8ppa` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4469ms

![home-desktop](visuals/home-desktop-2026-04-15T20-24-29-137Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:24:37.764Z -- Task `task_1776284629946_de8ppa` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4157ms

![home-mobile](visuals/home-mobile-2026-04-15T20-24-33-607Z.png)

> No UI elements are visible; the screen is entirely black. Error: No content rendered for the specified route and device.

---

## 2026-04-15T20:24:42.018Z -- Task `task_1776284629946_de8ppa` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4254ms

![auth-desktop](visuals/auth-desktop-2026-04-15T20-24-37-764Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:24:46.831Z -- Task `task_1776284629946_de8ppa` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4813ms

![auth-mobile](visuals/auth-mobile-2026-04-15T20-24-42-018Z.png)

> No UI components are visible; the screen is entirely black. Error: No content renders for the #auth route.

---

## 2026-04-15T20:24:50.722Z -- Task `task_1776284629946_de8ppa` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 3890ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T20-24-46-832Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:24:54.128Z -- Task `task_1776284629946_de8ppa` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 3406ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T20-24-50-722Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T20:24:58.197Z -- Task `task_1776284629946_de8ppa` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4069ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T20-24-54-128Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:25:02.410Z -- Task `task_1776284629946_de8ppa` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4213ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T20-24-58-197Z.png)

> No visible components are rendered; the screen is entirely black. Error: UI fails to display any content on the lobby route.

---

## 2026-04-15T20:25:06.593Z -- Task `task_1776284629946_de8ppa` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4183ms

![profile-desktop](visuals/profile-desktop-2026-04-15T20-25-02-410Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (blank screen).

---

## 2026-04-15T20:25:11.508Z -- Task `task_1776284629946_de8ppa` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4915ms

![profile-mobile](visuals/profile-mobile-2026-04-15T20-25-06-593Z.png)

> No UI components are visible; the screen is entirely black. Error: No content rendered for the #profile route.

---

## 2026-04-15T20:25:16.730Z -- Task `task_1776284629946_de8ppa` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 5222ms

![friends-desktop](visuals/friends-desktop-2026-04-15T20-25-11-508Z.png)

> No, the UI is not rendered. Visible components: None. Error: Blank/black screen indicates failed rendering.

---

## 2026-04-15T20:25:20.827Z -- Task `task_1776284629946_de8ppa` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 4097ms

![friends-mobile](visuals/friends-mobile-2026-04-15T20-25-16-730Z.png)

> No visible components; UI not rendered (entirely black screen). Error: Content fails to display on "#friends" route.

---

## 2026-04-15T20:25:25.332Z -- Task `task_1776284629946_de8ppa` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4505ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T20-25-20-827Z.png)

> No UI components are visible; the screen is entirely black. Error: No leaderboard content or elements rendered.

---

## 2026-04-15T20:25:30.144Z -- Task `task_1776284629946_de8ppa` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4812ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T20-25-25-332Z.png)

> No visible components are rendered; the screen is entirely black. Error: The leaderboard UI failed to load or display any content.

---

## 2026-04-15T20:25:34.620Z -- Task `task_1776284629946_de8ppa` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4476ms

![game-desktop](visuals/game-desktop-2026-04-15T20-25-30-144Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:25:38.439Z -- Task `task_1776284629946_de8ppa` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 3819ms

![game-mobile](visuals/game-mobile-2026-04-15T20-25-34-620Z.png)

> No, the UI is not rendered—only a black screen is visible. No components are displayed, indicating a rendering issue.

---

## 2026-04-15T20:31:16.560Z -- Task `task_1776284750465_qljdtc` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4787ms

![home-desktop](visuals/home-desktop-2026-04-15T20-31-11-773Z.png)

> No UI elements are visible; the screen is entirely black. Possible rendering error or missing content.

---

## 2026-04-15T20:31:20.793Z -- Task `task_1776284750465_qljdtc` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 4233ms

![home-mobile](visuals/home-mobile-2026-04-15T20-31-16-560Z.png)

> No, the UI is not rendered—only a black screen is visible. No components are displayed, indicating a rendering issue.

---

## 2026-04-15T20:31:25.676Z -- Task `task_1776284750465_qljdtc` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4882ms

![auth-desktop](visuals/auth-desktop-2026-04-15T20-31-20-794Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render for route "#auth".

---

## 2026-04-15T20:31:30.076Z -- Task `task_1776284750465_qljdtc` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 4400ms

![auth-mobile](visuals/auth-mobile-2026-04-15T20-31-25-676Z.png)

> No visible components are rendered. The UI appears completely blank, indicating a rendering error.

---

## 2026-04-15T20:31:34.131Z -- Task `task_1776284750465_qljdtc` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4055ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T20-31-30-076Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank screen).

---

## 2026-04-15T20:31:37.960Z -- Task `task_1776284750465_qljdtc` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 3829ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T20-31-34-131Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T20:31:42.081Z -- Task `task_1776284750465_qljdtc` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4120ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T20-31-37-961Z.png)

> No, the UI is not rendered—screen is entirely black. No visible components; error in rendering/display.

---

## 2026-04-15T20:31:45.946Z -- Task `task_1776284750465_qljdtc` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 3865ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T20-31-42-081Z.png)

> No visible components; UI is entirely black, indicating a rendering error.

---

## 2026-04-15T20:31:49.737Z -- Task `task_1776284750465_qljdtc` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 3790ms

![profile-desktop](visuals/profile-desktop-2026-04-15T20-31-45-947Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:31:54.856Z -- Task `task_1776284750465_qljdtc` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 5119ms

![profile-mobile](visuals/profile-mobile-2026-04-15T20-31-49-737Z.png)

> No, the UI is not rendered—the screen is entirely black with no visible components. Error: No content is displayed, suggesting a rendering failure or missing assets.

---

## 2026-04-15T20:31:58.850Z -- Task `task_1776284750465_qljdtc` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 3994ms

![friends-desktop](visuals/friends-desktop-2026-04-15T20-31-54-856Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (blank/black screen).

---

## 2026-04-15T20:32:02.740Z -- Task `task_1776284750465_qljdtc` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 3890ms

![friends-mobile](visuals/friends-mobile-2026-04-15T20-31-58-850Z.png)

> No visible components; UI not rendered (all-black screen). Error: Content fails to display on "#friends" route.

---

## 2026-04-15T20:32:06.474Z -- Task `task_1776284750465_qljdtc` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 3733ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T20-32-02-741Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (blank display).

---

## 2026-04-15T20:32:11.240Z -- Task `task_1776284750465_qljdtc` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4766ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T20-32-06-474Z.png)

> No UI elements are visible; the screen is entirely black. Error—no content renders for the leaderboard route.

---

## 2026-04-15T20:32:14.951Z -- Task `task_1776284750465_qljdtc` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 3711ms

![game-desktop](visuals/game-desktop-2026-04-15T20-32-11-240Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering error or failed load.

---

## 2026-04-15T20:32:18.920Z -- Task `task_1776284750465_qljdtc` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 3969ms

![game-mobile](visuals/game-mobile-2026-04-15T20-32-14-951Z.png)

> No visible components; UI not rendered (all-black screen). Error: Content fails to display.

---

## 2026-04-15T20:33:26.199Z -- Task `task_1776285148137_oym4bl` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4697ms

![home-desktop](visuals/home-desktop-2026-04-15T20-33-21-502Z.png)

> No UI elements are visible; the screen is entirely black. Likely a rendering error or missing content.

---

## 2026-04-15T20:33:29.985Z -- Task `task_1776285148137_oym4bl` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 3785ms

![home-mobile](visuals/home-mobile-2026-04-15T20-33-26-200Z.png)

> No visible components; UI not rendered (black screen). Error: Content failed to load/display.

---

## 2026-04-15T20:33:34.070Z -- Task `task_1776285148137_oym4bl` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4085ms

![auth-desktop](visuals/auth-desktop-2026-04-15T20-33-29-985Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:33:44.909Z -- Task `task_1776285148137_oym4bl` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 10838ms

![auth-mobile](visuals/auth-mobile-2026-04-15T20-33-34-071Z.png)

> No visible components; UI not rendered (black screen). Error: Auth route content failed to load/display.

---

## 2026-04-15T20:33:49.236Z -- Task `task_1776285148137_oym4bl` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4327ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T20-33-44-909Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:33:53.574Z -- Task `task_1776285148137_oym4bl` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4338ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T20-33-49-236Z.png)

> No UI components are visible; the screen is entirely black. The UI failed to render, indicating an error in displaying the dashboard content.

---

## 2026-04-15T20:33:57.837Z -- Task `task_1776285148137_oym4bl` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4262ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T20-33-53-575Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank/black screen).

---

## 2026-04-15T20:34:01.727Z -- Task `task_1776285148137_oym4bl` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 3890ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T20-33-57-837Z.png)

> No visible components; UI not rendered (black screen). Error: Content fails to display.

---

## 2026-04-15T20:34:06.287Z -- Task `task_1776285148137_oym4bl` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4560ms

![profile-desktop](visuals/profile-desktop-2026-04-15T20-34-01-727Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render on the "#profile" route for desktop 1280x720.

---

## 2026-04-15T20:34:10.194Z -- Task `task_1776285148137_oym4bl` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 3907ms

![profile-mobile](visuals/profile-mobile-2026-04-15T20-34-06-287Z.png)

> No UI components are visible; the screen is entirely black. The UI fails to render, indicating a potential loading issue or missing content.

---

## 2026-04-15T20:34:14.427Z -- Task `task_1776285148137_oym4bl` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 4233ms

![friends-desktop](visuals/friends-desktop-2026-04-15T20-34-10-194Z.png)

> No UI components are visible; the screen is entirely black. The UI fails to render for the "#friends" route on desktop 1280x720.

---

## 2026-04-15T20:34:18.977Z -- Task `task_1776285148137_oym4bl` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 4550ms

![friends-mobile](visuals/friends-mobile-2026-04-15T20-34-14-427Z.png)

> No visible components; UI not rendered (all-black screen). Error: Content fails to load/display.

---

## 2026-04-15T20:34:23.948Z -- Task `task_1776285148137_oym4bl` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4971ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T20-34-18-977Z.png)

> No UI elements are rendered; the screen is entirely black. Missing leaderboard components (title, rankings, scores) expected for this route.

---

## 2026-04-15T20:34:28.561Z -- Task `task_1776285148137_oym4bl` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4612ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T20-34-23-949Z.png)

> No visible components; the screen is entirely black. Error: UI not rendered (no content displayed).

---

## 2026-04-15T20:34:32.858Z -- Task `task_1776285148137_oym4bl` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4297ms

![game-desktop](visuals/game-desktop-2026-04-15T20-34-28-561Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering error or failed load for the "#game" route.

---

## 2026-04-15T20:34:36.750Z -- Task `task_1776285148137_oym4bl` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 3891ms

![game-mobile](visuals/game-mobile-2026-04-15T20-34-32-858Z.png)

> No visible components; UI not rendered (black screen). Errors: No content displayed.

---

## 2026-04-15T20:35:14.024Z -- Task `task_1776285285146_no6kw5` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4273ms

![home-desktop](visuals/home-desktop-2026-04-15T20-35-09-751Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:35:17.810Z -- Task `task_1776285285146_no6kw5` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 3785ms

![home-mobile](visuals/home-mobile-2026-04-15T20-35-14-025Z.png)

> No visible components; UI not rendered (all-black screen). Error: Content failed to load or display.

---

## 2026-04-15T20:35:23.033Z -- Task `task_1776285285146_no6kw5` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 5223ms

![auth-desktop](visuals/auth-desktop-2026-04-15T20-35-17-810Z.png)

> No visible components; UI appears unrendered (black screen). Error: No content displayed, indicating a rendering failure or missing assets.

---

## 2026-04-15T20:35:27.190Z -- Task `task_1776285285146_no6kw5` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4157ms

![auth-mobile](visuals/auth-mobile-2026-04-15T20-35-23-033Z.png)

> No visible components are rendered; the screen is entirely black. Error: UI failed to render any content for the "#auth" route.

---

## 2026-04-15T20:35:31.533Z -- Task `task_1776285285146_no6kw5` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 4343ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T20-35-27-190Z.png)

> No, the UI is not rendered. No visible components; error: blank/black screen (no dashboard content displayed).

---

## 2026-04-15T20:35:36.652Z -- Task `task_1776285285146_no6kw5` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 5119ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T20-35-31-533Z.png)

> No, the UI is not rendered—there are no visible components. The screen displays a solid black background with no content or interactive elements.

---

## 2026-04-15T20:35:40.953Z -- Task `task_1776285285146_no6kw5` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4301ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T20-35-36-652Z.png)

> No, the UI is not rendered—screen is entirely black. No visible components; error in rendering (blank display).

---

## 2026-04-15T20:35:44.845Z -- Task `task_1776285285146_no6kw5` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 3892ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T20-35-40-953Z.png)

> No, the UI is not rendered—screen is entirely black with no visible components. Error: No content displayed on the lobby route.

---

## 2026-04-15T20:35:48.835Z -- Task `task_1776285285146_no6kw5` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 3990ms

![profile-desktop](visuals/profile-desktop-2026-04-15T20-35-44-845Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (blank/black screen).

---

## 2026-04-15T20:35:52.962Z -- Task `task_1776285285146_no6kw5` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4127ms

![profile-mobile](visuals/profile-mobile-2026-04-15T20-35-48-835Z.png)

> No UI components are visible; the screen is entirely black. The UI fails to render, indicating a potential loading or display issue.

---

## 2026-04-15T20:35:57.243Z -- Task `task_1776285285146_no6kw5` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 4281ms

![friends-desktop](visuals/friends-desktop-2026-04-15T20-35-52-962Z.png)

> No UI components are visible; the screen is entirely black. The UI fails to render for the "#friends" route on desktop 1280x720.

---

## 2026-04-15T20:36:01.227Z -- Task `task_1776285285146_no6kw5` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 3984ms

![friends-mobile](visuals/friends-mobile-2026-04-15T20-35-57-243Z.png)

> No visible components; UI not rendered (entirely black screen). Error: Content failed to load or render.

---

## 2026-04-15T20:36:05.584Z -- Task `task_1776285285146_no6kw5` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 4356ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T20-36-01-228Z.png)

> No, the UI is not rendered—only a black screen is visible. No components are present, indicating a rendering issue or missing content.

---

## 2026-04-15T20:36:10.341Z -- Task `task_1776285285146_no6kw5` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4757ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T20-36-05-584Z.png)

> No UI components are visible; the screen is entirely black. Error: Leaderboard content failed to render (blank/black screen).

---

## 2026-04-15T20:36:14.036Z -- Task `task_1776285285146_no6kw5` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 3695ms

![game-desktop](visuals/game-desktop-2026-04-15T20-36-10-341Z.png)

> No UI components are rendered; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T20:36:17.756Z -- Task `task_1776285285146_no6kw5` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 3720ms

![game-mobile](visuals/game-mobile-2026-04-15T20-36-14-036Z.png)

> No visible components; UI not rendered (black screen). Error: No content displayed.

---

## 2026-04-15T20:38:50.822Z -- Task `task_1776285386623_w10072` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 3875ms

![home-desktop](visuals/home-desktop-2026-04-15T20-38-46-947Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T20:38:54.920Z -- Task `task_1776285386623_w10072` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 4097ms

![home-mobile](visuals/home-mobile-2026-04-15T20-38-50-823Z.png)

> No, the UI is not rendered—only a black screen is visible. No components are displayed, indicating a rendering issue.

---

## 2026-04-15T20:38:58.889Z -- Task `task_1776285386623_w10072` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 3969ms

![auth-desktop](visuals/auth-desktop-2026-04-15T20-38-54-920Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:39:03.292Z -- Task `task_1776285386623_w10072` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4403ms

![auth-mobile](visuals/auth-mobile-2026-04-15T20-38-58-889Z.png)

> No UI components are visible; the screen is entirely black. Error: The authentication page failed to render any content.

---

## 2026-04-15T20:39:07.286Z -- Task `task_1776285386623_w10072` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 3994ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T20-39-03-292Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:39:11.892Z -- Task `task_1776285386623_w10072` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4606ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T20-39-07-286Z.png)

> No, the UI is not rendered; the screen is entirely black with no visible components. Error: Blank/black screen indicates a rendering failure or missing content.

---

## 2026-04-15T20:39:15.592Z -- Task `task_1776285386623_w10072` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 3699ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T20-39-11-893Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:39:19.476Z -- Task `task_1776285386623_w10072` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 3884ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T20-39-15-592Z.png)

> No, the UI is not rendered—only a black screen is visible. No components are displayed, indicating a rendering issue.

---

## 2026-04-15T20:39:23.566Z -- Task `task_1776285386623_w10072` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4090ms

![profile-desktop](visuals/profile-desktop-2026-04-15T20-39-19-476Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (blank/black screen).

---

## 2026-04-15T20:39:28.480Z -- Task `task_1776285386623_w10072` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4913ms

![profile-mobile](visuals/profile-mobile-2026-04-15T20-39-23-567Z.png)

> No UI components are visible; the screen is entirely black. Error: No content or interactive elements render on the #profile route.

---

## 2026-04-15T20:39:33.498Z -- Task `task_1776285386623_w10072` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 5017ms

![friends-desktop](visuals/friends-desktop-2026-04-15T20-39-28-481Z.png)

> No, the UI is not rendered. No visible components are present; the screen displays a solid black background with no content.

---

## 2026-04-15T20:39:37.029Z -- Task `task_1776285386623_w10072` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 3531ms

![friends-mobile](visuals/friends-mobile-2026-04-15T20-39-33-498Z.png)

> No visible components; UI not rendered (entirely black screen).

---

## 2026-04-15T20:39:41.690Z -- Task `task_1776285386623_w10072` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4661ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T20-39-37-029Z.png)

> No UI components are rendered; the screen is entirely black. Error: No visible elements or content displayed for the leaderboard route.

---

## 2026-04-15T20:39:45.456Z -- Task `task_1776285386623_w10072` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 3766ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T20-39-41-690Z.png)

> No visible components; UI is not rendered (black screen). Error: No content displayed for the leaderboard route.

---

## 2026-04-15T20:39:49.473Z -- Task `task_1776285386623_w10072` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4017ms

![game-desktop](visuals/game-desktop-2026-04-15T20-39-45-456Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering issue or missing content.

---

## 2026-04-15T20:39:53.158Z -- Task `task_1776285386623_w10072` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 3685ms

![game-mobile](visuals/game-mobile-2026-04-15T20-39-49-473Z.png)

> No visible components; UI not rendered (entirely black screen).

---

## 2026-04-15T20:40:42.382Z -- Task `task_1776285603603_640vew` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4556ms

![home-desktop](visuals/home-desktop-2026-04-15T20-40-37-826Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:40:46.609Z -- Task `task_1776285603603_640vew` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4225ms

![home-mobile](visuals/home-mobile-2026-04-15T20-40-42-383Z.png)

> No UI elements are visible; the screen is entirely black. Error: No content rendered on the specified route and device.

---

## 2026-04-15T20:40:51.628Z -- Task `task_1776285603603_640vew` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 5019ms

![auth-desktop](visuals/auth-desktop-2026-04-15T20-40-46-609Z.png)

> No UI components are visible; the screen is entirely black. Error – the auth route UI did not render or display any content.

---

## 2026-04-15T20:40:55.312Z -- Task `task_1776285603603_640vew` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 3684ms

![auth-mobile](visuals/auth-mobile-2026-04-15T20-40-51-628Z.png)

> No visible components; UI not rendered (all-black screen).

---

## 2026-04-15T20:40:59.204Z -- Task `task_1776285603603_640vew` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 3891ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T20-40-55-312Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:41:02.963Z -- Task `task_1776285603603_640vew` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 3759ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T20-40-59-204Z.png)

> No visible components; UI not rendered (all-black screen). Error: Content failed to load or render.

---

## 2026-04-15T20:41:06.781Z -- Task `task_1776285603603_640vew` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 3818ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T20-41-02-963Z.png)

> No UI components are rendered; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T20:41:10.775Z -- Task `task_1776285603603_640vew` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 3994ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T20-41-06-781Z.png)

> No visible components; UI not rendered (black screen). Error: Content failed to load/display.

---

## 2026-04-15T20:41:14.767Z -- Task `task_1776285603603_640vew` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 3992ms

![profile-desktop](visuals/profile-desktop-2026-04-15T20-41-10-775Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render for route "#profile".

---

## 2026-04-15T20:41:18.500Z -- Task `task_1776285603603_640vew` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 3733ms

![profile-mobile](visuals/profile-mobile-2026-04-15T20-41-14-767Z.png)

> No, the UI is not rendered—only a black screen is visible. No components are displayed, indicating a rendering issue.

---

## 2026-04-15T20:41:23.469Z -- Task `task_1776285603603_640vew` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 4969ms

![friends-desktop](visuals/friends-desktop-2026-04-15T20-41-18-500Z.png)

> No, the UI is not rendered. No visible components; the screen displays as entirely black with no content.

---

## 2026-04-15T20:41:36.066Z -- Task `task_1776285603603_640vew` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 12597ms

![friends-mobile](visuals/friends-mobile-2026-04-15T20-41-23-469Z.png)

> No visible components are rendered; the screen is entirely black, indicating a failure to display the UI for the "#friends" route.

---

## 2026-04-15T20:41:41.186Z -- Task `task_1776285603603_640vew` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 5120ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T20-41-36-066Z.png)

> No UI elements are visible; the screen is entirely black. Error: Leaderboard content failed to render or load.

---

## 2026-04-15T20:41:46.137Z -- Task `task_1776285603603_640vew` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4951ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T20-41-41-186Z.png)

> No visible components; screen is entirely black. Error—UI not rendered (no content displayed).

---

## 2026-04-15T20:41:50.709Z -- Task `task_1776285603603_640vew` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4572ms

![game-desktop](visuals/game-desktop-2026-04-15T20-41-46-137Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering failure or missing content for the "#game" route.

---

## 2026-04-15T20:41:54.604Z -- Task `task_1776285603603_640vew` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 3895ms

![game-mobile](visuals/game-mobile-2026-04-15T20-41-50-709Z.png)

> No visible components; UI not rendered (all-black screen). Error: No content displayed.

---

## 2026-04-15T20:43:44.167Z -- Task `task_1776285724178_dq8dmw` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 4092ms

![home-desktop](visuals/home-desktop-2026-04-15T20-43-40-075Z.png)

> No, the UI is not rendered—only a black screen is visible. No components are displayed, indicating a rendering error.

---

## 2026-04-15T20:43:48.466Z -- Task `task_1776285724178_dq8dmw` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 4299ms

![home-mobile](visuals/home-mobile-2026-04-15T20-43-44-167Z.png)

> No, the UI is not rendered. No visible components; entire screen is black, indicating a rendering issue.

---

## 2026-04-15T20:43:52.489Z -- Task `task_1776285724178_dq8dmw` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4022ms

![auth-desktop](visuals/auth-desktop-2026-04-15T20-43-48-467Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:43:56.965Z -- Task `task_1776285724178_dq8dmw` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4476ms

![auth-mobile](visuals/auth-mobile-2026-04-15T20-43-52-489Z.png)

> No UI components are visible; the screen is entirely black. Error: No content renders for the "#auth" route.

---

## 2026-04-15T20:44:01.164Z -- Task `task_1776285724178_dq8dmw` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4199ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T20-43-56-965Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:44:04.857Z -- Task `task_1776285724178_dq8dmw` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 3693ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T20-44-01-164Z.png)

> No visible components; UI not rendered (black screen indicates rendering issue).

---

## 2026-04-15T20:44:09.356Z -- Task `task_1776285724178_dq8dmw` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4499ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T20-44-04-857Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank/black screen).

---

## 2026-04-15T20:44:13.555Z -- Task `task_1776285724178_dq8dmw` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4198ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T20-44-09-357Z.png)

> No visible components are rendered; the screen is entirely black. Error: UI fails to display any content on the "#lobby" route.

---

## 2026-04-15T20:44:17.866Z -- Task `task_1776285724178_dq8dmw` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4311ms

![profile-desktop](visuals/profile-desktop-2026-04-15T20-44-13-555Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:44:22.808Z -- Task `task_1776285724178_dq8dmw` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4942ms

![profile-mobile](visuals/profile-mobile-2026-04-15T20-44-17-866Z.png)

> No, the UI is not rendered—the screen is entirely black with no visible components. Error: Blank/black screen suggests a rendering failure or missing content.

---

## 2026-04-15T20:44:28.095Z -- Task `task_1776285724178_dq8dmw` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 5287ms

![friends-desktop](visuals/friends-desktop-2026-04-15T20-44-22-808Z.png)

> No UI components are visible; the screen displays as completely black. Error: No content or interactive elements render for the "#friends" route.

---

## 2026-04-15T20:44:31.576Z -- Task `task_1776285724178_dq8dmw` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 3481ms

![friends-mobile](visuals/friends-mobile-2026-04-15T20-44-28-095Z.png)

> No visible components; UI not rendered (all-black screen). Error: Content fails to load/display.

---

## 2026-04-15T20:44:35.980Z -- Task `task_1776285724178_dq8dmw` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4404ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T20-44-31-576Z.png)

> No UI components are visible; the screen is entirely black. Error: Leaderboard content did not render or load.

---

## 2026-04-15T20:44:41.202Z -- Task `task_1776285724178_dq8dmw` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 5222ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T20-44-35-980Z.png)

> No, the UI is not rendered. No visible components; the screen is entirely black (blank), indicating a rendering issue or missing content.

---

## 2026-04-15T20:44:45.400Z -- Task `task_1776285724178_dq8dmw` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4198ms

![game-desktop](visuals/game-desktop-2026-04-15T20-44-41-202Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank screen).

---

## 2026-04-15T20:44:49.598Z -- Task `task_1776285724178_dq8dmw` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4198ms

![game-mobile](visuals/game-mobile-2026-04-15T20-44-45-400Z.png)

> No visible components are rendered; the screen is entirely black. Error: UI fails to display any content, resulting in a blank screen.

---

## 2026-04-15T20:45:24.935Z -- Task `task_1776285897791_5vvqkd` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 5073ms

![home-desktop](visuals/home-desktop-2026-04-15T20-45-19-862Z.png)

> No UI elements are visible; the screen is entirely black. Likely a rendering error or missing content.

---

## 2026-04-15T20:45:29.038Z -- Task `task_1776285897791_5vvqkd` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 4103ms

![home-mobile](visuals/home-mobile-2026-04-15T20-45-24-935Z.png)

> No, the UI is not rendered. No visible components; entire screen is black, indicating a rendering issue.

---

## 2026-04-15T20:45:33.085Z -- Task `task_1776285897791_5vvqkd` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4047ms

![auth-desktop](visuals/auth-desktop-2026-04-15T20-45-29-038Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:45:37.440Z -- Task `task_1776285897791_5vvqkd` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4355ms

![auth-mobile](visuals/auth-mobile-2026-04-15T20-45-33-085Z.png)

> No visible components; screen is entirely black. Error—UI not rendered or content missing.

---

## 2026-04-15T20:45:41.392Z -- Task `task_1776285897791_5vvqkd` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 3951ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T20-45-37-441Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:45:45.227Z -- Task `task_1776285897791_5vvqkd` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 3835ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T20-45-41-392Z.png)

> No visible components are rendered; the screen is entirely black, indicating a failure to display the dashboard UI.

---

## 2026-04-15T20:45:49.120Z -- Task `task_1776285897791_5vvqkd` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 3892ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T20-45-45-228Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank screen).

---

## 2026-04-15T20:45:53.217Z -- Task `task_1776285897791_5vvqkd` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4097ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T20-45-49-120Z.png)

> No visible components are rendered; the screen is entirely black. Error: No UI elements display, indicating a rendering issue.

---

## 2026-04-15T20:45:57.311Z -- Task `task_1776285897791_5vvqkd` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4094ms

![profile-desktop](visuals/profile-desktop-2026-04-15T20-45-53-217Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render for the "#profile" route.

---

## 2026-04-15T20:46:01.511Z -- Task `task_1776285897791_5vvqkd` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4200ms

![profile-mobile](visuals/profile-mobile-2026-04-15T20-45-57-311Z.png)

> No UI components are visible; the screen is entirely black. The UI failed to render, showing a blank (black) state instead of expected profile elements.

---

## 2026-04-15T20:46:05.400Z -- Task `task_1776285897791_5vvqkd` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 3889ms

![friends-desktop](visuals/friends-desktop-2026-04-15T20-46-01-511Z.png)

> No visible components; UI not rendered (black screen). Error: Content failed to load/display.

---

## 2026-04-15T20:46:09.192Z -- Task `task_1776285897791_5vvqkd` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 3792ms

![friends-mobile](visuals/friends-mobile-2026-04-15T20-46-05-400Z.png)

> No visible components are rendered; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T20:46:13.396Z -- Task `task_1776285897791_5vvqkd` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4204ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T20-46-09-192Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank display).

---

## 2026-04-15T20:46:16.947Z -- Task `task_1776285897791_5vvqkd` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 3551ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T20-46-13-396Z.png)

> No visible components; UI not rendered (all-black screen). Error: Content failed to load or render.

---

## 2026-04-15T20:46:20.559Z -- Task `task_1776285897791_5vvqkd` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 3612ms

![game-desktop](visuals/game-desktop-2026-04-15T20-46-16-947Z.png)

> No UI components are rendered; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T20:46:24.369Z -- Task `task_1776285897791_5vvqkd` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 3810ms

![game-mobile](visuals/game-mobile-2026-04-15T20-46-20-559Z.png)

> No, the UI is not rendered—only a black screen is visible. No components are displayed, indicating a rendering issue.

---

## 2026-04-15T20:47:02.645Z -- Task `task_1776285994851_xbhlw0` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4567ms

![home-desktop](visuals/home-desktop-2026-04-15T20-46-58-078Z.png)

> No UI elements are visible; the screen is entirely black. Possible rendering error or missing content.

---

## 2026-04-15T20:47:06.166Z -- Task `task_1776285994851_xbhlw0` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 3521ms

![home-mobile](visuals/home-mobile-2026-04-15T20-47-02-645Z.png)

> No visible components are rendered; the screen is entirely black, indicating a potential rendering error or blank state.

---

## 2026-04-15T20:47:10.531Z -- Task `task_1776285994851_xbhlw0` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4365ms

![auth-desktop](visuals/auth-desktop-2026-04-15T20-47-06-166Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank screen).

---

## 2026-04-15T20:47:14.523Z -- Task `task_1776285994851_xbhlw0` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 3992ms

![auth-mobile](visuals/auth-mobile-2026-04-15T20-47-10-531Z.png)

> No visible components are rendered; the screen is entirely black, indicating a failure to display the auth route UI.

---

## 2026-04-15T20:47:18.748Z -- Task `task_1776285994851_xbhlw0` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4225ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T20-47-14-523Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:47:23.024Z -- Task `task_1776285994851_xbhlw0` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4276ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T20-47-18-748Z.png)

> No UI components are visible; the screen is entirely black. This indicates a rendering error for the "#dashboard" route on mobile 375x812.

---

## 2026-04-15T20:47:27.221Z -- Task `task_1776285994851_xbhlw0` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4197ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T20-47-23-024Z.png)

> No UI elements are visible; the screen is entirely black, indicating a rendering error or missing content.

---

## 2026-04-15T20:47:30.908Z -- Task `task_1776285994851_xbhlw0` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 3687ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T20-47-27-221Z.png)

> No visible components; UI not rendered (black screen).

---

## 2026-04-15T20:47:34.594Z -- Task `task_1776285994851_xbhlw0` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 3686ms

![profile-desktop](visuals/profile-desktop-2026-04-15T20-47-30-908Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (blank/black screen).

---

## 2026-04-15T20:47:39.140Z -- Task `task_1776285994851_xbhlw0` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4546ms

![profile-mobile](visuals/profile-mobile-2026-04-15T20-47-34-594Z.png)

> No UI components are visible; the screen is entirely black. Error: The profile page failed to render any content.

---

## 2026-04-15T20:47:42.788Z -- Task `task_1776285994851_xbhlw0` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 3647ms

![friends-desktop](visuals/friends-desktop-2026-04-15T20-47-39-141Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:47:46.239Z -- Task `task_1776285994851_xbhlw0` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 3450ms

![friends-mobile](visuals/friends-mobile-2026-04-15T20-47-42-789Z.png)

> No visible components; UI not rendered (entirely black screen).

---

## 2026-04-15T20:47:50.044Z -- Task `task_1776285994851_xbhlw0` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 3804ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T20-47-46-240Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank/black screen).

---

## 2026-04-15T20:47:53.640Z -- Task `task_1776285994851_xbhlw0` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 3596ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T20-47-50-044Z.png)

> No visible components are rendered; the screen is entirely black. This indicates a rendering error as the leaderboard UI fails to display any content.

---

## 2026-04-15T20:47:57.429Z -- Task `task_1776285994851_xbhlw0` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 3788ms

![game-desktop](visuals/game-desktop-2026-04-15T20-47-53-641Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank screen).

---

## 2026-04-15T20:48:01.116Z -- Task `task_1776285994851_xbhlw0` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 3686ms

![game-mobile](visuals/game-mobile-2026-04-15T20-47-57-430Z.png)

> No visible components; UI not rendered (black screen). Error: No content displayed.

---

## 2026-04-15T20:48:55.749Z -- Task `task_1776286089718_ta2phd` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 3864ms

![home-desktop](visuals/home-desktop-2026-04-15T20-48-51-885Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:48:59.212Z -- Task `task_1776286089718_ta2phd` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 3462ms

![home-mobile](visuals/home-mobile-2026-04-15T20-48-55-750Z.png)

> No visible components; UI not rendered (all-black screen).

---

## 2026-04-15T20:49:03.681Z -- Task `task_1776286089718_ta2phd` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4469ms

![auth-desktop](visuals/auth-desktop-2026-04-15T20-48-59-212Z.png)

> No UI components are visible; the screen is entirely black. Error: No authentication-related elements (e.g., login form, buttons) render.

---

## 2026-04-15T20:49:07.240Z -- Task `task_1776286089718_ta2phd` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 3559ms

![auth-mobile](visuals/auth-mobile-2026-04-15T20-49-03-681Z.png)

> No visible components; UI not rendered (all-black screen).

---

## 2026-04-15T20:49:11.156Z -- Task `task_1776286089718_ta2phd` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 3916ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T20-49-07-240Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:49:15.065Z -- Task `task_1776286089718_ta2phd` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 3908ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T20-49-11-157Z.png)

> No visible components; UI not rendered (all-black screen). Error: Content fails to display on mobile 375x812 route "#dashboard".

---

## 2026-04-15T20:49:18.943Z -- Task `task_1776286089718_ta2phd` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 3878ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T20-49-15-065Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:49:22.232Z -- Task `task_1776286089718_ta2phd` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 3289ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T20-49-18-943Z.png)

> No visible components; UI not rendered (black screen). Error: Content fails to display.

---

## 2026-04-15T20:49:26.078Z -- Task `task_1776286089718_ta2phd` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 3846ms

![profile-desktop](visuals/profile-desktop-2026-04-15T20-49-22-232Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render for route "#profile".

---

## 2026-04-15T20:49:29.926Z -- Task `task_1776286089718_ta2phd` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 3848ms

![profile-mobile](visuals/profile-mobile-2026-04-15T20-49-26-078Z.png)

> No, the UI is not rendered—only a black screen is visible. No components are displayed, indicating a rendering issue.

---

## 2026-04-15T20:49:34.197Z -- Task `task_1776286089718_ta2phd` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 4271ms

![friends-desktop](visuals/friends-desktop-2026-04-15T20-49-29-926Z.png)

> No UI elements are visible; the screen is entirely black. Error: No content rendered for the "#friends" route.

---

## 2026-04-15T20:49:38.088Z -- Task `task_1776286089718_ta2phd` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 3891ms

![friends-mobile](visuals/friends-mobile-2026-04-15T20-49-34-197Z.png)

> No visible components are rendered. The UI fails to display any content, indicating a rendering error.

---

## 2026-04-15T20:49:41.829Z -- Task `task_1776286089718_ta2phd` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 3741ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T20-49-38-088Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank display).

---

## 2026-04-15T20:49:46.341Z -- Task `task_1776286089718_ta2phd` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4512ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T20-49-41-829Z.png)

> No, the UI is not rendered; the screen is entirely black with no visible components. Error: Blank/black screen indicates a rendering failure (missing content/load issue).

---

## 2026-04-15T20:49:49.908Z -- Task `task_1776286089718_ta2phd` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 3566ms

![game-desktop](visuals/game-desktop-2026-04-15T20-49-46-342Z.png)

> No UI components are rendered; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T20:49:53.345Z -- Task `task_1776286089718_ta2phd` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 3437ms

![game-mobile](visuals/game-mobile-2026-04-15T20-49-49-908Z.png)

> No visible components; UI not rendered (all-black screen). Error: No content displayed.

---

## 2026-04-15T20:50:30.516Z -- Task `task_1776286205078_gj79du` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4498ms

![home-desktop](visuals/home-desktop-2026-04-15T20-50-26-018Z.png)

> No UI elements are visible; the screen is entirely black. Likely a rendering error or missing content.

---

## 2026-04-15T20:50:34.305Z -- Task `task_1776286205078_gj79du` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 3788ms

![home-mobile](visuals/home-mobile-2026-04-15T20-50-30-517Z.png)

> No, the UI is not rendered. No visible components; entire screen is black, indicating a rendering issue.

---

## 2026-04-15T20:50:38.556Z -- Task `task_1776286205078_gj79du` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4251ms

![auth-desktop](visuals/auth-desktop-2026-04-15T20-50-34-305Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank/black screen).

---

## 2026-04-15T20:50:42.804Z -- Task `task_1776286205078_gj79du` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4248ms

![auth-mobile](visuals/auth-mobile-2026-04-15T20-50-38-556Z.png)

> No visible components are rendered; the screen is entirely black. Error: UI failed to render any content for the "#auth" route.

---

## 2026-04-15T20:50:46.701Z -- Task `task_1776286205078_gj79du` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 3897ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T20-50-42-804Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:50:50.988Z -- Task `task_1776286205078_gj79du` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4287ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T20-50-46-701Z.png)

> The UI is not rendered; the screen is entirely black with no visible components. Error: No content is displayed (blank/black screen).

---

## 2026-04-15T20:50:54.988Z -- Task `task_1776286205078_gj79du` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4000ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T20-50-50-988Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:50:58.778Z -- Task `task_1776286205078_gj79du` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 3789ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T20-50-54-989Z.png)

> No visible components; UI not rendered (all-black screen). Error: Missing lobby interface elements.

---

## 2026-04-15T20:51:02.672Z -- Task `task_1776286205078_gj79du` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 3894ms

![profile-desktop](visuals/profile-desktop-2026-04-15T20-50-58-778Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:51:06.970Z -- Task `task_1776286205078_gj79du` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 4298ms

![profile-mobile](visuals/profile-mobile-2026-04-15T20-51-02-672Z.png)

> No, the UI is not rendered (completely black screen). No visible components; error is lack of displayed content.

---

## 2026-04-15T20:51:10.963Z -- Task `task_1776286205078_gj79du` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 3993ms

![friends-desktop](visuals/friends-desktop-2026-04-15T20-51-06-970Z.png)

> No UI components are visible; the screen is entirely black. The UI fails to render for the "#friends" route on desktop 1280x720.

---

## 2026-04-15T20:51:15.586Z -- Task `task_1776286205078_gj79du` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 4622ms

![friends-mobile](visuals/friends-mobile-2026-04-15T20-51-10-964Z.png)

> No visible components; UI not rendered (all-black screen). Error: Content fails to display on "#friends" route.

---

## 2026-04-15T20:51:20.692Z -- Task `task_1776286205078_gj79du` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 5106ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T20-51-15-586Z.png)

> No UI elements are visible; the screen is entirely black. Error: No content renders for the "#leaderboard" route.

---

## 2026-04-15T20:51:25.299Z -- Task `task_1776286205078_gj79du` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4607ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T20-51-20-692Z.png)

> No UI components are visible; the screen is entirely black. Error: Leaderboard content did not render (no elements displayed).

---

## 2026-04-15T20:51:29.796Z -- Task `task_1776286205078_gj79du` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4497ms

![game-desktop](visuals/game-desktop-2026-04-15T20-51-25-299Z.png)

> No UI components are rendered; the screen is entirely black. This indicates a rendering error or missing content for the "#game" route.

---

## 2026-04-15T20:51:33.320Z -- Task `task_1776286205078_gj79du` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 3523ms

![game-mobile](visuals/game-mobile-2026-04-15T20-51-29-796Z.png)

> No visible components; UI not rendered (blank screen).

---

## 2026-04-15T20:52:09.947Z -- Task `task_1776286301172_5xscpo` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 5140ms

![home-desktop](visuals/home-desktop-2026-04-15T20-52-04-807Z.png)

> No, the UI is not rendered—no visible components are present. Error: The screen displays a blank/black background, indicating a rendering issue or missing content.

---

## 2026-04-15T20:52:14.042Z -- Task `task_1776286301172_5xscpo` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4095ms

![home-mobile](visuals/home-mobile-2026-04-15T20-52-09-947Z.png)

> No, the UI is not rendered—screen is entirely black with no visible components. Error: No content displayed on the route.

---

## 2026-04-15T20:52:19.366Z -- Task `task_1776286301172_5xscpo` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 5323ms

![auth-desktop](visuals/auth-desktop-2026-04-15T20-52-14-043Z.png)

> No visible components; UI is unrendered (black screen). Error: No content displayed, indicating a rendering issue.

---

## 2026-04-15T20:52:22.848Z -- Task `task_1776286301172_5xscpo` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 3482ms

![auth-mobile](visuals/auth-mobile-2026-04-15T20-52-19-366Z.png)

> No visible components are rendered; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T20:52:26.844Z -- Task `task_1776286301172_5xscpo` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 3996ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T20-52-22-848Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:52:31.039Z -- Task `task_1776286301172_5xscpo` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4195ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T20-52-26-844Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering error for the "#dashboard" route.

---

## 2026-04-15T20:52:35.032Z -- Task `task_1776286301172_5xscpo` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 3993ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T20-52-31-039Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank screen).

---

## 2026-04-15T20:52:38.559Z -- Task `task_1776286301172_5xscpo` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 3527ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T20-52-35-032Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T20:52:42.511Z -- Task `task_1776286301172_5xscpo` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 3952ms

![profile-desktop](visuals/profile-desktop-2026-04-15T20-52-38-559Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:52:47.628Z -- Task `task_1776286301172_5xscpo` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 5117ms

![profile-mobile](visuals/profile-mobile-2026-04-15T20-52-42-511Z.png)

> No, the UI is not rendered; the screen is entirely black with no visible components. Error: Blank screen suggests a rendering failure or missing content.

---

## 2026-04-15T20:52:52.851Z -- Task `task_1776286301172_5xscpo` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 5222ms

![friends-desktop](visuals/friends-desktop-2026-04-15T20-52-47-628Z.png)

> No UI components are visible; the screen displays as completely black. Error: The "#friends" route content did not render or load properly.

---

## 2026-04-15T20:52:56.433Z -- Task `task_1776286301172_5xscpo` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 3582ms

![friends-mobile](visuals/friends-mobile-2026-04-15T20-52-52-851Z.png)

> No visible components; UI not rendered (all-black screen). Error: Content fails to display on "#friends" route.

---

## 2026-04-15T20:53:01.582Z -- Task `task_1776286301172_5xscpo` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 5149ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T20-52-56-433Z.png)

> No UI elements are rendered; the screen is entirely black. Missing leaderboard-specific components (title, rankings, scores) expected for this route.

---

## 2026-04-15T20:53:06.183Z -- Task `task_1776286301172_5xscpo` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4600ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T20-53-01-583Z.png)

> No visible components; the screen is entirely black. Error: UI not rendered (no content displayed).

---

## 2026-04-15T20:53:10.054Z -- Task `task_1776286301172_5xscpo` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 3870ms

![game-desktop](visuals/game-desktop-2026-04-15T20-53-06-184Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank screen).

---

## 2026-04-15T20:53:13.873Z -- Task `task_1776286301172_5xscpo` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 3819ms

![game-mobile](visuals/game-mobile-2026-04-15T20-53-10-054Z.png)

> No, the UI is not rendered—only a solid black screen is visible. No components are displayed, indicating a rendering issue.

---

## 2026-04-15T20:53:52.652Z -- Task `task_1776286403674_ljtrcm` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4262ms

![home-desktop](visuals/home-desktop-2026-04-15T20-53-48-390Z.png)

> No UI components are rendered; the screen is entirely black. Error: No content displayed on the route "/".

---

## 2026-04-15T20:53:56.316Z -- Task `task_1776286403674_ljtrcm` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 3664ms

![home-mobile](visuals/home-mobile-2026-04-15T20-53-52-652Z.png)

> No visible components; UI not rendered (black screen). Error: Content fails to load/display.

---

## 2026-04-15T20:54:00.844Z -- Task `task_1776286403674_ljtrcm` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4528ms

![auth-desktop](visuals/auth-desktop-2026-04-15T20-53-56-316Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render or load properly.

---

## 2026-04-15T20:54:04.959Z -- Task `task_1776286403674_ljtrcm` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4115ms

![auth-mobile](visuals/auth-mobile-2026-04-15T20-54-00-844Z.png)

> No visible components are rendered; the screen is entirely black. Error: UI failed to render any content for the "#auth" route.

---

## 2026-04-15T20:54:09.139Z -- Task `task_1776286403674_ljtrcm` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4180ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T20-54-04-959Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:54:12.424Z -- Task `task_1776286403674_ljtrcm` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 3285ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T20-54-09-139Z.png)

> No, the UI is not rendered—only a black screen is visible. No components are displayed, indicating a rendering issue.

---

## 2026-04-15T20:54:16.204Z -- Task `task_1776286403674_ljtrcm` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 3779ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T20-54-12-425Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T20:54:19.890Z -- Task `task_1776286403674_ljtrcm` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 3686ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T20-54-16-204Z.png)

> No visible components; UI not rendered (entirely black screen). Error: Content failed to load/display.

---

## 2026-04-15T20:54:23.854Z -- Task `task_1776286403674_ljtrcm` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 3964ms

![profile-desktop](visuals/profile-desktop-2026-04-15T20-54-19-890Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (blank/black screen).

---

## 2026-04-15T20:54:28.601Z -- Task `task_1776286403674_ljtrcm` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4747ms

![profile-mobile](visuals/profile-mobile-2026-04-15T20-54-23-854Z.png)

> No UI components are visible; the screen is entirely black. This indicates a rendering error or missing content for the #profile route.

---

## 2026-04-15T20:54:32.485Z -- Task `task_1776286403674_ljtrcm` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 3884ms

![friends-desktop](visuals/friends-desktop-2026-04-15T20-54-28-601Z.png)

> No visible components; UI not rendered (black screen). Error: Content failed to load or render.

---

## 2026-04-15T20:54:36.311Z -- Task `task_1776286403674_ljtrcm` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 3826ms

![friends-mobile](visuals/friends-mobile-2026-04-15T20-54-32-485Z.png)

> No visible components; UI not rendered (all-black screen). Error: Content failed to load/display.

---

## 2026-04-15T20:54:40.574Z -- Task `task_1776286403674_ljtrcm` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4263ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T20-54-36-311Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank/black screen).

---

## 2026-04-15T20:54:44.991Z -- Task `task_1776286403674_ljtrcm` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4417ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T20-54-40-574Z.png)

> No visible components; screen is entirely black. Error—UI not rendered (no content displayed).

---

## 2026-04-15T20:54:50.096Z -- Task `task_1776286403674_ljtrcm` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 5104ms

![game-desktop](visuals/game-desktop-2026-04-15T20-54-44-992Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:54:54.090Z -- Task `task_1776286403674_ljtrcm` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 3993ms

![game-mobile](visuals/game-mobile-2026-04-15T20-54-50-097Z.png)

> No visible components; the screen is entirely black, indicating a rendering issue or empty state.

---

## 2026-04-15T20:58:26.977Z -- Task `task_1776286503363_kvx50b` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 3474ms

![home-desktop](visuals/home-desktop-2026-04-15T20-58-23-503Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T20:58:31.281Z -- Task `task_1776286503363_kvx50b` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4304ms

![home-mobile](visuals/home-mobile-2026-04-15T20-58-26-977Z.png)

> No UI elements are visible; the screen is entirely black, indicating a rendering issue or missing content.

---

## 2026-04-15T20:58:35.475Z -- Task `task_1776286503363_kvx50b` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4194ms

![auth-desktop](visuals/auth-desktop-2026-04-15T20-58-31-281Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:58:39.699Z -- Task `task_1776286503363_kvx50b` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 4224ms

![auth-mobile](visuals/auth-mobile-2026-04-15T20-58-35-475Z.png)

> No, the UI is not rendered—only a black screen is visible. No components are displayed, indicating a rendering issue.

---

## 2026-04-15T20:58:43.882Z -- Task `task_1776286503363_kvx50b` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4182ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T20-58-39-700Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:58:47.721Z -- Task `task_1776286503363_kvx50b` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 3839ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T20-58-43-882Z.png)

> No visible components; UI not rendered (black screen). Error: Content failed to load/display.

---

## 2026-04-15T20:58:52.343Z -- Task `task_1776286503363_kvx50b` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4622ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T20-58-47-721Z.png)

> No, the UI is not rendered—screen is entirely black. No visible components; error in rendering/display.

---

## 2026-04-15T20:58:56.345Z -- Task `task_1776286503363_kvx50b` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 4002ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T20-58-52-343Z.png)

> No visible components; UI not rendered. Error: Screen appears completely black, indicating failed rendering.

---

## 2026-04-15T20:59:00.997Z -- Task `task_1776286503363_kvx50b` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4652ms

![profile-desktop](visuals/profile-desktop-2026-04-15T20-58-56-345Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T20:59:06.826Z -- Task `task_1776286503363_kvx50b` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 5829ms

![profile-mobile](visuals/profile-mobile-2026-04-15T20-59-00-997Z.png)

> No, the UI is not rendered—the screen is entirely black with no visible components. Error: Missing profile page content (e.g., header, profile details) indicating a rendering failure or empty state.

---

## 2026-04-15T20:59:14.912Z -- Task `task_1776286503363_kvx50b` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 8085ms

![friends-desktop](visuals/friends-desktop-2026-04-15T20-59-06-826Z.png)

> No UI components are visible; the screen is entirely black. The UI fails to render for the "#friends" route on desktop 1280x720.

---

## 2026-04-15T20:59:20.063Z -- Task `task_1776286503363_kvx50b` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 5151ms

![friends-mobile](visuals/friends-mobile-2026-04-15T20-59-14-912Z.png)

> No visible components; UI not rendered (entirely black screen). Error: Content fails to load/display.

---

## 2026-04-15T20:59:25.790Z -- Task `task_1776286503363_kvx50b` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 5727ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T20-59-20-063Z.png)

> The UI is not rendered; no visible components are present. The screen displays a solid black background with no content, indicating a rendering issue.

---

## 2026-04-15T20:59:29.955Z -- Task `task_1776286503363_kvx50b` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 4165ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T20-59-25-790Z.png)

> No visible components are rendered. The UI appears completely blank, indicating a rendering error.

---

## 2026-04-15T20:59:41.854Z -- Task `task_1776286503363_kvx50b` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 11899ms

![game-desktop](visuals/game-desktop-2026-04-15T20-59-29-955Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering or loading error.

---

## 2026-04-15T20:59:45.413Z -- Task `task_1776286503363_kvx50b` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 3559ms

![game-mobile](visuals/game-mobile-2026-04-15T20-59-41-854Z.png)

> No visible components; UI not rendered (black screen).

---

## 2026-04-15T21:00:39.296Z -- Task `task_1776286793412_ll2i3r` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 5083ms

![home-desktop](visuals/home-desktop-2026-04-15T21-00-34-213Z.png)

> No UI elements are visible; the screen is entirely black. Likely a rendering error or missing content.

---

## 2026-04-15T21:00:43.496Z -- Task `task_1776286793412_ll2i3r` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4200ms

![home-mobile](visuals/home-mobile-2026-04-15T21-00-39-296Z.png)

> No visible components are rendered; the screen is entirely black. Error: UI fails to display any content on the specified route and device.

---

## 2026-04-15T21:00:49.478Z -- Task `task_1776286793412_ll2i3r` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 5982ms

![auth-desktop](visuals/auth-desktop-2026-04-15T21-00-43-496Z.png)

> No, the UI is not rendered. No visible components; the screen is entirely black, indicating a rendering issue.

---

## 2026-04-15T21:00:53.923Z -- Task `task_1776286793412_ll2i3r` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4445ms

![auth-mobile](visuals/auth-mobile-2026-04-15T21-00-49-478Z.png)

> No visible components; screen is entirely black. Error—UI not rendered or content missing.

---

## 2026-04-15T21:00:58.253Z -- Task `task_1776286793412_ll2i3r` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4330ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T21-00-53-923Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:01:03.362Z -- Task `task_1776286793412_ll2i3r` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 5109ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T21-00-58-253Z.png)

> No, the UI is not rendered; the screen is entirely black with no visible components. Error: No UI elements displayed (likely a rendering failure or missing content).

---

## 2026-04-15T21:01:08.081Z -- Task `task_1776286793412_ll2i3r` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4717ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T21-01-03-363Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:01:12.186Z -- Task `task_1776286793412_ll2i3r` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 4105ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T21-01-08-081Z.png)

> No visible components; UI not rendered (blank screen).

---

## 2026-04-15T21:01:16.505Z -- Task `task_1776286793412_ll2i3r` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4319ms

![profile-desktop](visuals/profile-desktop-2026-04-15T21-01-12-186Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (blank screen).

---

## 2026-04-15T21:01:20.613Z -- Task `task_1776286793412_ll2i3r` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 4108ms

![profile-mobile](visuals/profile-mobile-2026-04-15T21-01-16-505Z.png)

> No, the UI is not rendered—only a black screen is visible. No components are displayed, indicating a rendering issue.

---

## 2026-04-15T21:01:24.723Z -- Task `task_1776286793412_ll2i3r` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 4110ms

![friends-desktop](visuals/friends-desktop-2026-04-15T21-01-20-613Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering error or missing content.

---

## 2026-04-15T21:01:29.057Z -- Task `task_1776286793412_ll2i3r` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 4334ms

![friends-mobile](visuals/friends-mobile-2026-04-15T21-01-24-723Z.png)

> No visible components are rendered. Error: The UI is not displayed (entirely black screen).

---

## 2026-04-15T21:01:33.755Z -- Task `task_1776286793412_ll2i3r` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4698ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T21-01-29-057Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank display).

---

## 2026-04-15T21:01:47.790Z -- Task `task_1776286793412_ll2i3r` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 14034ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T21-01-33-756Z.png)

> No visible components; UI not rendered (blank screen). Error: No content displayed on the leaderboard route.

---

## 2026-04-15T21:01:52.606Z -- Task `task_1776286793412_ll2i3r` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4816ms

![game-desktop](visuals/game-desktop-2026-04-15T21-01-47-790Z.png)

> No UI components are rendered; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T21:01:57.227Z -- Task `task_1776286793412_ll2i3r` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4621ms

![game-mobile](visuals/game-mobile-2026-04-15T21-01-52-606Z.png)

> No visible components are rendered; the screen is entirely black. Error: UI fails to display any content on the specified route.

---

## 2026-04-15T21:02:42.160Z -- Task `task_1776286927767_qyu564` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 5673ms

![home-desktop](visuals/home-desktop-2026-04-15T21-02-36-487Z.png)

> No UI elements are visible; the screen is entirely black. Possible rendering error or missing content.

---

## 2026-04-15T21:02:46.291Z -- Task `task_1776286927767_qyu564` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4131ms

![home-mobile](visuals/home-mobile-2026-04-15T21-02-42-160Z.png)

> No visible components are rendered; the screen is entirely black. Error: UI fails to display any content on the specified route and device.

---

## 2026-04-15T21:02:51.906Z -- Task `task_1776286927767_qyu564` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 5615ms

![auth-desktop](visuals/auth-desktop-2026-04-15T21-02-46-291Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render or load properly.

---

## 2026-04-15T21:02:56.728Z -- Task `task_1776286927767_qyu564` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 4821ms

![auth-mobile](visuals/auth-mobile-2026-04-15T21-02-51-907Z.png)

> No, the UI is not rendered—only a black screen is visible. No components are displayed, indicating a rendering issue.

---

## 2026-04-15T21:03:01.204Z -- Task `task_1776286927767_qyu564` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4475ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T21-02-56-729Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:03:05.629Z -- Task `task_1776286927767_qyu564` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4425ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T21-03-01-204Z.png)

> No UI components are visible; the screen is entirely black. The UI failed to render, indicating an error in displaying the dashboard content.

---

## 2026-04-15T21:03:11.568Z -- Task `task_1776286927767_qyu564` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 5939ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T21-03-05-629Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:03:16.065Z -- Task `task_1776286927767_qyu564` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4497ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T21-03-11-568Z.png)

> No visible components are rendered. Error: The UI is entirely black with no content displayed.

---

## 2026-04-15T21:03:20.485Z -- Task `task_1776286927767_qyu564` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4420ms

![profile-desktop](visuals/profile-desktop-2026-04-15T21-03-16-065Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render for route "#profile".

---

## 2026-04-15T21:03:25.896Z -- Task `task_1776286927767_qyu564` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 5411ms

![profile-mobile](visuals/profile-mobile-2026-04-15T21-03-20-485Z.png)

> No, the UI is not rendered—the screen is entirely black with no visible components. Error: Blank/black screen suggests a rendering failure or missing content.

---

## 2026-04-15T21:03:30.422Z -- Task `task_1776286927767_qyu564` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 4526ms

![friends-desktop](visuals/friends-desktop-2026-04-15T21-03-25-896Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering error or missing content.

---

## 2026-04-15T21:03:34.504Z -- Task `task_1776286927767_qyu564` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 4082ms

![friends-mobile](visuals/friends-mobile-2026-04-15T21-03-30-422Z.png)

> No visible components; UI not rendered (all-black screen). Error: Content failed to load/display.

---

## 2026-04-15T21:03:39.089Z -- Task `task_1776286927767_qyu564` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4585ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T21-03-34-504Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank display).

---

## 2026-04-15T21:03:43.121Z -- Task `task_1776286927767_qyu564` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 4032ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T21-03-39-089Z.png)

> No visible components; UI not rendered (all-black screen).

---

## 2026-04-15T21:03:51.072Z -- Task `task_1776286927767_qyu564` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 7951ms

![game-desktop](visuals/game-desktop-2026-04-15T21-03-43-121Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank display).

---

## 2026-04-15T21:03:55.035Z -- Task `task_1776286927767_qyu564` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 3963ms

![game-mobile](visuals/game-mobile-2026-04-15T21-03-51-072Z.png)

> No visible components; UI not rendered (blank screen).

---

## 2026-04-15T21:09:59.296Z -- Task `task_1776287045928_wltm1d` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 5907ms

![home-desktop](visuals/home-desktop-2026-04-15T21-09-53-389Z.png)

> No, the UI is not rendered—only a blank black screen is visible. No components are present; possible error: missing content or failed rendering.

---

## 2026-04-15T21:10:12.665Z -- Task `task_1776287045928_wltm1d` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 13369ms

![home-mobile](visuals/home-mobile-2026-04-15T21-09-59-296Z.png)

> No visible components; the screen is entirely black, indicating a rendering or loading issue.

---

## 2026-04-15T21:10:19.674Z -- Task `task_1776287045928_wltm1d` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 7009ms

![auth-desktop](visuals/auth-desktop-2026-04-15T21-10-12-665Z.png)

> No UI components are visible; the screen is entirely black. Error: No content rendered for the #auth route.

---

## 2026-04-15T21:10:25.514Z -- Task `task_1776287045928_wltm1d` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 5840ms

![auth-mobile](visuals/auth-mobile-2026-04-15T21-10-19-674Z.png)

> The UI is not rendered; the screen is entirely black with no visible components. Possible error: content failed to load or render correctly.

---

## 2026-04-15T21:10:31.118Z -- Task `task_1776287045928_wltm1d` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 5604ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T21-10-25-514Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:10:35.953Z -- Task `task_1776287045928_wltm1d` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4835ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T21-10-31-118Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering error where the dashboard content failed to load or display.

---

## 2026-04-15T21:10:40.622Z -- Task `task_1776287045928_wltm1d` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4669ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T21-10-35-953Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank display).

---

## 2026-04-15T21:10:45.173Z -- Task `task_1776287045928_wltm1d` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 4551ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T21-10-40-622Z.png)

> No visible components; UI not rendered (black screen). Error: No content displayed for route "#lobby".

---

## 2026-04-15T21:10:56.076Z -- Task `task_1776287045928_wltm1d` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 10903ms

![profile-desktop](visuals/profile-desktop-2026-04-15T21-10-45-173Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:11:01.402Z -- Task `task_1776287045928_wltm1d` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 5326ms

![profile-mobile](visuals/profile-mobile-2026-04-15T21-10-56-076Z.png)

> No visible components; the screen is entirely black, indicating a rendering issue or empty state.

---

## 2026-04-15T21:11:06.477Z -- Task `task_1776287045928_wltm1d` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 5075ms

![friends-desktop](visuals/friends-desktop-2026-04-15T21-11-01-402Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:11:10.567Z -- Task `task_1776287045928_wltm1d` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 4090ms

![friends-mobile](visuals/friends-mobile-2026-04-15T21-11-06-477Z.png)

> No visible components; UI not rendered (entirely black screen).

---

## 2026-04-15T21:11:15.179Z -- Task `task_1776287045928_wltm1d` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4612ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T21-11-10-567Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank/black screen).

---

## 2026-04-15T21:11:20.319Z -- Task `task_1776287045928_wltm1d` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 5140ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T21-11-15-179Z.png)

> No visible components are rendered; the screen is entirely black, indicating a failure to display the leaderboard UI.

---

## 2026-04-15T21:11:32.994Z -- Task `task_1776287045928_wltm1d` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 12674ms

![game-desktop](visuals/game-desktop-2026-04-15T21-11-20-320Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank/black screen).

---

## 2026-04-15T21:11:37.879Z -- Task `task_1776287045928_wltm1d` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4885ms

![game-mobile](visuals/game-mobile-2026-04-15T21-11-32-994Z.png)

> No visible components are rendered; the screen is entirely black. Error: UI not displayed, likely a rendering issue.

---

## 2026-04-15T21:12:23.984Z -- Task `task_1776287496081_pdj3p7` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 6938ms

![home-desktop](visuals/home-desktop-2026-04-15T21-12-17-046Z.png)

> No, the UI is not rendered; the screen is entirely black with no visible components. Error: No content or elements are displayed, indicating a failure in rendering the page.

---

## 2026-04-15T21:12:28.570Z -- Task `task_1776287496081_pdj3p7` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4586ms

![home-mobile](visuals/home-mobile-2026-04-15T21-12-23-984Z.png)

> No UI elements are visible; the screen is entirely black. Error: No content rendered for the specified route and device dimensions.

---

## 2026-04-15T21:12:37.155Z -- Task `task_1776287496081_pdj3p7` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 8585ms

![auth-desktop](visuals/auth-desktop-2026-04-15T21-12-28-570Z.png)

> No visible components; UI is unrendered (black screen). Error: No content displayed, indicating a rendering failure.

---

## 2026-04-15T21:12:41.677Z -- Task `task_1776287496081_pdj3p7` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4522ms

![auth-mobile](visuals/auth-mobile-2026-04-15T21-12-37-155Z.png)

> No UI elements are visible; the screen is entirely black. Error: No content rendered for the #auth route.

---

## 2026-04-15T21:12:46.832Z -- Task `task_1776287496081_pdj3p7` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 5155ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T21-12-41-677Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:12:51.125Z -- Task `task_1776287496081_pdj3p7` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4293ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T21-12-46-832Z.png)

> No visible components are rendered; the screen is entirely black, indicating a potential rendering issue or missing content.

---

## 2026-04-15T21:12:56.665Z -- Task `task_1776287496081_pdj3p7` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 5539ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T21-12-51-126Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:13:00.209Z -- Task `task_1776287496081_pdj3p7` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 3544ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T21-12-56-665Z.png)

> No visible components; UI not rendered (entirely black screen).

---

## 2026-04-15T21:13:06.067Z -- Task `task_1776287496081_pdj3p7` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 5857ms

![profile-desktop](visuals/profile-desktop-2026-04-15T21-13-00-209Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render for route "#profile".

---

## 2026-04-15T21:13:11.840Z -- Task `task_1776287496081_pdj3p7` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 5773ms

![profile-mobile](visuals/profile-mobile-2026-04-15T21-13-06-067Z.png)

> No visible components are rendered; the screen is entirely black, indicating a failure to display the profile UI.

---

## 2026-04-15T21:13:17.104Z -- Task `task_1776287496081_pdj3p7` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 5241ms

![friends-desktop](visuals/friends-desktop-2026-04-15T21-13-11-863Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:13:26.611Z -- Task `task_1776287496081_pdj3p7` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 9506ms

![friends-mobile](visuals/friends-mobile-2026-04-15T21-13-17-105Z.png)

> No visible components; UI not rendered (black screen). Error: Content fails to load/display.

---

## 2026-04-15T21:13:57.432Z -- Task `task_1776287496081_pdj3p7` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 30821ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T21-13-26-611Z.png)

> No UI components are visible; the screen is entirely black. Error: No leaderboard content or elements render on the page.

---

## 2026-04-15T21:16:46.114Z -- Task `task_1776287496081_pdj3p7` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 168682ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T21-13-57-432Z.png)

> No visible components; screen is entirely black. Error—UI not rendered (no content displayed).

---

## 2026-04-15T21:16:50.304Z -- Task `task_1776287496081_pdj3p7` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4186ms

![game-desktop](visuals/game-desktop-2026-04-15T21-16-46-118Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:16:54.260Z -- Task `task_1776287496081_pdj3p7` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 3956ms

![game-mobile](visuals/game-mobile-2026-04-15T21-16-50-304Z.png)

> No visible components; UI not rendered (blank screen).

---

## 2026-04-15T21:23:07.549Z -- Task `task_1776287641214_w1frd0` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 6348ms

![home-desktop](visuals/home-desktop-2026-04-15T21-23-01-201Z.png)

> No visible components; UI not rendered. Likely a rendering error or missing content.

---

## 2026-04-15T21:23:12.046Z -- Task `task_1776287641214_w1frd0` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4495ms

![home-mobile](visuals/home-mobile-2026-04-15T21-23-07-550Z.png)

> No visible components; the screen is entirely black, indicating a possible rendering error or missing content.

---

## 2026-04-15T21:23:16.255Z -- Task `task_1776287641214_w1frd0` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4208ms

![auth-desktop](visuals/auth-desktop-2026-04-15T21-23-12-047Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (blank/black screen).

---

## 2026-04-15T21:23:20.799Z -- Task `task_1776287641214_w1frd0` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4544ms

![auth-mobile](visuals/auth-mobile-2026-04-15T21-23-16-255Z.png)

> No visible components; screen is entirely black. Error: UI not rendered (no content displayed).

---

## 2026-04-15T21:23:25.276Z -- Task `task_1776287641214_w1frd0` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4477ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T21-23-20-799Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered for the "#dashboard" route.

---

## 2026-04-15T21:23:29.559Z -- Task `task_1776287641214_w1frd0` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4283ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T21-23-25-276Z.png)

> No UI components are visible; the screen is entirely black. The UI failed to render, showing a blank/black screen instead of dashboard elements.

---

## 2026-04-15T21:23:33.503Z -- Task `task_1776287641214_w1frd0` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 3944ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T21-23-29-559Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank screen).

---

## 2026-04-15T21:23:38.482Z -- Task `task_1776287641214_w1frd0` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 4978ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T21-23-33-504Z.png)

> No visible components; UI not rendered (black screen). Error: No content displayed.

---

## 2026-04-15T21:23:43.789Z -- Task `task_1776287641214_w1frd0` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 5306ms

![profile-desktop](visuals/profile-desktop-2026-04-15T21-23-38-483Z.png)

> No UI elements are rendered; the screen is entirely black. Visible components: none. Error: Missing profile page content.

---

## 2026-04-15T21:23:48.703Z -- Task `task_1776287641214_w1frd0` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4914ms

![profile-mobile](visuals/profile-mobile-2026-04-15T21-23-43-789Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered, showing a blank/black screen instead of profile content.

---

## 2026-04-15T21:23:52.950Z -- Task `task_1776287641214_w1frd0` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 4247ms

![friends-desktop](visuals/friends-desktop-2026-04-15T21-23-48-703Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank/black screen).

---

## 2026-04-15T21:23:57.201Z -- Task `task_1776287641214_w1frd0` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 4251ms

![friends-mobile](visuals/friends-mobile-2026-04-15T21-23-52-950Z.png)

> No visible components; UI not rendered (black screen). Error: Content failed to load/display.

---

## 2026-04-15T21:24:02.547Z -- Task `task_1776287641214_w1frd0` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 5346ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T21-23-57-201Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered, indicating a potential rendering failure or missing content.

---

## 2026-04-15T21:24:06.731Z -- Task `task_1776287641214_w1frd0` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4184ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T21-24-02-547Z.png)

> No visible components; the screen is entirely black, indicating a rendering issue or missing content.

---

## 2026-04-15T21:24:11.209Z -- Task `task_1776287641214_w1frd0` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4478ms

![game-desktop](visuals/game-desktop-2026-04-15T21-24-06-731Z.png)

> No UI components are rendered; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T21:24:15.633Z -- Task `task_1776287641214_w1frd0` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4424ms

![game-mobile](visuals/game-mobile-2026-04-15T21-24-11-209Z.png)

> No visible components are rendered; the screen is entirely black. Error: No UI elements displayed on the route "#game".

---

## 2026-04-15T21:24:53.705Z -- Task `task_1776288267002_zmwpc6` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 5034ms

![home-desktop](visuals/home-desktop-2026-04-15T21-24-48-671Z.png)

> No UI elements are visible; the screen is entirely black. This indicates a rendering failure or missing content.

---

## 2026-04-15T21:24:58.105Z -- Task `task_1776288267002_zmwpc6` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4399ms

![home-mobile](visuals/home-mobile-2026-04-15T21-24-53-706Z.png)

> No UI elements are visible; the screen is entirely black. Error: No content is rendered for the specified route and device dimensions.

---

## 2026-04-15T21:25:02.227Z -- Task `task_1776288267002_zmwpc6` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4122ms

![auth-desktop](visuals/auth-desktop-2026-04-15T21-24-58-105Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:25:06.524Z -- Task `task_1776288267002_zmwpc6` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 4297ms

![auth-mobile](visuals/auth-mobile-2026-04-15T21-25-02-227Z.png)

> No, the UI is not rendered—only a solid black screen is visible. No components are displayed, indicating a rendering issue.

---

## 2026-04-15T21:25:10.864Z -- Task `task_1776288267002_zmwpc6` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4339ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T21-25-06-525Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:25:14.710Z -- Task `task_1776288267002_zmwpc6` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 3845ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T21-25-10-865Z.png)

> No, the UI is not rendered. No visible components; error: blank/black screen indicating failed rendering.

---

## 2026-04-15T21:25:18.780Z -- Task `task_1776288267002_zmwpc6` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4070ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T21-25-14-710Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank/black screen).

---

## 2026-04-15T21:25:30.177Z -- Task `task_1776288267002_zmwpc6` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 11397ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T21-25-18-780Z.png)

> No visible components; UI not rendered. Error: Screen appears entirely black with no content displayed.

---

## 2026-04-15T21:25:34.396Z -- Task `task_1776288267002_zmwpc6` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4219ms

![profile-desktop](visuals/profile-desktop-2026-04-15T21-25-30-177Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render for the "#profile" route.

---

## 2026-04-15T21:25:39.163Z -- Task `task_1776288267002_zmwpc6` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4767ms

![profile-mobile](visuals/profile-mobile-2026-04-15T21-25-34-396Z.png)

> The UI is not rendered; the screen is entirely black. No visible components are present, indicating a rendering issue.

---

## 2026-04-15T21:25:43.671Z -- Task `task_1776288267002_zmwpc6` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 4508ms

![friends-desktop](visuals/friends-desktop-2026-04-15T21-25-39-163Z.png)

> No UI components are visible; the screen is entirely black. The UI fails to render for the "#friends" route on desktop 1280x720.

---

## 2026-04-15T21:25:47.943Z -- Task `task_1776288267002_zmwpc6` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 4271ms

![friends-mobile](visuals/friends-mobile-2026-04-15T21-25-43-672Z.png)

> No visible components are rendered; the screen is entirely black. Error: UI fails to display any content for the "#friends" route.

---

## 2026-04-15T21:25:51.953Z -- Task `task_1776288267002_zmwpc6` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4008ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T21-25-47-945Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:25:55.660Z -- Task `task_1776288267002_zmwpc6` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 3706ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T21-25-51-954Z.png)

> No visible components; UI not rendered (black screen). Errors: No content displayed.

---

## 2026-04-15T21:26:07.860Z -- Task `task_1776288267002_zmwpc6` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 12198ms

![game-desktop](visuals/game-desktop-2026-04-15T21-25-55-662Z.png)

> No UI components are rendered; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T21:26:11.672Z -- Task `task_1776288267002_zmwpc6` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 3811ms

![game-mobile](visuals/game-mobile-2026-04-15T21-26-07-861Z.png)

> No UI components are rendered; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T21:27:30.311Z -- Task `task_1776288383653_g5e79p` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 6343ms

![home-desktop](visuals/home-desktop-2026-04-15T21-27-23-968Z.png)

> No, the UI is not rendered—only a black screen appears with no visible components. No specific errors are detectable beyond the absence of rendered content.

---

## 2026-04-15T21:27:34.746Z -- Task `task_1776288383653_g5e79p` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4434ms

![home-mobile](visuals/home-mobile-2026-04-15T21-27-30-312Z.png)

> No UI components are visible; the screen is entirely black. The UI is not rendered as expected—no elements (e.g., navigation, content) are displayed.

---

## 2026-04-15T21:27:38.917Z -- Task `task_1776288383653_g5e79p` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4170ms

![auth-desktop](visuals/auth-desktop-2026-04-15T21-27-34-747Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:27:42.429Z -- Task `task_1776288383653_g5e79p` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 3512ms

![auth-mobile](visuals/auth-mobile-2026-04-15T21-27-38-917Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering error or missing content.

---

## 2026-04-15T21:27:46.320Z -- Task `task_1776288383653_g5e79p` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 3891ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T21-27-42-429Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:27:49.912Z -- Task `task_1776288383653_g5e79p` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 3592ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T21-27-46-320Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering error or failed load.

---

## 2026-04-15T21:27:53.842Z -- Task `task_1776288383653_g5e79p` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 3930ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T21-27-49-912Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank screen).

---

## 2026-04-15T21:27:57.487Z -- Task `task_1776288383653_g5e79p` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 3644ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T21-27-53-843Z.png)

> No, the UI is not rendered—only a black screen is visible. No components are displayed, indicating a rendering issue.

---

## 2026-04-15T21:28:01.321Z -- Task `task_1776288383653_g5e79p` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 3834ms

![profile-desktop](visuals/profile-desktop-2026-04-15T21-27-57-487Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render for the "#profile" route.

---

## 2026-04-15T21:28:06.560Z -- Task `task_1776288383653_g5e79p` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 5239ms

![profile-mobile](visuals/profile-mobile-2026-04-15T21-28-01-321Z.png)

> No, the UI is not rendered. No visible components; the screen is entirely black, indicating a rendering failure.

---

## 2026-04-15T21:28:10.414Z -- Task `task_1776288383653_g5e79p` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 3854ms

![friends-desktop](visuals/friends-desktop-2026-04-15T21-28-06-560Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (blank/black screen).

---

## 2026-04-15T21:28:15.021Z -- Task `task_1776288383653_g5e79p` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 4607ms

![friends-mobile](visuals/friends-mobile-2026-04-15T21-28-10-414Z.png)

> No UI components are visible; the screen is entirely black. Error—no content rendered for the #friends route.

---

## 2026-04-15T21:28:18.928Z -- Task `task_1776288383653_g5e79p` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 3907ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T21-28-15-021Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (blank/black screen).

---

## 2026-04-15T21:28:23.946Z -- Task `task_1776288383653_g5e79p` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 5018ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T21-28-18-928Z.png)

> No UI components are visible; the screen is entirely black. Error: The leaderboard UI failed to render, displaying a blank/black screen instead of expected elements like titles or entries.

---

## 2026-04-15T21:28:27.813Z -- Task `task_1776288383653_g5e79p` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 3867ms

![game-desktop](visuals/game-desktop-2026-04-15T21-28-23-946Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:28:31.530Z -- Task `task_1776288383653_g5e79p` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 3716ms

![game-mobile](visuals/game-mobile-2026-04-15T21-28-27-813Z.png)

> No visible components; UI not rendered (black screen). Error: Content fails to load/display.

---

## 2026-04-15T21:31:22.590Z -- Task `task_1776288520300_hhl3uf` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4281ms

![home-desktop](visuals/home-desktop-2026-04-15T21-31-18-309Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:31:26.422Z -- Task `task_1776288520300_hhl3uf` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 3831ms

![home-mobile](visuals/home-mobile-2026-04-15T21-31-22-591Z.png)

> No, the UI is not rendered—only a solid black screen is visible. No components are displayed, indicating a rendering issue.

---

## 2026-04-15T21:31:30.311Z -- Task `task_1776288520300_hhl3uf` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 3889ms

![auth-desktop](visuals/auth-desktop-2026-04-15T21-31-26-422Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:31:34.919Z -- Task `task_1776288520300_hhl3uf` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4608ms

![auth-mobile](visuals/auth-mobile-2026-04-15T21-31-30-311Z.png)

> No visible components; screen is entirely black. Error—UI not rendered (no content displayed).

---

## 2026-04-15T21:31:38.811Z -- Task `task_1776288520300_hhl3uf` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 3892ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T21-31-34-919Z.png)

> No UI components are visible; the screen is entirely black. The dashboard route fails to render any content.

---

## 2026-04-15T21:31:43.116Z -- Task `task_1776288520300_hhl3uf` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4305ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T21-31-38-811Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T21:31:47.102Z -- Task `task_1776288520300_hhl3uf` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 3985ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T21-31-43-117Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank/black screen).

---

## 2026-04-15T21:31:50.791Z -- Task `task_1776288520300_hhl3uf` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 3689ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T21-31-47-102Z.png)

> No visible components; UI not rendered (blank screen).

---

## 2026-04-15T21:31:55.308Z -- Task `task_1776288520300_hhl3uf` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4517ms

![profile-desktop](visuals/profile-desktop-2026-04-15T21-31-50-791Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:32:00.008Z -- Task `task_1776288520300_hhl3uf` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4700ms

![profile-mobile](visuals/profile-mobile-2026-04-15T21-31-55-308Z.png)

> No UI components are visible; the screen is entirely black. Error: No content rendered for the "#profile" route.

---

## 2026-04-15T21:32:04.103Z -- Task `task_1776288520300_hhl3uf` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 4094ms

![friends-desktop](visuals/friends-desktop-2026-04-15T21-32-00-009Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render for route "#friends".

---

## 2026-04-15T21:32:07.993Z -- Task `task_1776288520300_hhl3uf` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 3890ms

![friends-mobile](visuals/friends-mobile-2026-04-15T21-32-04-103Z.png)

> No visible components; UI not rendered (all-black screen). Error: Content fails to display on route "#friends".

---

## 2026-04-15T21:32:11.844Z -- Task `task_1776288520300_hhl3uf` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 3850ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T21-32-07-994Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:32:15.673Z -- Task `task_1776288520300_hhl3uf` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 3829ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T21-32-11-844Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering error or missing content.

---

## 2026-04-15T21:32:20.327Z -- Task `task_1776288520300_hhl3uf` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4653ms

![game-desktop](visuals/game-desktop-2026-04-15T21-32-15-674Z.png)

> No, the UI is not rendered—only a black screen is visible with no components displayed. Error: No UI elements loaded; screen remains entirely black.

---

## 2026-04-15T21:32:23.661Z -- Task `task_1776288520300_hhl3uf` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 3334ms

![game-mobile](visuals/game-mobile-2026-04-15T21-32-20-327Z.png)

> No visible components; UI not rendered (blank screen).

---

## 2026-04-15T21:33:46.695Z -- Task `task_1776288753002_m8yvqz` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4301ms

![home-desktop](visuals/home-desktop-2026-04-15T21-33-42-393Z.png)

> No UI elements are visible; the screen is entirely black. Likely a rendering error or missing content.

---

## 2026-04-15T21:33:56.946Z -- Task `task_1776288753002_m8yvqz` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 10251ms

![home-mobile](visuals/home-mobile-2026-04-15T21-33-46-695Z.png)

> No, the UI is not rendered. No visible components; error is a completely blank/black screen with no content displayed.

---

## 2026-04-15T21:34:01.144Z -- Task `task_1776288753002_m8yvqz` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4198ms

![auth-desktop](visuals/auth-desktop-2026-04-15T21-33-56-946Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:34:05.854Z -- Task `task_1776288753002_m8yvqz` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4709ms

![auth-mobile](visuals/auth-mobile-2026-04-15T21-34-01-145Z.png)

> No visible components; screen is entirely black. Error—UI not rendered (no content displayed).

---

## 2026-04-15T21:34:10.156Z -- Task `task_1776288753002_m8yvqz` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 4302ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T21-34-05-854Z.png)

> No, the UI is not rendered. No visible components; error: blank/black screen indicates missing content.

---

## 2026-04-15T21:34:14.497Z -- Task `task_1776288753002_m8yvqz` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 4341ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T21-34-10-156Z.png)

> No, the UI is not rendered—only a black screen is visible with no components displayed. Error: No content or interactive elements appear on the screen.

---

## 2026-04-15T21:34:18.348Z -- Task `task_1776288753002_m8yvqz` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 3850ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T21-34-14-498Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank/black screen).

---

## 2026-04-15T21:34:22.342Z -- Task `task_1776288753002_m8yvqz` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 3994ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T21-34-18-348Z.png)

> No UI components are visible; the screen is entirely black. The UI fails to render, indicating a potential loading issue or display error.

---

## 2026-04-15T21:34:26.316Z -- Task `task_1776288753002_m8yvqz` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 3974ms

![profile-desktop](visuals/profile-desktop-2026-04-15T21-34-22-342Z.png)

> No UI components are visible; the screen is entirely black. The UI failed to render for the "#profile" route.

---

## 2026-04-15T21:34:30.943Z -- Task `task_1776288753002_m8yvqz` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 4626ms

![profile-mobile](visuals/profile-mobile-2026-04-15T21-34-26-317Z.png)

> No, the UI is not rendered—no visible components. Error: Complete black screen with no content displayed.

---

## 2026-04-15T21:34:34.815Z -- Task `task_1776288753002_m8yvqz` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 3872ms

![friends-desktop](visuals/friends-desktop-2026-04-15T21-34-30-943Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:34:38.725Z -- Task `task_1776288753002_m8yvqz` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 3910ms

![friends-mobile](visuals/friends-mobile-2026-04-15T21-34-34-815Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:34:42.719Z -- Task `task_1776288753002_m8yvqz` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 3994ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T21-34-38-725Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank display).

---

## 2026-04-15T21:34:47.071Z -- Task `task_1776288753002_m8yvqz` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4352ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T21-34-42-719Z.png)

> No, the UI is not rendered; the screen is entirely black with no visible components. Error: No content displayed (likely a rendering failure).

---

## 2026-04-15T21:34:51.038Z -- Task `task_1776288753002_m8yvqz` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 3967ms

![game-desktop](visuals/game-desktop-2026-04-15T21-34-47-071Z.png)

> No UI components are rendered; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T21:34:54.497Z -- Task `task_1776288753002_m8yvqz` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 3459ms

![game-mobile](visuals/game-mobile-2026-04-15T21-34-51-038Z.png)

> No visible components; UI not rendered (black screen).

---

## 2026-04-15T21:35:48.664Z -- Task `task_1776288904120_jsfjg5` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 4034ms

![home-desktop](visuals/home-desktop-2026-04-15T21-35-44-630Z.png)

> No, the UI is not rendered—only a black screen is visible. No components are displayed, indicating a rendering issue.

---

## 2026-04-15T21:35:52.347Z -- Task `task_1776288904120_jsfjg5` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 3681ms

![home-mobile](visuals/home-mobile-2026-04-15T21-35-48-665Z.png)

> No visible components are rendered. Error: The UI fails to display any content on the screen.

---

## 2026-04-15T21:35:56.958Z -- Task `task_1776288904120_jsfjg5` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4611ms

![auth-desktop](visuals/auth-desktop-2026-04-15T21-35-52-347Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering error or missing content.

---

## 2026-04-15T21:36:01.021Z -- Task `task_1776288904120_jsfjg5` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 4063ms

![auth-mobile](visuals/auth-mobile-2026-04-15T21-35-56-958Z.png)

> No, the UI is not rendered—only a black screen is visible. No components are displayed, indicating a rendering issue.

---

## 2026-04-15T21:36:05.098Z -- Task `task_1776288904120_jsfjg5` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4076ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T21-36-01-022Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:36:08.939Z -- Task `task_1776288904120_jsfjg5` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 3841ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T21-36-05-098Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering error (e.g., failed load or display issue).

---

## 2026-04-15T21:36:13.137Z -- Task `task_1776288904120_jsfjg5` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4198ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T21-36-08-939Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:36:17.107Z -- Task `task_1776288904120_jsfjg5` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 3970ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T21-36-13-137Z.png)

> No visible components are rendered; the screen is entirely black. Error: No UI elements displayed on the route "#lobby".

---

## 2026-04-15T21:36:23.136Z -- Task `task_1776288904120_jsfjg5` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 6028ms

![profile-desktop](visuals/profile-desktop-2026-04-15T21-36-17-108Z.png)

> The UI is not rendered; the screen is completely black with no visible components. No specific errors are evident other than the absence of rendered content.

---

## 2026-04-15T21:36:27.882Z -- Task `task_1776288904120_jsfjg5` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 4746ms

![profile-mobile](visuals/profile-mobile-2026-04-15T21-36-23-136Z.png)

> No, the UI is not rendered; the screen is completely black with no visible components. Error: No content displayed, indicating a rendering failure or missing assets.

---

## 2026-04-15T21:36:31.773Z -- Task `task_1776288904120_jsfjg5` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 3891ms

![friends-desktop](visuals/friends-desktop-2026-04-15T21-36-27-882Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:36:36.791Z -- Task `task_1776288904120_jsfjg5` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 5017ms

![friends-mobile](visuals/friends-mobile-2026-04-15T21-36-31-774Z.png)

> No visible components are rendered; the screen is entirely black. Error: No UI elements or content are displayed for the "#friends" route.

---

## 2026-04-15T21:36:40.574Z -- Task `task_1776288904120_jsfjg5` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 3782ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T21-36-36-792Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank display).

---

## 2026-04-15T21:36:45.291Z -- Task `task_1776288904120_jsfjg5` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4717ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T21-36-40-574Z.png)

> No, the UI is not rendered as the screen is entirely black. No visible components; possible rendering error or missing content.

---

## 2026-04-15T21:36:49.079Z -- Task `task_1776288904120_jsfjg5` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 3788ms

![game-desktop](visuals/game-desktop-2026-04-15T21-36-45-291Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering or loading error.

---

## 2026-04-15T21:36:52.760Z -- Task `task_1776288904120_jsfjg5` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 3681ms

![game-mobile](visuals/game-mobile-2026-04-15T21-36-49-079Z.png)

> No visible components are rendered; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T21:38:30.147Z -- Task `task_1776289023415_exqq73` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 3915ms

![home-desktop](visuals/home-desktop-2026-04-15T21-38-26-232Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:38:35.009Z -- Task `task_1776289023415_exqq73` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 4861ms

![home-mobile](visuals/home-mobile-2026-04-15T21-38-30-148Z.png)

> No visible components; UI appears completely blank. Possible rendering error or missing content.

---

## 2026-04-15T21:38:45.097Z -- Task `task_1776289023415_exqq73` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 10087ms

![auth-desktop](visuals/auth-desktop-2026-04-15T21-38-35-010Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:38:49.193Z -- Task `task_1776289023415_exqq73` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4096ms

![auth-mobile](visuals/auth-mobile-2026-04-15T21-38-45-097Z.png)

> No visible components are rendered; the screen is entirely black, indicating a rendering error or missing content.

---

## 2026-04-15T21:38:53.356Z -- Task `task_1776289023415_exqq73` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4163ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T21-38-49-193Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:38:57.216Z -- Task `task_1776289023415_exqq73` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 3852ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T21-38-53-356Z.png)

> The UI is not rendered; no visible components are present. Error: Complete lack of displayed content on the screen.

---

## 2026-04-15T21:39:01.725Z -- Task `task_1776289023415_exqq73` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4508ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T21-38-57-217Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank screen).

---

## 2026-04-15T21:39:05.894Z -- Task `task_1776289023415_exqq73` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 4169ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T21-39-01-725Z.png)

> No visible components; UI not rendered (black screen). Error: No content displayed for route "#lobby".

---

## 2026-04-15T21:39:10.367Z -- Task `task_1776289023415_exqq73` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4473ms

![profile-desktop](visuals/profile-desktop-2026-04-15T21-39-05-894Z.png)

> No UI elements are visible; the screen is entirely black. This indicates a rendering error or missing content for the #profile route.

---

## 2026-04-15T21:39:14.440Z -- Task `task_1776289023415_exqq73` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4072ms

![profile-mobile](visuals/profile-mobile-2026-04-15T21-39-10-368Z.png)

> No UI components are visible; the screen is entirely black. The UI failed to render, showing a blank display.

---

## 2026-04-15T21:39:18.840Z -- Task `task_1776289023415_exqq73` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 4400ms

![friends-desktop](visuals/friends-desktop-2026-04-15T21-39-14-440Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:39:22.617Z -- Task `task_1776289023415_exqq73` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 3777ms

![friends-mobile](visuals/friends-mobile-2026-04-15T21-39-18-840Z.png)

> No visible components; UI not rendered (entirely black screen).

---

## 2026-04-15T21:39:26.838Z -- Task `task_1776289023415_exqq73` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4221ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T21-39-22-617Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (blank display).

---

## 2026-04-15T21:39:30.577Z -- Task `task_1776289023415_exqq73` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 3739ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T21-39-26-838Z.png)

> No visible components; UI not rendered (all-black screen). Error: Content fails to load/display.

---

## 2026-04-15T21:39:34.698Z -- Task `task_1776289023415_exqq73` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4121ms

![game-desktop](visuals/game-desktop-2026-04-15T21-39-30-577Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering or loading issue.

---

## 2026-04-15T21:39:38.755Z -- Task `task_1776289023415_exqq73` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4057ms

![game-mobile](visuals/game-mobile-2026-04-15T21-39-34-698Z.png)

> No UI components are rendered; the screen is entirely black. This indicates a rendering error where expected elements (e.g., game interface, buttons) are missing.

---

## 2026-04-15T21:41:22.899Z -- Task `task_1776289191964_1dbvto` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4987ms

![home-desktop](visuals/home-desktop-2026-04-15T21-41-17-912Z.png)

> No UI elements are visible; the screen is entirely black. Likely a rendering error or missing content.

---

## 2026-04-15T21:41:26.817Z -- Task `task_1776289191964_1dbvto` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 3915ms

![home-mobile](visuals/home-mobile-2026-04-15T21-41-22-900Z.png)

> No visible components; UI not rendered (black screen). Error: Content failed to load/display.

---

## 2026-04-15T21:41:30.983Z -- Task `task_1776289191964_1dbvto` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4164ms

![auth-desktop](visuals/auth-desktop-2026-04-15T21-41-26-819Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:41:35.084Z -- Task `task_1776289191964_1dbvto` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4100ms

![auth-mobile](visuals/auth-mobile-2026-04-15T21-41-30-984Z.png)

> No visible components are rendered; the screen is entirely black, indicating a failure to display the auth UI.

---

## 2026-04-15T21:41:39.152Z -- Task `task_1776289191964_1dbvto` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4068ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T21-41-35-084Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:41:42.967Z -- Task `task_1776289191964_1dbvto` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 3814ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T21-41-39-153Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T21:41:47.060Z -- Task `task_1776289191964_1dbvto` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4093ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T21-41-42-967Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank screen).

---

## 2026-04-15T21:41:50.850Z -- Task `task_1776289191964_1dbvto` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 3790ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T21-41-47-060Z.png)

> No visible components; UI not rendered (blank screen).

---

## 2026-04-15T21:41:55.872Z -- Task `task_1776289191964_1dbvto` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 5021ms

![profile-desktop](visuals/profile-desktop-2026-04-15T21-41-50-850Z.png)

> No visible components are rendered; the screen is entirely black. Error: UI fails to load/render (no content displayed).

---

## 2026-04-15T21:42:00.271Z -- Task `task_1776289191964_1dbvto` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4399ms

![profile-mobile](visuals/profile-mobile-2026-04-15T21-41-55-872Z.png)

> No UI elements are visible; the screen is entirely black. Error: No content rendered for the #profile route.

---

## 2026-04-15T21:42:04.444Z -- Task `task_1776289191964_1dbvto` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 4173ms

![friends-desktop](visuals/friends-desktop-2026-04-15T21-42-00-271Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank screen).

---

## 2026-04-15T21:42:08.536Z -- Task `task_1776289191964_1dbvto` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 4091ms

![friends-mobile](visuals/friends-mobile-2026-04-15T21-42-04-445Z.png)

> No visible components; UI not rendered (blank screen). Error: Content failed to load/display.

---

## 2026-04-15T21:42:12.657Z -- Task `task_1776289191964_1dbvto` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4120ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T21-42-08-537Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank display).

---

## 2026-04-15T21:42:16.755Z -- Task `task_1776289191964_1dbvto` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4098ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T21-42-12-657Z.png)

> No visible components are rendered; the screen is entirely black. Error: UI failed to load or render any content for the "#leaderboard" route.

---

## 2026-04-15T21:42:20.955Z -- Task `task_1776289191964_1dbvto` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4200ms

![game-desktop](visuals/game-desktop-2026-04-15T21-42-16-755Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:42:24.450Z -- Task `task_1776289191964_1dbvto` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 3495ms

![game-mobile](visuals/game-mobile-2026-04-15T21-42-20-955Z.png)

> No visible components are rendered; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T21:49:46.230Z -- Task `task_1776289356028_y9dtel` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4806ms

![home-desktop](visuals/home-desktop-2026-04-15T21-49-41-424Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:49:51.303Z -- Task `task_1776289356028_y9dtel` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 5071ms

![home-mobile](visuals/home-mobile-2026-04-15T21-49-46-232Z.png)

> No visible components; UI appears as a blank (black) screen, indicating rendering issue or missing content.

---

## 2026-04-15T21:49:55.706Z -- Task `task_1776289356028_y9dtel` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4403ms

![auth-desktop](visuals/auth-desktop-2026-04-15T21-49-51-303Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:49:59.773Z -- Task `task_1776289356028_y9dtel` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 4067ms

![auth-mobile](visuals/auth-mobile-2026-04-15T21-49-55-706Z.png)

> No visible components; UI not rendered (blank screen).

---

## 2026-04-15T21:50:04.410Z -- Task `task_1776289356028_y9dtel` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4637ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T21-49-59-773Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:50:09.221Z -- Task `task_1776289356028_y9dtel` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4811ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T21-50-04-410Z.png)

> No visible components; the screen is entirely black. Error—blank display with no content rendered.

---

## 2026-04-15T21:50:21.862Z -- Task `task_1776289356028_y9dtel` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 12640ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T21-50-09-222Z.png)

> No visible components; UI not rendered (blank screen).

---

## 2026-04-15T21:50:26.119Z -- Task `task_1776289356028_y9dtel` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 4256ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T21-50-21-863Z.png)

> No, the UI is not rendered—all content is missing (black screen). Visible components: none. Error: complete lack of rendered elements.

---

## 2026-04-15T21:50:30.624Z -- Task `task_1776289356028_y9dtel` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4505ms

![profile-desktop](visuals/profile-desktop-2026-04-15T21-50-26-119Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:50:42.041Z -- Task `task_1776289356028_y9dtel` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 11417ms

![profile-mobile](visuals/profile-mobile-2026-04-15T21-50-30-624Z.png)

> No, the UI is not rendered as the screen is entirely black. No visible components are present; the page failed to load or render content.

---

## 2026-04-15T21:50:47.315Z -- Task `task_1776289356028_y9dtel` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 5274ms

![friends-desktop](visuals/friends-desktop-2026-04-15T21-50-42-041Z.png)

> No UI elements are visible; the screen is entirely black. Error: Content failed to render (blank/black screen).

---

## 2026-04-15T21:50:51.104Z -- Task `task_1776289356028_y9dtel` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 3788ms

![friends-mobile](visuals/friends-mobile-2026-04-15T21-50-47-316Z.png)

> No visible components; UI not rendered (all-black screen). Error: Content fails to load/display.

---

## 2026-04-15T21:50:55.910Z -- Task `task_1776289356028_y9dtel` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 4806ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T21-50-51-104Z.png)

> No visible components are rendered; the UI appears completely blank, indicating a rendering issue.

---

## 2026-04-15T21:50:59.910Z -- Task `task_1776289356028_y9dtel` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 4000ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T21-50-55-910Z.png)

> No, the UI is not rendered—only a black screen is visible. No components are displayed, indicating a rendering issue.

---

## 2026-04-15T21:51:04.211Z -- Task `task_1776289356028_y9dtel` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4301ms

![game-desktop](visuals/game-desktop-2026-04-15T21-50-59-910Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank display).

---

## 2026-04-15T21:51:08.306Z -- Task `task_1776289356028_y9dtel` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 4095ms

![game-mobile](visuals/game-mobile-2026-04-15T21-51-04-211Z.png)

> No visible components are rendered. Error: The UI is entirely blank, indicating a rendering issue or missing content.

---

## 2026-04-15T21:53:17.845Z -- Task `task_1776289881948_sksbxb` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 5777ms

![home-desktop](visuals/home-desktop-2026-04-15T21-53-12-068Z.png)

> No UI elements are visible; the screen is entirely black. Likely a rendering error or missing content.

---

## 2026-04-15T21:53:22.737Z -- Task `task_1776289881948_sksbxb` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4887ms

![home-mobile](visuals/home-mobile-2026-04-15T21-53-17-850Z.png)

> No UI elements are visible; the screen is entirely black. Possible rendering error or missing content.

---

## 2026-04-15T21:53:27.136Z -- Task `task_1776289881948_sksbxb` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4399ms

![auth-desktop](visuals/auth-desktop-2026-04-15T21-53-22-737Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:53:31.101Z -- Task `task_1776289881948_sksbxb` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 3965ms

![auth-mobile](visuals/auth-mobile-2026-04-15T21-53-27-136Z.png)

> No visible components; UI not rendered (black screen). Error: Content fails to load/display.

---

## 2026-04-15T21:53:35.249Z -- Task `task_1776289881948_sksbxb` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4147ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T21-53-31-102Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:53:38.937Z -- Task `task_1776289881948_sksbxb` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 3688ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T21-53-35-249Z.png)

> No, the UI is not rendered—only a black screen is visible. No components are displayed, indicating a rendering error.

---

## 2026-04-15T21:53:43.428Z -- Task `task_1776289881948_sksbxb` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 4491ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T21-53-38-937Z.png)

> No visible components; UI not rendered. Error: Lobby route fails to display expected elements (e.g., lobby header, game options).

---

## 2026-04-15T21:53:47.862Z -- Task `task_1776289881948_sksbxb` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4434ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T21-53-43-428Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T21:53:52.005Z -- Task `task_1776289881948_sksbxb` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4143ms

![profile-desktop](visuals/profile-desktop-2026-04-15T21-53-47-862Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:53:56.908Z -- Task `task_1776289881948_sksbxb` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4903ms

![profile-mobile](visuals/profile-mobile-2026-04-15T21-53-52-005Z.png)

> No UI components are visible; the screen is entirely black. Error: The profile page fails to render any content.

---

## 2026-04-15T21:54:01.033Z -- Task `task_1776289881948_sksbxb` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 4125ms

![friends-desktop](visuals/friends-desktop-2026-04-15T21-53-56-908Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:54:04.726Z -- Task `task_1776289881948_sksbxb` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 3693ms

![friends-mobile](visuals/friends-mobile-2026-04-15T21-54-01-033Z.png)

> No visible components; UI not rendered (entirely black screen).

---

## 2026-04-15T21:54:09.432Z -- Task `task_1776289881948_sksbxb` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4706ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T21-54-04-726Z.png)

> No UI elements are visible; the screen is entirely black. Error: Leaderboard content failed to render (no components displayed).

---

## 2026-04-15T21:54:21.085Z -- Task `task_1776289881948_sksbxb` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 11653ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T21-54-09-432Z.png)

> No visible components are rendered; the screen is entirely black. Error: UI fails to display any content for the "#leaderboard" route.

---

## 2026-04-15T21:54:25.323Z -- Task `task_1776289881948_sksbxb` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4237ms

![game-desktop](visuals/game-desktop-2026-04-15T21-54-21-086Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank screen).

---

## 2026-04-15T21:54:29.226Z -- Task `task_1776289881948_sksbxb` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 3903ms

![game-mobile](visuals/game-mobile-2026-04-15T21-54-25-323Z.png)

> No visible components; UI not rendered (blank screen).

---

## 2026-04-15T21:55:17.304Z -- Task `task_1776290079049_3j5sf3` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 6222ms

![home-desktop](visuals/home-desktop-2026-04-15T21-55-11-082Z.png)

> No UI elements are visible; the screen is entirely black. Possible rendering error or missing content.

---

## 2026-04-15T21:55:23.107Z -- Task `task_1776290079049_3j5sf3` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 5802ms

![home-mobile](visuals/home-mobile-2026-04-15T21-55-17-305Z.png)

> No UI elements are visible; the screen is entirely black. Likely a rendering error or missing content.

---

## 2026-04-15T21:55:27.568Z -- Task `task_1776290079049_3j5sf3` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4461ms

![auth-desktop](visuals/auth-desktop-2026-04-15T21-55-23-107Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:55:32.185Z -- Task `task_1776290079049_3j5sf3` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 4617ms

![auth-mobile](visuals/auth-mobile-2026-04-15T21-55-27-568Z.png)

> No visible components; UI not rendered (black screen).

---

## 2026-04-15T21:55:44.682Z -- Task `task_1776290079049_3j5sf3` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 12496ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T21-55-32-186Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:55:50.638Z -- Task `task_1776290079049_3j5sf3` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 5956ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T21-55-44-682Z.png)

> No, the UI is not rendered; no visible components are present. The screen is entirely black, indicating a rendering issue or missing content.

---

## 2026-04-15T21:56:03.339Z -- Task `task_1776290079049_3j5sf3` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 12700ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T21-55-50-639Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank/black screen).

---

## 2026-04-15T21:56:07.639Z -- Task `task_1776290079049_3j5sf3` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 4300ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T21-56-03-339Z.png)

> No visible components; UI not rendered (black screen). Error: Content failed to load/display.

---

## 2026-04-15T21:56:12.113Z -- Task `task_1776290079049_3j5sf3` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4474ms

![profile-desktop](visuals/profile-desktop-2026-04-15T21-56-07-639Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (blank/black screen).

---

## 2026-04-15T21:56:16.396Z -- Task `task_1776290079049_3j5sf3` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 4282ms

![profile-mobile](visuals/profile-mobile-2026-04-15T21-56-12-114Z.png)

> No, the UI is not rendered—only a black screen is visible. No components are displayed, indicating a rendering issue or missing content.

---

## 2026-04-15T21:56:22.152Z -- Task `task_1776290079049_3j5sf3` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 5755ms

![friends-desktop](visuals/friends-desktop-2026-04-15T21-56-16-397Z.png)

> No, the UI is not rendered. No visible components are present; the screen is entirely black, indicating a rendering issue.

---

## 2026-04-15T21:56:25.948Z -- Task `task_1776290079049_3j5sf3` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 3796ms

![friends-mobile](visuals/friends-mobile-2026-04-15T21-56-22-152Z.png)

> No visible components; UI not rendered (entirely black screen).

---

## 2026-04-15T21:56:40.267Z -- Task `task_1776290079049_3j5sf3` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 14319ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T21-56-25-948Z.png)

> No UI components are visible; the screen is entirely black. Error: Leaderboard content failed to render or load.

---

## 2026-04-15T21:56:45.815Z -- Task `task_1776290079049_3j5sf3` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 5548ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T21-56-40-267Z.png)

> No UI elements are visible; the screen is entirely black. Error: UI failed to render content for the #leaderboard route.

---

## 2026-04-15T21:56:50.147Z -- Task `task_1776290079049_3j5sf3` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4330ms

![game-desktop](visuals/game-desktop-2026-04-15T21-56-45-816Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering or loading error.

---

## 2026-04-15T21:56:54.658Z -- Task `task_1776290079049_3j5sf3` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4511ms

![game-mobile](visuals/game-mobile-2026-04-15T21-56-50-147Z.png)

> No visible components are rendered; the screen is entirely black. Error: UI fails to display any content on the specified route and device dimensions.

---

## 2026-04-15T21:57:14.893Z -- Task `task_1776290209392_raspkz` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 6481ms

![home-desktop](visuals/home-desktop-2026-04-15T21-57-08-412Z.png)

> No, the UI is not rendered; no visible components are present. Error: Blank/black screen suggests rendering failure or missing content.

---

## 2026-04-15T21:57:19.312Z -- Task `task_1776290209392_raspkz` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4417ms

![home-mobile](visuals/home-mobile-2026-04-15T21-57-14-894Z.png)

> No visible components are rendered; the screen is entirely black, indicating a failure to display the UI.

---

## 2026-04-15T21:57:23.899Z -- Task `task_1776290209392_raspkz` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4587ms

![auth-desktop](visuals/auth-desktop-2026-04-15T21-57-19-312Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:57:27.724Z -- Task `task_1776290209392_raspkz` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 3825ms

![auth-mobile](visuals/auth-mobile-2026-04-15T21-57-23-899Z.png)

> No visible components; UI not rendered (black screen). Error: Content failed to load or render.

---

## 2026-04-15T21:57:32.627Z -- Task `task_1776290209392_raspkz` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4903ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T21-57-27-724Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:57:45.719Z -- Task `task_1776290209392_raspkz` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 13092ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T21-57-32-627Z.png)

> No UI components are visible; the screen is entirely black. The UI failed to render, showing a blank state instead of dashboard elements.

---

## 2026-04-15T21:57:50.633Z -- Task `task_1776290209392_raspkz` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4913ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T21-57-45-720Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:57:55.298Z -- Task `task_1776290209392_raspkz` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4664ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T21-57-50-634Z.png)

> No visible components are rendered; the screen is entirely black. Error: No UI elements displayed on the route "#lobby".

---

## 2026-04-15T21:58:07.837Z -- Task `task_1776290209392_raspkz` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 12538ms

![profile-desktop](visuals/profile-desktop-2026-04-15T21-57-55-299Z.png)

> No, the UI is not rendered; no visible components are present. Error: Blank screen indicates failed rendering or missing content.

---

## 2026-04-15T21:58:12.445Z -- Task `task_1776290209392_raspkz` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4608ms

![profile-mobile](visuals/profile-mobile-2026-04-15T21-58-07-837Z.png)

> No, the UI is not rendered—screen is entirely black with no visible components. Error: No content displayed for the #profile route.

---

## 2026-04-15T21:58:17.362Z -- Task `task_1776290209392_raspkz` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 4917ms

![friends-desktop](visuals/friends-desktop-2026-04-15T21-58-12-445Z.png)

> No, the UI is not rendered—only a black screen is visible. No components are displayed, indicating a rendering error.

---

## 2026-04-15T21:58:21.593Z -- Task `task_1776290209392_raspkz` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 4231ms

![friends-mobile](visuals/friends-mobile-2026-04-15T21-58-17-362Z.png)

> No visible components; UI not rendered (entirely black screen).

---

## 2026-04-15T21:58:27.317Z -- Task `task_1776290209392_raspkz` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 5724ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T21-58-21-593Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (no content displayed).

---

## 2026-04-15T21:58:31.491Z -- Task `task_1776290209392_raspkz` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 4174ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T21-58-27-317Z.png)

> No visible components are rendered. The UI appears completely blank, indicating a rendering error.

---

## 2026-04-15T21:58:44.431Z -- Task `task_1776290209392_raspkz` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 12940ms

![game-desktop](visuals/game-desktop-2026-04-15T21-58-31-491Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:58:48.384Z -- Task `task_1776290209392_raspkz` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 3952ms

![game-mobile](visuals/game-mobile-2026-04-15T21-58-44-432Z.png)

> No visible components are rendered; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T21:59:20.959Z -- Task `task_1776290328377_d2iga3` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 5407ms

![home-desktop](visuals/home-desktop-2026-04-15T21-59-15-552Z.png)

> No UI elements are visible; the screen is entirely black. Likely a rendering error or missing content.

---

## 2026-04-15T21:59:33.650Z -- Task `task_1776290328377_d2iga3` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 12690ms

![home-mobile](visuals/home-mobile-2026-04-15T21-59-20-960Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering issue or missing content.

---

## 2026-04-15T21:59:38.050Z -- Task `task_1776290328377_d2iga3` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4399ms

![auth-desktop](visuals/auth-desktop-2026-04-15T21-59-33-651Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:59:41.959Z -- Task `task_1776290328377_d2iga3` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 3909ms

![auth-mobile](visuals/auth-mobile-2026-04-15T21-59-38-050Z.png)

> No visible components; UI not rendered (all-black screen). Error: Auth route content failed to load/display.

---

## 2026-04-15T21:59:46.327Z -- Task `task_1776290328377_d2iga3` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4367ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T21-59-41-960Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T21:59:57.659Z -- Task `task_1776290328377_d2iga3` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 11310ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T21-59-46-348Z.png)

> No UI components are visible; the screen is entirely black. The UI fails to render, indicating a potential loading or display issue.

---

## 2026-04-15T22:00:02.771Z -- Task `task_1776290328377_d2iga3` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 5060ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T21-59-57-711Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T22:00:07.540Z -- Task `task_1776290328377_d2iga3` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4769ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T22-00-02-771Z.png)

> No visible components; UI not rendered (entirely black screen). Error: No content displayed for "#lobby" route.

---

## 2026-04-15T22:00:20.940Z -- Task `task_1776290328377_d2iga3` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 13400ms

![profile-desktop](visuals/profile-desktop-2026-04-15T22-00-07-540Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render on the "#profile" route for desktop 1280x720.

---

## 2026-04-15T22:00:25.450Z -- Task `task_1776290328377_d2iga3` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 4509ms

![profile-mobile](visuals/profile-mobile-2026-04-15T22-00-20-941Z.png)

> No, the UI is not rendered—only a black screen is visible. No components are displayed, indicating a rendering error.

---

## 2026-04-15T22:00:37.874Z -- Task `task_1776290328377_d2iga3` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 12424ms

![friends-desktop](visuals/friends-desktop-2026-04-15T22-00-25-450Z.png)

> No UI elements are visible; the screen is entirely black, indicating a rendering error or missing content.

---

## 2026-04-15T22:00:42.374Z -- Task `task_1776290328377_d2iga3` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 4499ms

![friends-mobile](visuals/friends-mobile-2026-04-15T22-00-37-875Z.png)

> No visible components; entire screen is black, indicating rendering failure or missing content.

---

## 2026-04-15T22:00:47.815Z -- Task `task_1776290328377_d2iga3` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 5441ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T22-00-42-374Z.png)

> No UI components are visible; the screen is entirely black. Error: The UI for the "#leaderboard" route is not rendered.

---

## 2026-04-15T22:00:53.528Z -- Task `task_1776290328377_d2iga3` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 5713ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T22-00-47-815Z.png)

> No UI components are visible; the screen is entirely black. The UI is not rendered, indicating a potential error or missing content.

---

## 2026-04-15T22:00:58.339Z -- Task `task_1776290328377_d2iga3` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4810ms

![game-desktop](visuals/game-desktop-2026-04-15T22-00-53-528Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank display).

---

## 2026-04-15T22:01:03.246Z -- Task `task_1776290328377_d2iga3` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4907ms

![game-mobile](visuals/game-mobile-2026-04-15T22-00-58-339Z.png)

> No visible components; the screen is entirely black, indicating a rendering issue or missing content.

---

## 2026-04-15T22:04:19.641Z -- Task `task_1776290454732_agqm8l` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 6545ms

![home-desktop](visuals/home-desktop-2026-04-15T22-04-13-095Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T22:04:24.983Z -- Task `task_1776290454732_agqm8l` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 5341ms

![home-mobile](visuals/home-mobile-2026-04-15T22-04-19-642Z.png)

> No visible components; the screen is entirely black, indicating a rendering issue or missing content.

---

## 2026-04-15T22:04:31.188Z -- Task `task_1776290454732_agqm8l` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 6155ms

![auth-desktop](visuals/auth-desktop-2026-04-15T22-04-24-983Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T22:04:40.499Z -- Task `task_1776290454732_agqm8l` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 9295ms

![auth-mobile](visuals/auth-mobile-2026-04-15T22-04-31-202Z.png)

> No UI components are visible; the screen is entirely black. Error – the auth route fails to render any content.

---

## 2026-04-15T22:04:46.535Z -- Task `task_1776290454732_agqm8l` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 6026ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T22-04-40-501Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered for route "#dashboard".

---

## 2026-04-15T22:05:01.684Z -- Task `task_1776290454732_agqm8l` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 15146ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T22-04-46-536Z.png)

> No UI components are visible; the screen is entirely black. The UI failed to render, showing a blank (black) display with no interactive elements or content.

---

## 2026-04-15T22:05:12.069Z -- Task `task_1776290454732_agqm8l` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 10363ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T22-05-01-701Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T22:05:18.525Z -- Task `task_1776290454732_agqm8l` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 6354ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T22-05-12-073Z.png)

> No visible components; UI not rendered (black screen). Error: No content displayed.

---

## 2026-04-15T22:05:25.879Z -- Task `task_1776290454732_agqm8l` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 7333ms

![profile-desktop](visuals/profile-desktop-2026-04-15T22-05-18-546Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (blank screen).

---

## 2026-04-15T22:05:33.099Z -- Task `task_1776290454732_agqm8l` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 7219ms

![profile-mobile](visuals/profile-mobile-2026-04-15T22-05-25-880Z.png)

> No UI elements are visible; the screen is entirely black. Error: No content rendered for the #profile route.

---

## 2026-04-15T22:05:39.797Z -- Task `task_1776290454732_agqm8l` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 6692ms

![friends-desktop](visuals/friends-desktop-2026-04-15T22-05-33-104Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render for the "#friends" route.

---

## 2026-04-15T22:05:50.561Z -- Task `task_1776290454732_agqm8l` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 10762ms

![friends-mobile](visuals/friends-mobile-2026-04-15T22-05-39-799Z.png)

> No visible components; UI not rendered (entirely black screen). Error: No content displayed for "#friends" route.

---

## 2026-04-15T22:05:58.412Z -- Task `task_1776290454732_agqm8l` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 7842ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T22-05-50-562Z.png)

> No visible components. UI is not rendered (black screen).

---

## 2026-04-15T22:06:04.204Z -- Task `task_1776290454732_agqm8l` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 5768ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T22-05-58-430Z.png)

> No visible components; UI not rendered (blank screen).

---

## 2026-04-15T22:06:21.564Z -- Task `task_1776290454732_agqm8l` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 17335ms

![game-desktop](visuals/game-desktop-2026-04-15T22-06-04-225Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no elements displayed).

---

## 2026-04-15T22:08:05.064Z -- Task `task_1776290454732_agqm8l` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 103478ms

![game-mobile](visuals/game-mobile-2026-04-15T22-06-21-577Z.png)

> No UI components are rendered; the screen is entirely black. This indicates a rendering error or missing content for the "#game" route.

---

## 2026-04-15T22:09:14.320Z -- Task `task_1776290760810_bjl61p` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 16059ms

![home-desktop](visuals/home-desktop-2026-04-15T22-08-58-242Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T22:09:30.444Z -- Task `task_1776290760810_bjl61p` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 16091ms

![home-mobile](visuals/home-mobile-2026-04-15T22-09-14-342Z.png)

> No UI elements are visible; the screen is entirely black, indicating a rendering issue or missing content.

---

## 2026-04-15T22:09:38.043Z -- Task `task_1776290760810_bjl61p` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 7578ms

![auth-desktop](visuals/auth-desktop-2026-04-15T22-09-30-449Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render for route "#auth".

---

## 2026-04-15T22:09:50.039Z -- Task `task_1776290760810_bjl61p` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 11993ms

![auth-mobile](visuals/auth-mobile-2026-04-15T22-09-38-045Z.png)

> No visible components are rendered; the screen is entirely black. Error: UI failed to render content for the #auth route.

---

## 2026-04-15T22:09:56.886Z -- Task `task_1776290760810_bjl61p` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 6831ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T22-09-50-050Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered for route "#dashboard".

---

## 2026-04-15T22:10:06.902Z -- Task `task_1776290760810_bjl61p` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 10012ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T22-09-56-889Z.png)

> No visible components; the screen is entirely black, indicating a rendering issue or empty state.

---

## 2026-04-15T22:10:12.442Z -- Task `task_1776290760810_bjl61p` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 5539ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T22-10-06-902Z.png)

> No UI components are visible; the screen is entirely black. The UI fails to render for the "#lobby" route on desktop 1280x720.

---

## 2026-04-15T22:10:18.955Z -- Task `task_1776290760810_bjl61p` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 6509ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T22-10-12-444Z.png)

> No visible components; the screen is entirely black, indicating a rendering issue or empty state.

---

## 2026-04-15T22:10:27.149Z -- Task `task_1776290760810_bjl61p` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 8186ms

![profile-desktop](visuals/profile-desktop-2026-04-15T22-10-18-963Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T22:10:50.764Z -- Task `task_1776290760810_bjl61p` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 23601ms

![profile-mobile](visuals/profile-mobile-2026-04-15T22-10-27-162Z.png)

> No UI components are visible; the screen is entirely black. Error: Content for the #profile route failed to render or display properly.

---

## 2026-04-15T22:11:02.248Z -- Task `task_1776290760810_bjl61p` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 11476ms

![friends-desktop](visuals/friends-desktop-2026-04-15T22-10-50-771Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T22:11:09.139Z -- Task `task_1776290760810_bjl61p` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 6886ms

![friends-mobile](visuals/friends-mobile-2026-04-15T22-11-02-253Z.png)

> No UI components are visible; the screen is entirely black, indicating a potential rendering error or empty state.

---

## 2026-04-15T22:11:35.293Z -- Task `task_1776290760810_bjl61p` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 26123ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T22-11-09-147Z.png)

> No UI components are visible; the screen is entirely black. Error: Leaderboard content failed to render.

---

## 2026-04-15T22:12:35.919Z -- Task `task_1776290760810_bjl61p` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 60590ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T22-11-35-326Z.png)

> No, the UI is not rendered. No visible components; error is complete lack of displayed content.

---

## 2026-04-15T22:12:43.270Z -- Task `task_1776290760810_bjl61p` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 7325ms

![game-desktop](visuals/game-desktop-2026-04-15T22-12-35-925Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no elements displayed).

---

## 2026-04-15T22:12:50.316Z -- Task `task_1776290760810_bjl61p` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 7018ms

![game-mobile](visuals/game-mobile-2026-04-15T22-12-43-288Z.png)

> No, the UI is not rendered—only a solid black screen is visible. No components are displayed, indicating a rendering issue.

---

## 2026-04-15T22:13:07.245Z -- Task `task_1776291047398_bq2w91` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 12586ms

![home-desktop](visuals/home-desktop-2026-04-15T22-12-54-659Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T22:13:15.093Z -- Task `task_1776291047398_bq2w91` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 7844ms

![home-mobile](visuals/home-mobile-2026-04-15T22-13-07-249Z.png)

> No, the UI is not rendered—no visible components appear. Error: Entire screen is black, indicating a rendering failure or missing content.

---

## 2026-04-15T22:13:23.552Z -- Task `task_1776291047398_bq2w91` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 8322ms

![auth-desktop](visuals/auth-desktop-2026-04-15T22-13-15-151Z.png)

> No visible components; the screen is entirely black. Error: UI failed to render (blank/black screen).

---

## 2026-04-15T22:13:32.956Z -- Task `task_1776291047398_bq2w91` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 9333ms

![auth-mobile](visuals/auth-mobile-2026-04-15T22-13-23-614Z.png)

> No visible components are rendered; the screen is entirely black. Error: UI failed to render content for the #auth route.

---

## 2026-04-15T22:13:39.005Z -- Task `task_1776291047398_bq2w91` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 6026ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T22-13-32-968Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered.

---

## 2026-04-15T22:13:45.003Z -- Task `task_1776291047398_bq2w91` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 5997ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T22-13-39-006Z.png)

> No visible components; UI not rendered (all-black screen).

---

## 2026-04-15T22:13:50.472Z -- Task `task_1776291047398_bq2w91` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 5459ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T22-13-45-013Z.png)

> No UI components are visible; the screen is entirely black. The UI fails to render for the "#lobby" route on desktop 1280x720.

---

## 2026-04-15T22:14:04.794Z -- Task `task_1776291047398_bq2w91` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 14291ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T22-13-50-497Z.png)

> No visible components; UI not rendered (blank screen).

---

## 2026-04-15T22:14:16.223Z -- Task `task_1776291047398_bq2w91` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 11387ms

![profile-desktop](visuals/profile-desktop-2026-04-15T22-14-04-825Z.png)

> No UI components are visible; the screen is entirely black. The UI failed to render for the "#profile" route on desktop 1280x720.

---

## 2026-04-15T22:14:38.156Z -- Task `task_1776291047398_bq2w91` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 21927ms

![profile-mobile](visuals/profile-mobile-2026-04-15T22-14-16-229Z.png)

> No visible components; the screen is entirely black, indicating a rendering issue or missing content.

---

## 2026-04-15T22:14:47.151Z -- Task `task_1776291047398_bq2w91` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 8989ms

![friends-desktop](visuals/friends-desktop-2026-04-15T22-14-38-162Z.png)

> No UI elements are visible; the screen is entirely black. Error: Content failed to render (blank/black screen).

---

## 2026-04-15T22:14:52.830Z -- Task `task_1776291047398_bq2w91` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 5678ms

![friends-mobile](visuals/friends-mobile-2026-04-15T22-14-47-152Z.png)

> No visible components are rendered; the screen is entirely black. This indicates a rendering error where the UI content failed to display.

---

## 2026-04-15T22:15:10.316Z -- Task `task_1776291047398_bq2w91` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 17430ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T22-14-52-837Z.png)

> No UI components are rendered; the screen is entirely black. Error: Content failed to load or render for the leaderboard route.

---

## 2026-04-15T22:15:34.822Z -- Task `task_1776291047398_bq2w91` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 24460ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T22-15-10-362Z.png)

> No visible components are rendered; the screen is entirely black. Error: UI failed to render content for the leaderboard route.

---

## 2026-04-15T22:15:44.305Z -- Task `task_1776291047398_bq2w91` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 9431ms

![game-desktop](visuals/game-desktop-2026-04-15T22-15-34-874Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T22:15:50.322Z -- Task `task_1776291047398_bq2w91` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 5990ms

![game-mobile](visuals/game-mobile-2026-04-15T22-15-44-331Z.png)

> No visible components; UI not rendered (black screen).

---

## 2026-04-15T22:16:18.245Z -- Task `task_1776291286463_1r01w0` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 16106ms

![home-desktop](visuals/home-desktop-2026-04-15T22-16-02-129Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T22:16:35.457Z -- Task `task_1776291286463_1r01w0` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 17154ms

![home-mobile](visuals/home-mobile-2026-04-15T22-16-18-262Z.png)

> No UI elements are visible; the screen is entirely black. Error: No content rendered for the specified route and device dimensions.

---

## 2026-04-15T22:16:50.548Z -- Task `task_1776291286463_1r01w0` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 14929ms

![auth-desktop](visuals/auth-desktop-2026-04-15T22-16-35-596Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank screen).

---

## 2026-04-15T22:17:00.352Z -- Task `task_1776291286463_1r01w0` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 9675ms

![auth-mobile](visuals/auth-mobile-2026-04-15T22-16-50-595Z.png)

> No visible components; UI not rendered (blank screen). Error: Content fails to load/display.

---

## 2026-04-15T22:17:09.334Z -- Task `task_1776291286463_1r01w0` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 8927ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T22-17-00-406Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T22:17:14.603Z -- Task `task_1776291286463_1r01w0` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 5267ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T22-17-09-335Z.png)

> No visible components; the screen is entirely black, indicating a rendering error or missing content.

---

## 2026-04-15T22:17:27.762Z -- Task `task_1776291286463_1r01w0` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 13151ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T22-17-14-608Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank/black screen).

---

## 2026-04-15T22:17:40.714Z -- Task `task_1776291286463_1r01w0` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 12912ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T22-17-27-802Z.png)

> No visible components; UI not rendered (entirely black screen). Error: Content fails to display on route "#lobby".

---

## 2026-04-15T22:17:46.408Z -- Task `task_1776291286463_1r01w0` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 5685ms

![profile-desktop](visuals/profile-desktop-2026-04-15T22-17-40-723Z.png)

> No UI elements are visible; the screen is entirely black, indicating a rendering issue or missing content.

---

## 2026-04-15T22:17:52.519Z -- Task `task_1776291286463_1r01w0` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 6110ms

![profile-mobile](visuals/profile-mobile-2026-04-15T22-17-46-409Z.png)

> No visible components; the screen is entirely black, indicating a rendering issue or empty state.

---

## 2026-04-15T22:17:58.342Z -- Task `task_1776291286463_1r01w0` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 5823ms

![friends-desktop](visuals/friends-desktop-2026-04-15T22-17-52-519Z.png)

> No, the UI is not rendered—only a blank black screen is visible. No components are displayed; this indicates a rendering issue or missing content.

---

## 2026-04-15T22:18:35.254Z -- Task `task_1776291286463_1r01w0` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 36912ms

![friends-mobile](visuals/friends-mobile-2026-04-15T22-17-58-342Z.png)

> No visible components are rendered; the screen is entirely black. Error: UI fails to display content (black screen suggests rendering or loading issue).

---

## 2026-04-15T22:19:08.207Z -- Task `task_1776291286463_1r01w0` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 32836ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T22-18-35-369Z.png)

> No UI components are visible; the screen is entirely black. Likely a rendering error (e.g., failed to load leaderboard content).

---

## 2026-04-15T22:20:47.600Z -- Task `task_1776291286463_1r01w0` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 99373ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T22-19-08-213Z.png)

> No visible components; the screen is entirely black. Error: UI not rendered or content missing.

---

## 2026-04-15T22:23:16.313Z -- Task `task_1776291286463_1r01w0` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 148599ms

![game-desktop](visuals/game-desktop-2026-04-15T22-20-47-636Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank screen).

---

## 2026-04-15T22:25:40.923Z -- Task `task_1776291286463_1r01w0` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 144471ms

![game-mobile](visuals/game-mobile-2026-04-15T22-23-16-436Z.png)

> No UI components are rendered; the screen is entirely black. This indicates a rendering error where no visible elements are displayed.

---

## 2026-04-15T22:33:27.543Z -- Task `task_1776291467475_rfljtq` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 6704ms

![home-desktop](visuals/home-desktop-2026-04-15T22-33-20-839Z.png)

> No, the UI is not rendered (entirely black screen). No visible components; error likely due to failed loading/rendering.

---

## 2026-04-15T22:33:32.470Z -- Task `task_1776291467475_rfljtq` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 4926ms

![home-mobile](visuals/home-mobile-2026-04-15T22-33-27-544Z.png)

> No visible components; the UI appears unrendered (black screen). Error: No content displayed on the specified route and device.

---

## 2026-04-15T22:33:37.050Z -- Task `task_1776291467475_rfljtq` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4579ms

![auth-desktop](visuals/auth-desktop-2026-04-15T22-33-32-471Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T22:33:41.111Z -- Task `task_1776291467475_rfljtq` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 4060ms

![auth-mobile](visuals/auth-mobile-2026-04-15T22-33-37-051Z.png)

> No visible components; UI not rendered (all-black screen indicates rendering issue).

---

## 2026-04-15T22:33:46.371Z -- Task `task_1776291467475_rfljtq` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 5259ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T22-33-41-112Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T22:33:50.829Z -- Task `task_1776291467475_rfljtq` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4457ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T22-33-46-372Z.png)

> No, the UI is not rendered. No visible components; error is that the screen displays as entirely black with no content.

---

## 2026-04-15T22:33:55.179Z -- Task `task_1776291467475_rfljtq` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4350ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T22-33-50-829Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank screen).

---

## 2026-04-15T22:34:07.878Z -- Task `task_1776291467475_rfljtq` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 12698ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T22-33-55-180Z.png)

> No visible components are rendered; the screen is entirely black. Error: UI not displayed (blank/black screen).

---

## 2026-04-15T22:34:12.187Z -- Task `task_1776291467475_rfljtq` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4308ms

![profile-desktop](visuals/profile-desktop-2026-04-15T22-34-07-879Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (blank screen).

---

## 2026-04-15T22:34:16.785Z -- Task `task_1776291467475_rfljtq` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4596ms

![profile-mobile](visuals/profile-mobile-2026-04-15T22-34-12-189Z.png)

> No visible components; the screen is entirely black, indicating a rendering error or missing content.

---

## 2026-04-15T22:34:22.914Z -- Task `task_1776291467475_rfljtq` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 6128ms

![friends-desktop](visuals/friends-desktop-2026-04-15T22-34-16-786Z.png)

> No, the UI is not rendered; the screen is entirely black with no visible components. Errors include a blank display, indicating a potential rendering failure or missing content.

---

## 2026-04-15T22:34:26.720Z -- Task `task_1776291467475_rfljtq` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 3805ms

![friends-mobile](visuals/friends-mobile-2026-04-15T22-34-22-915Z.png)

> No visible components; UI not rendered (black screen). Error: Content fails to load/display.

---

## 2026-04-15T22:34:33.100Z -- Task `task_1776291467475_rfljtq` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 6380ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T22-34-26-720Z.png)

> No visible UI components; the screen is entirely black, indicating the UI was not rendered. Errors include failure to display any leaderboard-related elements or interface.

---

## 2026-04-15T22:34:37.775Z -- Task `task_1776291467475_rfljtq` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4674ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T22-34-33-100Z.png)

> The UI is not rendered as no visible components are present. No components are displayed, indicating a potential rendering issue or empty state.

---

## 2026-04-15T22:34:42.388Z -- Task `task_1776291467475_rfljtq` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4613ms

![game-desktop](visuals/game-desktop-2026-04-15T22-34-37-775Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T22:34:46.194Z -- Task `task_1776291467475_rfljtq` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 3806ms

![game-mobile](visuals/game-mobile-2026-04-15T22-34-42-388Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering error or missing content.

---

## 2026-04-15T22:35:43.523Z -- Task `task_1776292497954_sp673a` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4436ms

![home-desktop](visuals/home-desktop-2026-04-15T22-35-39-087Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T22:35:47.839Z -- Task `task_1776292497954_sp673a` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 4314ms

![home-mobile](visuals/home-mobile-2026-04-15T22-35-43-525Z.png)

> No visible components are rendered. The UI appears completely blank, indicating a rendering error.

---

## 2026-04-15T22:36:01.675Z -- Task `task_1776292497954_sp673a` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 13835ms

![auth-desktop](visuals/auth-desktop-2026-04-15T22-35-47-840Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank/black screen).

---

## 2026-04-15T22:36:07.279Z -- Task `task_1776292497954_sp673a` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 5603ms

![auth-mobile](visuals/auth-mobile-2026-04-15T22-36-01-676Z.png)

> The UI is not rendered; the screen is entirely black with no visible components. No errors can be identified as there are no elements to assess.

---

## 2026-04-15T22:36:11.624Z -- Task `task_1776292497954_sp673a` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4344ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T22-36-07-280Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T22:36:15.984Z -- Task `task_1776292497954_sp673a` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 4360ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T22-36-11-624Z.png)

> No, the UI is not rendered—only a black screen is visible. No components are displayed, indicating a rendering issue.

---

## 2026-04-15T22:36:27.967Z -- Task `task_1776292497954_sp673a` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 11982ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T22-36-15-985Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank/black screen).

---

## 2026-04-15T22:36:32.678Z -- Task `task_1776292497954_sp673a` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4711ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T22-36-27-967Z.png)

> No UI components are visible; the screen is entirely black. The UI fails to render, indicating a display or loading issue.

---

## 2026-04-15T22:36:37.272Z -- Task `task_1776292497954_sp673a` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4593ms

![profile-desktop](visuals/profile-desktop-2026-04-15T22-36-32-679Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T22:36:42.899Z -- Task `task_1776292497954_sp673a` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 5626ms

![profile-mobile](visuals/profile-mobile-2026-04-15T22-36-37-273Z.png)

> No UI components are visible; the screen is entirely black. Error: Content not rendered or missing for the #profile route.

---

## 2026-04-15T22:36:47.633Z -- Task `task_1776292497954_sp673a` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 4733ms

![friends-desktop](visuals/friends-desktop-2026-04-15T22-36-42-900Z.png)

> No visible components; UI not rendered (black screen). Error: Content failed to load or render.

---

## 2026-04-15T22:36:51.910Z -- Task `task_1776292497954_sp673a` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 4276ms

![friends-mobile](visuals/friends-mobile-2026-04-15T22-36-47-634Z.png)

> No visible components; the screen is entirely black, indicating a rendering error or missing content.

---

## 2026-04-15T22:36:56.128Z -- Task `task_1776292497954_sp673a` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4217ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T22-36-51-911Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T22:37:00.742Z -- Task `task_1776292497954_sp673a` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 4614ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T22-36-56-128Z.png)

> No, the UI is not rendered—only a black screen is visible. No components are displayed, indicating a rendering issue.

---

## 2026-04-15T22:37:04.800Z -- Task `task_1776292497954_sp673a` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4057ms

![game-desktop](visuals/game-desktop-2026-04-15T22-37-00-743Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no elements displayed).

---

## 2026-04-15T22:37:08.846Z -- Task `task_1776292497954_sp673a` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 4046ms

![game-mobile](visuals/game-mobile-2026-04-15T22-37-04-800Z.png)

> No, the UI is not rendered—only a solid black screen is visible. No components are displayed, indicating a rendering issue.

---

## 2026-04-15T22:38:10.780Z -- Task `task_1776292636867_6wg7dv` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4419ms

![home-desktop](visuals/home-desktop-2026-04-15T22-38-06-361Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T22:38:15.211Z -- Task `task_1776292636867_6wg7dv` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4429ms

![home-mobile](visuals/home-mobile-2026-04-15T22-38-10-782Z.png)

> No UI elements are visible; the screen is entirely black, indicating a rendering issue or missing content.

---

## 2026-04-15T22:38:19.263Z -- Task `task_1776292636867_6wg7dv` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4050ms

![auth-desktop](visuals/auth-desktop-2026-04-15T22-38-15-212Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render for route "#auth".

---

## 2026-04-15T22:38:23.960Z -- Task `task_1776292636867_6wg7dv` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4697ms

![auth-mobile](visuals/auth-mobile-2026-04-15T22-38-19-263Z.png)

> No visible components; screen is entirely black. Error—UI not rendered (no content displayed).

---

## 2026-04-15T22:38:28.088Z -- Task `task_1776292636867_6wg7dv` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4127ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T22-38-23-961Z.png)

> No UI is rendered; the screen is entirely black. No visible components, indicating a rendering or loading issue.

---

## 2026-04-15T22:38:32.661Z -- Task `task_1776292636867_6wg7dv` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4573ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T22-38-28-088Z.png)

> No UI components are visible; the screen is entirely black. The UI failed to render, indicating an error in displaying the dashboard content.

---

## 2026-04-15T22:38:36.586Z -- Task `task_1776292636867_6wg7dv` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 3925ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T22-38-32-661Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank/black screen).

---

## 2026-04-15T22:38:43.172Z -- Task `task_1776292636867_6wg7dv` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 6585ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T22-38-36-587Z.png)

> No visible components are rendered; the screen is entirely black. This indicates a rendering error as expected UI elements for the "#lobby" route are missing.

---

## 2026-04-15T22:38:47.399Z -- Task `task_1776292636867_6wg7dv` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4226ms

![profile-desktop](visuals/profile-desktop-2026-04-15T22-38-43-173Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T22:38:51.405Z -- Task `task_1776292636867_6wg7dv` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 4006ms

![profile-mobile](visuals/profile-mobile-2026-04-15T22-38-47-399Z.png)

> No visible components; UI not rendered (all-black screen). Error: Content failed to load or render.

---

## 2026-04-15T22:38:57.478Z -- Task `task_1776292636867_6wg7dv` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 6071ms

![friends-desktop](visuals/friends-desktop-2026-04-15T22-38-51-406Z.png)

> No UI elements are visible; the screen is entirely black. Error: Content for the #friends route failed to render or load.

---

## 2026-04-15T22:39:01.350Z -- Task `task_1776292636867_6wg7dv` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 3872ms

![friends-mobile](visuals/friends-mobile-2026-04-15T22-38-57-478Z.png)

> No visible components; UI not rendered (blank screen).

---

## 2026-04-15T22:39:05.773Z -- Task `task_1776292636867_6wg7dv` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4422ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T22-39-01-351Z.png)

> No UI components are rendered; the screen is entirely black. Error: No visible elements or content displayed for the leaderboard route.

---

## 2026-04-15T22:39:10.268Z -- Task `task_1776292636867_6wg7dv` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4494ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T22-39-05-774Z.png)

> No visible components; screen is entirely black. Error—UI not rendered (no content displayed).

---

## 2026-04-15T22:39:14.374Z -- Task `task_1776292636867_6wg7dv` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4105ms

![game-desktop](visuals/game-desktop-2026-04-15T22-39-10-269Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T22:39:18.368Z -- Task `task_1776292636867_6wg7dv` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 3994ms

![game-mobile](visuals/game-mobile-2026-04-15T22-39-14-374Z.png)

> No UI components are visible; the screen is entirely black. Error: Blank screen (no content rendered).

---

## 2026-04-15T22:40:07.523Z -- Task `task_1776292777314_k1f2h7` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 5217ms

![home-desktop](visuals/home-desktop-2026-04-15T22-40-02-306Z.png)

> No UI components are rendered; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T22:40:12.814Z -- Task `task_1776292777314_k1f2h7` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 5290ms

![home-mobile](visuals/home-mobile-2026-04-15T22-40-07-524Z.png)

> No, the UI is not rendered; no visible components are present. Possible error: Blank screen indicating missing or failed content rendering.

---

## 2026-04-15T22:40:17.269Z -- Task `task_1776292777314_k1f2h7` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4455ms

![auth-desktop](visuals/auth-desktop-2026-04-15T22-40-12-814Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render for route "#auth".

---

## 2026-04-15T22:40:22.288Z -- Task `task_1776292777314_k1f2h7` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 5018ms

![auth-mobile](visuals/auth-mobile-2026-04-15T22-40-17-270Z.png)

> No visible components; screen is entirely black. Error—UI not rendered (no content displayed).

---

## 2026-04-15T22:40:26.917Z -- Task `task_1776292777314_k1f2h7` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4628ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T22-40-22-289Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T22:40:30.830Z -- Task `task_1776292777314_k1f2h7` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 3913ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T22-40-26-917Z.png)

> No visible components; UI not rendered (all-black screen indicates rendering failure).

---

## 2026-04-15T22:40:35.085Z -- Task `task_1776292777314_k1f2h7` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4255ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T22-40-30-830Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T22:40:39.584Z -- Task `task_1776292777314_k1f2h7` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4498ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T22-40-35-086Z.png)

> No visible components are rendered; the screen is entirely black. This indicates a rendering error where the UI fails to display any elements for the "#lobby" route on mobile 375x812.

---

## 2026-04-15T22:40:43.877Z -- Task `task_1776292777314_k1f2h7` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4292ms

![profile-desktop](visuals/profile-desktop-2026-04-15T22-40-39-585Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (blank/black screen).

---

## 2026-04-15T22:40:48.380Z -- Task `task_1776292777314_k1f2h7` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4502ms

![profile-mobile](visuals/profile-mobile-2026-04-15T22-40-43-878Z.png)

> No visible components are rendered; the screen is entirely black. The UI fails to display any content for the "#profile" route.

---

## 2026-04-15T22:40:54.117Z -- Task `task_1776292777314_k1f2h7` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 5736ms

![friends-desktop](visuals/friends-desktop-2026-04-15T22-40-48-381Z.png)

> The UI is not rendered; the screen is entirely black with no visible components. Error: Blank/black screen indicates failed rendering or missing content.

---

## 2026-04-15T22:40:58.213Z -- Task `task_1776292777314_k1f2h7` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 4095ms

![friends-mobile](visuals/friends-mobile-2026-04-15T22-40-54-118Z.png)

> No visible components; UI not rendered (blank screen).

---

## 2026-04-15T22:41:12.550Z -- Task `task_1776292777314_k1f2h7` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 14336ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T22-40-58-214Z.png)

> No UI components are visible; the screen is entirely black. Error: Leaderboard content failed to render or load.

---

## 2026-04-15T22:41:16.749Z -- Task `task_1776292777314_k1f2h7` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4198ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T22-41-12-551Z.png)

> No visible components are rendered; the screen is entirely black, indicating a failure to display the leaderboard UI.

---

## 2026-04-15T22:41:21.665Z -- Task `task_1776292777314_k1f2h7` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4914ms

![game-desktop](visuals/game-desktop-2026-04-15T22-41-16-750Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T22:41:25.396Z -- Task `task_1776292777314_k1f2h7` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 3731ms

![game-mobile](visuals/game-mobile-2026-04-15T22-41-21-665Z.png)

> No visible components; screen is entirely black. Error: UI not rendered (blank display).

---

## 2026-04-15T22:42:00.681Z -- Task `task_1776292894582_q8ys6m` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 3988ms

![home-desktop](visuals/home-desktop-2026-04-15T22-41-56-693Z.png)

> No UI components are rendered; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T22:42:06.006Z -- Task `task_1776292894582_q8ys6m` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 5323ms

![home-mobile](visuals/home-mobile-2026-04-15T22-42-00-683Z.png)

> No, the UI is not rendered—only a black screen is visible with no components displayed. Error: No content loaded or rendered for the specified route and device.

---

## 2026-04-15T22:42:10.309Z -- Task `task_1776292894582_q8ys6m` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4303ms

![auth-desktop](visuals/auth-desktop-2026-04-15T22-42-06-006Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T22:42:22.801Z -- Task `task_1776292894582_q8ys6m` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 12491ms

![auth-mobile](visuals/auth-mobile-2026-04-15T22-42-10-310Z.png)

> No UI components are visible; the screen is entirely black. Error: No content rendered for the #auth route.

---

## 2026-04-15T22:42:27.345Z -- Task `task_1776292894582_q8ys6m` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4543ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T22-42-22-802Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T22:42:32.836Z -- Task `task_1776292894582_q8ys6m` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 5490ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T22-42-27-346Z.png)

> No UI components are visible; the screen is entirely black. This indicates a rendering error or missing content for the dashboard route.

---

## 2026-04-15T22:42:37.274Z -- Task `task_1776292894582_q8ys6m` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4437ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T22-42-32-837Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank screen).

---

## 2026-04-15T22:42:41.212Z -- Task `task_1776292894582_q8ys6m` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 3937ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T22-42-37-275Z.png)

> No, the UI is not rendered. Visible components: none; error: blank/black screen with no content displayed.

---

## 2026-04-15T22:42:45.962Z -- Task `task_1776292894582_q8ys6m` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 4749ms

![profile-desktop](visuals/profile-desktop-2026-04-15T22-42-41-213Z.png)

> No, the UI is not rendered—only a black screen is visible. No components are displayed; this indicates a rendering issue or missing content.

---

## 2026-04-15T22:42:55.996Z -- Task `task_1776292894582_q8ys6m` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 10034ms

![profile-mobile](visuals/profile-mobile-2026-04-15T22-42-45-962Z.png)

> No visible components are rendered; the screen is entirely black. Error: UI content not displayed, indicating a rendering issue or missing assets.

---

## 2026-04-15T22:43:09.703Z -- Task `task_1776292894582_q8ys6m` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 13707ms

![friends-desktop](visuals/friends-desktop-2026-04-15T22-42-55-996Z.png)

> No visible UI components are rendered (only a black screen). Possible rendering error or missing content for the #friends route.

---

## 2026-04-15T22:43:22.985Z -- Task `task_1776292894582_q8ys6m` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 13282ms

![friends-mobile](visuals/friends-mobile-2026-04-15T22-43-09-703Z.png)

> No UI components are visible; the screen is entirely black. Error: The UI failed to render or display any content.

---

## 2026-04-15T22:43:27.736Z -- Task `task_1776292894582_q8ys6m` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4750ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T22-43-22-986Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank screen).

---

## 2026-04-15T22:43:33.359Z -- Task `task_1776292894582_q8ys6m` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 5623ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T22-43-27-736Z.png)

> No, the UI is not rendered—the screen is entirely black with no visible components. Error: Blank/black screen suggests a rendering failure or missing content.

---

## 2026-04-15T22:43:38.173Z -- Task `task_1776292894582_q8ys6m` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4812ms

![game-desktop](visuals/game-desktop-2026-04-15T22-43-33-360Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T22:43:42.629Z -- Task `task_1776292894582_q8ys6m` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 4456ms

![game-mobile](visuals/game-mobile-2026-04-15T22-43-38-173Z.png)

> No, the UI is not rendered—only a black screen is visible with no components displayed. Error: No content loaded or rendered for the #game route.

---

## 2026-04-15T22:46:07.991Z -- Task `task_1776293019133_ze4vhe` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4760ms

![home-desktop](visuals/home-desktop-2026-04-15T22-46-03-231Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T22:46:12.702Z -- Task `task_1776293019133_ze4vhe` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 4709ms

![home-mobile](visuals/home-mobile-2026-04-15T22-46-07-993Z.png)

> No visible components; UI appears as a solid black screen, indicating a rendering error or missing content.

---

## 2026-04-15T22:46:17.310Z -- Task `task_1776293019133_ze4vhe` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4607ms

![auth-desktop](visuals/auth-desktop-2026-04-15T22-46-12-703Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T22:46:21.303Z -- Task `task_1776293019133_ze4vhe` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 3992ms

![auth-mobile](visuals/auth-mobile-2026-04-15T22-46-17-311Z.png)

> No visible components; UI not rendered (all-black screen).

---

## 2026-04-15T22:46:32.901Z -- Task `task_1776293019133_ze4vhe` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 11598ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T22-46-21-303Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered for route "#dashboard".

---

## 2026-04-15T22:46:38.098Z -- Task `task_1776293019133_ze4vhe` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 5196ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T22-46-32-902Z.png)

> No UI components are visible; the screen is entirely black. The UI failed to render, showing a blank (black) state instead of dashboard elements.

---

## 2026-04-15T22:46:43.249Z -- Task `task_1776293019133_ze4vhe` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 5149ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T22-46-38-100Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank/black screen).

---

## 2026-04-15T22:46:47.826Z -- Task `task_1776293019133_ze4vhe` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4576ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T22-46-43-250Z.png)

> No visible components are rendered; the screen is entirely black. Error: UI not displayed (blank screen).

---

## 2026-04-15T22:46:53.278Z -- Task `task_1776293019133_ze4vhe` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 5451ms

![profile-desktop](visuals/profile-desktop-2026-04-15T22-46-47-827Z.png)

> No visible components; UI not rendered (blank screen). Possible error: Content failed to load/render.

---

## 2026-04-15T22:46:58.682Z -- Task `task_1776293019133_ze4vhe` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 5402ms

![profile-mobile](visuals/profile-mobile-2026-04-15T22-46-53-279Z.png)

> No UI components are visible; the screen is entirely black. Error: No content is rendered for the "#profile" route.

---

## 2026-04-15T22:47:04.108Z -- Task `task_1776293019133_ze4vhe` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 5426ms

![friends-desktop](visuals/friends-desktop-2026-04-15T22-46-58-682Z.png)

> No visible UI components are rendered; the screen is entirely black. Error: The page appears blank, indicating potential rendering issues or missing content for the #friends route.

---

## 2026-04-15T22:47:17.831Z -- Task `task_1776293019133_ze4vhe` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 13722ms

![friends-mobile](visuals/friends-mobile-2026-04-15T22-47-04-109Z.png)

> No UI elements are rendered; the screen is entirely black. Visible components: none. Error: Blank screen indicates failed rendering or missing content.

---

## 2026-04-15T22:47:23.158Z -- Task `task_1776293019133_ze4vhe` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 5326ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T22-47-17-832Z.png)

> No UI components are rendered; the screen is entirely black. Error: No visible elements or content displayed for the leaderboard route.

---

## 2026-04-15T22:47:27.355Z -- Task `task_1776293019133_ze4vhe` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 4196ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T22-47-23-159Z.png)

> No visible components; UI not rendered (black screen).

---

## 2026-04-15T22:47:32.373Z -- Task `task_1776293019133_ze4vhe` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 5017ms

![game-desktop](visuals/game-desktop-2026-04-15T22-47-27-356Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T22:47:36.776Z -- Task `task_1776293019133_ze4vhe` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 4402ms

![game-mobile](visuals/game-mobile-2026-04-15T22-47-32-374Z.png)

> No, the UI is not rendered—only a black screen is visible. No components are displayed, indicating a rendering issue.

---

## 2026-04-15T22:48:40.985Z -- Task `task_1776293260035_rtqq5v` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 4539ms

![home-desktop](visuals/home-desktop-2026-04-15T22-48-36-445Z.png)

> No visible components; UI not rendered (black screen). Error: No content displayed.

---

## 2026-04-15T22:48:45.803Z -- Task `task_1776293260035_rtqq5v` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 4817ms

![home-mobile](visuals/home-mobile-2026-04-15T22-48-40-986Z.png)

> No visible components; UI appears as a solid black screen, indicating a rendering error or missing content.

---

## 2026-04-15T22:48:50.915Z -- Task `task_1776293260035_rtqq5v` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 5111ms

![auth-desktop](visuals/auth-desktop-2026-04-15T22-48-45-804Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering error or missing content for the #auth route.

---

## 2026-04-15T22:48:55.630Z -- Task `task_1776293260035_rtqq5v` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4714ms

![auth-mobile](visuals/auth-mobile-2026-04-15T22-48-50-916Z.png)

> No visible components are rendered; the screen is entirely black, indicating a rendering error for the "#auth" route.

---

## 2026-04-15T22:49:00.033Z -- Task `task_1776293260035_rtqq5v` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 4402ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T22-48-55-631Z.png)

> No, the UI is not rendered. No visible components; error: blank/black screen (no dashboard elements displayed).

---

## 2026-04-15T22:49:04.640Z -- Task `task_1776293260035_rtqq5v` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4606ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T22-49-00-034Z.png)

> No UI components are visible; the screen is entirely black. The UI failed to render, showing a blank (black) display with no interactive elements or content.

---

## 2026-04-15T22:49:08.838Z -- Task `task_1776293260035_rtqq5v` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4198ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T22-49-04-640Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T22:49:12.833Z -- Task `task_1776293260035_rtqq5v` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 3995ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T22-49-08-838Z.png)

> No visible components; UI not rendered (blank screen).

---

## 2026-04-15T22:49:17.953Z -- Task `task_1776293260035_rtqq5v` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 5120ms

![profile-desktop](visuals/profile-desktop-2026-04-15T22-49-12-833Z.png)

> No UI elements are visible; the screen is entirely black. This suggests a rendering failure or missing content for the #profile route.

---

## 2026-04-15T22:49:21.741Z -- Task `task_1776293260035_rtqq5v` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 3787ms

![profile-mobile](visuals/profile-mobile-2026-04-15T22-49-17-954Z.png)

> No visible components; UI not rendered (all-black screen).

---

## 2026-04-15T22:49:26.043Z -- Task `task_1776293260035_rtqq5v` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 4301ms

![friends-desktop](visuals/friends-desktop-2026-04-15T22-49-21-742Z.png)

> No UI components are visible; the screen is entirely black. The UI fails to render for the "#friends" route on desktop 1280x720.

---

## 2026-04-15T22:49:29.832Z -- Task `task_1776293260035_rtqq5v` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 3788ms

![friends-mobile](visuals/friends-mobile-2026-04-15T22-49-26-044Z.png)

> No visible components; UI not rendered (all-black screen).

---

## 2026-04-15T22:49:34.439Z -- Task `task_1776293260035_rtqq5v` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4606ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T22-49-29-833Z.png)

> No UI components are rendered; the screen is entirely black. Error: No visible elements or content displayed for the leaderboard route.

---

## 2026-04-15T22:49:38.333Z -- Task `task_1776293260035_rtqq5v` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 3893ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T22-49-34-440Z.png)

> No UI is rendered; the screen is entirely black. No visible components, error: blank display (no content loaded).

---

## 2026-04-15T22:49:42.858Z -- Task `task_1776293260035_rtqq5v` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4525ms

![game-desktop](visuals/game-desktop-2026-04-15T22-49-38-333Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T22:49:46.991Z -- Task `task_1776293260035_rtqq5v` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4133ms

![game-mobile](visuals/game-mobile-2026-04-15T22-49-42-858Z.png)

> No visible components are rendered; the screen is entirely black. Error: UI fails to display any content on the specified route.

---

## 2026-04-15T22:51:54.914Z -- Task `task_1776293396302_h5rzda` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4109ms

![home-desktop](visuals/home-desktop-2026-04-15T22-51-50-805Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T22:51:59.547Z -- Task `task_1776293396302_h5rzda` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4631ms

![home-mobile](visuals/home-mobile-2026-04-15T22-51-54-916Z.png)

> No UI elements are visible; the screen is entirely black. Likely a rendering error or missing content.

---

## 2026-04-15T22:52:03.784Z -- Task `task_1776293396302_h5rzda` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4236ms

![auth-desktop](visuals/auth-desktop-2026-04-15T22-51-59-548Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render for route "#auth".

---

## 2026-04-15T22:52:08.909Z -- Task `task_1776293396302_h5rzda` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 5124ms

![auth-mobile](visuals/auth-mobile-2026-04-15T22-52-03-785Z.png)

> No UI components are visible; the screen is entirely black. Error: The authentication page failed to render any content.

---

## 2026-04-15T22:52:13.081Z -- Task `task_1776293396302_h5rzda` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 4172ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T22-52-08-909Z.png)

> No, the UI is not rendered. No visible components; error: blank/black screen (no content displayed).

---

## 2026-04-15T22:52:18.521Z -- Task `task_1776293396302_h5rzda` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 5439ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T22-52-13-081Z.png)

> No UI elements are visible; the screen is entirely black. This indicates a rendering error or missing content for the dashboard route.

---

## 2026-04-15T22:52:23.819Z -- Task `task_1776293396302_h5rzda` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 5296ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T22-52-18-521Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank/black screen).

---

## 2026-04-15T22:52:27.924Z -- Task `task_1776293396302_h5rzda` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 4103ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T22-52-23-820Z.png)

> No visible components; UI not rendered. Error: Screen appears completely black with no content displayed.

---

## 2026-04-15T22:52:31.866Z -- Task `task_1776293396302_h5rzda` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 3942ms

![profile-desktop](visuals/profile-desktop-2026-04-15T22-52-27-924Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T22:52:35.592Z -- Task `task_1776293396302_h5rzda` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 3725ms

![profile-mobile](visuals/profile-mobile-2026-04-15T22-52-31-867Z.png)

> No visible components; UI not rendered (black screen).

---

## 2026-04-15T22:52:39.572Z -- Task `task_1776293396302_h5rzda` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 3980ms

![friends-desktop](visuals/friends-desktop-2026-04-15T22-52-35-592Z.png)

> No UI components are visible; the screen is entirely black. The UI failed to render for the "#friends" route on desktop 1280x720.

---

## 2026-04-15T22:52:44.281Z -- Task `task_1776293396302_h5rzda` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 4708ms

![friends-mobile](visuals/friends-mobile-2026-04-15T22-52-39-573Z.png)

> No, the UI is not rendered—only a black screen is visible. No components are displayed, indicating a rendering issue.

---

## 2026-04-15T22:52:49.651Z -- Task `task_1776293396302_h5rzda` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 5370ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T22-52-44-281Z.png)

> No UI elements are rendered; the screen is entirely black. Missing leaderboard-specific components (headers, rankings, scores) expected for this route.

---

## 2026-04-15T22:52:54.750Z -- Task `task_1776293396302_h5rzda` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 5099ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T22-52-49-651Z.png)

> No visible components are rendered; the screen is entirely black. Error: No UI elements or content displayed for the leaderboard route.

---

## 2026-04-15T22:52:58.750Z -- Task `task_1776293396302_h5rzda` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4000ms

![game-desktop](visuals/game-desktop-2026-04-15T22-52-54-750Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T22:53:02.633Z -- Task `task_1776293396302_h5rzda` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 3882ms

![game-mobile](visuals/game-mobile-2026-04-15T22-52-58-751Z.png)

> No visible components; UI not rendered (all-black screen). Error: Content fails to display.

---

## 2026-04-15T22:54:02.948Z -- Task `task_1776293593634_cc9xs1` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4188ms

![home-desktop](visuals/home-desktop-2026-04-15T22-53-58-759Z.png)

> No UI components are visible; the screen is entirely black, indicating a potential rendering error or missing content.

---

## 2026-04-15T22:54:06.531Z -- Task `task_1776293593634_cc9xs1` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 3582ms

![home-mobile](visuals/home-mobile-2026-04-15T22-54-02-949Z.png)

> No visible components; UI not rendered (black screen). Error: No content displayed.

---

## 2026-04-15T22:54:10.991Z -- Task `task_1776293593634_cc9xs1` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4459ms

![auth-desktop](visuals/auth-desktop-2026-04-15T22-54-06-532Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render for route "#auth".

---

## 2026-04-15T22:54:15.274Z -- Task `task_1776293593634_cc9xs1` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 4282ms

![auth-mobile](visuals/auth-mobile-2026-04-15T22-54-10-992Z.png)

> No visible components; UI not rendered (black screen indicates failure to display auth route elements).

---

## 2026-04-15T22:54:20.353Z -- Task `task_1776293593634_cc9xs1` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 5078ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T22-54-15-275Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T22:54:25.585Z -- Task `task_1776293593634_cc9xs1` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 5231ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T22-54-20-354Z.png)

> No, the UI is not rendered; the screen is entirely black with no visible components. Error: No content or elements are displayed, indicating a failure to render the dashboard interface.

---

## 2026-04-15T22:54:29.622Z -- Task `task_1776293593634_cc9xs1` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4037ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T22-54-25-585Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T22:54:33.746Z -- Task `task_1776293593634_cc9xs1` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4124ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T22-54-29-622Z.png)

> No visible components are rendered; the screen is entirely black. Error: No UI elements displayed on the route "#lobby".

---

## 2026-04-15T22:54:37.812Z -- Task `task_1776293593634_cc9xs1` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4065ms

![profile-desktop](visuals/profile-desktop-2026-04-15T22-54-33-747Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (blank/black screen).

---

## 2026-04-15T22:54:42.114Z -- Task `task_1776293593634_cc9xs1` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4301ms

![profile-mobile](visuals/profile-mobile-2026-04-15T22-54-37-813Z.png)

> No UI elements are visible; the screen is entirely black. The route likely failed to render any components, indicating a rendering error.

---

## 2026-04-15T22:54:47.288Z -- Task `task_1776293593634_cc9xs1` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 5173ms

![friends-desktop](visuals/friends-desktop-2026-04-15T22-54-42-115Z.png)

> No UI components are visible; the screen is entirely black. Error: Content for the #friends route failed to render or load.

---

## 2026-04-15T22:54:51.286Z -- Task `task_1776293593634_cc9xs1` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 3997ms

![friends-mobile](visuals/friends-mobile-2026-04-15T22-54-47-289Z.png)

> No visible components are rendered; the screen is entirely black, indicating a failure to display the UI for the "#friends" route.

---

## 2026-04-15T22:55:02.934Z -- Task `task_1776293593634_cc9xs1` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 11646ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T22-54-51-287Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank display).

---

## 2026-04-15T22:55:08.191Z -- Task `task_1776293593634_cc9xs1` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 5257ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T22-55-02-934Z.png)

> No UI components are visible; the screen is entirely black. Error: No content renders for the "#leaderboard" route.

---

## 2026-04-15T22:55:12.461Z -- Task `task_1776293593634_cc9xs1` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4269ms

![game-desktop](visuals/game-desktop-2026-04-15T22-55-08-192Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank display).

---

## 2026-04-15T22:55:16.721Z -- Task `task_1776293593634_cc9xs1` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4259ms

![game-mobile](visuals/game-mobile-2026-04-15T22-55-12-462Z.png)

> No UI elements are visible; the screen is entirely black. Error: No content rendered for the "#game" route.

---

## 2026-04-15T22:58:34.565Z -- Task `task_1776293726642_s2mxym` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 4844ms

![home-desktop](visuals/home-desktop-2026-04-15T22-58-29-721Z.png)

> No visible components; UI appears unrendered (blank/black screen).

---

## 2026-04-15T22:58:39.099Z -- Task `task_1776293726642_s2mxym` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4533ms

![home-mobile](visuals/home-mobile-2026-04-15T22-58-34-566Z.png)

> No UI elements are visible; the screen is entirely black. Error: No content rendered on the specified route and device.

---

## 2026-04-15T22:58:43.184Z -- Task `task_1776293726642_s2mxym` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4085ms

![auth-desktop](visuals/auth-desktop-2026-04-15T22-58-39-099Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T22:58:47.107Z -- Task `task_1776293726642_s2mxym` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 3922ms

![auth-mobile](visuals/auth-mobile-2026-04-15T22-58-43-185Z.png)

> No visible components are rendered; the screen is entirely black. This indicates a rendering error where the UI elements for the "#auth" route failed to display.

---

## 2026-04-15T22:58:51.248Z -- Task `task_1776293726642_s2mxym` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4140ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T22-58-47-108Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering error or missing content for the "#dashboard" route.

---

## 2026-04-15T22:58:54.859Z -- Task `task_1776293726642_s2mxym` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 3611ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T22-58-51-248Z.png)

> No visible components; UI not rendered (blank screen).

---

## 2026-04-15T22:58:58.877Z -- Task `task_1776293726642_s2mxym` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4018ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T22-58-54-859Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank/black screen).

---

## 2026-04-15T22:59:02.656Z -- Task `task_1776293726642_s2mxym` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 3774ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T22-58-58-882Z.png)

> No visible components are rendered. Error: The UI is not displayed (completely black screen).

---

## 2026-04-15T22:59:06.857Z -- Task `task_1776293726642_s2mxym` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4201ms

![profile-desktop](visuals/profile-desktop-2026-04-15T22-59-02-656Z.png)

> No UI elements are visible; the screen is entirely black. Error: No content rendered for the #profile route.

---

## 2026-04-15T22:59:11.425Z -- Task `task_1776293726642_s2mxym` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4568ms

![profile-mobile](visuals/profile-mobile-2026-04-15T22-59-06-857Z.png)

> No UI elements are visible; the screen is entirely black. The UI fails to render any content for the "#profile" route.

---

## 2026-04-15T22:59:16.142Z -- Task `task_1776293726642_s2mxym` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 4716ms

![friends-desktop](visuals/friends-desktop-2026-04-15T22-59-11-426Z.png)

> No UI elements are rendered; the screen is entirely black. Error: No content or components displayed for the #friends route.

---

## 2026-04-15T22:59:21.105Z -- Task `task_1776293726642_s2mxym` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 4962ms

![friends-mobile](visuals/friends-mobile-2026-04-15T22-59-16-143Z.png)

> No UI components are rendered (screen is entirely black). Error: No visible elements for the "#friends" route.

---

## 2026-04-15T22:59:25.997Z -- Task `task_1776293726642_s2mxym` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4891ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T22-59-21-106Z.png)

> No UI components are rendered; the screen is entirely black. Error: No visible elements or content for the leaderboard route.

---

## 2026-04-15T22:59:30.703Z -- Task `task_1776293726642_s2mxym` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4706ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T22-59-25-997Z.png)

> No visible components are rendered; the screen is entirely black. Error: No UI elements display, indicating a rendering issue.

---

## 2026-04-15T22:59:35.271Z -- Task `task_1776293726642_s2mxym` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 4567ms

![game-desktop](visuals/game-desktop-2026-04-15T22-59-30-704Z.png)

> No, the UI is not rendered—no visible components are present. Error: No UI elements are displayed on the screen.

---

## 2026-04-15T22:59:38.983Z -- Task `task_1776293726642_s2mxym` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 3709ms

![game-mobile](visuals/game-mobile-2026-04-15T22-59-35-274Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T23:08:49.028Z -- Task `task_1776293999408_pehgi9` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 9310ms

![home-desktop](visuals/home-desktop-2026-04-15T23-08-39-718Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T23:08:52.663Z -- Task `task_1776293999408_pehgi9` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 3634ms

![home-mobile](visuals/home-mobile-2026-04-15T23-08-49-029Z.png)

> No, the UI is not rendered—no visible components appear. Error: Entire screen is black, indicating a rendering failure or missing content.

---

## 2026-04-15T23:09:13.086Z -- Task `task_1776293999408_pehgi9` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 20422ms

![auth-desktop](visuals/auth-desktop-2026-04-15T23-08-52-664Z.png)

> No UI components are visible; the screen displays as entirely black. Error: The authentication page did not render any content (blank/black screen).

---

## 2026-04-15T23:09:17.800Z -- Task `task_1776293999408_pehgi9` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4709ms

![auth-mobile](visuals/auth-mobile-2026-04-15T23-09-13-091Z.png)

> The UI is not rendered; the screen is entirely black with no visible components. Error: No content displayed for the "#auth" route on mobile 375x812.

---

## 2026-04-15T23:09:22.517Z -- Task `task_1776293999408_pehgi9` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4715ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T23-09-17-802Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered for route "#dashboard".

---

## 2026-04-15T23:09:27.569Z -- Task `task_1776293999408_pehgi9` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 5050ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T23-09-22-518Z.png)

> No visible components; the screen is entirely black. Error—UI not rendered (blank/black screen indicates failure to load content).

---

## 2026-04-15T23:09:31.665Z -- Task `task_1776293999408_pehgi9` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4096ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T23-09-27-569Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank/black screen).

---

## 2026-04-15T23:09:35.345Z -- Task `task_1776293999408_pehgi9` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 3680ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T23-09-31-665Z.png)

> No visible components; UI not rendered (entire screen is black). Error: No content displayed on the route.

---

## 2026-04-15T23:09:39.461Z -- Task `task_1776293999408_pehgi9` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4116ms

![profile-desktop](visuals/profile-desktop-2026-04-15T23-09-35-345Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T23:09:51.844Z -- Task `task_1776293999408_pehgi9` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 12383ms

![profile-mobile](visuals/profile-mobile-2026-04-15T23-09-39-461Z.png)

> No visible components; UI not rendered (black screen).

---

## 2026-04-15T23:09:56.201Z -- Task `task_1776293999408_pehgi9` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** OK  **Latency:** 4356ms

![friends-desktop](visuals/friends-desktop-2026-04-15T23-09-51-845Z.png)

> No visible components; UI not rendered (black screen indicates rendering failure).

---

## 2026-04-15T23:09:59.972Z -- Task `task_1776293999408_pehgi9` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 3769ms

![friends-mobile](visuals/friends-mobile-2026-04-15T23-09-56-202Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank screen).

---

## 2026-04-15T23:10:04.822Z -- Task `task_1776293999408_pehgi9` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4850ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T23-09-59-972Z.png)

> No UI components are visible; the screen is entirely black. Error: Blank page, indicating rendering failure or missing content.

---

## 2026-04-15T23:10:09.115Z -- Task `task_1776293999408_pehgi9` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4292ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T23-10-04-823Z.png)

> No visible components; the screen is entirely black, indicating a rendering error or missing content.

---

## 2026-04-15T23:10:18.106Z -- Task `task_1776293999408_pehgi9` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 8991ms

![game-desktop](visuals/game-desktop-2026-04-15T23-10-09-115Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T23:10:21.721Z -- Task `task_1776293999408_pehgi9` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 3615ms

![game-mobile](visuals/game-mobile-2026-04-15T23-10-18-106Z.png)

> No UI components are rendered; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T23:10:57.256Z -- Task `task_1776294621997_yotqgl` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 6968ms

![home-desktop](visuals/home-desktop-2026-04-15T23-10-50-288Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T23:11:01.606Z -- Task `task_1776294621997_yotqgl` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4349ms

![home-mobile](visuals/home-mobile-2026-04-15T23-10-57-257Z.png)

> No UI elements are visible; the screen is entirely black, indicating a rendering issue or missing content.

---

## 2026-04-15T23:11:06.533Z -- Task `task_1776294621997_yotqgl` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4927ms

![auth-desktop](visuals/auth-desktop-2026-04-15T23-11-01-606Z.png)

> No UI components are rendered; the screen is entirely black. Possible rendering error or missing content for the auth route.

---

## 2026-04-15T23:11:11.508Z -- Task `task_1776294621997_yotqgl` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4975ms

![auth-mobile](visuals/auth-mobile-2026-04-15T23-11-06-533Z.png)

> No visible components; the screen is entirely black, indicating a rendering issue or missing content.

---

## 2026-04-15T23:11:15.263Z -- Task `task_1776294621997_yotqgl` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 3755ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T23-11-11-508Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T23:11:19.750Z -- Task `task_1776294621997_yotqgl` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4487ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T23-11-15-263Z.png)

> No UI components are visible; the screen is entirely black. This indicates a rendering error or missing content for the dashboard route.

---

## 2026-04-15T23:11:24.443Z -- Task `task_1776294621997_yotqgl` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 4693ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T23-11-19-750Z.png)

> No visible components; UI not rendered. Error: Lobby route shows blank screen (no elements loaded).

---

## 2026-04-15T23:11:37.508Z -- Task `task_1776294621997_yotqgl` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 13065ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T23-11-24-443Z.png)

> No visible components are rendered; the screen is entirely black. Error: No UI elements displayed on the route "#lobby".

---

## 2026-04-15T23:11:41.639Z -- Task `task_1776294621997_yotqgl` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4128ms

![profile-desktop](visuals/profile-desktop-2026-04-15T23-11-37-511Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T23:11:46.198Z -- Task `task_1776294621997_yotqgl` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4559ms

![profile-mobile](visuals/profile-mobile-2026-04-15T23-11-41-639Z.png)

> No UI components are visible; the screen is entirely black. Error: No content renders for the #profile route.

---

## 2026-04-15T23:11:50.110Z -- Task `task_1776294621997_yotqgl` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 3912ms

![friends-desktop](visuals/friends-desktop-2026-04-15T23-11-46-198Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T23:11:54.132Z -- Task `task_1776294621997_yotqgl` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 4022ms

![friends-mobile](visuals/friends-mobile-2026-04-15T23-11-50-110Z.png)

> No UI components are rendered; the screen is entirely black. This indicates a rendering error or missing content for the "#friends" route.

---

## 2026-04-15T23:11:57.961Z -- Task `task_1776294621997_yotqgl` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 3827ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T23-11-54-133Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T23:12:03.348Z -- Task `task_1776294621997_yotqgl` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 5387ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T23-11-57-961Z.png)

> No UI components are visible; the screen is entirely black. Error: The leaderboard UI failed to render, displaying a blank/black screen instead of expected elements (e.g., rankings, scores).

---

## 2026-04-15T23:12:07.518Z -- Task `task_1776294621997_yotqgl` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4170ms

![game-desktop](visuals/game-desktop-2026-04-15T23-12-03-348Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T23:12:19.416Z -- Task `task_1776294621997_yotqgl` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 11898ms

![game-mobile](visuals/game-mobile-2026-04-15T23-12-07-518Z.png)

> No, the UI is not rendered—only a black screen is visible. No components are displayed, indicating a rendering issue.

---

## 2026-04-15T23:13:16.538Z -- Task `task_1776294755320_p4rdg1` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4153ms

![home-desktop](visuals/home-desktop-2026-04-15T23-13-12-385Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T23:13:20.776Z -- Task `task_1776294755320_p4rdg1` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4237ms

![home-mobile](visuals/home-mobile-2026-04-15T23-13-16-539Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering issue or missing content.

---

## 2026-04-15T23:13:24.637Z -- Task `task_1776294755320_p4rdg1` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 3861ms

![auth-desktop](visuals/auth-desktop-2026-04-15T23-13-20-776Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T23:13:28.518Z -- Task `task_1776294755320_p4rdg1` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 3880ms

![auth-mobile](visuals/auth-mobile-2026-04-15T23-13-24-638Z.png)

> No visible components are rendered; the screen is entirely black. Error: UI not displaying any content for the "#auth" route.

---

## 2026-04-15T23:13:36.052Z -- Task `task_1776294755320_p4rdg1` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 7533ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T23-13-28-519Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T23:13:39.884Z -- Task `task_1776294755320_p4rdg1` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 3831ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T23-13-36-053Z.png)

> No UI components are visible; the screen is entirely black. Error: No content is rendered for the "#dashboard" route on mobile 375x812.

---

## 2026-04-15T23:13:44.762Z -- Task `task_1776294755320_p4rdg1` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4878ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T23-13-39-884Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T23:13:51.468Z -- Task `task_1776294755320_p4rdg1` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 6706ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T23-13-44-762Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T23:13:55.411Z -- Task `task_1776294755320_p4rdg1` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 3943ms

![profile-desktop](visuals/profile-desktop-2026-04-15T23-13-51-468Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (blank screen).

---

## 2026-04-15T23:13:59.603Z -- Task `task_1776294755320_p4rdg1` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4191ms

![profile-mobile](visuals/profile-mobile-2026-04-15T23-13-55-411Z.png)

> No visible components; the UI is not rendered (entirely black screen). Error: No content displayed for the profile route.

---

## 2026-04-15T23:14:03.620Z -- Task `task_1776294755320_p4rdg1` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 4017ms

![friends-desktop](visuals/friends-desktop-2026-04-15T23-13-59-603Z.png)

> No UI components are visible; the screen is entirely black. The UI fails to render for the "#friends" route on desktop 1280x720.

---

## 2026-04-15T23:14:07.930Z -- Task `task_1776294755320_p4rdg1` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 4310ms

![friends-mobile](visuals/friends-mobile-2026-04-15T23-14-03-620Z.png)

> No UI elements are visible; the screen is entirely black. Error: No content rendered for the "#friends" route.

---

## 2026-04-15T23:14:12.703Z -- Task `task_1776294755320_p4rdg1` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4772ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T23-14-07-931Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T23:14:16.624Z -- Task `task_1776294755320_p4rdg1` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 3920ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T23-14-12-704Z.png)

> No visible components; UI appears unrendered (blank screen). Error: No content displayed for the leaderboard route.

---

## 2026-04-15T23:14:20.527Z -- Task `task_1776294755320_p4rdg1` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 3902ms

![game-desktop](visuals/game-desktop-2026-04-15T23-14-16-625Z.png)

> No UI components are rendered; the screen is entirely black. This indicates a rendering error or missing content for the "#game" route.

---

## 2026-04-15T23:14:24.573Z -- Task `task_1776294755320_p4rdg1` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4045ms

![game-mobile](visuals/game-mobile-2026-04-15T23-14-20-528Z.png)

> No visible components are rendered; the screen is entirely black. Error: UI fails to display any content on the specified route and device dimensions.

---

## 2026-04-15T23:16:10.380Z -- Task `task_1776294879900_m1v9qk` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 3947ms

![home-desktop](visuals/home-desktop-2026-04-15T23-16-06-433Z.png)

> No UI components are rendered; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T23:16:14.780Z -- Task `task_1776294879900_m1v9qk` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4398ms

![home-mobile](visuals/home-mobile-2026-04-15T23-16-10-382Z.png)

> No UI elements are visible; the screen is entirely black. Error: No content is rendered for the specified route and device dimensions.

---

## 2026-04-15T23:16:19.792Z -- Task `task_1776294879900_m1v9qk` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 5012ms

![auth-desktop](visuals/auth-desktop-2026-04-15T23-16-14-780Z.png)

> No UI components are visible; the screen is entirely black. Error—UI failed to render or load properly.

---

## 2026-04-15T23:16:23.891Z -- Task `task_1776294879900_m1v9qk` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 4098ms

![auth-mobile](visuals/auth-mobile-2026-04-15T23-16-19-793Z.png)

> No visible components; UI not rendered (blank screen). Error: No content displayed for "#auth" route.

---

## 2026-04-15T23:16:27.988Z -- Task `task_1776294879900_m1v9qk` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4097ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T23-16-23-891Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T23:16:32.014Z -- Task `task_1776294879900_m1v9qk` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4024ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T23-16-27-989Z.png)

> No UI components are visible; the screen is entirely black. The UI fails to render, indicating a potential loading issue or error.

---

## 2026-04-15T23:16:36.056Z -- Task `task_1776294879900_m1v9qk` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 4042ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T23-16-32-014Z.png)

> No visible components; UI not rendered (black screen). Error: Content failed to load/display.

---

## 2026-04-15T23:16:39.741Z -- Task `task_1776294879900_m1v9qk` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 3684ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T23-16-36-057Z.png)

> No visible components; UI not rendered (entirely black screen).

---

## 2026-04-15T23:16:44.315Z -- Task `task_1776294879900_m1v9qk` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 4574ms

![profile-desktop](visuals/profile-desktop-2026-04-15T23-16-39-741Z.png)

> No, the UI is not rendered—only a black screen is visible. No components are displayed; this indicates a rendering issue or missing content.

---

## 2026-04-15T23:16:48.468Z -- Task `task_1776294879900_m1v9qk` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4153ms

![profile-mobile](visuals/profile-mobile-2026-04-15T23-16-44-315Z.png)

> No UI components are visible; the screen is entirely black. Error: No content renders for the #profile route.

---

## 2026-04-15T23:16:52.799Z -- Task `task_1776294879900_m1v9qk` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 4330ms

![friends-desktop](visuals/friends-desktop-2026-04-15T23-16-48-469Z.png)

> No, the UI is not rendered; the screen is entirely black with no visible components. Error: No content or elements are displayed.

---

## 2026-04-15T23:16:56.842Z -- Task `task_1776294879900_m1v9qk` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 4042ms

![friends-mobile](visuals/friends-mobile-2026-04-15T23-16-52-800Z.png)

> No UI components are visible; the screen is entirely black. The UI failed to render, showing a blank state instead of expected elements for the "#friends" route.

---

## 2026-04-15T23:17:00.673Z -- Task `task_1776294879900_m1v9qk` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 3831ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T23-16-56-842Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T23:17:04.841Z -- Task `task_1776294879900_m1v9qk` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4168ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T23-17-00-673Z.png)

> No UI components are visible; the screen is entirely black. Error: No content is rendered for the "#leaderboard" route.

---

## 2026-04-15T23:17:09.048Z -- Task `task_1776294879900_m1v9qk` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4207ms

![game-desktop](visuals/game-desktop-2026-04-15T23-17-04-841Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T23:17:12.655Z -- Task `task_1776294879900_m1v9qk` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 3606ms

![game-mobile](visuals/game-mobile-2026-04-15T23-17-09-049Z.png)

> No visible components; UI not rendered (all-black screen).

---

## 2026-04-15T23:18:06.867Z -- Task `task_1776295049400_yod0cg` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4667ms

![home-desktop](visuals/home-desktop-2026-04-15T23-18-02-200Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T23:18:10.958Z -- Task `task_1776295049400_yod0cg` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4088ms

![home-mobile](visuals/home-mobile-2026-04-15T23-18-06-870Z.png)

> No UI elements are visible; the screen is entirely black. Error: No content is rendered for the specified route and device dimensions.

---

## 2026-04-15T23:18:15.812Z -- Task `task_1776295049400_yod0cg` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4853ms

![auth-desktop](visuals/auth-desktop-2026-04-15T23-18-10-959Z.png)

> No UI components are visible; the screen is entirely black. Error – the authentication page failed to render content.

---

## 2026-04-15T23:18:19.570Z -- Task `task_1776295049400_yod0cg` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 3757ms

![auth-mobile](visuals/auth-mobile-2026-04-15T23-18-15-813Z.png)

> No visible components; UI not rendered (black screen indicates rendering issue).

---

## 2026-04-15T23:18:23.461Z -- Task `task_1776295049400_yod0cg` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 3891ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T23-18-19-570Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T23:18:27.382Z -- Task `task_1776295049400_yod0cg` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 3921ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T23-18-23-461Z.png)

> No visible components; UI not rendered (all-black screen). Error: Content failed to load or render.

---

## 2026-04-15T23:18:31.255Z -- Task `task_1776295049400_yod0cg` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 3873ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T23-18-27-382Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank screen).

---

## 2026-04-15T23:18:34.891Z -- Task `task_1776295049400_yod0cg` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 3635ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T23-18-31-256Z.png)

> No visible components; UI not rendered (black screen). Error: Display issue or missing content.

---

## 2026-04-15T23:18:39.724Z -- Task `task_1776295049400_yod0cg` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 4833ms

![profile-desktop](visuals/profile-desktop-2026-04-15T23-18-34-891Z.png)

> No, the UI is not rendered; no visible components are present. Error: The profile page fails to display any content.

---

## 2026-04-15T23:18:43.763Z -- Task `task_1776295049400_yod0cg` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4039ms

![profile-mobile](visuals/profile-mobile-2026-04-15T23-18-39-724Z.png)

> No UI components are visible; the screen is entirely black. The UI failed to render, showing a blank (black) state instead of expected profile elements.

---

## 2026-04-15T23:18:48.132Z -- Task `task_1776295049400_yod0cg` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 4368ms

![friends-desktop](visuals/friends-desktop-2026-04-15T23-18-43-764Z.png)

> No UI components are visible; the screen is entirely black. The UI fails to render for the "#friends" route on desktop 1280x720.

---

## 2026-04-15T23:18:52.593Z -- Task `task_1776295049400_yod0cg` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 4461ms

![friends-mobile](visuals/friends-mobile-2026-04-15T23-18-48-132Z.png)

> No UI components are visible; the screen is entirely black. The UI failed to render, showing a blank state instead of expected elements for the "#friends" route.

---

## 2026-04-15T23:18:56.554Z -- Task `task_1776295049400_yod0cg` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 3960ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T23-18-52-594Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T23:19:00.582Z -- Task `task_1776295049400_yod0cg` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 4028ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T23-18-56-554Z.png)

> No visible components are rendered. The UI appears completely blank, indicating a rendering error.

---

## 2026-04-15T23:19:39.452Z -- Task `task_1776295049400_yod0cg` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 38870ms

![game-desktop](visuals/game-desktop-2026-04-15T23-19-00-582Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T23:19:43.595Z -- Task `task_1776295049400_yod0cg` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 4143ms

![game-mobile](visuals/game-mobile-2026-04-15T23-19-39-452Z.png)

> No visible components; UI not rendered (black screen).

---

## 2026-04-15T23:20:26.228Z -- Task `task_1776295185797_g7p934` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 3984ms

![home-desktop](visuals/home-desktop-2026-04-15T23-20-22-244Z.png)

> No UI components are visible; the screen is entirely black, indicating a rendering error.

---

## 2026-04-15T23:20:30.149Z -- Task `task_1776295185797_g7p934` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** OK  **Latency:** 3919ms

![home-mobile](visuals/home-mobile-2026-04-15T23-20-26-230Z.png)

> No visible components are rendered. Error: UI fails to display any content on the screen.

---

## 2026-04-15T23:20:34.071Z -- Task `task_1776295185797_g7p934` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 3922ms

![auth-desktop](visuals/auth-desktop-2026-04-15T23-20-30-149Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render for route "#auth".

---

## 2026-04-15T23:20:37.743Z -- Task `task_1776295185797_g7p934` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** OK  **Latency:** 3672ms

![auth-mobile](visuals/auth-mobile-2026-04-15T23-20-34-071Z.png)

> No visible components; UI not rendered (black screen indicates rendering issue).

---

## 2026-04-15T23:20:41.791Z -- Task `task_1776295185797_g7p934` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4047ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T23-20-37-744Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T23:20:46.162Z -- Task `task_1776295185797_g7p934` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** OK  **Latency:** 4370ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T23-20-41-792Z.png)

> No visible components; UI appears unrendered (blank screen). Error: No content displayed on the dashboard route.

---

## 2026-04-15T23:20:50.326Z -- Task `task_1776295185797_g7p934` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 4163ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T23-20-46-163Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank screen).

---

## 2026-04-15T23:20:54.570Z -- Task `task_1776295185797_g7p934` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** OK  **Latency:** 4244ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T23-20-50-326Z.png)

> No visible components are rendered. Error: The UI is not displayed (completely black screen).

---

## 2026-04-15T23:20:59.296Z -- Task `task_1776295185797_g7p934` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** OK  **Latency:** 4725ms

![profile-desktop](visuals/profile-desktop-2026-04-15T23-20-54-571Z.png)

> No, the UI is not rendered—only a blank black screen is visible. No components are displayed, indicating a rendering issue or missing content.

---

## 2026-04-15T23:21:03.007Z -- Task `task_1776295185797_g7p934` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 3711ms

![profile-mobile](visuals/profile-mobile-2026-04-15T23-20-59-296Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank/black screen).

---

## 2026-04-15T23:21:07.298Z -- Task `task_1776295185797_g7p934` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 4290ms

![friends-desktop](visuals/friends-desktop-2026-04-15T23-21-03-008Z.png)

> No, the UI is not rendered; the screen is entirely black with no visible components. Error: No content or elements are displayed on the page.

---

## 2026-04-15T23:21:11.124Z -- Task `task_1776295185797_g7p934` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 3826ms

![friends-mobile](visuals/friends-mobile-2026-04-15T23-21-07-298Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank/black screen).

---

## 2026-04-15T23:21:15.345Z -- Task `task_1776295185797_g7p934` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 4220ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T23-21-11-124Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T23:21:19.147Z -- Task `task_1776295185797_g7p934` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** OK  **Latency:** 3801ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T23-21-15-346Z.png)

> No visible components; UI not rendered (blank screen).

---

## 2026-04-15T23:21:27.491Z -- Task `task_1776295185797_g7p934` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 8343ms

![game-desktop](visuals/game-desktop-2026-04-15T23-21-19-148Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T23:21:31.644Z -- Task `task_1776295185797_g7p934` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4152ms

![game-mobile](visuals/game-mobile-2026-04-15T23-21-27-492Z.png)

> No visible components are rendered; the screen is entirely black. This indicates a rendering error where the UI elements failed to display.

---

## 2026-04-15T23:22:56.576Z -- Task `task_1776295307061_5x98rl` -- `/` (desktop 1280x720)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4893ms

![home-desktop](visuals/home-desktop-2026-04-15T23-22-51-683Z.png)

> No UI elements are visible; the screen is entirely black. Possible rendering error or missing content.

---

## 2026-04-15T23:23:00.698Z -- Task `task_1776295307061_5x98rl` -- `/` (mobile 375x812)

**URL:** http://localhost:3000  **Verdict:** FAILED  **Latency:** 4070ms

![home-mobile](visuals/home-mobile-2026-04-15T23-22-56-628Z.png)

> No UI elements are visible; the screen is entirely black, indicating a rendering issue or missing content.

---

## 2026-04-15T23:23:04.805Z -- Task `task_1776295307061_5x98rl` -- `#auth` (desktop 1280x720)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4106ms

![auth-desktop](visuals/auth-desktop-2026-04-15T23-23-00-699Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T23:23:08.968Z -- Task `task_1776295307061_5x98rl` -- `#auth` (mobile 375x812)

**URL:** http://localhost:3000/#auth  **Verdict:** FAILED  **Latency:** 4163ms

![auth-mobile](visuals/auth-mobile-2026-04-15T23-23-04-805Z.png)

> No visible components; the screen is entirely black. Error: UI not rendered (blank display).

---

## 2026-04-15T23:23:13.364Z -- Task `task_1776295307061_5x98rl` -- `#dashboard` (desktop 1280x720)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 4395ms

![dashboard-desktop](visuals/dashboard-desktop-2026-04-15T23-23-08-969Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T23:23:17.154Z -- Task `task_1776295307061_5x98rl` -- `#dashboard` (mobile 375x812)

**URL:** http://localhost:3000/#dashboard  **Verdict:** FAILED  **Latency:** 3789ms

![dashboard-mobile](visuals/dashboard-mobile-2026-04-15T23-23-13-365Z.png)

> No visible components; the screen is entirely black, indicating a rendering issue or missing content.

---

## 2026-04-15T23:23:29.791Z -- Task `task_1776295307061_5x98rl` -- `#lobby` (desktop 1280x720)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 12637ms

![lobby-desktop](visuals/lobby-desktop-2026-04-15T23-23-17-154Z.png)

> No UI components are visible; the screen is entirely black. The UI fails to render for the "#lobby" route on desktop 1280x720.

---

## 2026-04-15T23:23:42.487Z -- Task `task_1776295307061_5x98rl` -- `#lobby` (mobile 375x812)

**URL:** http://localhost:3000/#lobby  **Verdict:** FAILED  **Latency:** 12694ms

![lobby-mobile](visuals/lobby-mobile-2026-04-15T23-23-29-792Z.png)

> No, the UI is not rendered (entirely black screen). No visible components; error: blank display with no content shown.

---

## 2026-04-15T23:23:47.056Z -- Task `task_1776295307061_5x98rl` -- `#profile` (desktop 1280x720)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4568ms

![profile-desktop](visuals/profile-desktop-2026-04-15T23-23-42-488Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render for the "#profile" route.

---

## 2026-04-15T23:23:51.899Z -- Task `task_1776295307061_5x98rl` -- `#profile` (mobile 375x812)

**URL:** http://localhost:3000/#profile  **Verdict:** FAILED  **Latency:** 4843ms

![profile-mobile](visuals/profile-mobile-2026-04-15T23-23-47-056Z.png)

> No UI elements are visible; the screen is entirely black. Error: No content rendered for the #profile route.

---

## 2026-04-15T23:23:56.532Z -- Task `task_1776295307061_5x98rl` -- `#friends` (desktop 1280x720)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 4633ms

![friends-desktop](visuals/friends-desktop-2026-04-15T23-23-51-899Z.png)

> No UI components are visible; the screen is entirely black. The UI failed to render, showing no content or elements.

---

## 2026-04-15T23:24:00.601Z -- Task `task_1776295307061_5x98rl` -- `#friends` (mobile 375x812)

**URL:** http://localhost:3000/#friends  **Verdict:** FAILED  **Latency:** 4068ms

![friends-mobile](visuals/friends-mobile-2026-04-15T23-23-56-533Z.png)

> No UI components are visible; the screen is entirely black. The UI fails to render any elements for the "#friends" route.

---

## 2026-04-15T23:24:04.448Z -- Task `task_1776295307061_5x98rl` -- `#leaderboard` (desktop 1280x720)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 3846ms

![leaderboard-desktop](visuals/leaderboard-desktop-2026-04-15T23-24-00-602Z.png)

> No UI components are visible; the screen is entirely black. Error: UI not rendered (blank/black screen).

---

## 2026-04-15T23:24:09.672Z -- Task `task_1776295307061_5x98rl` -- `#leaderboard` (mobile 375x812)

**URL:** http://localhost:3000/#leaderboard  **Verdict:** FAILED  **Latency:** 5223ms

![leaderboard-mobile](visuals/leaderboard-mobile-2026-04-15T23-24-04-448Z.png)

> No UI components are visible; the screen is entirely black. Error: The leaderboard UI failed to render, displaying a blank (black) screen instead of expected elements.

---

## 2026-04-15T23:24:13.673Z -- Task `task_1776295307061_5x98rl` -- `#game` (desktop 1280x720)

**URL:** http://localhost:3000/#game  **Verdict:** FAILED  **Latency:** 4001ms

![game-desktop](visuals/game-desktop-2026-04-15T23-24-09-672Z.png)

> No UI components are visible; the screen is entirely black. Error: UI failed to render (no content displayed).

---

## 2026-04-15T23:24:17.421Z -- Task `task_1776295307061_5x98rl` -- `#game` (mobile 375x812)

**URL:** http://localhost:3000/#game  **Verdict:** OK  **Latency:** 3748ms

![game-mobile](visuals/game-mobile-2026-04-15T23-24-13-673Z.png)

> No visible components; UI not rendered (black screen).

---
