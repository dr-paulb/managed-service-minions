import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import type { AzureDevOpsClient } from './client.js';
import {
  listPullRequestsSchema,
  getPullRequestSchema,
  getPullRequestDiffSchema,
  createPullRequestSchema,
  mergePullRequestSchema,
  listWorkItemsSchema,
  getWorkItemSchema,
  updateWorkItemSchema,
  type ToolOutput,
} from './types.js';

const tools: Tool[] = [
  {
    name: 'ado_list_pull_requests',
    description: 'List pull requests in an Azure DevOps Git repository.',
    inputSchema: {
      type: 'object',
      properties: {
        repositoryId: { type: 'string' },
        status: { type: 'string', enum: ['active', 'abandoned', 'completed', 'all'] },
        top: { type: 'integer' },
      },
      required: ['repositoryId'],
    },
  },
  {
    name: 'ado_get_pull_request',
    description: 'Get a single Azure DevOps pull request by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        repositoryId: { type: 'string' },
        pullRequestId: { type: 'integer' },
      },
      required: ['repositoryId', 'pullRequestId'],
    },
  },
  {
    name: 'ado_get_pull_request_diff',
    description: 'Get the diff for an Azure DevOps pull request.',
    inputSchema: {
      type: 'object',
      properties: {
        repositoryId: { type: 'string' },
        pullRequestId: { type: 'integer' },
      },
      required: ['repositoryId', 'pullRequestId'],
    },
  },
  {
    name: 'ado_create_pull_request',
    description: 'Create a new Azure DevOps pull request.',
    inputSchema: {
      type: 'object',
      properties: {
        repositoryId: { type: 'string' },
        title: { type: 'string' },
        sourceRefName: { type: 'string' },
        targetRefName: { type: 'string' },
        description: { type: 'string' },
      },
      required: ['repositoryId', 'title', 'sourceRefName', 'targetRefName'],
    },
  },
  {
    name: 'ado_merge_pull_request',
    description: 'Complete/merge an Azure DevOps pull request.',
    inputSchema: {
      type: 'object',
      properties: {
        repositoryId: { type: 'string' },
        pullRequestId: { type: 'integer' },
        comment: { type: 'string' },
      },
      required: ['repositoryId', 'pullRequestId'],
    },
  },
  {
    name: 'ado_list_work_items',
    description: 'List Azure DevOps work items by WIQL query or explicit IDs.',
    inputSchema: {
      type: 'object',
      properties: {
        wiql: { type: 'string' },
        ids: { type: 'array', items: { type: 'integer' } },
      },
    },
  },
  {
    name: 'ado_get_work_item',
    description: 'Get a single Azure DevOps work item by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'integer', minimum: 1 },
      },
      required: ['id'],
    },
  },
  {
    name: 'ado_update_work_item',
    description: 'Update fields on an Azure DevOps work item.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        fields: { type: 'object' },
      },
      required: ['id', 'fields'],
    },
  },
];

function ok(data: unknown): ToolOutput {
  return { success: true, data };
}

function err(message: string): ToolOutput {
  return { success: false, error: message };
}

export function createAzureDevOpsServer(client: AzureDevOpsClient): Server {
  const server = new Server(
    { name: 'mcp-azure-devops', version: '0.1.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const args = request.params.arguments ?? {};
    let result: ToolOutput;

    try {
      switch (request.params.name) {
        case 'ado_list_pull_requests': {
          const input = listPullRequestsSchema.parse(args);
          const data = await client.listPullRequests(input.repositoryId, input.status, input.top);
          result = ok(data);
          break;
        }
        case 'ado_get_pull_request': {
          const input = getPullRequestSchema.parse(args);
          const data = await client.getPullRequest(input.repositoryId, input.pullRequestId);
          result = ok(data);
          break;
        }
        case 'ado_get_pull_request_diff': {
          const input = getPullRequestDiffSchema.parse(args);
          const data = await client.getPullRequestDiff(input.repositoryId, input.pullRequestId);
          result = ok(data);
          break;
        }
        case 'ado_create_pull_request': {
          const input = createPullRequestSchema.parse(args);
          const data = await client.createPullRequest(
            input.repositoryId,
            input.title,
            input.sourceRefName,
            input.targetRefName,
            input.description
          );
          result = ok(data);
          break;
        }
        case 'ado_merge_pull_request': {
          const input = mergePullRequestSchema.parse(args);
          const data = await client.mergePullRequest(
            input.repositoryId,
            input.pullRequestId,
            input.comment
          );
          result = ok(data);
          break;
        }
        case 'ado_list_work_items': {
          const input = listWorkItemsSchema.parse(args);
          const data = await client.listWorkItems(input.wiql, input.ids);
          result = ok(data);
          break;
        }
        case 'ado_get_work_item': {
          const input = getWorkItemSchema.parse(args);
          const data = await client.getWorkItem(input.id);
          result = ok(data);
          break;
        }
        case 'ado_update_work_item': {
          const input = updateWorkItemSchema.parse(args);
          const data = await client.updateWorkItem(input.id, input.fields);
          result = ok(data);
          break;
        }
        default:
          result = err(`Unknown tool: ${request.params.name}`);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        result = err(error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '));
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

export async function startAzureDevOpsServer(client: AzureDevOpsClient): Promise<void> {
  const server = createAzureDevOpsServer(client);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
