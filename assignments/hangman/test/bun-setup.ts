// Bun test DOM setup using jsdom
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "http://localhost",
  pretendToBeVisual: true,
});

const window = dom.window as any;

// Expose DOM globals to Bun's test environment
(globalThis as any).window = window;
(globalThis as any).document = window.document;
(globalThis as any).HTMLElement = window.HTMLElement;
(globalThis as any).HTMLDivElement = window.HTMLDivElement;
(globalThis as any).HTMLButtonElement = window.HTMLButtonElement;
(globalThis as any).HTMLSelectElement = window.HTMLSelectElement;
(globalThis as any).HTMLInputElement = window.HTMLInputElement;
(globalThis as any).HTMLOptionElement = window.HTMLOptionElement;
(globalThis as any).HTMLLabelElement = window.HTMLLabelElement;
(globalThis as any).HTMLSpanElement = window.HTMLSpanElement;
(globalThis as any).HTMLAnchorElement = window.HTMLAnchorElement;
(globalThis as any).HTMLHeadingElement = window.HTMLHeadingElement;
(globalThis as any).HTMLImageElement = window.HTMLImageElement;
(globalThis as any).Event = window.Event;
(globalThis as any).MouseEvent = window.MouseEvent;
(globalThis as any).KeyboardEvent = window.KeyboardEvent;
(globalThis as any).Node = window.Node;
(globalThis as any).Element = window.Element;
(globalThis as any).DocumentFragment = window.DocumentFragment;
(globalThis as any).DOMParser = window.DOMParser;
(globalThis as any).customElements = window.customElements;
(globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) =>
  setTimeout(cb, 0);
(globalThis as any).cancelAnimationFrame = (id: number) => clearTimeout(id);

// Mock window.alert, window.confirm, window.prompt
(globalThis as any).alert = () => {};
(globalThis as any).confirm = () => true;
(globalThis as any).prompt = () => "";

// Ensure localStorage mock is available
if (!globalThis.localStorage) {
  const store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k]);
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
}
