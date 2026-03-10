import { describe, it, expect } from "bun:test";
import { loadNative } from "../packages/src/native";
import type { GrepMatch, GrepResult, GrepCountResult, GrepFilesResult } from "../packages/src/native";

describe("grep_search", () => {
    it("should search for pattern in files", async () => {
        const native = loadNative();

        // Skip if native not available
        if (!native.grep_search) {
            console.log("grep_search not available in native module");
            return;
        }

        // Search for "bun" in the native module directory
        const result = await native.grep_search("bun", "/Users/ebowwa/Desktop/codespaces/packages/src/coder/packages/src/native", {
            caseInsensitive: false,
        });

        expect(result.totalCount).toBeGreaterThan(0);
        expect(result.matches.length).toBeGreaterThan(0);
        expect(result.matches[0].content).toBeDefined();
    });

    it("should return context lines", async () => {
        const native = loadNative();

        if (!native.grep_search) {
            console.log("grep_search not available in native module");
            return;
        }

        const result = await native.grep_search("highlight_code", "/Users/ebowwa/Desktop/codespaces/packages/src/coder/packages/src/native", {
            contextLines: 2,
        });

        expect(result.totalCount).toBeGreaterThan(0);
        // Context lines should be populated
        expect(result.matches[0].contextBefore).toBeDefined();
        expect(result.matches[0].contextAfter).toBeDefined();
    });

    it("should count matches per file", async () => {
        const native = loadNative();

        if (!native.grep_count) {
            console.log("grep_count not available in native module");
            return;
        }

        const result = await native.grep_count("import", "/Users/ebowwa/Desktop/codespaces/packages/src/coder/packages/src/native", {
            caseInsensitive: false,
        });

        expect(result.length).toBeGreaterThan(0);
        expect(result[0].count).toBeGreaterThan(0);
        expect(result[0].path).toBeDefined();
    });

    it("should list files with matches", async () => {
        const native = loadNative();

        if (!native.grep_files) {
            console.log("grep_files not available in native module");
            return;
        }

        const result = await native.grep_files("export", "/Users/ebowwa/Desktop/codespaces/packages/src/coder/packages/src/native", {
            caseInsensitive: false,
        });

        expect(result.files.length).toBeGreaterThan(0);
        expect(result.totalMatches).toBeGreaterThan(0);
    });
});
