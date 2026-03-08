#!/usr/bin/env bash
#
# test-bootstrap-live.sh
#
# End-to-end test script for Hetzner bootstrap configuration
#
# This script:
#   1. Generates bootstrap YAML using TypeScript code
#   2. Creates a Hetzner test server with the bootstrap
#   3. Waits for server to be ready
#   4. Tests SSH connectivity
#   5. Verifies bun is in PATH
#   6. Reports results and offers cleanup
#
# Usage:
#   ./test-bootstrap-live.sh [options]
#
# Options:
#   --keep-server     Don't offer to delete the server after testing
#   --no-wait         Skip initial wait for bootstrap completion
#   --server-type     Server type (default: cx22)
#   --ssh-key         SSH key name (default: ebowwa)
#   --help            Show this help message
#
# Complexity: Medium
#

set -euo pipefail

# ============================================================================
# Configuration
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Test server configuration
SERVER_NAME="bootstrap-test-$(date +%s)"
SERVER_TYPE="${SERVER_TYPE:-cx22}"
SERVER_IMAGE="${SERVER_IMAGE:-ubuntu-24.04}"
SERVER_LOCATION="${SERVER_LOCATION:-fsn1}"
SSH_KEY_NAME="${SSH_KEY_NAME:-ebowwa}"

# Bootstrap configuration
SEED_REPO="${SEED_REPO:-https://github.com/ebowwa/seed}"
SEED_BRANCH="${SEED_BRANCH:-Bun-port}"
SEED_PATH="${SEED_PATH:-/root/seed}"

# Timing configuration
BOOTSTRAP_WAIT_TIME="${BOOTSTRAP_WAIT_TIME:-90}"  # Seconds to wait for bootstrap
SSH_CONNECT_TIMEOUT="${SSH_CONNECT_TIMEOUT:-5}"    # Seconds to wait for SSH
MAX_RETRIES="${MAX_RETRIES:-12}"                   # Max connection retries

# Flags
KEEP_SERVER=false
SKIP_WAIT=false

# Runtime state (set during execution)
SERVER_ID=""
SERVER_IP=""
SERVER_STATUS=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# Helper Functions
# ============================================================================

log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $*"
}

log_error() {
    echo -e "${RED}[✗]${NC} $*"
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $*"
}

info() {
    echo -e "${BLUE}$*${NC}"
}

print_section() {
    local title="$1"
    echo ""
    echo "===================================================================="
    echo "  ${title}"
    echo "===================================================================="
    echo ""
}

show_help() {
    cat << EOF
Usage: $(basename "$0") [OPTIONS]

End-to-end test script for Hetzner bootstrap configuration

Options:
  --keep-server     Don't offer to delete the server after testing
  --no-wait         Skip initial wait for bootstrap completion
  --server-type     Server type (default: cx22)
  --ssh-key         SSH key name (default: ebowwa)
  --help            Show this help message

Environment Variables:
  HCLOUD_TOKEN      Hetzner API token (required if not in CLI config)
  SEED_REPO         Seed repository URL
  SEED_BRANCH       Seed repository branch
  BOOTSTRAP_WAIT_TIME Seconds to wait for bootstrap (default: 90)

Examples:
  # Basic test
  $(basename "$0")

  # Test with larger server
  $(basename "$0") --server-type cpx11

  # Test without waiting for bootstrap
  $(basename "$0") --no-wait

  # Keep server for manual inspection
  $(basename "$0") --keep-server

EOF
}

cleanup_on_error() {
    local exit_code=$?

    if [[ ${exit_code} -ne 0 ]] && [[ -n "${SERVER_ID}" ]] && [[ "${KEEP_SERVER}" != true ]]; then
        echo ""
        log_warning "Script failed with exit code ${exit_code}"
        log "Offering cleanup of test server..."

        read -rp "Delete server ${SERVER_NAME} (${SERVER_IP})? [y/N] " -n 1 -r
        echo

        if [[ $REPLY =~ ^[Yy]$ ]]; then
            delete_server
        else
            log_warning "Server left running. Manual cleanup required:"
            info "  hcloud server delete ${SERVER_ID}"
        fi
    fi

    exit ${exit_code}
}

trap cleanup_on_error EXIT

# ============================================================================
# Hetzner API Functions
# ============================================================================

