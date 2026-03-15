/**
 * JSON Schema Generator from Zod Schemas
 * Generates JSON Schema files for external tool integration
 *
 * @example
 * bun run packages/src/schemas/generate-json-schemas.ts
 */

import { zodToJsonSchema } from "zod-to-json-schema";
import { z } from "zod";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Import all Zod schemas
import {
  // API schemas
  StopReasonSchema,
  UsageMetricsSchema,
  ContentBlockSchema,
  APIResponseSchema,
  APIRequestSchema,
  MessageSchema,
  OAuthConfigSchema,
  BackendConfigSchema,
  RateLimitConfigSchema,
  CacheConfigSchema,
  // Model schemas
  KnownClaudeModelSchema,
  ModelTierSchema,
  ModelDefinitionSchema,
  ModelPricingSchema,
  ExtendedThinkingFeaturesSchema,
  // Agent schemas
  AgentTypeDefinitionSchema,
  SessionTypeSchema,
  SessionStateSchema,
  AgentCapabilitiesSchema,
  AgentConfigSchema,
  AgentStatusSchema,
  // Permission schemas
  PermissionModeSchema,
  PermissionRequestSchema,
  PermissionResponseSchema,
  RiskLevelSchema,
  PermissionToolChoiceSchema,
  // MCP schemas
  MCPServerConfigSchema,
  MCPToolSchema,
  JSONRPCRequestSchema,
  JSONRPCResponseSchema,
  ToolCallRequestSchema,
  ToolCallResponseSchema,
  TransportTypeSchema,
  // Hook schemas
  HookTypeSchema,
  HookEventSchema,
  HookDefinitionSchema,
  HookInputSchema,
  HookOutputSchema,
  // Slash command schemas
  SlashCommandSchema,
  ParsedCommandSchema,
  CommandCategorySchema,
  // Tool schemas
  ToolCategorySchema,
  BuiltInToolSchema,
  ToolExecutionConfigSchema,
  ToolResultSchema,
} from "./index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMAS_DIR = join(__dirname, "json");

// Ensure output directory exists
if (!existsSync(SCHEMAS_DIR)) {
  mkdirSync(SCHEMAS_DIR, { recursive: true });
}

interface SchemaEntry {
  name: string;
  schema: z.ZodType;
  description?: string;
}

// Schema collections by category
const schemaCollections: Record<string, SchemaEntry[]> = {
  api: [
    { name: "StopReason", schema: StopReasonSchema },
    { name: "UsageMetrics", schema: UsageMetricsSchema },
    { name: "ContentBlock", schema: ContentBlockSchema },
    { name: "APIResponse", schema: APIResponseSchema },
    { name: "APIRequest", schema: APIRequestSchema },
    { name: "Message", schema: MessageSchema },
    { name: "OAuthConfig", schema: OAuthConfigSchema },
    { name: "BackendConfig", schema: BackendConfigSchema },
    { name: "RateLimitConfig", schema: RateLimitConfigSchema },
    { name: "CacheConfig", schema: CacheConfigSchema },
  ],
  models: [
    { name: "KnownClaudeModel", schema: KnownClaudeModelSchema },
    { name: "ModelTier", schema: ModelTierSchema },
    { name: "ModelDefinition", schema: ModelDefinitionSchema },
    { name: "ModelPricing", schema: ModelPricingSchema },
    { name: "ExtendedThinkingFeatures", schema: ExtendedThinkingFeaturesSchema },
  ],
  agents: [
    { name: "AgentTypeDefinition", schema: AgentTypeDefinitionSchema },
    { name: "SessionType", schema: SessionTypeSchema },
    { name: "SessionState", schema: SessionStateSchema },
    { name: "AgentCapabilities", schema: AgentCapabilitiesSchema },
    { name: "AgentConfig", schema: AgentConfigSchema },
    { name: "AgentStatus", schema: AgentStatusSchema },
  ],
  permissions: [
    { name: "PermissionMode", schema: PermissionModeSchema },
    { name: "PermissionRequest", schema: PermissionRequestSchema },
    { name: "PermissionResponse", schema: PermissionResponseSchema },
    { name: "RiskLevel", schema: RiskLevelSchema },
    { name: "PermissionToolChoice", schema: PermissionToolChoiceSchema },
  ],
  mcp: [
    { name: "MCPServerConfig", schema: MCPServerConfigSchema },
    { name: "MCPTool", schema: MCPToolSchema },
    { name: "JSONRPCRequest", schema: JSONRPCRequestSchema },
    { name: "JSONRPCResponse", schema: JSONRPCResponseSchema },
    { name: "ToolCallRequest", schema: ToolCallRequestSchema },
    { name: "ToolCallResponse", schema: ToolCallResponseSchema },
    { name: "TransportType", schema: TransportTypeSchema },
  ],
  hooks: [
    { name: "HookType", schema: HookTypeSchema },
    { name: "HookEvent", schema: HookEventSchema },
    { name: "HookDefinition", schema: HookDefinitionSchema },
    { name: "HookInput", schema: HookInputSchema },
    { name: "HookOutput", schema: HookOutputSchema },
  ],
  "slash-commands": [
    { name: "SlashCommand", schema: SlashCommandSchema },
    { name: "ParsedCommand", schema: ParsedCommandSchema },
    { name: "CommandCategory", schema: CommandCategorySchema },
  ],
  tools: [
    { name: "ToolCategory", schema: ToolCategorySchema },
    { name: "BuiltInTool", schema: BuiltInToolSchema },
    { name: "ToolExecutionConfig", schema: ToolExecutionConfigSchema },
    { name: "ToolResult", schema: ToolResultSchema },
  ],
};

