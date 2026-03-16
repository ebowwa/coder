/**
 * CLI Configuration Management
 *
 * Handles loading, saving, and managing CLI configuration.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Configuration interface
 */
export interface CLIConfig {
  /** API endpoint for CRM backend */
  apiEndpoint: string;

  /** Default output format */
  outputFormat: 'table' | 'json' | 'plain';

  /** Default page size for lists */
  pageSize: number;

  /** Default currency */
  currency: string;

  /** Color output enabled */
  colorEnabled: boolean;

  /** Editor for multiline input */
  editor?: string;

  /** Recent contacts for quick access */
  recentContacts: string[];

  /** Recent deals for quick access */
  recentDeals: string[];

  /** Custom aliases */
  aliases: Record<string, string>;

  /** User preferences */
  preferences: {
    defaultStatus?: string;
    defaultDealStage?: string;
    defaultPriority?: string;
  };
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: CLIConfig = {
  apiEndpoint: 'http://localhost:3000/api',
  outputFormat: 'table',
  pageSize: 20,
  currency: 'USD',
  colorEnabled: true,
  recentContacts: [],
  recentDeals: [],
  aliases: {},
  preferences: {},
};

/**
 * Get config file path
 */
function getConfigPath(): string {
  const configDir = path.join(os.homedir(), '.crm');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  return path.join(configDir, 'config.json');
}

/**
 * Load configuration from file
 */
export function loadConfig(): CLIConfig {
  const configPath = getConfigPath();

  if (!fs.existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    const userConfig = JSON.parse(content);
    return { ...DEFAULT_CONFIG, ...userConfig };
  } catch (error) {
    console.error('Warning: Failed to load config, using defaults');
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Save configuration to file
 */
export function saveConfig(config: CLIConfig): void {
  const configPath = getConfigPath();

  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save config:', error);
  }
}

/**
 * Update specific config value
 */
export function updateConfig<K extends keyof CLIConfig>(
  key: K,
  value: CLIConfig[K]
): void {
  const config = loadConfig();
  config[key] = value;
  saveConfig(config);
}

/**
 * Get a config value
 */
export function getConfig<K extends keyof CLIConfig>(
  key: K
): CLIConfig[K] {
  const config = loadConfig();
  return config[key];
}

/**
 * Add to recent contacts
 */
export function addRecentContact(contactId: string): void {
  const config = loadConfig();
  const recent = config.recentContacts.filter((id) => id !== contactId);
  recent.unshift(contactId);
  config.recentContacts = recent.slice(0, 10); // Keep last 10
  saveConfig(config);
}

/**
 * Add to recent deals
 */
export function addRecentDeal(dealId: string): void {
  const config = loadConfig();
  const recent = config.recentDeals.filter((id) => id !== dealId);
  recent.unshift(dealId);
  config.recentDeals = recent.slice(0, 10); // Keep last 10
  saveConfig(config);
}

/**
 * Set an alias
 */
export function setAlias(name: string, command: string): void {
  const config = loadConfig();
  config.aliases[name] = command;
  saveConfig(config);
}

/**
 * Remove an alias
 */
export function removeAlias(name: string): boolean {
  const config = loadConfig();
  if (config.aliases[name]) {
    delete config.aliases[name];
    saveConfig(config);
    return true;
  }
  return false;
}

/**
 * Resolve alias to command
 */
export function resolveAlias(name: string): string | null {
  const config = loadConfig();
  return config.aliases[name] || null;
}

/**
 * Reset configuration to defaults
 */
export function resetConfig(): void {
  saveConfig({ ...DEFAULT_CONFIG });
}

/**
 * Display current configuration
 */
export function displayConfig(): void {
  const config = loadConfig();
  console.log('\nCurrent Configuration:\n');

  const entries: [string, unknown][] = [
    ['API Endpoint', config.apiEndpoint],
    ['Output Format', config.outputFormat],
    ['Page Size', config.pageSize],
    ['Currency', config.currency],
    ['Color Enabled', config.colorEnabled],
    ['Editor', config.editor || '(system default)'],
    ['Recent Contacts', config.recentContacts.length],
    ['Recent Deals', config.recentDeals.length],
    ['Aliases', Object.keys(config.aliases).length],
  ];

  for (const [key, value] of entries) {
    console.log(`  \x1b[36m${key}:\x1b[0m ${value}`);
  }

  console.log();
}

/**
 * Config file location
 */
export function getConfigLocation(): string {
  return getConfigPath();
}

/**
 * Environment variable overrides
 */
export function applyEnvOverrides(config: CLIConfig): CLIConfig {
  const envConfig = { ...config };

  if (process.env.CRM_API_ENDPOINT) {
    envConfig.apiEndpoint = process.env.CRM_API_ENDPOINT;
  }

  if (process.env.CRM_OUTPUT_FORMAT) {
    envConfig.outputFormat = process.env.CRM_OUTPUT_FORMAT as CLIConfig['outputFormat'];
  }

  if (process.env.CRM_CURRENCY) {
    envConfig.currency = process.env.CRM_CURRENCY;
  }

  if (process.env.NO_COLOR) {
    envConfig.colorEnabled = false;
  }

  return envConfig;
}

/**
 * Initialize config with interactive prompts
 */
export async function initConfig(): Promise<void> {
  const { prompt, confirm, select } = await import('./prompt.js');

  console.log('\n\x1b[1mCRM CLI Configuration\x1b[0m\n');
  console.log('Let\'s set up your CRM CLI configuration.\n');

  const config = loadConfig();

  // API Endpoint
  const apiEndpoint = await prompt('API Endpoint', config.apiEndpoint);
  if (apiEndpoint) {
    config.apiEndpoint = apiEndpoint;
  }

  // Output format
  config.outputFormat = await select(
    'Default output format',
    ['table', 'json', 'plain'] as const,
    config.outputFormat
  );

  // Page size
  const pageSizeStr = await prompt('Default page size', String(config.pageSize));
  const pageSize = parseInt(pageSizeStr);
  if (!isNaN(pageSize) && pageSize > 0) {
    config.pageSize = pageSize;
  }

  // Currency
  config.currency = await select(
    'Default currency',
    ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'],
    config.currency
  );

  // Color
  config.colorEnabled = await confirm('Enable color output?', config.colorEnabled);

  // Editor
  const editor = await prompt('Editor for multiline input (e.g., vim, code)', config.editor);
  if (editor) {
    config.editor = editor;
  }

  saveConfig(config);

  console.log('\n\x1b[32m\u2713 Configuration saved!\x1b[0m');
  console.log(`\nConfig file: ${getConfigPath()}\n`);
}
