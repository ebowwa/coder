// Vitest jsdom test setup
// jsdom environment provides document, window, etc. automatically.

// Mock window.alert, window.confirm, window.prompt
globalThis.alert = () => {};
globalThis.confirm = () => true;
globalThis.prompt = () => '';

// Mock localStorage if not available
if (!globalThis.localStorage) {
  const store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
}
