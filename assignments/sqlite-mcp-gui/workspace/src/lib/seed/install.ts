/**
 * Seed Installation Module
 *
 * Handles cloning and setting up the ebowwa/seed repository on remote VPS instances.
 * The seed repo contains the base configuration for VPS nodes including:
 * - Claude Code setup
 * - GitHub CLI configuration
 * - Doppler secrets management
 * - Tailscale VPN
 * - Distributed Claude skills
 */

import { execSSH } from "../ssh/client.js";
import type { SSHOptions } from "../ssh/types.js";

/**
 * Result of seed installation
 */
export interface SeedInstallResult {
  success: boolean;
  cloned: boolean;
  setupRun: boolean;
  seedPath: string;
  error?: string;
  output: string[];
}

/**
 * Login commands for accessing the VPS
 */
export interface VPSLoginCommands {
  /** Direct SSH command */
  ssh: string;
  /** Web terminal URL (relative path) */
  web: string;
  /** Claude chat command for distributed Claude */
  claude: string;
  /** Quick connect command for copy-paste */
  quick: string;
}

/**
 * Progress callback type for installation updates
 */
export type SeedInstallProgressCallback = (message: string) => void;

/**
 * Install seed repository on a remote VPS
 *
 * This function:
 * 1. Clones ebowwa/seed to ~/seed on the VPS
 * 2. Runs setup.sh with auto-confirmation
 * 3. Returns installation status
 *
 * @param host - VPS IP address or hostname
 * @param options - SSH connection options
 * @param onProgress - Optional callback for installation progress updates
 * @returns Installation result with status and output
 */
