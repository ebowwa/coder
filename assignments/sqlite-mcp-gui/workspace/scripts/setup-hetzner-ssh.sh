#!/bin/bash
# ============================================================================
# Hetzner SSH Key Management
# ============================================================================
#
# PROBLEM:
# - Creating random keys in Hetzner doesn't work (we need matching private key)
# - Password auth is unreliable
# - IP reuse causes known_hosts conflicts
#
# SOLUTION:
# - Always use existing local keys or create new key pairs
# - Upload public key to Hetzner, keep private key local
#
# Usage:
#   ./setup-hetzner-ssh.sh [--create] [--check]
#     --create: Force create new key pair
#     --check:  Check existing keys
# ============================================================================

set -e

SSH_DIR="${HOME}/.ssh"
HETZNER_KEY_PREFIX="hetzner-codespaces"
HETZNER_API_TOKEN="${HETZNER_API_TOKEN:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}✓${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; }

# ============================================================================
# Check existing Hetzner SSH keys
# ============================================================================
check_existing_keys() {
    echo "Checking local Hetzner SSH keys..."

    local found=false
    for key in "$SSH_DIR"/${HETZNER_KEY_PREFIX}*; do
        if [ -f "$key" ] && [ -f "${key}.pub" ]; then
            local name=$(basename "$key")
            local fingerprint=$(ssh-keygen -lf "${key}.pub" 2>/dev/null | awk '{print $2}')
            echo "  • $name (fingerprint: $fingerprint)"
            found=true
        fi
    done

    if [ "$found" = false ]; then
        echo "  No Hetzner keys found."
    fi
}

# ============================================================================
# Find or create SSH key pair
# ============================================================================
get_or_create_key() {
    local force_create="${1:-false}"

    # Check for existing key
    local private_key="$SSH_DIR/$HETZNER_KEY_PREFIX"
    if [ -f "$private_key" ] && [ "$force_create" = false ]; then
        log_info "Using existing SSH key: $HETZNER_KEY_PREFIX"
        echo "$HETZNER_KEY_PREFIX"
        return
    fi

    # Create new key pair
    local key_name="${HETZNER_KEY_PREFIX}-$(date +%s)"
    private_key="$SSH_DIR/$key_name"
    local public_key="${private_key}.pub"

    log_info "Creating new SSH key pair: $key_name"

    # Generate ed25519 key
    ssh-keygen -t ed25519 -f "$private_key" -N "" -C "$key_name" >/dev/null 2>&1

    # Set permissions
    chmod 600 "$private_key"
    chmod 644 "$public_key"

    log_info "Created: $private_key"
    log_info "Created: ${public_key}"

    echo "$key_name"
}

# ============================================================================
# Upload key to Hetzner
# ============================================================================
upload_to_hetzner() {
    local key_name="$1"
    local private_key="$SSH_DIR/$key_name"
    local public_key="${private_key}.pub"

    if [ -z "$HETZNER_API_TOKEN" ]; then
        log_error "HETZNER_API_TOKEN not set"
        return 1
    fi

    local public_key_content=$(cat "$public_key")

    # Check if key already exists
    log_info "Checking if key exists in Hetzner..."
    local existing_keys=$(curl -s \
        -H "Authorization: Bearer $HETZNER_API_TOKEN" \
        "https://api.hetzner.cloud/v1/ssh_keys")

    # Check if our key is already there (by fingerprint)
    local fingerprint=$(ssh-keygen -lf "$public_key" 2>/dev/null | awk '{print $2}')
    if echo "$existing_keys" | grep -q "$fingerprint"; then
        log_info "Key already exists in Hetzner"
        return 0
    fi

    # Upload new key
    log_info "Uploading SSH key to Hetzner..."

    local response=$(curl -s \
        -X POST \
        -H "Authorization: Bearer $HETZNER_API_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"name\":\"$key_name\",\"public_key\":\"$public_key_content\"}" \
        "https://api.hetzner.cloud/v1/ssh_keys")

    if echo "$response" | grep -q "error"; then
        log_error "Failed to upload key: $response"
        return 1
    fi

    local key_id=$(echo "$response" | jq -r '.ssh_key.id')
    log_info "SSH key uploaded (ID: $key_id)"
}

# ============================================================================
# Clear known_hosts entry (fix IP reuse issues)
# ============================================================================
clear_known_hosts() {
    local ip="$1"

    if [ -z "$ip" ]; then
        log_error "IP address required"
        return 1
    fi

    ssh-keygen -R "$ip" 2>/dev/null || true
    log_info "Cleared known_hosts for $ip"
}

# ============================================================================
# Test SSH connection
# ============================================================================
test_ssh() {
    local ip="$1"
    local key_name="$2"

    local private_key="$SSH_DIR/$key_name"

    log_info "Testing SSH connection to $ip..."

    if timeout 15 ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 \
        -i "$private_key" root@"$ip" "echo 'connected'" >/dev/null 2>&1; then
        log_info "SSH connection successful"
        return 0
    else
        log_error "SSH connection failed"
        return 1
    fi
}

# ============================================================================
# Main
# ============================================================================
main() {
    local command="${1:-}"
    shift || true

    case "$command" in
        --check|-c)
            check_existing_keys
            ;;
        --create|--new|-n)
            local key_name
            key_name=$(get_or_create_key true)
            upload_to_hetzner "$key_name"
            ;;
        --upload|-u)
            local key_name="${1:-$HETZNER_KEY_PREFIX}"
            upload_to_hetzner "$key_name"
            ;;
        --clear|-r)
            clear_known_hosts "$1"
            ;;
        --test|-t)
            test_ssh "$1" "$2"
            ;;
        --prepare|-p)
            # Full workflow: get or create key, upload to Hetzner
            local key_name
            key_name=$(get_or_create_key false)
            upload_to_hetzner "$key_name"
            echo "$key_name"
            ;;
        *)
            echo "Usage: $0 [--check|--create|--upload KEY|--clear IP|--test IP KEY|--prepare]"
            echo ""
            echo "Commands:"
            echo "  --check, -c     Check existing Hetzner SSH keys"
            echo "  --create, -n    Create new SSH key pair and upload"
            echo "  --upload, -u    Upload existing key to Hetzner"
            echo "  --clear, -r     Clear known_hosts entry for IP"
            echo "  --test, -t      Test SSH connection"
            echo "  --prepare, -p   Full workflow (create if needed, upload)"
            echo ""
            echo "Examples:"
            echo "  $0 --check                    # List local keys"
            echo "  $0 --prepare                  # Setup keys for server creation"
            echo "  $0 --clear 49.13.5.208        # Clear known_hosts"
            echo "  $0 --test 49.13.5.208 key     # Test SSH connection"
            exit 1
            ;;
    esac
}

main "$@"
