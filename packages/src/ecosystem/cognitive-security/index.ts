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

import { native } from "../../native/index.js";

let nativeModule: any = null;

async function getNative() {
  if (!nativeModule) {
    // Use the already-loaded native module from src/native/index.ts
    // which properly maps all functions including cognitive security
    nativeModule = native;
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

// ===== Action Module Types =====

export type ActionType =
  | "modify"
  | "execute"
  | "communicate"
  | "transfer"
  | "observe"
  | "create"
  | "delete";

export type FlowDirection = "inbound" | "outbound" | "bidirectional";

export interface ClassifiedAction {
  id: string;
  actionType: string;
  domain: string;
  operation: string;
  target?: string;
  flowDirection: string;
  riskLevel: number;
  hasSideEffects: boolean;
  requiresApproval: boolean;
  reasoning?: string;
  timestamp: number;
  metadata?: string;
}

export interface ActionValidationResult {
  allowed: boolean;
  classification?: ClassifiedAction;
  reason: string;
  violatedPolicy?: string;
  approvalRequired: boolean;
  approvalToken?: string;
  alternatives: string[];
  confidence: number;
}

export interface ActionPolicy {
  id: string;
  description: string;
  actionTypes: string[];
  domains: string[];
  operations: string[];
  effect: "allow" | "deny" | "require_approval";
  priority: number;
  conditions?: string;
  enabled: boolean;
}

export interface ActionContextForValidation {
  actionType: string;
  domain: string;
  operation: string;
  target?: string;
  params?: string;
  reasoning?: string;
  sessionId?: string;
  parentActionId?: string;
}

export interface ApprovalRequest {
  id: string;
  actionId: string;
  classification: ClassifiedAction;
  context: ActionContextForValidation;
  createdAt: number;
  expiresAt: number;
  status: "pending" | "approved" | "denied" | "cancelled";
  decidedBy?: string;
  decidedAt?: number;
  reason?: string;
  priority: number;
  escalationLevel: number;
}

export interface ApprovalStats {
  pendingCount: number;
  approvedCount: number;
  deniedCount: number;
  cancelledCount: number;
  totalProcessed: number;
}

export interface AuditEntry {
  id: string;
  sequence: number;
  timestamp: number;
  action: ClassifiedAction;
  validation: ActionValidationResult;
  executed: boolean;
  executionResult?: string;
  sessionId?: string;
  agentId?: string;
  correlationId?: string;
  metadata?: string;
}

export interface AuditStats {
  totalEntries: number;
  blockedCount: number;
  executedCount: number;
  byActionType: { actionType: string; count: number }[];
  byDomain: { domain: string; count: number }[];
  firstTimestamp: number;
  lastTimestamp: number;
}

export interface ActionRiskInfo {
  actionType: string;
  riskLevel: number;
}

// ===== Domain Configs =====

export interface FileDomainConfig {
  protectedPaths: string[];
  readOnlyPaths: string[];
  largeFileThreshold: number;
}

export interface NetworkDomainConfig {
  allowedHosts: string[];
  blockedHosts: string[];
  requireApprovalExternal: boolean;
}

export interface ShellDomainConfig {
  allowedCommands: string[];
  blockedCommands: string[];
  requireApproval: boolean;
}

// ===== Action Classification =====

/**
 * Classify an operation into an action type
 */
export async function classifyOperation(
  operation: string,
  domain: string,
  target?: string,
  reasoning?: string
): Promise<ClassifiedAction> {
  const native = await getNative();
  return native.classify_operation(operation, domain, target, reasoning);
}

/**
 * Get all supported action types
 */
export async function getActionTypes(): Promise<string[]> {
  const native = await getNative();
  return native.get_action_types();
}

/**
 * Get risk levels for all action types
 */
export async function getActionRiskLevels(): Promise<ActionRiskInfo[]> {
  const native = await getNative();
  return native.get_action_risk_levels();
}

// ===== Action Validation =====

/**
 * Create a deny-all policy
 */
export async function createDenyAllPolicy(): Promise<ActionPolicy> {
  const native = await getNative();
  return native.create_deny_all_policy();
}

/**
 * Create an observe-only policy
 */
export async function createObserveOnlyPolicy(): Promise<ActionPolicy> {
  const native = await getNative();
  return native.create_observe_only_policy();
}

/**
 * Create a transfer approval policy
 */
export async function createTransferApprovalPolicy(): Promise<ActionPolicy> {
  const native = await getNative();
  return native.create_transfer_approval_policy();
}

// ===== Domain Configs =====

/**
 * Create file domain configuration
 */
export async function createFileDomainConfig(): Promise<FileDomainConfig> {
  const native = await getNative();
  return native.create_file_domain_config();
}

/**
 * Create network domain configuration
 */
export async function createNetworkDomainConfig(): Promise<NetworkDomainConfig> {
  const native = await getNative();
  return native.create_network_domain_config();
}

/**
 * Create shell domain configuration
 */
export async function createShellDomainConfig(): Promise<ShellDomainConfig> {
  const native = await getNative();
  return native.create_shell_domain_config();
}

// ===== Flow Control Types =====

export type SensitivityLevelType = "public" | "internal" | "confidential" | "secret" | "top_secret";

export type DataCategoryType =
  | "pii"
  | "financial"
  | "credentials"
  | "secrets"
  | "source_code"
  | "configuration"
  | "logs"
  | "user_content"
  | "system_data"
  | "network_data"
  | "generic";

export interface ClassifiedData {
  id: string;
  sensitivity: string;
  category: string;
  source: string;
  tags: string[];
  can_log: boolean;
  can_transmit: boolean;
  can_store: boolean;
  expires_at: number | null;
  created_at: number;
}

export interface FlowRecord {
  id: string;
  data_id: string;
  source_domain: string;
  target_domain: string;
  direction: string;
  allowed: boolean;
  reason: string;
  policy_id: string | null;
  session_id: string | null;
  action_id: string | null;
  timestamp: number;
  data_hash: string;
}

export interface FlowValidationResult {
  allowed: boolean;
  reason: string;
  applied_policy: string | null;
  can_log: boolean;
  can_transmit: boolean;
  can_store: boolean;
  transformations: string[];
  confidence: number;
  warnings: string[];
  requireApproval?: boolean;
}

export interface FlowPolicy {
  id: string;
  description: string;
  source_pattern: string;
  target_pattern: string;
  min_source_sensitivity: string | null;
  max_target_sensitivity: string | null;
  categories: string[];
  effect: "allow" | "deny" | "transform" | "audit_only";
  priority: number;
  required_transforms: string[];
  log_flow: boolean;
  require_approval: boolean;
  conditions: string | null;
  enabled: boolean;
}

export interface FlowTrackerStats {
  total_flows: number;
  allowed_count: number;
  blocked_count: number;
  by_direction: { direction: string; count: number }[];
  by_source_domain: { domain: string; count: number }[];
  by_target_domain: { domain: string; count: number }[];
  first_timestamp: number;
  last_timestamp: number;
}

export interface DomainStats {
  domain: string;
  inbound_count: number;
  outbound_count: number;
  blocked_count: number;
  by_sensitivity: Record<string, number>;
}

// ===== Leak Prevention Types =====

export type LeakType =
  | "credential_exposure"
  | "pii_exposure"
  | "secret_key_exposure"
  | "internal_url_exposure"
  | "debug_info_leak"
  | "stack_trace_exposure"
  | "config_exposure"
  | "source_code_leak"
  | "encoded_smuggling"
  | "timing_channel"
  | "covert_channel";

export type PreventionActionType = "allow" | "alert" | "block";

export interface LeakDetection {
  pattern_name: string;
  leak_type: LeakType;
  severity: number;
  match_found: boolean;
}

export interface LeakCheckResult {
  action: PreventionActionType;
  detections: LeakDetection[];
  channel_allowed: boolean;
  checked_at: number;
}

export interface PreventionStatsResult {
  total_checks: number;
  blocked_count: number;
  alert_count: number;
  by_leak_type: Record<string, number>;
}

// ===== Taint Tracking Types =====

export type TaintSourceType =
  | "user_input"
  | "file_system"
  | "network"
  | "environment"
  | "secrets"
  | "database"
  | "agent_generated"
  | "tool_output"
  | "memory"
  | "external";

export type PropagationType =
  | "assignment"
  | "parameter"
  | "return"
  | "concatenation"
  | "collection_inclusion"
  | "property"
  | "transformation"
  | "aggregation";

export interface TaintSource {
  id: string;
  source_type: string;
  sensitivity: string;
  registered_at: number;
  tags: string[];
}

export interface TaintedData {
  id: string;
  source_id: string;
  data_hash: string;
  sensitivity: string;
  location: DataLocation;
  propagated_from: string[];
  tainted_at: number;
  can_sanitize: boolean;
  last_accessed: number;
  access_count: number;
}

export interface DataLocation {
  location_type: string;
  identifier: string;
  context: string | null;
}

export interface TaintPropagation {
  id: string;
  source_id: string;
  target_id: string;
  propagation_type: string;
  operation: string;
  timestamp: number;
}

export interface FlowDecision {
  allowed: boolean;
  reason: string;
  requires_sanitization: boolean;
}

export interface TaintStatsResult {
  total_sources: number;
  total_tainted: number;
  total_propagations: number;
  by_source_type: Record<string, number>;
  by_sensitivity: Record<string, number>;
}

// ===== Flow Classification =====

/**
 * Classify data based on content and source
 */
export async function classifyData(
  content: string,
  source: string,
  tags: string[]
): Promise<ClassifiedData> {
  const native = await getNative();
  return native.classify_data(content, source, tags);
}

/**
 * Check if content contains sensitive data
 */
export async function containsSensitiveData(content: string): Promise<boolean> {
  const native = await getNative();
  return native.contains_sensitive_data(content);
}

/**
 * Redact sensitive content
 */
export async function redactSensitive(
  content: string,
  replacement?: string
): Promise<string> {
  const native = await getNative();
  return native.redact_sensitive(content, replacement ?? null);
}

/**
 * Get sensitivity levels
 */
export async function getSensitivityLevels(): Promise<SensitivityLevelInfo[]> {
  const native = await getNative();
  return native.get_sensitivity_levels();
}

/**
 * Get data categories
 */
export async function getDataCategories(): Promise<DataCategoryInfo[]> {
  const native = await getNative();
  return native.get_data_categories();
}

export interface SensitivityLevelInfo {
  name: string;
  value: number;
  description: string;
}

export interface DataCategoryInfo {
  name: string;
  description: string;
}

// ===== Flow Policy Engine =====

/**
 * Create a flow policy engine
 */
export async function createFlowPolicyEngine(): Promise<FlowPolicyEngineHandle> {
  const native = await getNative();
  if (typeof native.create_flow_policy_engine === 'function') {
    return native.create_flow_policy_engine();
  }
  // Return JS fallback handle
  return createFallbackFlowPolicyEngine();
}

function createFallbackFlowPolicyEngine(): FlowPolicyEngineHandle {
  const policies: Map<string, FlowPolicy> = new Map();
  let defaultAction = "allow";
  let blpMode = "disabled";

  return {
    addPolicy(policy: FlowPolicy): void {
      policies.set(policy.id, policy);
    },
    removePolicy(policyId: string): boolean {
      return policies.delete(policyId);
    },
    evaluate(
      data: ClassifiedData,
      sourceDomain: string,
      targetDomain: string
    ): FlowValidationResult {
      // Simple fallback: allow if sensitivity allows
      const sensitivityOrder: Record<string, number> = {
        public: 1, internal: 2, confidential: 3, secret: 4, top_secret: 5,
      };
      const sourceLevel = sensitivityOrder[data.sensitivity] || 2;
      const targetLevel = sensitivityOrder[targetDomain] || 1;

      // Bell-LaPadula: can't write up (no read up, no write down)
      if (blpMode === "enabled") {
        if (sourceLevel > targetLevel) {
          return {
            allowed: false,
            reason: `BLP violation: cannot flow from ${data.sensitivity} to ${targetDomain}`,
            applied_policy: "blp_default",
            can_log: true,
            can_transmit: false,
            can_store: true,
            transformations: [],
            confidence: 1.0,
            warnings: [],
          };
        }
      }

      return {
        allowed: defaultAction === "allow",
        reason: `Allowed by default (${defaultAction})`,
        applied_policy: null,
        can_log: true,
        can_transmit: true,
        can_store: true,
        transformations: [],
        confidence: 0.5,
        warnings: [],
      };
    },
    listPolicies(): FlowPolicy[] {
      return Array.from(policies.values());
    },
    setDefaultAction(action: string): void {
      defaultAction = action;
    },
    setBlpMode(mode: string): void {
      blpMode = mode;
    },
  };
}

export interface FlowPolicyEngineHandle {
  addPolicy(policy: FlowPolicy): void;
  removePolicy(policyId: string): boolean;
  evaluate(
    data: ClassifiedData,
    sourceDomain: string,
    targetDomain: string
  ): FlowValidationResult;
  listPolicies(): FlowPolicy[];
  setDefaultAction(action: string): void;
  setBlpMode(mode: string): void;
}

/**
 * Create an allow-all flow policy
 */
export async function createAllowAllFlowPolicy(): Promise<FlowPolicy> {
  const native = await getNative();
  if (typeof native.create_allow_all_flow_policy === 'function') {
    return native.create_allow_all_flow_policy();
  }
  return {
    id: "allow_all",
    description: "Allow all flows",
    source_pattern: "*",
    target_pattern: "*",
    min_source_sensitivity: null,
    max_target_sensitivity: null,
    categories: [],
    effect: "allow",
    priority: 0,
    required_transforms: [],
    log_flow: false,
    require_approval: false,
    conditions: null,
    enabled: true,
  };
}

/**
 * Create a deny-all flow policy
 */
export async function createDenyAllFlowPolicy(): Promise<FlowPolicy> {
  const native = await getNative();
  if (typeof native.create_deny_all_flow_policy === 'function') {
    return native.create_deny_all_flow_policy();
  }
  return {
    id: "deny_all",
    description: "Deny all flows",
    source_pattern: "*",
    target_pattern: "*",
    min_source_sensitivity: null,
    max_target_sensitivity: null,
    categories: [],
    effect: "deny",
    priority: 1000,
    required_transforms: [],
    log_flow: false,
    require_approval: false,
    conditions: null,
    enabled: true,
  };
}

/**
 * Create a strict flow policy
 */
export async function createStrictFlowPolicy(): Promise<FlowPolicy> {
  const native = await getNative();
  if (typeof native.create_strict_flow_policy === 'function') {
    return native.create_strict_flow_policy();
  }
  return {
    id: "strict",
    description: "Strict flow policy",
    source_pattern: "*",
    target_pattern: "*",
    min_source_sensitivity: "internal",
    max_target_sensitivity: null,
    categories: [],
    effect: "transform",
    priority: 500,
    required_transforms: ["redact_sensitive"],
    log_flow: true,
    require_approval: true,
    conditions: null,
    enabled: true,
  };
}

// ===== Flow Tracker =====

/**
 * Create a flow tracker
 */
export async function createFlowTracker(): Promise<FlowTrackerHandle> {
  const native = await getNative();
  if (typeof native.create_flow_tracker === 'function') {
    return native.create_flow_tracker();
  }
  // Return JS fallback handle
  return createFallbackFlowTracker();
}

function createFallbackFlowTracker(): FlowTrackerHandle {
  const flows: FlowRecord[] = [];
  let maxFlows = 10000;

  return {
    record(
      data: ClassifiedData,
      sourceDomain: string,
      targetDomain: string,
      direction: string,
      validation: FlowValidationResult,
      sessionId: string | null,
      actionId: string | null
    ): FlowRecord {
      const record: FlowRecord = {
        id: `flow_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        data_id: data.id,
        source_domain: sourceDomain,
        target_domain: targetDomain,
        direction,
        allowed: validation.allowed,
        reason: validation.reason,
        policy_id: validation.applied_policy,
        session_id: sessionId,
        action_id: actionId,
        timestamp: Date.now(),
        data_hash: "",
      };
      if (flows.length >= maxFlows) {
        flows.shift();
      }
      flows.push(record);
      return record;
    },
    getFlow(flowId: string): FlowRecord | null {
      return flows.find(f => f.id === flowId) || null;
    },
    getLineage(dataId: string): FlowRecord[] {
      return flows.filter(f => f.data_id === dataId);
    },
    bySource(domain: string): FlowRecord[] {
      return flows.filter(f => f.source_domain === domain);
    },
    byTarget(domain: string): FlowRecord[] {
      return flows.filter(f => f.target_domain === domain);
    },
    bySession(sessionId: string): FlowRecord[] {
      return flows.filter(f => f.session_id === sessionId);
    },
    blocked(): FlowRecord[] {
      return flows.filter(f => !f.allowed);
    },
    allowed(): FlowRecord[] {
      return flows.filter(f => f.allowed);
    },
    recent(limit: number): FlowRecord[] {
      return flows.slice(-limit);
    },
    stats(): FlowTrackerStats {
      return {
        total_flows: flows.length,
        allowed_count: flows.filter(f => f.allowed).length,
        blocked_count: flows.filter(f => !f.allowed).length,
        by_direction: [],
        by_source_domain: [],
        by_target_domain: [],
        first_timestamp: flows[0]?.timestamp || Date.now(),
        last_timestamp: flows[flows.length - 1]?.timestamp || Date.now(),
      };
    },
    domainStats(domain: string): DomainStats | null {
      const domainFlows = flows.filter(
        f => f.source_domain === domain || f.target_domain === domain
      );
      if (domainFlows.length === 0) return null;
      return {
        domain,
        inbound_count: domainFlows.filter(f => f.target_domain === domain).length,
        outbound_count: domainFlows.filter(f => f.source_domain === domain).length,
        blocked_count: domainFlows.filter(f => !f.allowed).length,
        by_sensitivity: {},
      };
    },
    count(): number {
      return flows.length;
    },
    clear(): void {
      flows.length = 0;
    },
    setMaxFlows(max: number): void {
      maxFlows = max;
    },
    exportJsonl(): string {
      return flows.map(f => JSON.stringify(f)).join("\n");
    },
  };
}

export interface FlowTrackerHandle {
  record(
    data: ClassifiedData,
    sourceDomain: string,
    targetDomain: string,
    direction: string,
    validation: FlowValidationResult,
    sessionId: string | null,
    actionId: string | null
  ): FlowRecord;
  getFlow(flowId: string): FlowRecord | null;
  getLineage(dataId: string): FlowRecord[];
  bySource(domain: string): FlowRecord[];
  byTarget(domain: string): FlowRecord[];
  bySession(sessionId: string): FlowRecord[];
  blocked(): FlowRecord[];
  allowed(): FlowRecord[];
  recent(limit: number): FlowRecord[];
  stats(): FlowTrackerStats;
  domainStats(domain: string): DomainStats | null;
  count(): number;
  clear(): void;
  setMaxFlows(max: number): void;
  exportJsonl(): string;
}

// ===== Leak Prevention =====

/**
 * Create a leak prevention engine
 */
export async function createLeakPrevention(): Promise<LeakPreventionHandle> {
  const native = await getNative();
  if (typeof native.create_leak_prevention === 'function') {
    return native.create_leak_prevention();
  }
  // Return JS fallback handle
  return createFallbackLeakPrevention();
}

function createFallbackLeakPrevention(): LeakPreventionHandle {
  const sensitivePatterns: string[] = [];
  const channels: Set<string> = new Set(["stdout", "stderr", "network", "file"]);
  let mode: "alert" | "block" = "alert";
  let checkCount = 0;
  let blockedCount = 0;
  let alertCount = 0;

  const leakPatterns: { pattern: RegExp; type: LeakType }[] = [
    { pattern: /password[=:]\s*\S+/gi, type: "credential_exposure" },
    { pattern: /api[_-]?key[=:]\s*\S+/gi, type: "credential_exposure" },
    { pattern: /token[=:]\s*\S+/gi, type: "credential_exposure" },
    { pattern: /secret[=:]\s*\S+/gi, type: "credential_exposure" },
    { pattern: /\b[A-Za-z0-9._%+-]{20,}@\b/g, type: "pii_exposure" },
    { pattern: /\b\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, type: "pii_exposure" },
    { pattern: /-----BEGIN.*KEY-----/g, type: "secret_key_exposure" },
    { pattern: /-----BEGIN.*PRIVATE KEY-----/g, type: "secret_key_exposure" },
    { pattern: /mongodb:\/\/.+/gi, type: "internal_url_exposure" },
    { pattern: /redis:\/\/.+/gi, type: "internal_url_exposure" },
  ];

  return {
    check(content: string, channel: string): LeakCheckResult {
      checkCount++;
      const detections: LeakDetection[] = [];

      for (const { pattern, type } of leakPatterns) {
        if (pattern.test(content)) {
          detections.push({
            pattern_name: pattern.source,
            leak_type: type,
            severity: type === "credential_exposure" ? 5 : type === "secret_key_exposure" ? 5 : 3,
            match_found: true,
          });
        }
      }

      for (const sensitive of sensitivePatterns) {
        if (content.includes(sensitive)) {
          detections.push({
            pattern_name: "registered_sensitive",
            leak_type: "credential_exposure",
            severity: 4,
            match_found: true,
          });
        }
      }

      const channelAllowed = channels.has(channel);
      const shouldBlock = detections.length > 0 && mode === "block";
      const action = shouldBlock ? "block" : detections.length > 0 ? "alert" : "allow";

      if (action === "block") blockedCount++;
      else if (action === "alert") alertCount++;

      return {
        action,
        detections,
        channel_allowed: channelAllowed,
        checked_at: Date.now(),
      };
    },
    sanitize(content: string): string {
      let sanitized = content;
      for (const { pattern } of leakPatterns) {
        sanitized = sanitized.replace(pattern, "[REDACTED]");
      }
      for (const sensitive of sensitivePatterns) {
        sanitized = sanitized.replace(sensitive, "[REDACTED]");
      }
      return sanitized;
    },
    registerSensitive(data: string): void {
      sensitivePatterns.push(data);
    },
    addChannel(channel: string): void {
      channels.add(channel);
    },
    removeChannel(channel: string): void {
      channels.delete(channel);
    },
    setMode(newMode: string): void {
      if (newMode === "alert" || newMode === "block") {
        mode = newMode;
      }
    },
    stats(): PreventionStatsResult {
      return {
        total_checks: checkCount,
        blocked_count: blockedCount,
        alert_count: alertCount,
        by_leak_type: {},
      };
    },
    clearSensitive(): void {
      sensitivePatterns.length = 0;
    },
  };
}

export interface LeakPreventionHandle {
  check(content: string, channel: string): LeakCheckResult;
  sanitize(content: string): string;
  registerSensitive(data: string): void;
  addChannel(channel: string): void;
  removeChannel(channel: string): void;
  setMode(mode: string): void;
  stats(): PreventionStatsResult;
  clearSensitive(): void;
}

/**
 * Quick check content for leaks
 */
export async function checkForLeaks(
  content: string,
  channel: string
): Promise<LeakCheckResult> {
  const native = await getNative();
  if (typeof native.check_for_leaks === 'function') {
    return native.check_for_leaks(content, channel);
  }
  // Use fallback implementation
  const engine = createFallbackLeakPrevention();
  return engine.check(content, channel);
}

/**
 * Quick sanitize content
 */
export async function sanitizeContent(content: string): Promise<string> {
  const native = await getNative();
  if (typeof native.sanitizeContent === 'function') {
    return native.sanitizeContent(content);
  }
  // Use fallback implementation
  const engine = createFallbackLeakPrevention();
  return engine.sanitize(content);
}

// ===== Taint Tracking =====

/**
 * Create a taint tracker
 */
export async function createTaintTracker(): Promise<TaintTrackerHandle> {
  const native = await getNative();
  if (typeof native.createTaintTracker === 'function') {
    return native.createTaintTracker();
  }
  // Return JS fallback handle
  return createFallbackTaintTracker();
}

function createFallbackTaintTracker(): TaintTrackerHandle {
  const sources: Map<string, TaintSource> = new Map();
  const taintedData: Map<string, TaintedData> = new Map();
  const propagations: TaintPropagation[] = [];

  return {
    registerSource(sourceType: string, sensitivity: string, tags: string[]): string {
      const id = `source_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      sources.set(id, {
        id,
        source_type: sourceType,
        sensitivity,
        registered_at: Date.now(),
        tags,
      });
      return id;
    },
    taint(
      sourceId: string,
      data: string,
      locationType: string,
      identifier: string
    ): string | null {
      const source = sources.get(sourceId);
      if (!source) return null;

      const taintId = `taint_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const tainted: TaintedData = {
        id: taintId,
        source_id: sourceId,
        data_hash: data.substring(0, 32),
        sensitivity: source.sensitivity,
        location: {
          location_type: locationType,
          identifier,
          context: null,
        },
        propagated_from: [],
        tainted_at: Date.now(),
        can_sanitize: true,
        last_accessed: Date.now(),
        access_count: 0,
      };
      taintedData.set(taintId, tainted);
      return taintId;
    },
    propagate(
      sourceTaintId: string,
      newData: string,
      locationType: string,
      identifier: string,
      propagationType: string,
      operation: string
    ): string | null {
      const sourceTaint = taintedData.get(sourceTaintId);
      if (!sourceTaint) return null;

      const newTaintId = `taint_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const newTaint: TaintedData = {
        id: newTaintId,
        source_id: sourceTaint.source_id,
        data_hash: newData.substring(0, 32),
        sensitivity: sourceTaint.sensitivity,
        location: {
          location_type: locationType,
          identifier,
          context: null,
        },
        propagated_from: [sourceTaintId],
        tainted_at: Date.now(),
        can_sanitize: true,
        last_accessed: Date.now(),
        access_count: 0,
      };
      taintedData.set(newTaintId, newTaint);

      propagations.push({
        id: `prop_${Date.now()}`,
        source_id: sourceTaintId,
        target_id: newTaintId,
        propagation_type: propagationType,
        operation,
        timestamp: Date.now(),
      });

      return newTaintId;
    },
    canFlow(taintId: string, sink: string): FlowDecision {
      const taint = taintedData.get(taintId);
      if (!taint) {
        return { allowed: true, reason: "No taint found", requires_sanitization: false };
      }

      // Check sensitivity-based flow
      const sensitivityOrder = ["public", "internal", "confidential", "secret", "top_secret"];
      const taintLevel = sensitivityOrder.indexOf(taint.sensitivity);

      if (taintLevel >= 3) {
        // High sensitivity data
        if (sink === "external" || sink === "network") {
          return {
            allowed: false,
            reason: `Cannot flow ${taint.sensitivity} data to ${sink}`,
            requires_sanitization: true,
          };
        }
      }

      return { allowed: true, reason: "Flow allowed", requires_sanitization: false };
    },
    isTainted(data: string): boolean {
      for (const taint of taintedData.values()) {
        if (data.includes(taint.data_hash)) {
          return true;
        }
      }
      return false;
    },
    getTaint(taintId: string): TaintedData | null {
      return taintedData.get(taintId) || null;
    },
    stats(): TaintStatsResult {
      return {
        total_sources: sources.size,
        total_tainted: taintedData.size,
        total_propagations: propagations.length,
        by_source_type: {},
        by_sensitivity: {},
      };
    },
    clear(taintId: string): boolean {
      return taintedData.delete(taintId);
    },
    clearAll(): void {
      sources.clear();
      taintedData.clear();
      propagations.length = 0;
    },
  };
}

export interface TaintTrackerHandle {
  registerSource(
    sourceType: string,
    sensitivity: string,
    tags: string[]
  ): string;
  taint(
    sourceId: string,
    data: string,
    locationType: string,
    identifier: string
  ): string | null;
  propagate(
    sourceTaintId: string,
    newData: string,
    locationType: string,
    identifier: string,
    propagationType: string,
    operation: string
  ): string | null;
  canFlow(taintId: string, sink: string): FlowDecision;
  isTainted(data: string): boolean;
  getTaint(taintId: string): TaintedData | null;
  stats(): TaintStatsResult;
  clear(taintId: string): boolean;
  clearAll(): void;
}

// ===== Immutable Directives =====
// Cryptographically signed rules that cannot be modified by AI

export interface ImmutableDirective {
  id: string;
  directiveType: string;
  rule: string;
  domain: string;
  priority: number;
  overridable: boolean;
  createdAt: number;
  expiresAt?: number;
  createdBy: string;
  signature?: string;
  signedBy?: string;
  ruleHash: string;
}

export interface DirectiveResult {
  allowed: boolean;
  requiresApproval: boolean;
  violations: DirectiveViolation[];
  approvalDirectives: string[];
  denialReason?: string;
}

export interface DirectiveViolation {
  directiveId: string;
  directiveType: string;
  reason: string;
  severity: string;
}

// ===== Signed Actions =====
// Every action cryptographically signed before execution

export interface SignedAction {
  id: string;
  sequence: number;
  sessionId: string;
  tool: string;
  domain: string;
  actionType: string;
  target?: string;
  paramsHash: string;
  timestamp: number;
  intentId?: string;
  signature: string;
  signedBy: string;
  prevHash?: string;
  hash: string;
}

export interface ActionVerification {
  signatureValid: boolean;
  chainIntact: boolean;
  hashValid: boolean;
  intentVerified: boolean;
  valid: boolean;
  error?: string;
}

// ===== Drift Detection =====
// Behavioral analytics to detect deviation from intent

export interface BehavioralProfile {
  agentId: string;
  intentId?: string;
  createdAt: number;
  updatedAt: number;
  totalActions: number;
  actionTypes: Record<string, number>;
  domains: Record<string, number>;
  tools: Record<string, number>;
  actionsPerMinute: number;
  rateWindow: number;
  commonSequences: SequencePattern[];
  forbiddenAttempts: number;
  approvalRequests: number;
}

export interface SequencePattern {
  sequence: string[];
  count: number;
  lastSeen: number;
}

export interface DriftIndicator {
  indicatorType: string;
  severity: number;
  description: string;
  factor: string;
  evidence: string[];
}

// ===== Native Module Bindings =====
// These will be populated when the native module is built

import type { SystemSignature } from "../../core/claude-md.js";

let directiveStoreHandle: any = null;
let actionSignerHandle: any = null;
let driftDetectorHandle: any = null;

/**
 * Create a directive store for immutable directives
 */
export async function createDirectiveStore(): Promise<DirectiveStoreHandle> {
  const native = await getNative();
  if (native.create_directive_store) {
    return native.create_directive_store();
  }
  // Fallback to JS implementation
  return new DirectiveStoreHandle();
}

/**
 * Create an action signer for cryptographic action signing
 */
export async function createActionSigner(
  privateKeyHex: string,
  sessionId: string
): Promise<ActionSignerHandle> {
  const native = await getNative();
  if (native.create_action_signer) {
    return native.create_action_signer(privateKeyHex, sessionId);
  }
  // Fallback to JS implementation
  return new ActionSignerHandle(privateKeyHex, sessionId);
}

/**
 * Create a drift detector for behavioral analytics
 */
export async function createDriftDetector(
  agentId: string,
  intentId?: string
): Promise<DriftDetectorHandle> {
  const native = await getNative();
  if (native.create_drift_detector) {
    return native.create_drift_detector(agentId, intentId);
  }
  // Fallback to JS implementation
  return new DriftDetectorHandle(agentId, intentId);
}

/**
 * Create default financial protection directives
 */
export async function createDefaultFinancialDirectives(
  store: DirectiveStoreHandle
): Promise<ImmutableDirective[]> {
  const native = await getNative();
  if (native.create_default_financial_directives) {
    return native.create_default_financial_directives(store);
  }
  // JS fallback - create basic directives
  return [
    await store.createDirective(
      "forbidden_action",
      JSON.stringify({
        actions: ["*"],
        paramPatterns: ["send.*eth", "send.*btc", "transfer.*crypto", "wallet.*address"]
      }),
      "financial",
      1,
      false,
      "system"
    ),
    await store.createDirective(
      "forbidden_action",
      JSON.stringify({
        actions: ["mcp__telegram__telegram_send_message"],
        paramPatterns: ["password", "secret", "api_key", "private_key"]
      }),
      "credentials",
      1,
      false,
      "system"
    ),
  ];
}

// ===== JS Fallback Implementations =====

class DirectiveStoreHandle {
  private directives: Map<string, ImmutableDirective> = new Map();

  async setSigningKey(privateKeyHex: string): Promise<void> {
    // JS fallback - no actual signing
  }

  async createDirective(
    directiveType: string,
    rule: string,
    domain: string,
    priority: number = 5,
    overridable: boolean = false,
    createdBy: string = "user"
  ): Promise<ImmutableDirective> {
    const id = `directive-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const directive: ImmutableDirective = {
      id,
      directiveType,
      rule,
      domain,
      priority,
      overridable,
      createdAt: Date.now(),
      createdBy,
      ruleHash: await this.hashRule(rule),
    };
    this.directives.set(id, directive);
    return directive;
  }

  async addDirective(directive: ImmutableDirective): Promise<void> {
    this.directives.set(directive.id, directive);
  }

  async evaluate(
    actionType: string,
    domain: string,
    target: string | null,
    params: string
  ): Promise<DirectiveResult> {
    const violations: DirectiveViolation[] = [];
    const approvalDirectives: string[] = [];

    for (const directive of this.directives.values()) {
      if (directive.domain !== "*" && directive.domain !== domain) continue;

      const matches = this.evaluateRule(directive.rule, actionType, domain, target, params);

      if (matches) {
        if (directive.directiveType === "forbidden_action") {
          violations.push({
            directiveId: directive.id,
            directiveType: directive.directiveType,
            reason: `Matched forbidden pattern in ${directive.domain}`,
            severity: directive.priority === 1 ? "critical" : "high",
          });
        } else if (directive.directiveType === "required_approval") {
          approvalDirectives.push(directive.id);
        }
      }
    }

    const hasCritical = violations.some(v => v.severity === "critical");

    return {
      allowed: !hasCritical,
      requiresApproval: approvalDirectives.length > 0,
      violations,
      approvalDirectives,
      denialReason: hasCritical ? "Critical directive violation" : undefined,
    };
  }

  private evaluateRule(
    rule: string,
    actionType: string,
    domain: string,
    target: string | null,
    params: string
  ): boolean {
    try {
      const ruleJson = JSON.parse(rule);
      // Check action patterns
      if (ruleJson.actions) {
        for (const action of ruleJson.actions) {
          if (action === "*" || action === actionType) return true;
        }
      }
      // Check param patterns
      if (ruleJson.paramPatterns || ruleJson.param_patterns) {
        const patterns = ruleJson.paramPatterns || ruleJson.param_patterns;
        for (const pattern of patterns) {
          if (params.toLowerCase().includes(pattern.toLowerCase())) return true;
        }
      }
      return false;
    } catch {
      // Simple string match
      return rule.includes(actionType) || rule.includes(domain);
    }
  }

  private async hashRule(rule: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(rule);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }
}

class ActionSignerHandle {
  private privateKey: string;
  private _sessionId: string;
  private _sequence: number = 0;
  private _lastHash: string | null = null;
  private _intentId: string | null = null;

  constructor(privateKey: string, sessionId: string) {
    this.privateKey = privateKey;
    this._sessionId = sessionId;
  }

  setIntent(intentId: string): void {
    this._intentId = intentId;
  }

  async sign(
    tool: string,
    domain: string,
    actionType: string,
    target: string | null,
    params: string
  ): Promise<SignedAction> {
    this._sequence++;
    const timestamp = Date.now();
    const id = `action-${this._sessionId}-${this._sequence}`;

    // Hash params
    const encoder = new TextEncoder();
    const paramsData = encoder.encode(params);
    const paramsHashBuffer = await crypto.subtle.digest("SHA-256", paramsData);
    const paramsHash = Array.from(new Uint8Array(paramsHashBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    // Create action (without signature for hash computation)
    const action: SignedAction = {
      id,
      sequence: this._sequence,
      sessionId: this._sessionId,
      tool,
      domain,
      actionType,
      target: target || undefined,
      paramsHash,
      timestamp,
      intentId: this._intentId ?? undefined,
      signature: "",
      signedBy: this.privateKey.substring(0, 16), // Placeholder
      prevHash: this._lastHash ?? undefined,
      hash: "",
    };

    // Compute hash
    const hashInput = `${action.id}:${action.sequence}:${action.tool}:${action.domain}:${action.paramsHash}:${action.timestamp}`;
    const hashData = encoder.encode(hashInput);
    const hashBuffer = await crypto.subtle.digest("SHA-256", hashData);
    action.hash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    // Sign (simplified - in production use Ed25519)
    action.signature = `sig-${action.hash.substring(0, 32)}`;

    this._lastHash = action.hash;

    return action;
  }

  async verify(action: SignedAction): Promise<ActionVerification> {
    // Simplified verification
    const valid = action.signature === `sig-${action.hash.substring(0, 32)}`;
    return {
      signatureValid: valid,
      chainIntact: action.prevHash === this._lastHash || action.sequence === 1,
      hashValid: true,
      intentVerified: !this._intentId || action.intentId === this._intentId,
      valid,
      error: valid ? undefined : "Signature verification failed",
    };
  }

  getSequence(): number {
    return this._sequence;
  }

  getSessionId(): string {
    return this._sessionId;
  }

  get publicKey(): string {
    return this.privateKey.substring(0, 16) + "...";
  }
}

/**
 * Verify a signed action without needing a signer handle
 */
export async function verifySignedAction(
  action: SignedAction,
  publicKeyHex: string
): Promise<ActionVerification> {
  const native = await getNative();
  if (native.verify_signed_action) {
    return native.verify_signed_action(action, publicKeyHex);
  }
  // JS fallback - simplified verification
  const expectedSig = `sig-${action.hash.substring(0, 32)}`;
  const valid = action.signature === expectedSig;
  return {
    signatureValid: valid,
    chainIntact: action.prevHash !== null || action.sequence === 1,
    hashValid: true,
    intentVerified: true, // Can't verify intent without context
    valid,
    error: valid ? undefined : "Signature verification failed",
  };
}

class DriftDetectorHandle {
  private agentId: string;
  private intentId: string | null;
  private profile: BehavioralProfile;
  private recentActions: SignedAction[] = [];
  private actionTimes: number[] = [];
  private threshold: number = 0.3;

  constructor(agentId: string, intentId?: string) {
    this.agentId = agentId;
    this.intentId = intentId || null;
    this.profile = {
      agentId,
      intentId: intentId || undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      totalActions: 0,
      actionTypes: {},
      domains: {},
      tools: {},
      actionsPerMinute: 0,
      rateWindow: 60,
      commonSequences: [],
      forbiddenAttempts: 0,
      approvalRequests: 0,
    };
  }

  record(action: SignedAction): void {
    this.profile.totalActions++;
    this.profile.updatedAt = Date.now();

    // Update distributions
    this.profile.actionTypes[action.actionType] = (this.profile.actionTypes[action.actionType] || 0) + 1;
    this.profile.domains[action.domain] = (this.profile.domains[action.domain] || 0) + 1;
    this.profile.tools[action.tool] = (this.profile.tools[action.tool] || 0) + 1;

    // Track recent actions
    this.recentActions.push(action);
    if (this.recentActions.length > 100) {
      this.recentActions.shift();
    }

    // Track times for rate calculation
    this.actionTimes.push(action.timestamp);
    const cutoff = Date.now() - this.profile.rateWindow * 1000;
    this.actionTimes = this.actionTimes.filter(t => t > cutoff);

    // Calculate rate
    if (this.actionTimes.length > 1) {
      const lastTime = this.actionTimes[this.actionTimes.length - 1];
      const firstTime = this.actionTimes[0];
      if (lastTime !== undefined && firstTime !== undefined) {
        const timeSpan = (lastTime - firstTime) / 1000;
        if (timeSpan > 0) {
          this.profile.actionsPerMinute = (this.actionTimes.length / timeSpan) * 60;
        }
      }
    }
  }

  recordForbidden(): void {
    this.profile.forbiddenAttempts++;
  }

  recordApproval(): void {
    this.profile.approvalRequests++;
  }

  detect(): DriftResult {
    const indicators: DriftIndicator[] = [];

    // Check for too many forbidden attempts
    if (this.profile.forbiddenAttempts > 0) {
      const forbiddenRatio = this.profile.forbiddenAttempts / this.profile.totalActions;
      if (forbiddenRatio > 0.1) {
        indicators.push({
          indicatorType: "forbidden-pattern",
          severity: Math.min(forbiddenRatio, 1),
          description: `${this.profile.forbiddenAttempts} forbidden attempts (${(forbiddenRatio * 100).toFixed(1)}%)`,
          factor: "security_violations",
          evidence: [`${this.profile.forbiddenAttempts} forbidden attempts`],
        });
      }
    }

    // Check rate anomaly
    if (this.profile.actionsPerMinute > 30) {
      indicators.push({
        indicatorType: "rate-anomaly",
        severity: Math.min(this.profile.actionsPerMinute / 60, 1),
        description: `High action rate: ${this.profile.actionsPerMinute.toFixed(1)}/min`,
        factor: "action_rate",
        evidence: [`${this.profile.actionsPerMinute.toFixed(1)} actions/min`],
      });
    }

    // Calculate drift score
    const overallDrift = indicators.length > 0
      ? indicators.reduce((sum, i) => sum + i.severity, 0) / indicators.length
      : 0;

    const concernLevel = overallDrift > 0.7
      ? "critical" as const
      : overallDrift > 0.5
      ? "high" as const
      : overallDrift > this.threshold
      ? "medium" as const
      : overallDrift > 0.1
      ? "low" as const
      : "none" as const;

    return {
      overallDrift,
      driftFactors: indicators.map(i => ({
        factorType: i.factor,
        drift: i.severity,
        description: i.description,
      })),
      concernLevel,
    };
  }

  getProfile(): BehavioralProfile {
    return { ...this.profile };
  }

  setThreshold(threshold: number): void {
    this.threshold = threshold;
  }

  getRecentActions(): SignedAction[] {
    return [...this.recentActions];
  }
}

// ===== Automatic Security Hooks =====

export * from "./hooks.js";
