import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import type { JiraClient } from './client.js';
import {
  addCommentInputSchema,
  createIssueInputSchema,
  issueKeyInputSchema,
  listIssuesInputSchema,
  updateIssueInputSchema,
} from './types.js';

const jiraTools: Tool[] = [
  {
    name: 'jira_list_issues',
    description: 'List Jira issues for a project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: { type: 'string' },
        status: { type: 'string' },
        limit: { type: 'integer' },
      },
      required: ['projectKey'],
    },
  },
  {
    name: 'jira_get_issue',
    description: 'Get a single Jira issue by key.',
    inputSchema: {
      type: 'object',
      properties: {
        issueKey: { type: 'string' },
      },
      required: ['issueKey'],
    },
  },
  {
    name: 'jira_update_issue',
    description: 'Update fields on a Jira issue.',
    inputSchema: {
      type: 'object',
      properties: {
        issueKey: { type: 'string' },
        fields: { type: 'object' },
      },
      required: ['issueKey', 'fields'],
    },
  },
  {
    name: 'jira_create_issue',
    description: 'Create a new Jira issue.',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: { type: 'string' },
        summary: { type: 'string' },
        description: { type: 'string' },
        issueType: { type: 'string' },
      },
      required: ['projectKey', 'summary'],
    },
  },
  {
    name: 'jira_add_comment',
    description: 'Add a comment to a Jira issue.',
    inputSchema: {
      type: 'object',
      properties: {
        issueKey: { type: 'string' },
        body: { type: 'string' },
      },
      required: ['issueKey', 'body'],
    },
  },
];

export function createJiraServer(client: JiraClient): Server {
  const server = new Server(
    { name: 'mcp-jira', version: '0.1.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: jiraTools }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    const args = request.params.arguments ?? {};

    try {
      let data: unknown;

      switch (name) {
        case 'jira_list_issues':
          data = await client.listIssues(listIssuesInputSchema.parse(args));
          break;
        case 'jira_get_issue':
          data = await client.getIssue(issueKeyInputSchema.parse(args));
          break;
        case 'jira_update_issue':
          await client.updateIssue(updateIssueInputSchema.parse(args));
          data = { updated: true };
          break;
        case 'jira_create_issue':
          data = await client.createIssue(createIssueInputSchema.parse(args));
          break;
        case 'jira_add_comment':
          data = await client.addComment(addCommentInputSchema.parse(args));
          break;
        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({ success: true, data }) }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text', text: JSON.stringify({ success: false, error: message }) }],
      };
    }
  });

  return server;
}
