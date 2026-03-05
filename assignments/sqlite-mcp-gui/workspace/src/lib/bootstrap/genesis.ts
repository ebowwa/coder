/**
 * Genesis Server Bootstrap Generator
 *
 * Generates cloud-init YAML scripts for Genesis server provisioning.
 * Genesis is a bootstrap/control plane node that runs com.hetzner.codespaces
 * and manages Hetzner VPS worker nodes.
 */

export interface GenesisBootstrapOptions {
  /** Admin SSH public key for genesis user */
  adminSSHKey: string;

  /** Genesis repository URL (default: https://github.com/ebowwa/com.hetzner.codespaces) */
  genesisRepo?: string;

  /** Genesis repository branch or tag */
  genesisBranch?: string;

  /** Genesis server hostname (default: genesis) */
  hostname?: string;

  /** Default Hetzner server type for workers */
  defaultServerType?: string;

  /** Default Hetzner location */
  defaultLocation?: string;

  /** Maximum concurrent workers */
  maxWorkers?: string;

  /** Additional packages to install */
  packages?: string[];

  /** Additional commands to run after genesis setup */
  additionalCommands?: string[];
}

/**
 * Generate a cloud-init YAML script for Genesis server bootstrap
 *
 * @param options - Genesis bootstrap configuration options
 * @returns Cloud-init YAML string
 */
