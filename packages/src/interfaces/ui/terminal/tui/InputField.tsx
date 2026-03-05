/** @jsx React.createElement */
/** @jsxFrag React.Fragment */
/**
 * Input Field Component - Simple plain text input
 */

import React, { useSyncExternalStore } from "react";
import { Text } from "ink";
import type { InputFieldProps } from "./types.js";

// Global input display state - bypasses React batching
let globalInputValue = "";
let globalCursorPos = 0;
const listeners = new Set<() => void>();

export function setGlobalInput(value: string, cursor: number) {
  globalInputValue = value;
  globalCursorPos = cursor;
  listeners.forEach((listener) => listener());
}

export function getGlobalInput() {
  return { value: globalInputValue, cursorPos: globalCursorPos };
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  return { value: globalInputValue, cursorPos: globalCursorPos };
}

/**
 * Simple input field - just text, no box
 */
export function InputField({ placeholder, isActive }: Omit<InputFieldProps, "value" | "cursorPos">) {
  const { value, cursorPos } = useSyncExternalStore(subscribe, getSnapshot);

  const beforeCursor = value.slice(0, cursorPos);
  const afterCursor = value.slice(cursorPos);

  return (
    <Text>
      <Text bold color={isActive ? "cyan" : "gray"}>You: </Text>
      {value.length > 0 ? (
        <>
          {beforeCursor}
          <Text backgroundColor="cyan" color="black">
            {cursorPos < value.length ? value[cursorPos] : " "}
          </Text>
          {afterCursor}
        </>
      ) : (
        <Text dimColor>{placeholder}</Text>
      )}
    </Text>
  );
}

export default InputField;
