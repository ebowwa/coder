/**
 * Cognitive Security - Intent Module
 *
 * TypeScript bindings for the Rust cognitive security module.
 * Provides intent preservation, alignment scoring, and corruption detection.
 */

// ===== Types =====

export interface AgentIntent {
  id: string;
  version: number;
  identity: AgentIdentity;
  purpose: AgentPurpose;
  principles: AgentPrinciples;
  signature?: string;
  createdAt: number;
  signedBy?: string;
}

export interface AgentIdentity {
  name: string;
  description: string;
  capabilities: string[];
  constraints: string[];
}

export interface AgentPurpose {
  goals: Goal[];
  nonGoals: string[];
  boundaries: Boundary[];
}

export interface AgentPrinciples {
  values: string[];
  priorities: string[];
  forbidden: string[];
}

export interface Goal {
  id: string;
  description: string;
  priority: "critical" | "high" | "medium" | "low";
  measurable: boolean;
  successCriteria?: string;
}

export interface Boundary {
  id: string;
  description: string;
  enforcement: "never" | "require_approval" | "log_only";
  domain: string;
  pattern?: string;
}

export interface ActionContext {
  actionType: string;
  domain: string;
  operation: string;
  target?: string;
  params?: Record<string, unknown>;
  reasoning?: string;
}

export interface AlignmentResult {
  score: number;
  reasoning: string;
  servesGoals: string[];
  hindersGoals: string[];
  boundaryConcerns: string[];
  confidence: number;
  shouldBlock: boolean;
  requiresReview: boolean;
}

export interface IntegrityResult {
  valid: boolean;
  error?: string;
  signatureValid: boolean;
  contentIntact: boolean;
  expired: boolean;
}

