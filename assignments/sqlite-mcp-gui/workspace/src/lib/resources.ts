/**
 * Resource monitoring commands for remote servers
 *
 * IMPORTANT LESSONS LEARNED (from testing on Hetzner nodes):
 * ============================================================
 *
 * 1. SSH Authentication: These commands require SSH key authentication.
 *    The API endpoint MUST pass `keyPath` from metadata to execSSHParallel(),
 *    otherwise SSH connection will fail with "All configured authentication methods failed".
 *
 * 2. Command Testing Results (tested on Ubuntu 24.04 Hetzner node):
 *    - cpu: ✓ WORKS - returns decimal percentage (e.g., "1.47333")
 *    - memory: ✓ WORKS - returns "percent used_gb total_gb" (e.g., "14.5858 0.544106 3.73039")
 *    - disk: ✓ WORKS - returns "percent used_size total_size" (e.g., "4% 1.2G 38G")
 *    - gpu: ✓ WORKS - returns "NOGPU" when no NVIDIA GPU present (fallback works!)
 *    - network: ✓ WORKS - returns rx/tx bytes (e.g., "10484 10484")
 *    - loadavg: ✓ WORKS - returns 3 load averages (e.g., "0.72 0.16 0.09")
 *    - processes: ✓ WORKS - returns process count (e.g., "133")
 *    - connections: ✓ WORKS - returns connection count (e.g., "17")
 *    - ports: ⚠ PARTIAL - works but includes "local_address" due to header row in /proc/net/tcp
 *
 * 3. GPU Command Fallback: The `|| echo NOGPU` fallback DOES work correctly.
 *    When nvidia-smi is not available, it cleanly returns "NOGPU" without errors.
 *
 * 4. SSH Pool Error Handling: The pool throws on stderr without stdout.
 *    See pool.ts:149-151 - this is why commands must handle their own errors
 *    and return sensible fallback values rather than failing.
 *
 * Each command returns space-separated values for easy parsing.
 * Commands avoid complex quoting to ensure reliable SSH execution.
 */

// TODO: Thread monitoring

import { parseResources as parseResourcesShared } from "../../../../packages/src/types/resources";

// Re-export parseResources from shared
export { parseResources as parseResourcesShared };

/**
 * SSH commands for fetching system resources
 * Returns: raw command string to execute via SSH
 * Avoids quotes and complex pipes for reliable SSH execution through base64 wrapper
 *
 * LESSON LEARNED (2026-01-19): These commands are tested on actual Hetzner nodes.
 * See test-commands.mjs for live testing. All commands return space-separated values
 * for easy parsing and handle their own errors with fallbacks.
 */
