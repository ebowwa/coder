/**
 * MCP - Model Context Protocol Server
 * Exposes cheapspaces backend functionality as MCP tools
 *
 * This allows AI assistants (like Claude) to directly interact with
 * Hetzner VPS management, SSH sessions, file operations, etc.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { join } from "node:path";
import { homedir } from "node:os";

// Import business logic from src/
import { HetznerClient } from "../../src/lib/hetzner";

// Get API token from CLI config
async function getTokenFromCLI(): Promise<string> {
  try {
    const configPath = join(homedir(), ".config", "hcloud", "cli.toml");
    const configFile = Bun.file(configPath);
    if (await configFile.exists()) {
      const config = await configFile.text();
      const match = config.match(/token\s*=\s*["']([^"']+)["']/);
      if (match && match[1]) {
        return match[1];
      }
    }
  } catch (e) {
    // Ignore errors
  }
  return "";
}

// Resolve API token: env var > CLI config
async function resolveApiToken(): Promise<string> {
  if (process.env.HETZNER_API_TOKEN) {
    return process.env.HETZNER_API_TOKEN;
  }
  return await getTokenFromCLI();
}

// Initialize Hetzner client
let hetznerClient: HetznerClient | null = null;

// Initialize asynchronously
async function initializeClient() {
  const token = await resolveApiToken();
  if (token) {
    try {
      hetznerClient = new HetznerClient(token);
      console.error(`[cheapspaces-mcp] Authenticated via ${process.env.HETZNER_API_TOKEN ? "HETZNER_API_TOKEN" : "Hetzner CLI config"}`);
    } catch (e) {
      console.warn("[cheapspaces-mcp] Failed to initialize Hetzner client:", e);
    }
  } else {
    console.warn("[cheapspaces-mcp] Hetzner API token not configured - MCP running in limited mode");
  }
}

// Create MCP server
const server = new Server(
  {
    name: "cheapspaces-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_environments",
        description: "List all Hetzner VPS environments with their status, IPs, and metadata",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_environment",
        description: "Get details of a specific environment by ID",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Environment ID (server ID)",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "create_environment",
        description: "Create a new Hetzner VPS environment",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Server name",
            },
            serverType: {
              type: "string",
              description: "Server type (e.g., cax21, cpx21)",
              default: "cax21",
            },
            location: {
              type: "string",
              description: "Datacenter location (e.g., nbg1, fsn1, hel1)",
            },
            sshKey: {
              type: "string",
              description: "SSH key name or public key to add to the server",
            },
            enablePassword: {
              type: "boolean",
              description: "Enable temporary password access via cloud-init (useful for initial setup)",
              default: false,
            },
            userData: {
              type: "string",
              description: "Custom cloud-init user-data script (YAML format). Overrides enablePassword if both are set.",
            },
          },
          required: ["name"],
        },
      },
      {
        name: "start_environment",
        description: "Power on a stopped environment",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Environment ID",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "stop_environment",
        description: "Power off an environment",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Environment ID",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "delete_environment",
        description: "Delete an environment permanently",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Environment ID",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "get_resources",
        description: "Get real-time CPU, memory, and disk usage for an environment",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Environment ID",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "ssh_test",
        description: "Test SSH connectivity to an environment",
        inputSchema: {
          type: "object",
          properties: {
            host: {
              type: "string",
              description: "IP address or hostname",
            },
            user: {
              type: "string",
              description: "SSH user (default: root)",
              default: "root",
            },
            keyPath: {
              type: "string",
              description: "Path to SSH private key (optional)",
            },
            password: {
              type: "string",
              description: "SSH password (optional, for password authentication)",
            },
          },
          required: ["host"],
        },
      },
      {
        name: "create_ssh_key",
        description: "Create a new SSH key in Hetzner for server access",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "SSH key name",
            },
            publicKey: {
              type: "string",
              description: "SSH public key content",
            },
          },
          required: ["name", "publicKey"],
        },
      },
      {
        name: "list_ssh_keys",
        description: "List all SSH keys in Hetzner",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "exec_ssh",
        description: "Execute a command via SSH on a server",
        inputSchema: {
          type: "object",
          properties: {
            host: {
              type: "string",
              description: "IP address or hostname",
            },
            command: {
              type: "string",
              description: "Command to execute",
            },
            user: {
              type: "string",
              description: "SSH user (default: root)",
              default: "root",
            },
            keyPath: {
              type: "string",
              description: "Path to SSH private key (optional, tries SSH agent if not provided)",
            },
            password: {
              type: "string",
              description: "SSH password (optional, for password authentication)",
            },
          },
          required: ["host", "command"],
        },
      },
      {
        name: "list_server_types",
        description: "List all Hetzner server types with specs (cores, memory, disk, prices)",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "list_locations",
        description: "List all Hetzner datacenter locations",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "list_volumes",
        description: "List all Hetzner volumes with their status, size, and server attachment",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Filter by volume name",
            },
            status: {
              type: "string",
              description: "Filter by status (creating, available, deleting)",
            },
          },
        },
      },
      {
        name: "get_volume",
        description: "Get details of a specific volume by ID",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Volume ID",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "create_volume",
        description: "Create a new Hetzner volume",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Volume name",
            },
            size: {
              type: "number",
              description: "Volume size in GB (10-10240)",
            },
            location: {
              type: "string",
              description: "Location name (e.g., nbg1, fsn1, hel1)",
            },
            serverId: {
              type: "string",
              description: "Server ID to attach volume to",
            },
            automount: {
              type: "boolean",
              description: "Automatically mount the volume (default: true)",
            },
            format: {
              type: "string",
              description: "File system format (ext4 or xfs)",
              enum: ["ext4", "xfs"],
            },
          },
          required: ["name", "size"],
        },
      },
      {
        name: "delete_volume",
        description: "Delete a volume permanently",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Volume ID",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "attach_volume",
        description: "Attach a volume to a server",
        inputSchema: {
          type: "object",
          properties: {
            volumeId: {
              type: "string",
              description: "Volume ID",
            },
            serverId: {
              type: "string",
              description: "Server ID",
            },
            automount: {
              type: "boolean",
              description: "Automatically mount the volume (default: true)",
            },
          },
          required: ["volumeId", "serverId"],
        },
      },
      {
        name: "detach_volume",
        description: "Detach a volume from a server",
        inputSchema: {
          type: "object",
          properties: {
            volumeId: {
              type: "string",
              description: "Volume ID",
            },
          },
          required: ["volumeId"],
        },
      },
      {
        name: "resize_volume",
        description: "Resize a volume (must be larger than current size)",
        inputSchema: {
          type: "object",
          properties: {
            volumeId: {
              type: "string",
              description: "Volume ID",
            },
            size: {
              type: "number",
              description: "New size in GB (must be larger than current)",
            },
          },
          required: ["volumeId", "size"],
        },
      },
      {
        name: "calculate_volume_price",
        description: "Calculate pricing for a volume based on size",
        inputSchema: {
          type: "object",
          properties: {
            size: {
              type: "number",
              description: "Volume size in GB",
            },
          },
          required: ["size"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "list_environments": {
        if (!hetznerClient) {
          return {
            content: [{
              type: "text",
              text: "Hetzner client not available. Please configure HETZNER_API_TOKEN.",
            }],
          };
        }

        const servers = await hetznerClient.listServers();
        const environments = servers.map((server) => ({
          id: server.id.toString(),
          name: server.name,
          status: server.status,
          ipv4: server.public_net.ipv4?.ip || null,
          ipv6: server.public_net.ipv6?.ip || null,
          serverType: server.server_type.name,
          location: server.datacenter.location.name,
          created: server.created,
        }));

        return {
          content: [{
            type: "text",
            text: JSON.stringify(environments, null, 2),
          }],
        };
      }

      case "get_environment": {
        if (!hetznerClient) {
          return {
            content: [{
              type: "text",
              text: "Hetzner client not available.",
            }],
          };
        }

        const server = await hetznerClient.getServer(parseInt(args?.id as string));
        return {
          content: [{
            type: "text",
            text: JSON.stringify(server, null, 2),
          }],
        };
      }

      case "create_environment": {
        if (!hetznerClient) {
          return {
            content: [{
              type: "text",
              text: "Hetzner client not available.",
            }],
          };
        }

        // Validate required parameter
        const name = args?.name;
        if (!name || typeof name !== "string") {
          return {
            content: [{
              type: "text",
              text: "Error: name is required and must be a string",
            }],
            isError: true,
          };
        }

        // Validate user-data format if provided
        if (args?.userData && typeof args.userData === "string") {
          if (!args.userData.trim().startsWith("#cloud-config")) {
            return {
              content: [{
                type: "text",
                text: "Error: userData must start with '#cloud-config'",
              }],
              isError: true,
            };
          }
        }

        // Generate default seed installation cloud-init
        // This ensures every server has seed cloned by default
        const { generateSeedBootstrap } = await import("../../src/lib/bootstrap/cloud-init.ts");
        let userData = generateSeedBootstrap();
        let generatedPassword = "";

        // Override with custom userData if provided
        if (args?.userData && typeof args.userData === "string") {
          userData = args.userData;
        }
        // Override with password mode if requested
        else if (args?.enablePassword === true) {
          // Generate a clean password without dots that confuse YAML
          const cleanPassword = Array.from({length: 12}, () =>
            'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]
          ).join('');
          generatedPassword = cleanPassword;

          // CRITICAL: Combine password setup with seed installation
          // Password mode adds SSH password access ON TOP of seed installation
          const passwordSetup = `#cloud-config
runcmd:
  - sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config
  - sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config
  - systemctl restart ssh
  - sh -c 'echo root:${cleanPassword} | chpasswd'
  - sh -c 'echo ${cleanPassword} > /root/password.txt'
  - chmod 600 /root/password.txt
`;

          // Merge password setup with seed installation
          // Parse both cloud-init configs and combine runcmd sections
          const seedLines = userData.split('\n');
          const passwordLines = passwordSetup.split('\n');
          const mergedLines: string[] = [];

          let inRuncmd = false;
          let runcmdIndex = -1;

          // Add seed bootstrap content until we hit runcmd
          for (const line of seedLines) {
            if (line.startsWith('runcmd:')) {
              inRuncmd = true;
              runcmdIndex = mergedLines.length;
              mergedLines.push(line);
            } else if (inRuncmd && line.startsWith('  -')) {
              mergedLines.push(line);
            } else if (!inRuncmd) {
              mergedLines.push(line);
            } else if (inRuncmd && !line.startsWith('  -')) {
              // End of runcmd section
              inRuncmd = false;
            }
          }

          // Append password runcmd commands
          for (const line of passwordLines) {
            if (line.startsWith('runcmd:')) continue; // Skip header
            if (line.trim() === '' || line.startsWith('#')) continue; // Skip empty and comments
            if (line.startsWith('  -')) {
              mergedLines.splice(runcmdIndex + 1, 0, line);
              runcmdIndex++;
            }
          }

          userData = mergedLines.join('\n');
        }

        // Build SSH keys array - support both key name and public key
        let sshKeys: (string | number)[] = [];
        if (args?.sshKey && typeof args.sshKey === "string") {
          // Check if it's a public key (contains spaces) or a key name
          if (args.sshKey.includes(" ")) {
            // It's a public key - need to create it first
            try {
              const keyName = `mcp-key-${Date.now()}`;
              const newKey = await hetznerClient.ssh_keys.create({
                name: keyName,
                public_key: args.sshKey,
              });
              sshKeys = [newKey.id];
            } catch (e) {
              return {
                content: [{
                  type: "text",
                  text: `Error creating SSH key: ${String(e)}`,
                }],
                isError: true,
              };
            }
          } else {
            // It's a key name - look it up to get the ID
            try {
              const key = await hetznerClient.ssh_keys.findByName(args.sshKey);
              if (key) {
                sshKeys = [key.id];
              } else {
                return {
                  content: [{
                    type: "text",
                    text: `Error: SSH key '${args.sshKey}' not found. Available keys:\n${JSON.stringify(await hetznerClient.ssh_keys.list(), null, 2)}`,
                  }],
                  isError: true,
                };
              }
            } catch (e) {
              return {
                content: [{
                  type: "text",
                  text: `Error looking up SSH key: ${String(e)}`,
                }],
                isError: true,
              };
            }
          }
        }

        // Build server options with validated parameters
        const serverOptions: Record<string, unknown> = {
          name,
          server_type: typeof args?.serverType === "string" ? args.serverType : "cax21",
          ssh_keys: sshKeys,
        };

        // Only add location if it's a valid string
        if (args?.location && typeof args.location === "string") {
          serverOptions.location = args.location;
        }

        // Always include user_data (seed installation cloud-init)
        serverOptions.user_data = userData;

        const response = await hetznerClient.createServer(serverOptions);

        // Build response text
        let responseText = "";

        // CRITICAL: Put password FIRST and make it VERY prominent
        // The MCP tool layer seems to truncate responses after JSON, so password MUST come before
        if (generatedPassword) {
          responseText += `========================================\n`;
          responseText += `🔑 TEMPORARY ROOT PASSWORD: ${generatedPassword}\n`;
          responseText += `========================================\n`;
          responseText += `SAVE THIS NOW - It will NOT be shown again!\n\n`;
        }

        responseText += `Environment created:\n${JSON.stringify(response.server, null, 2)}`;

        console.error(`[MCP] Password generated for server ${response.server.name}: ${generatedPassword}`);

        return {
          content: [{
            type: "text",
            text: responseText,
          }],
        };
      }

      case "start_environment": {
        if (!hetznerClient) {
          return {
            content: [{
              type: "text",
              text: "Hetzner client not available.",
            }],
          };
        }

        const action = await hetznerClient.powerOn(parseInt(args?.id as string));
        return {
          content: [{
            type: "text",
            text: `Start action initiated: ${action.id}`,
          }],
        };
      }

      case "stop_environment": {
        if (!hetznerClient) {
          return {
            content: [{
              type: "text",
              text: "Hetzner client not available.",
            }],
          };
        }

        await hetznerClient.powerOff(parseInt(args?.id as string));
        return {
          content: [{
            type: "text",
            text: "Environment stopped.",
          }],
        };
      }

      case "delete_environment": {
        if (!hetznerClient) {
          return {
            content: [{
              type: "text",
              text: "Hetzner client not available.",
            }],
          };
        }

        await hetznerClient.deleteServer(parseInt(args?.id as string));
        return {
          content: [{
            type: "text",
            text: "Environment deleted.",
          }],
        };
      }

      case "get_resources": {
        // Import resource functions
        const { parseResources } = await import("../../src/lib/resources.ts");
        const { execSSHParallel } = await import("@codespaces/terminal");
        const { getMetadata } = await import("../../src/lib/metadata.ts");

        if (!hetznerClient) {
          return {
            content: [{
              type: "text",
              text: "Hetzner client not available.",
            }],
          };
        }

        const server = await hetznerClient.getServer(parseInt(args?.id as string));
        if (!server?.public_net.ipv4?.ip) {
          return {
            content: [{
              type: "text",
              text: "Server not found or no IP address.",
            }],
          };
        }

        // Get SSH key path from metadata
        const metadata = getMetadata(server.id.toString());
        const keyPath = metadata?.sshKeyPath;
        const password = (metadata as any)?.sshPassword;

        const RESOURCE_COMMANDS = {
          cpu: "top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1",
          memory: "free | grep Mem | awk '{printf \"%.1f\", ($3/$2) * 100.0}'",
          disk: "df -h / | tail -1 | awk '{print $5}' | sed 's/%//'",
        };

        const rawResults = await execSSHParallel(RESOURCE_COMMANDS, {
          host: server.public_net.ipv4.ip,
          user: "root",
          timeout: 5,
          ...(keyPath && { keyPath }),
          ...(password && { password }),
        });

        const resources = parseResources(
          rawResults as { cpu: string; memory: string; disk: string }
        );

        return {
          content: [{
            type: "text",
            text: JSON.stringify(resources, null, 2),
          }],
        };
      }

      case "ssh_test": {
        const { testSSHConnection } = await import("@codespaces/terminal");

        const connected = await testSSHConnection({
          host: args?.host as string,
          user: (args?.user as string) || "root",
          port: 22,
          keyPath: args?.keyPath as string | undefined,
          password: args?.password as string | undefined,
        });

        return {
          content: [{
            type: "text",
            text: connected ? "SSH connection successful." : "SSH connection failed.",
          }],
        };
      }

      case "create_ssh_key": {
        if (!hetznerClient) {
          return {
            content: [{
              type: "text",
              text: "Hetzner client not available.",
            }],
          };
        }

        const sshKey = await hetznerClient.ssh_keys.create({
          name: args?.name as string,
          public_key: args?.publicKey as string,
        });

        return {
          content: [{
            type: "text",
            text: `SSH key created:\n${JSON.stringify(sshKey, null, 2)}`,
          }],
        };
      }

      case "list_ssh_keys": {
        if (!hetznerClient) {
          return {
            content: [{
              type: "text",
              text: "Hetzner client not available.",
            }],
          };
        }

        const sshKeys = await hetznerClient.ssh_keys.list();

        return {
          content: [{
            type: "text",
            text: JSON.stringify(sshKeys, null, 2),
          }],
        };
      }

      case "exec_ssh": {
        const { execSSH } = await import("@codespaces/terminal/client");

        const result = await execSSH(args?.command as string, {
          host: args?.host as string,
          user: (args?.user as string) || "root",
          timeout: 30,
          keyPath: args?.keyPath as string | undefined,
          password: args?.password as string | undefined,
        });

        return {
          content: [{
            type: "text",
            text: result,
          }],
        };
      }

      case "list_server_types": {
        if (!hetznerClient) {
          return {
            content: [{
              type: "text",
              text: "Hetzner client not available.",
            }],
          };
        }

        const serverTypes = await hetznerClient.pricing.listServerTypes();

        return {
          content: [{
            type: "text",
            text: JSON.stringify(serverTypes, null, 2),
          }],
        };
      }

      case "list_locations": {
        if (!hetznerClient) {
          return {
            content: [{
              type: "text",
              text: "Hetzner client not available.",
            }],
          };
        }

        const locations = await hetznerClient.pricing.listLocations();

        return {
          content: [{
            type: "text",
            text: JSON.stringify(locations, null, 2),
          }],
        };
      }

      case "list_volumes": {
        if (!hetznerClient) {
          return {
            content: [{
              type: "text",
              text: "Hetzner client not available.",
            }],
          };
        }

        const volumes = await hetznerClient.volumes.list({
          name: args?.name as string,
          status: args?.status as string,
        });

        return {
          content: [{
            type: "text",
            text: JSON.stringify(volumes, null, 2),
          }],
        };
      }

      case "get_volume": {
        if (!hetznerClient) {
          return {
            content: [{
              type: "text",
              text: "Hetzner client not available.",
            }],
          };
        }

        const volume = await hetznerClient.volumes.get(parseInt(args?.id as string));

        return {
          content: [{
            type: "text",
            text: JSON.stringify(volume, null, 2),
          }],
        };
      }

      case "create_volume": {
        if (!hetznerClient) {
          return {
            content: [{
              type: "text",
              text: "Hetzner client not available.",
            }],
          };
        }

        // Validate required parameters
        const name = args?.name;
        const size = args?.size;

        if (!name || typeof name !== "string") {
          return {
            content: [{
              type: "text",
              text: "Error: name is required and must be a string",
            }],
            isError: true,
          };
        }

        if (!size || typeof size !== "number") {
          return {
            content: [{
              type: "text",
              text: "Error: size is required and must be a number",
            }],
            isError: true,
          };
        }

        if (size < 10 || size > 10240) {
          return {
            content: [{
              type: "text",
              text: "Error: size must be between 10 and 10240 GB",
            }],
            isError: true,
          };
        }

        const result = await hetznerClient.volumes.create({
          name,
          size,
          location: args?.location as string,
          server: args?.serverId ? parseInt(args.serverId as string, 10) : undefined,
          automount: args?.automount as boolean,
          format: args?.format as "ext4" | "xfs",
        });

        return {
          content: [{
            type: "text",
            text: `Volume created:\n${JSON.stringify(result.volume, null, 2)}\n\nAction ID: ${result.action.id}`,
          }],
        };
      }

      case "delete_volume": {
        if (!hetznerClient) {
          return {
            content: [{
              type: "text",
              text: "Hetzner client not available.",
            }],
          };
        }

        const action = await hetznerClient.volumes.delete(parseInt(args?.id as string));

        return {
          content: [{
            type: "text",
            text: `Volume deletion initiated. Action ID: ${action.id}`,
          }],
        };
      }

      case "attach_volume": {
        if (!hetznerClient) {
          return {
            content: [{
              type: "text",
              text: "Hetzner client not available.",
            }],
          };
        }

        const action = await hetznerClient.volumes.attach(
          parseInt(args?.volumeId as string),
          parseInt(args?.serverId as string),
          args?.automount as boolean ?? true,
        );

        return {
          content: [{
            type: "text",
            text: `Volume attachment initiated. Action ID: ${action.id}`,
          }],
        };
      }

      case "detach_volume": {
        if (!hetznerClient) {
          return {
            content: [{
              type: "text",
              text: "Hetzner client not available.",
            }],
          };
        }

        const action = await hetznerClient.volumes.detach(parseInt(args?.volumeId as string));

        return {
          content: [{
            type: "text",
            text: `Volume detachment initiated. Action ID: ${action.id}`,
          }],
        };
      }

      case "resize_volume": {
        if (!hetznerClient) {
          return {
            content: [{
              type: "text",
              text: "Hetzner client not available.",
            }],
          };
        }

        const action = await hetznerClient.volumes.resize(
          parseInt(args?.volumeId as string),
          args?.size as number,
        );

        return {
          content: [{
            type: "text",
            text: `Volume resize initiated. Action ID: ${action.id}`,
          }],
        };
      }

      case "calculate_volume_price": {
        const { VolumeOperations } = await import("../../src/lib/hetzner/volumes.ts");
        const price = VolumeOperations.calculatePrice(args?.size as number);

        return {
          content: [{
            type: "text",
            text: JSON.stringify(price, null, 2),
          }],
        };
      }

      default:
        return {
          content: [{
            type: "text",
            text: `Unknown tool: ${name}`,
          }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error: ${String(error)}`,
      }],
      isError: true,
    };
  }
});

// Start server
async function main() {
  // Initialize Hetzner client before starting server
  await initializeClient();

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Cheapspaces MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