export interface IntentKeypair {
  privateKey: string;
  publicKey: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ===== Behavior Tracking =====

export interface BehaviorSnapshot {
  timestamp: number;
  actionCount: number;
  alignmentDistribution: AlignmentDistribution;
  actionsByDomain: DomainCount[];
  actionsByType: TypeCount[];
  boundaryViolations: number;
  actionsBlocked: number;
}

export interface AlignmentDistribution {
  mean: number;
  variance: number;
  min: number;
  max: number;
  belowThresholdCount: number;
}

export interface DomainCount {
  domain: string;
  count: number;
}

export interface TypeCount {
  actionType: string;
  count: number;
}

export interface CorruptionAnalysis {
  riskScore: number;
  indicators: CorruptionIndicator[];
  recommendation: "continue" | "monitor" | "alert" | "pause" | "reset" | "investigate";
  explanation: string;
}

export interface CorruptionIndicator {
  indicatorType: string;
  severity: string;
  description: string;
  evidence: string;
}

export interface DriftResult {
  overallDrift: number;
  driftFactors: DriftFactor[];
  concernLevel: "none" | "low" | "medium" | "high" | "critical";
}

export interface DriftFactor {
  factorType: string;
  drift: number;
  description: string;
}

// ===== Native Bindings =====

let nativeModule: any = null;

async function getNative() {
  if (!nativeModule) {
    nativeModule = await import("../../native/index.js");
  }
  return nativeModule;
}

// ===== Key Management =====

/**
 * Generate a new Ed25519 keypair for signing intents
 */
export async function generateKeypair(): Promise<IntentKeypair> {
  const native = await getNative();
  return native.cs_generate_keypair();
}

// ===== Signing & Verification =====

/**
 * Sign an agent intent with a private key
 */
export async function signIntent(
  intent: AgentIntent,
  privateKey: string
): Promise<AgentIntent> {
  const native = await getNative();
  return native.cs_sign_intent(intent, privateKey);
}

/**
 * Verify an intent's signature
 */
export async function verifyIntent(intent: AgentIntent): Promise<IntegrityResult> {
  const native = await getNative();
  return native.cs_verify_intent(intent);
}

/**
 * Hash an intent for comparison
 */
export async function hashIntent(intent: AgentIntent): Promise<string> {
  const native = await getNative();
  return native.cs_hash_intent(intent);
}

/**
 * Check if two intents are equivalent (ignoring signatures)
 */
export async function intentsEquivalent(
  intent1: AgentIntent,
  intent2: AgentIntent
): Promise<boolean> {
  const native = await getNative();
  return native.cs_intents_equivalent(intent1, intent2);
}

// ===== Alignment Scoring =====

/**
 * Score how well an action aligns with an intent
 */
export async function scoreAlignment(
  action: ActionContext,
  intent: AgentIntent
): Promise<AlignmentResult> {
  const native = await getNative();
  return native.cs_score_alignment(action, intent);
}

/**
 * Batch score multiple actions against an intent
 */
export async function batchScoreAlignment(
  actions: ActionContext[],
  intent: AgentIntent
): Promise<AlignmentResult[]> {
  const native = await getNative();
  return native.cs_batch_score_alignment(actions, intent);
}

/**
 * Check if any action in a sequence would violate intent
 */
export async function checkSequenceViolations(
  actions: ActionContext[],
  intent: AgentIntent
): Promise<number[]> {
  const native = await getNative();
  return native.cs_check_sequence_violations(actions, intent);
}

// ===== Intent Management =====

/**
 * Load intent from a JSON file
 */
export async function loadIntent(path: string): Promise<AgentIntent> {
  const native = await getNative();
  return native.cs_load_intent(path);
}

/**
 * Save intent to a JSON file
 */
export async function saveIntent(intent: AgentIntent, path: string): Promise<void> {
  const native = await getNative();
  return native.cs_save_intent(intent, path);
}

/**
 * Parse intent from JSON string
 */
export async function parseIntent(json: string): Promise<AgentIntent> {
  const native = await getNative();
  return native.cs_parse_intent(json);
}

/**
 * Serialize intent to JSON string
 */
export async function serializeIntent(intent: AgentIntent): Promise<string> {
  const native = await getNative();
  return native.cs_serialize_intent(intent);
}

/**
 * Validate intent structure
 */
export async function validateIntent(intent: AgentIntent): Promise<ValidationResult> {
  const native = await getNative();
  return native.cs_validate_intent(intent);
}

/**
 * Create a default data collector intent
 */
export async function createDataCollectorIntent(
  name: string,
  description: string
): Promise<AgentIntent> {
  const native = await getNative();
  return native.cs_create_data_collector_intent(name, description);
}

/**
 * Merge two intents (child overrides parent)
 */
export async function mergeIntents(
  base: AgentIntent,
  override: AgentIntent
): Promise<AgentIntent> {
  const native = await getNative();
  return native.cs_merge_intents(base, override);
}

// ===== Corruption Detection =====

/**
 * Analyze behavior for signs of intent corruption
 */
export async function analyzeCorruption(
  snapshot: BehaviorSnapshot,
  intent: AgentIntent
): Promise<CorruptionAnalysis> {
  const native = await getNative();
  return native.cs_analyze_corruption(snapshot, intent);
}

/**
 * Detect behavioral drift between two snapshots
 */
export async function detectDrift(
  baseline: BehaviorSnapshot,
  current: BehaviorSnapshot
): Promise<DriftResult> {
  const native = await getNative();
  return native.cs_detect_drift(baseline, current);
}

/**
 * Create an empty behavior snapshot
 */
export async function createEmptySnapshot(): Promise<BehaviorSnapshot> {
  const native = await getNative();
  return native.cs_create_empty_snapshot();
}

/**
 * Update a snapshot with a new action result
 */
export async function updateSnapshot(
  snapshot: BehaviorSnapshot,
  action: ActionContext,
  alignment: AlignmentResult
): Promise<BehaviorSnapshot> {
  const native = await getNative();
  return native.cs_update_snapshot(snapshot, action, alignment);
}