export const RESOURCE_COMMANDS = {
  /**
   * CPU usage percentage
   * Format: "12.5" (user+system as percentage of total)
   *
   * Command breakdown:
   * - cat /proc/stat | head -1: Get first line with aggregate CPU stats
   * - Fields: user(nice) system idle iowait irq...
   * - Formula: (user + system) / (user + system + idle) * 100
   * - $2=user, $4=system, $5=idle (nice included in user)
   *
   * LESSON: Using user+system vs total gives active CPU percentage,
   * not idle percentage. This is more intuitive for monitoring.
   */
  cpu: `cat /proc/stat | head -1 | awk '{print ($2+$4)*100/($2+$4+$5)}'`,

  /**
   * Memory usage - reads from /proc/meminfo
   * Format: "percent used_gb total_gb"
   * Example: "17.5 0.7 3.7"
   *
   * Command breakdown:
   * - grep -E '^MemTotal|^MemAvailable': Get total and available memory
   * - awk stores MemTotal on first line (t), MemAvailable on second (a)
   * - Used = Total - Available
   * - Output: percent_used, used_gb, total_gb
   *
   * LESSON: /proc/meminfo values are in KB. Divide by 1024^2 to get GB.
   * MemAvailable includes reclaimable memory, giving realistic "free" amount.
   */
  memory: `cat /proc/meminfo | grep -E '^MemTotal|^MemAvailable' | awk '{if(NR==1)t=$2; else a=$2} END {print (t-a)*100/t, (t-a)/1024/1024, t/1024/1024}'`,

  /**
   * Disk usage for root partition
   * Format: "percent used_size total_size"
   * Example: "4% 2.8G 75G"
   *
   * Command breakdown:
   * - df -h /: Human-readable disk stats for root
   * - grep -v '^Filesystem': Skip header row
   * - awk '{print $5, $3, $2}': percent, used, total columns
   * - head -1: Get first (usually only) filesystem
   *
   * LESSON: df -h returns sizes like "2.8G" - parser adds space before unit.
   * We take output as-is and let parser handle formatting consistency.
   */
  disk: `df -h / | grep -v '^Filesystem' | awk '{print $5, $3, $2}' | head -1`,

  /**
   * GPU usage (if NVIDIA GPU present)
   * Format: "utilization_percent memory_used_mb memory_total_mb" or "NOGPU"
   * Example: "45 2048 8192" or "NOGPU"
   *
   * Command breakdown:
   * - type nvidia-smi 2>/dev/null: Check if nvidia-smi exists silently
   * - &&: If exists, run query (utilization, memory.used, memory.total)
   * - --format=csv,noheader,nounits: Clean CSV output without units
   * - head -1: Get first GPU (most systems have 1)
   * - || echo NOGPU: Fallback if nvidia-smi not found
   *
   * LESSON: The || echo NOGPU fallback is CRITICAL. It ensures we always
   * get valid output even on non-GPU systems. Parser checks for "NOGPU".
   */
  gpu: `type nvidia-smi 2>/dev/null && nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits | head -1 || echo NOGPU`,

  /**
   * Network I/O bytes (total rx/tx since boot)
   * Format: "rx_bytes tx_bytes"
   * Example: "1234567890 987654321"
   *
   * Command breakdown:
   * - cat /proc/net/dev: Network interface statistics
   * - grep -E ': ': Find interface lines (contain colon)
   * - head -1: Get first interface (usually eth0 or ens*)
   * - awk '{print $2, $10}': rx_bytes (field 2), tx_bytes (field 10)
   *
   * LESSON: /proc/net/dev has header rows. Interface lines have format
   * "interface: rx_bytes ... tx_bytes". Fields are 0-indexed after interface.
   */
  network: `cat /proc/net/dev | grep -E ': ' | head -1 | awk '{print $2, $10}'`,

  /**
   * Load average (1min, 5min, 15min)
   * Format: "1min 5min 15min"
   * Example: "0.50 0.75 1.00"
   *
   * Command breakdown:
   * - cat /proc/loadavg: Load average and run queue data
   * - cut -d' ' -f1-3: Extract first 3 space-separated fields
   *
   * LESSON: Load average is number of processes waiting for CPU.
   * Values are normalized by CPU count. 1.0 = fully utilized single core.
   * The 1min value is most useful for current load, 15min for trends.
   */
  loadavg: `cut -d' ' -f1-3 /proc/loadavg`,

  /**
   * Active process count
   * Format: "count"
   * Example: "142"
   *
   * Command breakdown:
   * - ls /proc: List all entries in /proc (each process has a numbered dir)
   * - 2>/dev/null: Suppress permission errors
   * - grep -cE '^[0-9]+$': Count entries that are only digits
   *
   * LESSON: Each running process has a /proc/[PID] directory. Counting
   * these directories gives us the process count. Kernel threads included.
   */
  processes: `ls /proc 2>/dev/null | grep -cE '^[0-9]+$'`,

  /**
   * Active network connections (established + listening)
   * Format: "count"
   * Example: "45"
   *
   * Command breakdown:
   * - cat /proc/net/tcp /proc/net/tcp6: Read TCP v4 and v6 connection tables
   * - 2>/dev/null: Suppress errors
   * - wc -l: Count lines (each line = one connection)
   *
   * LESSON: This counts ALL TCP sockets including listening ports.
   * For just established connections, would need to filter by state column.
   * Current count is useful for overall network activity monitoring.
   */
  connections: `cat /proc/net/tcp /proc/net/tcp6 2>/dev/null | wc -l`,

  /**
   * Active listening ports (hex format)
   * Format: "port1;port2;..." or empty
   * Example: "0016;0035;1F90" (22, 53, 8080 in hex)
   *
   * Command breakdown:
   * - cat /proc/net/tcp /proc/net/tcp6: Read TCP tables
   * - grep -v 'local_address': CRITICAL - exclude header row
   * - awk '{print $2}': Extract local address:port column
   * - cut -d: -f2: Get just the port part (after colon)
   * - sort -u: Remove duplicates
   * - tr '\n' ';': Convert newlines to semicolons
   * - sed 's/;$//': Remove trailing semicolon
   *
   * LESSON LEARNED (2026-01-19): /proc/net/tcp has a header row with
   * "local_address" text. Lines have leading spaces (e.g., "   0:" not "0:").
   * The grep -v 'local_address' pattern is the reliable way to exclude it.
   * Previous attempt with grep -E '^[0-9]+:' failed due to leading spaces.
   */
  ports: `cat /proc/net/tcp /proc/net/tcp6 2>/dev/null | grep -v 'local_address' | awk '{print $2}' | cut -d: -f2 | sort -u | tr '\\n' ';' | sed 's/;$//'`,
} as const;

// Re-export parseResources from shared with a simpler name
export const parseResources = parseResourcesShared;
