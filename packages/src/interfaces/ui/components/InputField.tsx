/**
 * InputField - Terminal input field with cursor
 */

import React from "react";
import { Text } from "ink";

export interface InputFieldProps {
  /** Label to show before input */
  label?: string;
  /** Current input value */
  value: string;
  /** Current cursor position */
  cursorPosition: number;
  /** Placeholder when empty */
  placeholder?: string;
  /** Whether input is disabled */
  disabled?: boolean;
  /** Label color */
  labelColor?: string;
  /** Cursor color */
  cursorColor?: string;
}

/**
 * Render an input field with cursor
 */
export function InputField({
  label = "You: ",
  value,
  cursorPosition,
  placeholder = "Type your message...",
  disabled = false,
  labelColor = "cyan",
  cursorColor = "cyan",
}: InputFieldProps) {
  const actualLabelColor = disabled ? "gray" : labelColor;

  return (
    <Text>
      <Text bold color={actualLabelColor}>
        {label}
      </Text>
      {value.length > 0 ? (
        <>
          {value.slice(0, cursorPosition)}
          <Text backgroundColor={cursorColor} color="black">
            {cursorPosition < value.length ? value[cursorPosition] : " "}
          </Text>
          {value.slice(cursorPosition + 1)}
        </>
      ) : (
        <Text dimColor>{placeholder}</Text>
      )}
    </Text>
  );
}

export default InputField;
