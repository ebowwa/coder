# Hetzner Cloud Architecture

## Overview

Each cloud server runs on a physical server. In some scenarios, a physical server may become unavailable. To keep cloud servers running, Hetzner's systems perform a live migration from the affected physical server to another physical server within the same location.

## Replication Stages During Live Migration

Everything is replicated from the source server to the target server in three stages.

### Stage 1

| Aspect | Description |
|--------|-------------|
| **Duration** | Several minutes |
| **Network** | Traffic is routed to `source` |
| **Availability** | `source` brownout |

**Actions:**
- The new, empty cloud server `target` is created on a different physical server within the same location
- The cloud server `target` is not available yet
- Most state of the `source` server is replicated onto the `target` server
- The local NVMe SSD and the `source` memory are copied to the `target`, while tracking the pages that have been changed on the `source`

### Stage 2

| Aspect | Description |
|--------|-------------|
| **Duration** | Usually less than 1 second |
| **Network** | Cloud server is unavailable |
| **Availability** | Unavailable |

**Actions:**
- The cloud server `source` is turned off and becomes unavailable
- The state required for running the cloud server is now replicated from the `source` server onto the `target` server
- The static state of the system is now replicated

### Stage 3

| Aspect | Description |
|--------|-------------|
| **Network** | Traffic is routed to `target` |
| **Availability** | `target` brownout |

**Actions:**
- The cloud server `source` is turned back on
- If the `target` server still needs anything, the `source` server can still help
- If networking is still updating and routing traffic to the `source` server, the `source` server forwards that traffic to the `target` server

## Replicated Data

The following data is replicated during live migration:

- **Critical data:** e.g. local NVMe SSD, memory, Volume
- **Operational data:** data required to run the cloud server

## References

- [Hetzner Cloud Architecture Documentation](https://docs.hetzner.com/cloud/servers/technical-concepts/architecture)
