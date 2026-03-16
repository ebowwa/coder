/**
 * STDIO transport for CRM MCP
 * Handles communication over standard input/output
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { CRMStorageClient } from '../storage/client.js';
import { ToolHandlers } from '../tools/handlers.js';
import { TOOL_DEFINITIONS } from '../tools/definitions.js';
import { CRMError } from '../storage/types.js';

/**
 * STDIO Server implementation for CRM
 */
export class StdioServer {
  private server: Server;
  private handlers: ToolHandlers;

  constructor(private storage: CRMStorageClient) {
    this.server = new Server(
      {
        name: 'crm-mcp-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.handlers = new ToolHandlers(storage);
    this.setupHandlers();
  }

  /**
   * Set up MCP request handlers
   */
  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: TOOL_DEFINITIONS,
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        let result;

        // Contact tools
        if (name === 'crm_create_contact') {
          result = await this.handlers.createContact(args ?? {});
        } else if (name === 'crm_get_contact') {
          result = await this.handlers.getContact(args ?? {});
        } else if (name === 'crm_update_contact') {
          result = await this.handlers.updateContact(args ?? {});
        } else if (name === 'crm_delete_contact') {
          result = await this.handlers.deleteContact(args ?? {});
        } else if (name === 'crm_list_contacts') {
          result = await this.handlers.listContacts(args ?? {});
        } else if (name === 'crm_search_contacts') {
          result = await this.handlers.searchContacts(args ?? {});
        }
        // Deal tools
        else if (name === 'crm_create_deal') {
          result = await this.handlers.createDeal(args ?? {});
        } else if (name === 'crm_get_deal') {
          result = await this.handlers.getDeal(args ?? {});
        } else if (name === 'crm_update_deal') {
          result = await this.handlers.updateDeal(args ?? {});
        } else if (name === 'crm_delete_deal') {
          result = await this.handlers.deleteDeal(args ?? {});
        } else if (name === 'crm_list_deals') {
          result = await this.handlers.listDeals(args ?? {});
        } else if (name === 'crm_get_deals_by_stage') {
          result = await this.handlers.getDealsByStage(args ?? {});
        }
        // Activity tools
        else if (name === 'crm_create_activity') {
          result = await this.handlers.createActivity(args ?? {});
        } else if (name === 'crm_get_activity') {
          result = await this.handlers.getActivity(args ?? {});
        } else if (name === 'crm_list_activities') {
          result = await this.handlers.listActivities(args ?? {});
        } else if (name === 'crm_delete_activity') {
          result = await this.handlers.deleteActivity(args ?? {});
        }
        // Media tools
        else if (name === 'crm_upload_media') {
          result = await this.handlers.uploadMedia(args ?? {});
        } else if (name === 'crm_get_media') {
          result = await this.handlers.getMedia(args ?? {});
        } else if (name === 'crm_list_media') {
          result = await this.handlers.listMedia(args ?? {});
        } else if (name === 'crm_delete_media') {
          result = await this.handlers.deleteMedia(args ?? {});
        }
        // Note tools
        else if (name === 'crm_create_note') {
          result = await this.handlers.createNote(args ?? {});
        } else if (name === 'crm_get_note') {
          result = await this.handlers.getNote(args ?? {});
        } else if (name === 'crm_update_note') {
          result = await this.handlers.updateNote(args ?? {});
        } else if (name === 'crm_delete_note') {
          result = await this.handlers.deleteNote(args ?? {});
        } else if (name === 'crm_list_notes') {
          result = await this.handlers.listNotes(args ?? {});
        }
        // Tag tools
        else if (name === 'crm_create_tag') {
          result = await this.handlers.createTag(args ?? {});
        } else if (name === 'crm_get_tag') {
          result = await this.handlers.getTag(args ?? {});
        } else if (name === 'crm_list_tags') {
          result = await this.handlers.listTags(args ?? {});
        } else if (name === 'crm_delete_tag') {
          result = await this.handlers.deleteTag(args ?? {});
        }
        // Company tools
        else if (name === 'crm_create_company') {
          result = await this.handlers.createCompany(args ?? {});
        } else if (name === 'crm_get_company') {
          result = await this.handlers.getCompany(args ?? {});
        } else if (name === 'crm_update_company') {
          result = await this.handlers.updateCompany(args ?? {});
        } else if (name === 'crm_delete_company') {
          result = await this.handlers.deleteCompany(args ?? {});
        } else if (name === 'crm_list_companies') {
          result = await this.handlers.listCompanies(args ?? {});
        }
        // Stats & Dashboard
        else if (name === 'crm_get_stats') {
          result = await this.handlers.getStats();
        } else if (name === 'crm_get_dashboard') {
          result = await this.handlers.getDashboard(args ?? {});
        }
        // Unknown tool
        else {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  error: `Unknown tool: ${name}`,
                }),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof CRMError ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: errorMessage,
              }),
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Start the STDIO server
   */
  async start(): Promise<void> {
    // Set up error handling
    this.server.onerror = (error) => console.error('[CRM MCP Error]', error);

    // Set up signal handlers for graceful shutdown
    process.on('SIGINT', async () => {
      console.error('[CRM MCP] Received SIGINT, shutting down...');
      await this.server.close();
      await this.storage.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.error('[CRM MCP] Received SIGTERM, shutting down...');
      await this.server.close();
      await this.storage.close();
      process.exit(0);
    });

    // Connect the transport
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    // Log startup confirmation to stderr (doesn't interfere with JSON-RPC)
    console.error('[CRM MCP] Server running on stdio');

    // Keep stdin open to receive requests
    process.stdin.resume();
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    await this.server.close();
    await this.storage.close();
  }
}
