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
