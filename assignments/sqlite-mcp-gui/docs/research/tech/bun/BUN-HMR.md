# Bun Hot Module Replacement (HMR)

**Source:** https://bun.com/docs/bundler/hot-reloading

Hot Module Replacement (HMR) allows you to update modules in a running application without needing a full page reload. This preserves the application state and improves the development experience.

## Overview

Bun implements a client-side HMR API modeled after Vite's `import.meta.hot` API. All HMR code is automatically tree-shaken in production builds.

## Key Features

- **No guard needed** - `if (import.meta.hot)` checks are unnecessary; Bun dead-code-eliminates HMR calls in production
- **Automatic cleanup** - Event listeners are automatically removed when modules are replaced
- **State preservation** - Use `import.meta.hot.data` to persist state between reloads

## API Methods

| Method | Status | Description |
|--------|--------|-------------|
| `hot.accept()` | ✅ | Indicate that a hot update can be replaced gracefully |
| `hot.data` | ✅ | Persist data between module evaluations |
| `hot.dispose()` | ✅ | Add a callback to run when a module is about to be replaced |
| `hot.on()` | ✅ | Attach an event listener |
| `hot.off()` | ✅ | Remove an event listener |
| `hot.prune()` | 🚧 | Callback is currently never called |
| `hot.decline()` | ✅ | No-op to match Vite's API |
| `hot.invalidate()` | ❌ | Not implemented |
| `hot.send()` | ❌ | Not implemented |

## `import.meta.hot.accept()`

### Without arguments (self-accepting)

Indicates that this module can be replaced simply by re-evaluating the file:

```ts
// index.ts
import { getCount } from "./foo.ts";

console.log("count is ", getCount());

import.meta.hot.accept();

export function getNegativeCount() {
  return -getCount();
}
```

### With callback

Called with the new module instead of patching importers:

```ts
export const count = 0;

import.meta.hot.accept(newModule => {
  if (newModule) {
    // newModule is undefined when SyntaxError happened
    console.log("updated: count is now ", newModule.count);
  }
});
```

### Accepting other modules

```ts
import { count } from "./foo";

import.meta.hot.accept("./foo", () => {
  console.log("updated: count is now ", count);
});
```

### Accepting multiple dependencies

```ts
import.meta.hot.accept(["./foo", "./bar"], newModules => {
  // newModules is an array where each item corresponds to the updated module
  // or undefined if that module had a syntax error
});
```

## `import.meta.hot.data`

Maintains state between module instances during hot replacement. Writing to this also marks the module as self-accepting.

```ts
import { createRoot } from "react-dom/client";
import { App } from "./app";

const root = (import.meta.hot.data.root ??= createRoot(elem));
root.render(<App />); // re-use an existing root
```

**Note:** In production, `data` is inlined to be `{}`, meaning it cannot be used as a state holder.

## `import.meta.hot.dispose()`

Attaches a cleanup callback called:
- Just before the module is replaced (before the next is loaded)
- After the module is detached (all imports removed)

```ts
const sideEffect = setupSideEffect();

import.meta.hot.dispose(() => {
  sideEffect.cleanup();
});
```

Returning a promise will delay module replacement until all dispose callbacks complete.

## `import.meta.hot.prune()`

Called when all imports to this module are removed, but the module was previously loaded.

```ts
import { something } from "./something";

// Initialize or re-use a WebSocket connection
export const ws = (import.meta.hot.data.ws ??= new WebSocket(location.origin));

// If the module's import is removed, clean up the WebSocket connection.
import.meta.hot.prune(() => {
  ws.close();
});
```

## Event Listeners

### `import.meta.hot.on()`

```ts
import.meta.hot.on("bun:beforeUpdate", () => {
  console.log("before a hot update");
});
```

### Built-in Events

| Event | Emitted when |
|-------|--------------|
| `bun:beforeUpdate` | Before a hot update is applied |
| `bun:afterUpdate` | After a hot update is applied |
| `bun:beforeFullReload` | Before a full page reload happens |
| `bun:beforePrune` | Before prune callbacks are called |
| `bun:invalidate` | When a module is invalidated |
| `bun:error` | When a build or runtime error occurs |
| `bun:ws:disconnect` | When the HMR WebSocket connection is lost |
| `bun:ws:connect` | When the HMR WebSocket connects or re-connects |

## React Fast Refresh Pattern

To enable React Fast Refresh with Bun, preserve the React root across HMR:

```tsx
// ❌ WRONG - Creates new root every time
const rootElement = document.getElementById('root')
if (rootElement) {
  createRoot(rootElement).render(<App />)
}

// ✅ CORRECT - Reuses root across HMR
const rootElement = document.getElementById('root')
if (rootElement) {
  const root = (import.meta.hot.data.root ??= createRoot(rootElement))
  root.render(<App />)
}
```

## Server-Side Setup

Enable HMR in `Bun.serve()`:

```ts
Bun.serve({
  port: 3000,
  development: {
    hmr: true,
  },
  // ...
});
```

Run with the `--hot` flag:

```bash
bun --hot ./index.ts
```

## What Gets Hot-Reloaded

| File Type | HMR Support |
|-----------|-------------|
| `.html` files | ✅ Full reload |
| `.tsx` / `.jsx` | ✅ Component HMR (React Fast Refresh) |
| `.css` files | ✅ Style injection |
| `.ts` server files | ✅ Server restart |