// JSON Schema metadata
const SCHEMA_BASE = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: "https://ebowwa.github.io/coder/schemas/",
};

function generateJsonSchema(name: string, zodSchema: z.ZodType): Record<string, unknown> {
  const jsonSchema = zodToJsonSchema(zodSchema, {
    name,
    $refStrategy: "root",
    target: "jsonSchema7",
  });

  return {
    ...SCHEMA_BASE,
    ...jsonSchema,
    $id: `${SCHEMA_BASE.$id}${name}.json`,
    title: `${name} Schema`,
  };
}

function writeSchemaFile(category: string, name: string, schema: Record<string, unknown>): void {
  const categoryDir = join(SCHEMAS_DIR, category);
  if (!existsSync(categoryDir)) {
    mkdirSync(categoryDir, { recursive: true });
  }

  const filePath = join(categoryDir, `${name}.json`);
  writeFileSync(filePath, JSON.stringify(schema, null, 2));
  console.log(`  ✓ ${category}/${name}.json`);
}

function generateCategoryIndex(category: string, schemas: SchemaEntry[]): void {
  const index = {
    ...SCHEMA_BASE,
    $id: `${SCHEMA_BASE.$id}${category}/index.json`,
    title: `${category} Schemas Index`,
    description: `JSON Schema definitions for ${category} types`,
    definitions: schemas.reduce(
      (acc, { name, schema }) => {
        acc[name] = generateJsonSchema(name, schema);
        return acc;
      },
      {} as Record<string, unknown>
    ),
  };

  const filePath = join(SCHEMAS_DIR, category, "index.json");
  writeFileSync(filePath, JSON.stringify(index, null, 2));
  console.log(`  ✓ ${category}/index.json`);
}

function generateRootIndex(): void {
  const allSchemas = Object.entries(schemaCollections).flatMap(([category, schemas]) =>
    schemas.map(({ name }) => ({
      category,
      name,
      $ref: `./${category}/${name}.json`,
    }))
  );

  const rootIndex = {
    ...SCHEMA_BASE,
    $id: `${SCHEMA_BASE.$id}index.json`,
    title: "Coder JSON Schemas",
    description: "JSON Schema definitions for @ebowwa/coder types",
    schemas: allSchemas,
    categories: Object.keys(schemaCollections),
  };

  const filePath = join(SCHEMAS_DIR, "index.json");
  writeFileSync(filePath, JSON.stringify(rootIndex, null, 2));
  console.log(`  ✓ index.json (root)`);
}

// Main generation function
function main(): void {
  console.log("\n🔄 Generating JSON Schemas from Zod...\n");

  let totalSchemas = 0;

  for (const [category, schemas] of Object.entries(schemaCollections)) {
    console.log(`📦 ${category}/`);
    for (const { name, schema } of schemas) {
      const jsonSchema = generateJsonSchema(name, schema);
      writeSchemaFile(category, name, jsonSchema);
      totalSchemas++;
    }
    generateCategoryIndex(category, schemas);
  }

  generateRootIndex();

  console.log(`\n✅ Generated ${totalSchemas} JSON Schema files in ${SCHEMAS_DIR}\n`);
}

main();