export async function installSeed(
  host: string,
  options: Partial<SSHOptions> = {},
  onProgress?: SeedInstallProgressCallback,
): Promise<SeedInstallResult> {
  const sshOptions: SSHOptions = {
    host,
    user: "root",
    timeout: 120, // 2 minutes for cloning + setup
    ...options,
  };

  const output: string[] = [];
  const seedPath = "/root/seed";

  // Helper to log to both output array and progress callback
  const log = (msg: string) => {
    output.push(msg);
    onProgress?.(msg);
  };

  try {
    // Step 1: Check if seed already exists
    log("Checking for existing seed installation...");
    let alreadyCloned = false;
    try {
      const checkResult = await execSSH(
        `test -d ${seedPath} && echo "exists" || echo "not_found"`,
        {
          ...sshOptions,
          timeout: 10, // Increased from 5
        },
      );
      alreadyCloned = checkResult.trim() === "exists";
    } catch (checkError) {
      // Check might have failed due to SSH timing issues - try once more
      log(
        `Initial check failed, retrying: ${checkError instanceof Error ? checkError.message : String(checkError)}`,
      );
      try {
        const checkResult = await execSSH(
          `test -d ${seedPath} && echo "exists" || echo "not_found"`,
          {
            ...sshOptions,
            timeout: 10,
          },
        );
        alreadyCloned = checkResult.trim() === "exists";
      } catch (retryError) {
        // Assume not cloned if both checks fail
        log(`Check retry also failed, assuming fresh install`);
        alreadyCloned = false;
      }
    }

    if (alreadyCloned) {
      log("Seed repo exists at ~/seed, checking if setup was run...");

      // Check if setup actually completed by looking for a marker file
      let setupCheckResult: string;
      try {
        setupCheckResult = await execSSH(
          `test -f ${seedPath}/.seed-setup-complete && echo "setup_done" || echo "setup_needed"`,
          {
            ...sshOptions,
            timeout: 10,
          },
        );
      } catch (markerError) {
        // Marker check failed - assume setup not done
        log(
          `Marker check failed, assuming setup needed: ${markerError instanceof Error ? markerError.message : String(markerError)}`,
        );
        setupCheckResult = "setup_needed";
      }

      if (setupCheckResult.trim() === "setup_done") {
        log("Setup already completed, pulling latest...");
        try {
          const pullResult = await execSSH(
            `cd ${seedPath} && git pull origin dev`,
            {
              ...sshOptions,
              timeout: 30,
            },
          );
          log(`Git pull: ${pullResult}`);
        } catch (pullError) {
          log(`Git pull failed (continuing anyway): ${pullError}`);
        }
        // Already set up, skip to verification
        return {
          success: true,
          cloned: false,
          setupRun: true,
          seedPath,
          output,
        };
      }

      log("Repo cloned but setup not run, will run setup now...");
    } else {
      // Step 2: Clone the repository
      // Clone dev branch which contains the Node Agent orchestration features
      // This branch includes: Ralph Loop management, worktree support, PM daemon, and distributed Claude skills
      // TODO: Make branch configurable via metadata (e.g., metadata.seedBranch)
      log("Cloning ebowwa/seed repository (dev branch)...");
      try {
        const cloneResult = await execSSH(
          `git clone --depth 1 --branch dev https://github.com/ebowwa/seed.git ${seedPath}`,
          {
            ...sshOptions,
            timeout: 120, // Increased from 60 to 120 seconds
          },
        );
        log(`Clone result: ${cloneResult}`);
      } catch (cloneError) {
        // Clone might have succeeded despite error (timeout or network issue)
        // Check if directory actually exists before giving up
        const checkExists = await execSSH(
          `test -d ${seedPath} && echo "exists" || echo "not_found"`,
          {
            ...sshOptions,
            timeout: 5,
          },
        );

        if (checkExists.trim() === "exists") {
          log(
            `Clone command errored but directory exists, continuing: ${cloneError instanceof Error ? cloneError.message : String(cloneError)}`,
          );
        } else {
          // Directory really doesn't exist, this is a real failure
          log(
            `Clone failed: ${cloneError instanceof Error ? cloneError.message : String(cloneError)}`,
          );
          throw cloneError;
        }
      }
    }

    // Step 3: Run setup.sh with auto-confirmation
    // Using 'yes' command to auto-confirm all prompts
    log("Running setup.sh with auto-confirmation...");
    try {
      const setupResult = await execSSH(
        `cd ${seedPath} && yes | bash setup.sh`,
        {
          ...sshOptions,
          timeout: 180, // Increased to 3 minutes for setup (might install packages)
        },
      );
      log(`Setup result: ${setupResult}`);

      // Create marker file to indicate setup completed
      try {
        await execSSH(`touch ${seedPath}/.seed-setup-complete`, {
          ...sshOptions,
          timeout: 10,
        });
        log("Created setup completion marker");
      } catch (markerError) {
        log(
          `Warning: Failed to create marker file: ${markerError instanceof Error ? markerError.message : String(markerError)}`,
        );
      }
    } catch (setupError) {
      log(
        `Setup failed: ${setupError instanceof Error ? setupError.message : String(setupError)}`,
      );
      // Continue to verify anyway
    }

    // Step 4: Verify installation
    log("Verifying installation...");
    const verifyResult = await execSSH(
      `test -f ${seedPath}/setup.sh && test -f ${seedPath}/chat.sh && echo "verified" || echo "incomplete"`,
      {
        ...sshOptions,
        timeout: 5,
      },
    );

    const verified = verifyResult.trim() === "verified";

    return {
      success: verified,
      cloned: true,
      setupRun: true,
      seedPath,
      output,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Installation error: ${errorMessage}`);

    return {
      success: false,
      cloned: false,
      setupRun: false,
      seedPath,
      error: errorMessage,
      output,
    };
  }
}

/**
 * Generate login commands for a VPS
 *
 * @param serverId - Server/environment ID
 * @param ipv4 - IPv4 address
 * @param user - SSH user (default: root)
 * @returns Login commands
 */
export function generateLoginCommands(
  serverId: string,
  ipv4: string | null,
  user: string = "root",
): VPSLoginCommands {
  const host = ipv4 || "<IP_ADDRESS>";

  return {
    ssh: `ssh ${user}@${host}`,
    web: `/terminal?server=${serverId}`,
    claude: `ssh ${user}@${host} 'cd ~/seed && ./chat.sh "hello"'`,
    quick: `ssh root@${host}`,
  };
}

/**
 * Get seed installation status without installing
 *
 * @param host - VPS IP address or hostname
 * @param options - SSH connection options
 * @returns Installation status
 */
export async function getSeedStatus(
  host: string,
  options: Partial<SSHOptions> = {},
): Promise<{
  installed: boolean;
  setupComplete: boolean;
  version?: string;
  branch?: string;
}> {
  const sshOptions: SSHOptions = {
    host,
    user: "root",
    timeout: 10,
    ...options,
  };

  try {
    // Check if seed directory exists
    const checkResult = await execSSH(
      `test -d /root/seed && echo "exists" || echo "not_found"`,
      sshOptions,
    );

    if (checkResult.trim() !== "exists") {
      return { installed: false, setupComplete: false };
    }

    // Check if setup was completed
    let setupComplete = false;
    try {
      const setupCheck = await execSSH(
        `test -f /root/seed/.seed-setup-complete && echo "done" || echo "incomplete"`,
        sshOptions,
      );
      setupComplete = setupCheck.trim() === "done";
    } catch {
      // Assume incomplete if check fails
    }

    // Get git info if available
    try {
      const branch = await execSSH(
        `cd /root/seed && git rev-parse --abbrev-ref HEAD`,
        sshOptions,
      );
      const commit = await execSSH(
        `cd /root/seed && git rev-parse --short HEAD`,
        sshOptions,
      );

      return {
        installed: true,
        setupComplete,
        version: commit.trim(),
        branch: branch.trim(),
      };
    } catch {
      return { installed: true, setupComplete };
    }
  } catch {
    return { installed: false, setupComplete: false };
  }
}

/**
 * Update seed on an existing installation
 *
 * @param host - VPS IP address or hostname
 * @param options - SSH connection options
 * @returns Update result
 */
export async function updateSeed(
  host: string,
  options: Partial<SSHOptions> = {},
): Promise<{ success: boolean; output: string }> {
  const sshOptions: SSHOptions = {
    host,
    user: "root",
    timeout: 60,
    ...options,
  };

  try {
    const result = await execSSH(`cd /root/seed && git pull`, sshOptions);
    return { success: true, output: result };
  } catch (error) {
    return {
      success: false,
      output: error instanceof Error ? error.message : String(error),
    };
  }
}
/** TODO:
 * - we handle this when the terminal is exposed but also true we should handle this with the server bootstrap
 * - we will need to carefully handle the auths of git, doppler, and Tailscale
 * - tmux should have sep windows for each sign in command
 **/