export function generateGenesisBootstrap(options: GenesisBootstrapOptions): string {
  const {
    adminSSHKey,
    genesisRepo = "https://github.com/ebowwa/com.hetzner.codespaces",
    genesisBranch = "main",
    hostname = "genesis",
    defaultServerType = "cpx11",
    defaultLocation = "fsn1",
    maxWorkers = "10",
    packages = [],
    additionalCommands = [],
  } = options;

  if (!adminSSHKey) {
    throw new Error("adminSSHKey is required for Genesis bootstrap");
  }

  const lines: string[] = [];

  // Cloud-config header
  lines.push("#cloud-config");
  lines.push("# Genesis Server Bootstrap Configuration");
  lines.push("# Version: 1.0.0");
  lines.push("");
  lines.push("# This cloud-init config bootstraps a Genesis server that:");
  lines.push("# - Runs com.hetzner.codespaces web application");
  lines.push("# - Uses the existing Hetzner API to create any server");
  lines.push("# - Can be ephemeral and recreated at any time");
  lines.push("");
  lines.push("# IMPORTANT: Never store secrets in cloud-init! Use Vault/SOPS/external sources.");
  lines.push("");

  // STAGE 1: Network & Early Setup
  lines.push("# =====================================================");
  lines.push("# STAGE 1: Network & Early Setup (Network stage)");
  lines.push("# =====================================================");
  lines.push("");
  lines.push(`hostname: ${hostname}`);
  lines.push("manage_etc_hosts: true");
  lines.push("timezone: UTC");
  lines.push("");

  // STAGE 2: SSH & Security
  lines.push("# =====================================================");
  lines.push("# STAGE 2: SSH & Security (Network stage)");
  lines.push("# =====================================================");
  lines.push("");
  lines.push("ssh_pwauth: false");
  lines.push("");
  lines.push("# Create genesis service user");
  lines.push("users:");
  lines.push("  - name: genesis");
  lines.push("    gecos: Genesis Service Account");
  lines.push("    primary_group: genesis");
  lines.push("    groups: docker,wheel");
  lines.push("    sudo: ALL=(ALL) NOPASSWD:ALL");
  lines.push("    shell: /bin/bash");
  lines.push("    lock_passwd: true");
  lines.push("    ssh_authorized_keys:");
  lines.push(`      - ${adminSSHKey}`);
  lines.push("");

  // STAGE 3: Package Management
  lines.push("# =====================================================");
  lines.push("# STAGE 3: Package Management (Config stage)");
  lines.push("# =====================================================");
  lines.push("");
  lines.push("package_update: true");
  lines.push("package_upgrade: false");
  lines.push("package_reboot_if_required: true");
  lines.push("");
  lines.push("packages:");
  lines.push("  - curl");
  lines.push("  - wget");
  lines.push("  - git");
  lines.push("  - unzip");
  lines.push("  - jq");
  lines.push("  - build-essential");

  // Add additional packages
  for (const pkg of packages) {
    lines.push(`  - ${pkg}`);
  }
  lines.push("");

  // STAGE 4: Application Setup
  lines.push("# =====================================================");
  lines.push("# STAGE 4: Application Setup (Config stage)");
  lines.push("# =====================================================");
  lines.push("");
  lines.push("write_files:");

  // Genesis directories
  lines.push("  # Genesis application directories");
  lines.push("  - path: /opt/genesis");
  lines.push("    owner: genesis:genesis");
  lines.push("    permissions: '0755'");
  lines.push("");
  lines.push("  - path: /opt/genesis/data");
  lines.push("    owner: genesis:genesis");
  lines.push("    permissions: '0755'");
  lines.push("");
  lines.push("  - path: /var/log/genesis");
  lines.push("    owner: genesis:genesis");
  lines.push("    permissions: '0755'");
  lines.push("");

  // Environment file template
  lines.push("  # Environment file template (do NOT include actual secrets)");
  lines.push("  - path: /etc/default/genesis.template");
  lines.push("    owner: genesis:genesis");
  lines.push("    permissions: '0640'");
  lines.push("    content: |");
  lines.push("      # Genesis Server Environment Configuration");
  lines.push("      # Copy this to /etc/default/genesis and fill in required values");
  lines.push("      #");
  lines.push("      # DO NOT commit actual secrets to version control!");
  lines.push("");
  lines.push("      # Application Settings");
  lines.push("      NODE_ENV=production");
  lines.push(`      PORT=3000`);
  lines.push(`      HOST=0.0.0.0`);
  lines.push("");
  lines.push("      # Hetzner API (REQUIRED - use Vault or Secrets Manager in production)");
  lines.push("      # HETZNER_API_TOKEN should be set securely after bootstrap");
  lines.push("      HETZNER_DEFAULT_TYPE=" + defaultServerType);
  lines.push("      HETZNER_DEFAULT_LOCATION=" + defaultLocation);
  lines.push("      MAX_WORKER_NODES=" + maxWorkers);
  lines.push("");

  // Systemd service unit
  lines.push("  # Genesis systemd service unit");
  lines.push("  - path: /etc/systemd/system/genesis.service");
  lines.push("    owner: root:root");
  lines.push("    permissions: '0644'");
  lines.push("    content: |");
  lines.push("      [Unit]");
  lines.push("      Description=Genesis Application Server (com.hetzner.codespaces)");
  lines.push("      Documentation=https://github.com/ebowwa/com.hetzner.codespaces");
  lines.push("      After=network-online.target");
  lines.push("      Wants=network-online.target");
  lines.push("");
  lines.push("      [Service]");
  lines.push("      Type=simple");
  lines.push("      User=genesis");
  lines.push("      Group=genesis");
  lines.push("      WorkingDirectory=/opt/genesis");
  lines.push("");
  lines.push("      # Execution");
  lines.push("      ExecStart=/usr/bin/bun start");
  lines.push("      ExecReload=/bin/kill -HUP $MAINPID");
  lines.push("");
  lines.push("      # Restart Policy (with rate limiting)");
  lines.push("      Restart=on-failure");
  lines.push("      RestartSec=5s");
  lines.push("      StartLimitIntervalSec=300");
  lines.push("      StartLimitBurst=5");
  lines.push("");
  lines.push("      # Logging");
  lines.push("      StandardOutput=journal");
  lines.push("      StandardError=journal");
  lines.push("      SyslogIdentifier=genesis");
  lines.push("");
  lines.push("      # Environment");
  lines.push('      Environment="NODE_ENV=production"');
  lines.push("      EnvironmentFile=/etc/default/genesis");
  lines.push("      EnvironmentFile=-/etc/default/genesis.local");
  lines.push("");
  lines.push("      # Resource Limits");
  lines.push("      LimitNOFILE=65536");
  lines.push("");
  lines.push("      # Security Hardening");
  lines.push("      NoNewPrivileges=true");
  lines.push("      PrivateTmp=true");
  lines.push("      ProtectSystem=strict");
  lines.push("      ProtectHome=true");
  lines.push("      ReadWritePaths=/opt/genesis/data /var/log/genesis");
  lines.push("");
  lines.push("      [Install]");
  lines.push("      WantedBy=multi-user.target");
  lines.push("");

  // Bootstrap status tracking
  lines.push("  # Bootstrap status tracking");
  lines.push("  - path: /root/.genesis-bootstrap-status");
  lines.push("    owner: root:root");
  lines.push("    permissions: '0644'");
  lines.push("    content: |");
  lines.push("      status=started");
  lines.push("      started_at=$(date -Iseconds)");
  lines.push("      source=cloud-init");
  lines.push("      version=1.0.0");
  lines.push("");

  // Add bun to /etc/environment
  lines.push("  # Add bun to /etc/environment for all users/shells");
  lines.push("  # Format: Simple KEY=\"value\" pairs, no variable expansion");
  lines.push("  - path: /etc/environment");
  lines.push("    owner: root:root");
  lines.push("    permissions: '0644'");
  lines.push("    content: |");
  lines.push('      PATH="/root/.bun/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"');
  lines.push("");

  // STAGE 5: Run Commands
  lines.push("# =====================================================");
  lines.push("# STAGE 5: Run Commands (Config stage)");
  lines.push("# =====================================================");
  lines.push("");
  lines.push("runcmd:");

  // Install Bun
  lines.push("  # Install Bun runtime");
  lines.push("  - curl -fsSL https://bun.sh/install | bash");
  lines.push("");

  // Clone genesis application
  lines.push("  # Clone/pull genesis application");
  const cloneCmd = genesisBranch
    ? `git clone --depth 1 --branch ${genesisBranch} ${genesisRepo} /opt/genesis`
    : `git clone --depth 1 ${genesisRepo} /opt/genesis`;

  lines.push(`  - |`);
  lines.push(`    if [ ! -d /opt/genesis/.git ]; then`);
  lines.push(`      ${cloneCmd}`);
  lines.push(`    else`);
  lines.push(`      cd /opt/genesis && git pull`);
  lines.push(`    fi`);
  lines.push("");

  // Install dependencies
  lines.push("  # Install dependencies");
  lines.push("  - cd /opt/genesis && bun install");
  lines.push("");

  // Build application
  lines.push("  # Build application (if needed)");
  lines.push("  - cd /opt/genesis && bun run build");
  lines.push("");

  // Configure environment warning
  lines.push("  # Configure environment (prompt for secrets or use external source)");
  lines.push("  - |");
  lines.push(`    echo "WARNING: HETZNER_API_TOKEN must be configured in /etc/default/genesis"`);
  lines.push("");

  // Enable and start service
  lines.push("  # Enable and start genesis service");
  lines.push("  - systemctl daemon-reload");
  lines.push("  - systemctl enable genesis.service");
  lines.push("  - systemctl start genesis.service");
  lines.push("");

  // Mark bootstrap complete
  lines.push("  # Mark bootstrap complete");
  lines.push('  - echo "status=complete" >> /root/.genesis-bootstrap-status');
  lines.push('  - echo "completed_at=$(date -Iseconds)" >> /root/.genesis-bootstrap-status');
  lines.push("");

  // Additional commands
  if (additionalCommands.length > 0) {
    lines.push("  # Additional custom commands");
    for (const cmd of additionalCommands) {
      lines.push(`  - ${cmd}`);
    }
    lines.push("");
  }

  // STAGE 6: Final
  lines.push("# =====================================================");
  lines.push("# STAGE 6: Final (Final stage)");
  lines.push("# =====================================================");
  lines.push("");
  lines.push('final_message: "Genesis server bootstrap completed after $UPTIME seconds"');

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
export function generateRemoteGenesisBootstrap(url: string): string {
  return `#include\n${url}`;
}

/**
 * Genesis bootstrap configuration presets for common scenarios
 */
export const GenesisBootstrapPresets = {
  /**
   * Default Genesis server with standard configuration
   */
  default: (adminSSHKey: string) =>
    generateGenesisBootstrap({
      adminSSHKey,
    }),

  /**
   * Genesis server with ARM architecture (CAX series - best €/performance)
   */
  arm: (adminSSHKey: string) =>
    generateGenesisBootstrap({
      adminSSHKey,
      defaultServerType: "cax21",
    }),

  /**
   * Genesis server with high-performance CPU (CPX series)
   */
  performance: (adminSSHKey: string) =>
    generateGenesisBootstrap({
      adminSSHKey,
      defaultServerType: "cpx21",
    }),

  /**
   * Genesis server with dedicated CPU (CCX series)
   */
  dedicated: (adminSSHKey: string) =>
    generateGenesisBootstrap({
      adminSSHKey,
      defaultServerType: "ccx13",
    }),

  /**
   * Development Genesis server with extra packages
   */
  development: (adminSSHKey: string) =>
    generateGenesisBootstrap({
      adminSSHKey,
      packages: ["htop", "vim", "tmux", "strace"],
      additionalCommands: [
        "echo 'Genesis development server ready' | wall",
      ],
    }),
} as const;