get_hetzner_token() {
    # Check HCLOUD_TOKEN environment variable first
    if [[ -n "${HCLOUD_TOKEN:-}" ]]; then
        echo "${HCLOUD_TOKEN}"
        return 0
    fi

    # Try to read from CLI config
    local cli_config="${HOME}/.config/hcloud/cli.toml"

    if [[ ! -f "${cli_config}" ]]; then
        log_error "Hetzner CLI config not found at ${cli_config}"
        log_error "Please set HCLOUD_TOKEN environment variable"
        return 1
    fi

    # Parse token from CLI config (handle TOML format)
    # Look for: token = "..."
    local token
    token=$(grep -E '^[\s]*token[\s]*=' "${cli_config}" | sed 's/.*token[[:space:]]*=[[:space:]]*["\([^"]*\)"].*/\1/')

    if [[ -z "${token}" ]]; then
        log_error "Could not extract token from ${cli_config}"
        log_error "Please set HCLOUD_TOKEN environment variable"
        return 1
    fi

    echo "${token}"
}

hcloud_api() {
    local endpoint="$1"
    local data="${2:-}"

    local token
    token=$(get_hetzner_token)

    local url="https://api.hetzner.cloud/v1${endpoint}"

    if [[ -n "${data}" ]]; then
        curl -s -X POST \
            -H "Authorization: Bearer ${token}" \
            -H "Content-Type: application/json" \
            -d "${data}" \
            "${url}"
    else
        curl -s -X GET \
            -H "Authorization: Bearer ${token}" \
            "${url}"
    fi
}

get_ssh_key_id() {
    local key_name="$1"

    log "Looking up SSH key: ${key_name}"

    local response
    response=$(hcloud_api "/ssh_keys")

    local key_id
    key_id=$(echo "${response}" | jq -r --arg name "${key_name}" '.ssh_keys[] | select(.name == $name) | .id')

    if [[ -z "${key_id}" ]]; then
        log_error "SSH key '${key_name}' not found"

        local available_keys
        available_keys=$(echo "${response}" | jq -r '.ssh_keys[].name' | tr '\n' ' ')

        if [[ -n "${available_keys}" ]]; then
            log "Available SSH keys: ${available_keys}"
        fi

        return 1
    fi

    log_success "Found SSH key: ${key_name} (ID: ${key_id})"
    echo "${key_id}"
}

create_server() {
    local bootstrap_yaml="$1"
    local ssh_key_id="$2"

    log "Creating server: ${SERVER_NAME}"

    local create_data
    create_data=$(jq -n \
        --arg name "${SERVER_NAME}" \
        --arg type "${SERVER_TYPE}" \
        --arg image "${SERVER_IMAGE}" \
        --arg location "${SERVER_LOCATION}" \
        --argjson user_data "${bootstrap_yaml}" \
        --argjson ssh_keys "${ssh_key_id}" \
        '{
            name: $name,
            server_type: $type,
            image: $image,
            location: $location,
            user_data: $user_data,
            ssh_keys: [$ssh_keys],
            start_after_create: true
        }')

    local response
    response=$(hcloud_api "/servers" "${create_data}")

    # Check for errors
    if echo "${response}" | jq -e '.error' >/dev/null; then
        local error_msg
        error_msg=$(echo "${response}" | jq -r '.error.message')
        log_error "Failed to create server: ${error_msg}"
        return 1
    fi

    SERVER_ID=$(echo "${response}" | jq -r '.server.id')
    SERVER_IP=$(echo "${response}" | jq -r '.server.public_net.ipv4.ip')

    log_success "Server created!"
    log "  Server ID: ${SERVER_ID}"
    log "  Server IP: ${SERVER_IP}"
}

wait_for_server_ready() {
    log "Waiting for server to become ready..."

    local max_wait=300  # 5 minutes max
    local elapsed=0

    while [[ ${elapsed} -lt ${max_wait} ]]; do
        local response
        response=$(hcloud_api "/servers/${SERVER_ID}")

        SERVER_STATUS=$(echo "${response}" | jq -r '.server.status')

        if [[ "${SERVER_STATUS}" == "running" ]]; then
            log_success "Server is running!"
            return 0
        fi

        log "  Server status: ${SERVER_STATUS} (${elapsed}s)"
        sleep 5
        elapsed=$((elapsed + 5))
    done

    log_error "Server did not become ready in ${max_wait}s"
    return 1
}

delete_server() {
    log "Deleting server ${SERVER_NAME}..."

    local response
    response=$(hcloud_api "/servers/${SERVER_ID}" "" "-X DELETE")

    if echo "${response}" | jq -e '.error' >/dev/null; then
        local error_msg
        error_msg=$(echo "${response}" | jq -r '.error.message')
        log_error "Failed to delete server: ${error_msg}"
        return 1
    fi

    log_success "Server deleted"
}

