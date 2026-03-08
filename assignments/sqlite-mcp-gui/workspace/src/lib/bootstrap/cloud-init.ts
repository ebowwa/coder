/**
 * Cloud-Init Bootstrap Generator
 *
 * Generates cloud-init YAML scripts for first-boot server provisioning.
 * Handles seed repository installation and initial setup.
 */

export interface BootstrapOptions {
  /** Seed repository URL (default: https://github.com/ebowwa/seed) */
  seedRepo?: string;
  /** Seed repository branch (default: dev) */
  seedBranch?: string;
  /** Installation path (default: /root/seed) */
  seedPath?: string;
  /** Whether to run setup.sh non-interactively (default: true) */
  runSetup?: boolean;
  /** Additional environment variables for setup.sh */
  setupEnv?: Record<string, string>;
  /** Additional packages to install */
  packages?: string[];
  /** Additional commands to run after seed installation */
  additionalCommands?: string[];
}

/**
 * Generate a cloud-init YAML script for seed installation
 *
 * @param options - Bootstrap configuration options
 * @returns Cloud-init YAML string
 */
export function generateSeedBootstrap(options: BootstrapOptions = {}): string {
  const {
    seedRepo = "https://github.com/ebowwa/seed",
    seedBranch = "dev",
    seedPath = "/root/seed",
    runSetup = true,
    setupEnv = {},
    packages = [],
    additionalCommands = [],
  } = options;

  const lines: string[] = [];

  // Cloud-config header
  lines.push("#cloud-config");
  lines.push("");

  // System updates
  lines.push("# Update system packages");
  lines.push("package_update: true");
  lines.push("package_upgrade: true");
  lines.push("");

  // Required packages
  lines.push("# Install required packages");
  lines.push("packages:");
  lines.push("  - git");
  lines.push("  - curl");
  lines.push("  - jq");
  lines.push("  - unzip");
  lines.push("  - tmux");

  // Add additional packages
  for (const pkg of packages) {
    lines.push(`  - ${pkg}`);
  }
  lines.push("");

  // Status tracking file
  lines.push("# Write bootstrap status file");
  lines.push("write_files:");
  lines.push("  - path: /root/.bootstrap-status");
  lines.push("    owner: root:root");
  lines.push("    permissions: '0644'");
  lines.push("    content: |");
  lines.push("      status=started");
  lines.push("      started_at=$(date -Iseconds)");
  lines.push("      source=cloud-init");
  lines.push("");

  // Add bun to system-wide PATH via /etc/environment
  // NOTE: /etc/environment uses simple KEY="value" format (no variables, no comments)
  // We need to replace PATH rather than append, and include all standard paths
  lines.push("  # Add bun to /etc/environment for all users/shells");
  lines.push("  # Format: Simple KEY=\"value\" pairs, no variable expansion");
  lines.push("  - path: /etc/environment");
  lines.push("    owner: root:root");
  lines.push("    permissions: '0644'");
  lines.push("    content: |");
  lines.push("      PATH=\"/root/.bun/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin\"");
  lines.push("");

  // Node-agent systemd service
  lines.push("  # Node-agent systemd service for Ralph Loop orchestration");
  lines.push("  - path: /etc/systemd/system/node-agent.service");
  lines.push("    owner: root:root");
  lines.push("    permissions: '0644'");
  lines.push("    content: |");
  lines.push("      [Unit]");
  lines.push("      Description=Node Agent for Ralph Loop Orchestration");
  lines.push("      Documentation=https://github.com/ebowwa/seed");
  lines.push("      After=network-online.target");
  lines.push("      Wants=network-online.target");
  lines.push("");
  lines.push("      [Service]");
  lines.push("      Type=simple");
  lines.push("      User=root");
  lines.push(`      WorkingDirectory=${seedPath}/node-agent`);
  lines.push("      ExecStart=/root/.bun/bin/bun run src/index.ts");
  lines.push(`      EnvironmentFile=-${seedPath}/node-agent/.env`);
  lines.push("      Environment=PORT=8911");
  lines.push("      Restart=always");
  lines.push("      RestartSec=10");
  lines.push("      StandardOutput=journal");
  lines.push("      StandardError=journal");
  lines.push("      SyslogIdentifier=node-agent");
  lines.push("");
  lines.push("      [Install]");
  lines.push("      WantedBy=multi-user.target");
  lines.push("");

  // Run commands
  lines.push("# Bootstrap commands");
  lines.push("runcmd:");

  // Install Bun and create node symlink
  lines.push("  # Install Bun");
  lines.push("  - curl -fsSL https://bun.sh/install | bash");
  lines.push("  - ln -sf /root/.bun/bin/bun /root/.bun/bin/node  # Create 'node' symlink to bun");
  lines.push("");

  // Clone seed repository
  lines.push(`  # Clone seed repository`);
  lines.push(`  - git clone --depth 1 --branch ${seedBranch} ${seedRepo} ${seedPath}`);
  lines.push("");

  if (runSetup) {
    // Build environment variables
    const envVars = ["NONINTERACTIVE=1", ...Object.entries(setupEnv).map(([k, v]) => `${k}=${v}`)];
    const envString = envVars.join(" ");

    lines.push(`  # Run seed setup non-interactively`);
    lines.push(`  - cd ${seedPath} && ${envString} bash ./setup.sh 2>&1 | tee /var/log/seed-setup.log`);
    lines.push("");

    // Create completion marker
    lines.push(`  # Mark setup complete`);
    lines.push(`  - touch ${seedPath}/.seed-setup-complete`);
    lines.push("");
  }

  // Additional commands
  if (additionalCommands.length > 0) {
    lines.push(`  # Additional custom commands`);
    for (const cmd of additionalCommands) {
      lines.push(`  - ${cmd}`);
    }
    lines.push("");
  }

  // Mark bootstrap complete
  lines.push(`  # Mark bootstrap complete`);
  lines.push(`  - echo "status=complete" >> /root/.bootstrap-status`);
  lines.push(`  - echo "completed_at=$(date -Iseconds)" >> /root/.bootstrap-status`);
  lines.push("");
  lines.push("  # Start node-agent service");
  lines.push("  - systemctl daemon-reload");
  lines.push("  - systemctl enable node-agent");
  lines.push("  - systemctl start node-agent");

  return lines.join("\n");
}

/**
 * Generate a minimal cloud-init script that uses #include to fetch from a URL
 *
 * This is useful for larger bootstrap scripts or when you want to update
 * the bootstrap without code changes.
 *
 * @param url - URL to fetch the cloud-init config from
 * @returns Cloud-init YAML string with #include directive
 */
export function generateRemoteBootstrap(url: string): string {
  return `#include\n${url}`;
}

/**
 * Bootstrap configuration presets for common scenarios
 */
export const BootstrapPresets = {
  /**
   * Default seed installation with setup.sh
   */
  default: () => generateSeedBootstrap(),

  /**
   * Seed installation without running setup.sh
   * Useful for debugging or manual setup
   */
  cloneOnly: () => generateSeedBootstrap({ runSetup: false }),

  /**
   * Verbose bootstrap with logging enabled
   */
  verbose: () =>
    generateSeedBootstrap({
      setupEnv: {
        DEBUG: "1",
        VERBOSE: "1",
      },
    }),
} as const;

// Re-export Genesis bootstrap functions
export {
  generateGenesisBootstrap,
  generateRemoteGenesisBootstrap,
  GenesisBootstrapPresets,
  type GenesisBootstrapOptions,
} from "./genesis";
