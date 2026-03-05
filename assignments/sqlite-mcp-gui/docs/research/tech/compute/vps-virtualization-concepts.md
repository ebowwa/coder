# VPS Virtualization Concepts

## VPS Node Architecture

A VPS node is itself a VM - it's a virtual machine running on a physical host server.

### Hierarchy

```
Physical Server (bare metal hardware)
    └── Hypervisor (KVM, Xen, VMware, etc.)
        ├── VPS 1 (your instance)
        ├── VPS 2 (another customer)
        ├── VPS 3 (another customer)
        └── ...
```

## Key Points

1. **Your VPS is a VM** - You're renting a slice of a physical server's resources (CPU, RAM, disk)

2. **You can run VMs inside your VPS** - Using nested virtualization (if the provider supports it), you can run VMs like KVM, QEMU, or Docker containers

3. **Not all providers allow nested virtualization** - Many disable it for security/performance reasons. Hetzner, for example, offers dedicated servers with full virtualization support, but their cloud VPS products may have restrictions

## Common Confusion: "Node" Terminology

When people say "node" they might mean:

- **The physical host server** - which runs many VPS instances
- **Your VPS instance itself** - which is one VM on that host

## Alternatives for Multiple Isolated Environments

If you're looking to run multiple isolated environments, consider containers (Docker/Podman) instead of full VMs - they're lighter weight and typically work fine on any VPS.