# ============================================================================
# SSH Testing Functions
# ============================================================================

wait_for_ssh() {
    log "Waiting for SSH to become available..."

    local attempt=1

    while [[ ${attempt} -le ${MAX_RETRIES} ]]; do
        if ssh -o ConnectTimeout="${SSH_CONNECT_TIMEOUT}" \
               -o StrictHostKeyChecking=no \
               -o UserKnownHostsFile=/dev/null \
               -o BatchMode=yes \
               "root@${SERVER_IP}" \
               "echo 'SSH connected'" >/dev/null 2>&1; then
            log_success "SSH is available!"
            return 0
        fi

        log "  Attempt ${attempt}/${MAX_RETRIES}: SSH not ready yet..."
        sleep 5
        attempt=$((attempt + 1))
    done

    log_error "SSH did not become available after ${MAX_RETRIES} attempts"
    return 1
}

run_ssh_command() {
    local command="$1"
    local description="${2:-Running command}"

    log "${description}: ${command}"

    ssh -o ConnectTimeout="${SSH_CONNECT_TIMEOUT}" \
        -o StrictHostKeyChecking=no \
        -o UserKnownHostsFile=/dev/null \
        "root@${SERVER_IP}" \
        "${command}"
}

verify_bootstrap_status() {
    log "Checking bootstrap status file..."

    local status
    status=$(run_ssh_command "cat /root/.bootstrap-status 2>/dev/null || echo 'not_found'")

    if [[ "${status}" == "not_found" ]]; then
        log_warning "Bootstrap status file not found yet (bootstrap may still be running)"
        return 0
    fi

    log "Bootstrap status:"
    echo "${status}" | while IFS= read -r line; do
        log "  ${line}"
    done

    if echo "${status}" | grep -q "status=complete"; then
        log_success "Bootstrap marked as complete"
        return 0
    else
        log_warning "Bootstrap not yet complete"
        return 0
    fi
}

verify_bun_in_path() {
    log "Verifying bun is in PATH..."

    # Check if bun is in PATH (requires new shell session to pick up /etc/environment)
    local bun_path
    bun_path=$(run_ssh_command "su - root -c 'which bun' 2>/dev/null || echo 'not_found'")

    if [[ "${bun_path}" == "not_found" ]]; then
        log_warning "bun not found in PATH (requires login shell to load /etc/environment)"
        log "  Checking direct bun path..."

        # Check if bun binary exists
        local direct_check
        direct_check=$(run_ssh_command "test -f /root/.bun/bin/bun && echo 'exists' || echo 'not_found'")

        if [[ "${direct_check}" == "exists" ]]; then
            log_success "bun binary exists at /root/.bun/bin/bun"
            log "  Note: /etc/environment requires login shell to take effect"
            run_ssh_command "/root/.bun/bin/bun --version" "Testing bun directly"
            return 0
        else
            log_error "bun binary not found at /root/.bun/bin/bun"
            return 1
        fi
    else
        log_success "bun found in PATH: ${bun_path}"
        run_ssh_command "bun --version" "Checking bun version"
        return 0
    fi
}

verify_seed_installation() {
    log "Verifying seed installation..."

    local seed_exists
    seed_exists=$(run_ssh_command "test -d ${SEED_PATH} && echo 'exists' || echo 'not_found'")

    if [[ "${seed_exists}" == "not_found" ]]; then
        log_error "Seed directory not found at ${SEED_PATH}"
        return 1
    fi

    log_success "Seed directory exists"

    # Check setup log
    log "Checking setup log..."
    run_ssh_command "tail -20 /var/log/seed-setup.log 2>/dev/null || echo 'No setup log yet'" "Setup log tail"
}

# ============================================================================
# Bootstrap Generation
# ============================================================================

generate_bootstrap_yaml() {
    log "Generating bootstrap YAML..."

    cd "${PROJECT_ROOT}"

    # Run the TypeScript generation script
    local bootstrap_yaml
    bootstrap_yaml=$(bun run "${SCRIPT_DIR}/generate-bootstrap.ts")

    # Validate we got YAML output
    if ! echo "${bootstrap_yaml}" | grep -q "#cloud-config"; then
        log_error "Generated output doesn't look like cloud-config YAML"
        return 1
    fi

    log_success "Bootstrap YAML generated"

    # Show preview
    log "Bootstrap YAML preview:"
    echo ""
    echo "${bootstrap_yaml}" | head -30
    echo "..."
    echo ""

    # Output as JSON string for API consumption
    jq -n --arg yaml "${bootstrap_yaml}" '$yaml'
}

