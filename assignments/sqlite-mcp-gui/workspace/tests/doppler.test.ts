/**
 * Test doppler login parsing
 */

import { test, expect } from "bun:test";
import { parseDopplerLoginOutput } from "../src/lib/doppler";

// Test cases for doppler login output
const testCases = [
  {
    name: "Standard doppler login output",
    input: `
Please authenticate at:

  https://cli.doppler.com/terminal-auth

Your authentication code is: ABCD-1234-EFGH-5678

Waiting for authentication...
`,
    expected: {
      authUrl: "https://cli.doppler.com/terminal-auth",
      authCode: "ABCD-1234-EFGH-5678",
      status: "pending",
    },
  },
  {
    name: "Output with ANSI codes",
    input: "\x1b[0G\x1b[2K\x1b[0;1;92mPlease authenticate at:\x1b[0m\n\n  https://cli.doppler.com/terminal-auth\n\nYour authentication code is: XXXX-XXXX-XXXX-XXXX\n\nWaiting for authentication...",
    expected: {
      authUrl: "https://cli.doppler.com/terminal-auth",
      authCode: "XXXX-XXXX-XXXX-XXXX",
      status: "pending",
    },
  },
  {
    name: "Authenticated success message",
    input: "Authenticated successfully! Welcome to Doppler.",
    expected: {
      authUrl: "",
      authCode: "",
      status: "authenticated",
    },
  },
  {
    name: "Error message",
    input: "Doppler Error: Authentication failed",
    expected: {
      authUrl: "",
      authCode: "",
      status: "error",
    },
  },
];

describe("parseDopplerLoginOutput", () => {
  test.each(testCases)("$name", ({ input, expected }) => {
    const result = parseDopplerLoginOutput(input);

    expect(result.authUrl).toBe(expected.authUrl);
    expect(result.authCode).toBe(expected.authCode);
    expect(result.status).toBe(expected.status);
  });
});
