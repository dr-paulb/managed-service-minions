import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import type { ServiceNowClient } from './client.js';
import {
  listIncidentsSchema,
  getIncidentSchema,
  updateIncidentSchema,
  createIncidentSchema,
  type ToolOutput,
} from './types.js';

const tools: Tool[] = [
  {
    name: 'servicenow_list_incidents',
    description: 'List ServiceNow incidents with optional limit and state filter.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'integer', minimum: 1 },
        state: { type: 'string' },
      },
    },
  },
  {
    name: 'servicenow_get_incident',
    description: 'Get a ServiceNow incident by sys_id or number.',
    inputSchema: {
      type: 'object',
      properties: {
        sys_id: { type: 'string' },
        number: { type: 'string' },
      },
      oneOf: [{ required: ['sys_id'] }, { required: ['number'] }],
    },
  },
  {
    name: 'servicenow_update_incident',
    description: 'Update fields on a ServiceNow incident by sys_id.',
    inputSchema: {
      type: 'object',
      properties: {
        sys_id: { type: 'string' },
        fields: { type: 'object' },
      },
      required: ['sys_id', 'fields'],
    },
  },
  {
    name: 'servicenow_create_incident',
    description: 'Create a new ServiceNow incident.',
    inputSchema: {
      type: 'object',
      properties: {
        short_description: { type: 'string' },
        description: { type: 'string' },
        urgency: { type: 'string' },
        impact: { type: 'string' },
      },
      required: ['short_description'],
    },
  },
];

function ok(data: unknown): ToolOutput {
  return { success: true, data };
}

function err(message: string): ToolOutput {
  return { success: false, error: message };
}

export function createServiceNowServer(client: ServiceNowClient): Server {
  const server = new Server(
    { name: 'mcp-servicenow', version: '0.1.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const args = request.params.arguments ?? {};
    let result: ToolOutput;

    try {
      switch (request.params.name) {
        case 'servicenow_list_incidents': {
          const input = listIncidentsSchema.parse(args);
          const data = await client.listIncidents(input.limit, input.state);
          result = ok(data);
          break;
        }
        case 'servicenow_get_incident': {
          const input = getIncidentSchema.parse(args);
          if (input.sys_id !== undefined) {
            const data = await client.getIncidentBySysId(input.sys_id);
            result = ok(data);
          } else {
            const data = await client.getIncidentByNumber(input.number!);
            result = ok(data);
          }
          break;
        }
        case 'servicenow_update_incident': {
          const input = updateIncidentSchema.parse(args);
          const data = await client.updateIncident(input.sys_id, input.fields);
          result = ok(data);
          break;
        }
        case 'servicenow_create_incident': {
          const input = createIncidentSchema.parse(args);
          const data = await client.createIncident(input);
          result = ok(data);
          break;
        }
        default:
          result = err(`Unknown tool: ${request.params.name}`);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        result = err(
          error.errors
            .map((e) => (e.path.length ? `${e.path.join('.')}: ${e.message}` : e.message))
            .join('; ')
        );
      } else if (error instanceof Error) {
        result = err(error.message);
      } else {
        result = err(String(error));
      }
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
    };
  });

  return server;
}

export async function startServiceNowServer(client: ServiceNowClient): Promise<void> {
  const server = createServiceNowServer(client);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