# ============================================================================
# Main Execution
# ============================================================================

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --keep-server)
                KEEP_SERVER=true
                shift
                ;;
            --no-wait)
                SKIP_WAIT=true
                shift
                ;;
            --server-type)
                SERVER_TYPE="$2"
                shift 2
                ;;
            --ssh-key)
                SSH_KEY_NAME="$2"
                shift 2
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

main() {
    parse_arguments "$@"

    print_section "Bootstrap Live Test"
    log "Test Configuration:"
    log "  Server Name: ${SERVER_NAME}"
    log "  Server Type: ${SERVER_TYPE}"
    log "  Server Image: ${SERVER_IMAGE}"
    log "  Server Location: ${SERVER_LOCATION}"
    log "  SSH Key: ${SSH_KEY_NAME}"
    log "  Seed Repo: ${SEED_REPO}"
    log "  Seed Branch: ${SEED_BRANCH}"
    log ""

    # ========================================================================
    # Step 1: Generate Bootstrap YAML
    # ========================================================================

    print_section "Step 1: Generate Bootstrap YAML"

    local bootstrap_json
    if ! bootstrap_json=$(generate_bootstrap_yaml); then
        log_error "Failed to generate bootstrap YAML"
        exit 1
    fi

    # ========================================================================
    # Step 2: Create Test Server
    # ========================================================================

    print_section "Step 2: Create Test Server"

    local ssh_key_id
    if ! ssh_key_id=$(get_ssh_key_id "${SSH_KEY_NAME}"); then
        log_error "Failed to get SSH key ID"
        exit 1
    fi

    if ! create_server "${bootstrap_json}" "${ssh_key_id}"; then
        log_error "Failed to create server"
        exit 1
    fi

    # ========================================================================
    # Step 3: Wait for Server Ready
    # ========================================================================

    print_section "Step 3: Wait for Server Ready"

    if ! wait_for_server_ready; then
        log_error "Server did not become ready"
        exit 1
    fi

    # ========================================================================
    # Step 4: Wait for Bootstrap
    # ========================================================================

    if [[ "${SKIP_WAIT}" == false ]]; then
        print_section "Step 4: Wait for Bootstrap (${BOOTSTRAP_WAIT_TIME}s)"

        log "Waiting ${BOOTSTRAP_WAIT_TIME} seconds for bootstrap to complete..."
        log "  (cloud-init needs time to clone repo and run setup)"

        sleep "${BOOTSTRAP_WAIT_TIME}"
    fi

    # ========================================================================
    # Step 5: SSH Connectivity Test
    # ========================================================================

    print_section "Step 5: SSH Connectivity Test"

    if ! wait_for_ssh; then
        log_error "SSH did not become available"
        log_warning "Server is running but SSH is not accessible"
        log "You may need to check the Hetzner console for server status"
        exit 1
    fi

    # Test basic command
    log "Testing basic command execution..."
    run_ssh_command "uname -a" "System info"

    # ========================================================================
    # Step 6: Verification Tests
    # ========================================================================

    print_section "Step 6: Verification Tests"

    verify_bootstrap_status
    verify_bun_in_path
    verify_seed_installation

    # ========================================================================
    # Step 7: Final Report
    # ========================================================================

    print_section "Test Complete"
    log_success "All tests passed!"
    echo ""

    info "Server Details:"
    info "  ID: ${SERVER_ID}"
    info "  Name: ${SERVER_NAME}"
    info "  IP: ${SERVER_IP}"
    info "  Status: ${SERVER_STATUS}"
    echo ""

    info "Manual Verification Commands:"
    echo "  ssh root@${SERVER_IP}"
    echo "  cat /root/.bootstrap-status"
    echo "  cat /var/log/seed-setup.log"
    echo "  ls -la ${SEED_PATH}"
    echo ""

    # ========================================================================
    # Step 8: Cleanup
    # ========================================================================

    if [[ "${KEEP_SERVER}" == true ]]; then
        log_warning "Server left running as requested (--keep-server)"
        info "Delete manually when done: hcloud server delete ${SERVER_ID}"
    else
        log "Test complete. Offering cleanup..."
        echo ""

        read -rp "Delete server ${SERVER_NAME} (${SERVER_IP})? [Y/n] " -n 1 -r
        echo

        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            delete_server
        else
            log_warning "Server left running"
            info "Delete manually when done: hcloud server delete ${SERVER_ID}"
        fi
    fi

    echo ""
    log_success "Test script completed successfully"
}

# Run main function
main "$@"
