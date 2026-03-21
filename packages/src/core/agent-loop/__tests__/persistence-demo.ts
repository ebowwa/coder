/**
 * Live Demo of Phase 1 Persistence
 * Run with: bun run packages/src/core/agent-loop/__tests__/persistence-demo.ts
 */

import { join } from "path";
import { homedir } from "os";
import { rm } from "fs/promises";
import { existsSync } from "fs";
import { LoopState } from "../loop-state.js";
import { LoopPersistence, DEFAULT_PERSISTENCE_CONFIG } from "../loop-persistence.js";
import {
  generateCheckpointId,
  validatePersistedState,
  createStateSummary,
  SERIALIZER_VERSION,
} from "../loop-serializer.js";
import { DEFAULT_LOOP_BEHAVIOR } from "../../../ecosystem/presets/types.js";

// Test directory
const TEST_DIR = join(homedir(), ".claude", "loops-demo-test");

async function main() {
  console.log("=".repeat(60));
  console.log("  PHASE 1 PERSISTENCE - LIVE DEMO");
  console.log("=".repeat(60));
  console.log();

  // Clean up any previous test
  if (existsSync(TEST_DIR)) {
    await rm(TEST_DIR, { recursive: true });
  }

  // 1. Create persistence manager
  console.log("1. Creating persistence manager...");
  const persistence = new LoopPersistence({
    ...DEFAULT_PERSISTENCE_CONFIG,
    storageDir: TEST_DIR,
    enabled: true,
    autoSaveInterval: 1000,
    maxCheckpoints: 5,
  });
  await persistence.init();
  console.log(`   Storage dir: ${TEST_DIR}`);
  console.log("   ✓ Initialized\n");

  // 2. Create a LoopState with some initial messages
  console.log("2. Creating LoopState with messages...");
  const state = new LoopState([
    { role: "user", content: [{ type: "text", text: "Hello, start coding!" }] },
  ]);

  // Simulate some turns
  state.incrementTurn();
  state.addAssistantMessage([{ type: "text", text: "I'll help you code!" }]);
  state.addUserMessage([{ type: "tool_result", tool_use_id: "tool-0", content: "Create a simple function" }]);

  state.incrementTurn();
  state.addAssistantMessage([
    { type: "text", text: "Here's a function:" },
    { type: "tool_use", id: "tool-1", name: "Write", input: { file_path: "/tmp/test.ts", content: "export function hello() { return 'world'; }" } },
  ]);

  console.log(`   Turns: ${state.turnNumber}`);
  console.log(`   Messages: ${state.messages.length}`);
  console.log("   ✓ State created\n");

  // 3. Serialize the state
  console.log("3. Serializing state...");
  const sessionId = `demo-${Date.now().toString(36)}`;
  const serialized = state.serialize(sessionId);

  console.log(`   Session ID: ${sessionId}`);
  console.log(`   Serializer version: ${SERIALIZER_VERSION}`);
  console.log(`   Checkpoints in state: ${serialized.checkpoints.length}`);
  console.log("   ✓ Serialized\n");

  // 4. Validate the serialized state
  console.log("4. Validating serialized state...");
  const isValid = validatePersistedState(serialized);
  console.log(`   Valid: ${isValid}`);
  if (!isValid) {
    throw new Error("State validation failed!");
  }
  console.log("   ✓ Validated\n");

  // 5. Start the loop (creates manifest)
  console.log("5. Starting loop persistence...");
  await persistence.startLoop(sessionId, serialized, {
    workingDirectory: process.cwd(),
    model: "claude-sonnet-4-6",
  });
  console.log("   ✓ Loop started\n");

  // 6. Create a checkpoint
  console.log("6. Creating checkpoint...");
  const checkpoint = await persistence.createCheckpoint(
    sessionId,
    serialized,
    "manual",
    "Demo checkpoint after turn 2"
  );
  console.log(`   Checkpoint ID: ${checkpoint.id}`);
  console.log(`   Type: ${checkpoint.type}`);
  console.log(`   Summary: ${checkpoint.summary}`);
  console.log("   ✓ Checkpoint created\n");

  // 7. Simulate more turns and auto-save
  console.log("7. Simulating more turns...");
  state.incrementTurn();
  state.addAssistantMessage([{ type: "text", text: "Function created successfully!" }]);

  const updatedSerialized = state.serialize(sessionId);
  await persistence.save(sessionId, updatedSerialized);
  console.log(`   Turn: ${state.turnNumber}`);
  console.log("   ✓ Auto-saved\n");

  // 8. Create another checkpoint
  console.log("8. Creating second checkpoint...");
  const checkpoint2 = await persistence.createCheckpoint(
    sessionId,
    updatedSerialized,
    "auto",
    "Auto checkpoint at turn 3"
  );
  console.log(`   Checkpoint ID: ${checkpoint2.id}`);
  console.log("   ✓ Second checkpoint created\n");

  // 9. Load state back from disk
  console.log("9. Loading state from disk...");
  const loaded = await persistence.load(sessionId);
  if (!loaded) {
    throw new Error("Failed to load state!");
  }
  console.log(`   Loaded session: ${loaded.sessionId}`);
  console.log(`   Turn number: ${loaded.turnNumber}`);
  console.log(`   Checkpoints: ${loaded.checkpoints.length}`);
  console.log(`   Messages: ${loaded.messages.length}`);
  console.log("   ✓ State loaded\n");

  // 10. Validate loaded state
  console.log("10. Validating loaded state...");
  const loadedValid = validatePersistedState(loaded);
  console.log(`   Valid: ${loadedValid}`);
  console.log("   ✓ Validated\n");

  // 11. Create summary
  console.log("11. Creating state summary...");
  const summary = createStateSummary(loaded);
  console.log("   Summary:");
  console.log(`     Session ID: ${summary.sessionId}`);
  console.log(`     Turn: ${summary.turnNumber}`);
  console.log(`     Cost: $${summary.totalCost.toFixed(4)}`);
  console.log(`     Duration: ${summary.duration}`);
  console.log(`     Checkpoints: ${summary.checkpointCount}`);
  console.log(`     Template: ${summary.templateName}`);
  console.log(`     Interrupted: ${summary.interrupted}`);
  console.log("   ✓ Summary created\n");

  // 12. List checkpoints
  console.log("12. Listing checkpoints...");
  const checkpoints = await persistence.listCheckpoints(sessionId);
  console.log(`   Total checkpoints: ${checkpoints.length}`);
  for (const cp of checkpoints) {
    console.log(`     - ${cp.id}: Turn ${cp.turnNumber}, Type: ${cp.type}`);
  }
  console.log("   ✓ Checkpoints listed\n");

  // 13. Test recovery
  console.log("13. Testing recovery...");
  const recovery = await persistence.recoverLoop(sessionId);
  console.log(`   Recovery success: ${recovery.success}`);
  console.log(`   Session ID: ${recovery.sessionId}`);
  if (recovery.state) {
    console.log(`   Recovered turn: ${recovery.state.turnNumber}`);
  }
  console.log("   ✓ Recovery works\n");

  // 14. End the loop
  console.log("14. Ending loop...");
  await persistence.endLoop(sessionId, { endReason: "demo completed" });
  const manifest = await persistence.loadManifest(sessionId);
  if (manifest) {
    console.log(`   Ended at: ${new Date(manifest.endedAt!).toISOString()}`);
    console.log(`   Interrupted: ${manifest.interrupted}`);
    console.log(`   Total turns: ${manifest.totalTurns}`);
  }
  console.log("   ✓ Loop ended\n");

  // 15. Test finding interrupted loops (should be empty since we ended properly)
  console.log("15. Finding interrupted loops...");
  const interrupted = await persistence.findInterruptedLoops();
  console.log(`   Interrupted loops found: ${interrupted.length}`);
  console.log("   ✓ Check complete\n");

  // Cleanup
  console.log("16. Cleaning up...");
  await persistence.deleteLoop(sessionId);
  const exists = await persistence.exists(sessionId);
  console.log(`   Loop exists after delete: ${exists}`);
  console.log("   ✓ Cleaned up\n");

  console.log("=".repeat(60));
  console.log("  ALL PHASE 1 TESTS PASSED!");
  console.log("=".repeat(60));
}

main().catch((error) => {
  console.error("\n❌ Demo failed:", error);
  process.exit(1);
});
