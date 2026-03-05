# Hetzner Cloud Servers Overview

## Overview

Cloud servers are virtual machines that run on physical servers and are used to run an operating system and computer programs. The physical servers are located in the USA, in Singapore, and in Hetzner's data centers in Europe.

The virtualization makes it possible to adjust the scale of servers at any time, and you can easily add or remove other features if needed.

**Note:** Cloud servers do not include public IP addresses. You can add Primary IPs if you would like to have a public network interface. You can choose to use existing Primary IPs (IPv4, IPv6) from your project or create a new one with the server.

## Server Types

You can choose between **Shared Resources** and **Dedicated Resources** cloud servers.

| Shared Resources | | Dedicated Resources |
| --- | --- | --- |
| **Cost-Optimized** | **Regular Performance** | **General Purpose** |
| Older hardware generation | Most recent hardware generation | Most recent hardware generation |
| For best performance, hypervisors are used to distribute usage rights of CPU resources among several virtual servers | | Every dedicated resources instance has its own dedicated CPU resources |
| Ideal for individual applications or development environments | | Ideal for CPU intensive applications or research calculations |

## Pricing

Cloud server prices vary depending on the type (Shared Resources, Dedicated Resources) and do not include public IP addresses. Per server, you can add one Primary IP of each type (IPv4, IPv6).

## Network Options

Cloud servers do not include public IP addresses. Therefore, a Primary IP has to be added to the server to establish a connection to the internet.

- **IPv6 Primary IPs:** Free of charge
- **IPv4 Primary IPs:** €0.50/month (excl. VAT)

### Network Configuration Options

When creating a server, you can choose from three network options. At least one of those three options has to be selected:

| Option | Public IPs | Private IPs |
| --- | --- | --- |
| **Private network** | no Primary IP | At least one private IP |
| **Public network** | one Primary IP (IPv4 **or** IPv6) | Private IP optional |
| **Public network** | two Primary IPs (IPv4 **and** IPv6) | Private IP optional |

If you create a server with a public IP address and do not select an existing Primary IP from your project, the system will auto-create one for you.

**Important:** Each interface of a cloud server is automatically assigned a MAC address and connections to the internet only work with this assigned MAC address.

## Operating Systems

You can choose from the following operating systems:
- Ubuntu
- Fedora
- Debian
- CentOS
- Rocky Linux
- AlmaLinux

## Resources and Attributes

The following resources and attributes are associated with cloud servers:

- Primary IPs
- Apps
- Volumes
- Floating IPs
- Firewalls
- Load Balancers
- Networks
- Backups
- Snapshots
- Placement Groups
- Name
- Labels

## Limits

| Resource | Limit |
|----------|-------|
| Servers (default) | Up to 5 |
| Dedicated resource servers | Up to 8 |
| Primary IPv4 per server | Up to 1 |
| Primary IPv6 per server | Up to 1 |
| Floating IPs per server | Up to 20 |
| Apps per server | Up to 1 |
| Placement Groups per server | Up to 1 |
| Networks per server | Up to 3 |
| Firewalls per server | Up to 5 |
| Volumes per server | Up to 16 |

**Note:** It can be possible to increase default limits if requested.

## References

- [Hetzner Cloud Servers Overview](https://docs.hetzner.com/cloud/servers/overview)
