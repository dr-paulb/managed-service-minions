/* eslint-disable @typescript-eslint/no-explicit-any */
import { jest } from '@jest/globals';
import type { JiraClient } from '../client.js';

const mockSetRequestHandler = jest.fn() as jest.Mock<any>;
const mockConnect = jest.fn() as jest.Mock<any>;
const MockServer = jest.fn() as jest.Mock<any>;

jest.unstable_mockModule('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: MockServer,
}));

MockServer.mockImplementation(() => ({
  setRequestHandler: mockSetRequestHandler,
  connect: mockConnect,
}));

const { createJiraServer } = await import('../server.js');

describe('createJiraServer', () => {
  let mockClient: JiraClient;

  beforeEach(() => {
    mockClient = {
      listIssues: jest.fn(),
      getIssue: jest.fn(),
      updateIssue: jest.fn(),
      createIssue: jest.fn(),
      addComment: jest.fn(),
    } as unknown as JiraClient;

    mockSetRequestHandler.mockClear();
    mockConnect.mockClear();
  });

  it('creates an MCP server and registers handlers', () => {
    createJiraServer(mockClient);
    expect(MockServer).toHaveBeenCalledWith(
      { name: 'mcp-jira', version: '0.1.0' },
      { capabilities: { tools: {} } }
    );
    expect(mockSetRequestHandler).toHaveBeenCalledTimes(2);
  });

  it('lists the Jira tools', async () => {
    createJiraServer(mockClient);
    const listToolsHandler = mockSetRequestHandler.mock.calls[0][1] as () => Promise<{
      tools: Array<{ name: string }>;
    }>;
    const response = await listToolsHandler();
    expect(response.tools).toHaveLength(5);
    expect(response.tools.map((t) => t.name)).toEqual([
      'jira_list_issues',
      'jira_get_issue',
      'jira_update_issue',
      'jira_create_issue',
      'jira_add_comment',
    ]);
  });

  describe('call tool handler', () => {
    async function callTool(name: string, args: Record<string, unknown> = {}) {
      createJiraServer(mockClient);
      const handler = mockSetRequestHandler.mock.calls[1][1] as (req: {
        params: { name: string; arguments?: Record<string, unknown> };
      }) => Promise<{ content: Array<{ text: string }> }>;
      return handler({ params: { name, arguments: args } });
    }

    it('lists issues', async () => {
      const issues = [{ key: 'PROJ-1' }];
      (mockClient.listIssues as jest.Mock<any>).mockResolvedValue(issues);
      const response = await callTool('jira_list_issues', { projectKey: 'PROJ' });
      const payload = JSON.parse(response.content[0].text);
      expect(payload.success).toBe(true);
      expect(payload.data).toEqual(issues);
      expect(mockClient.listIssues).toHaveBeenCalledWith(
        expect.objectContaining({ projectKey: 'PROJ' })
      );
    });

    it('gets an issue', async () => {
      const issue = { key: 'PROJ-2' };
      (mockClient.getIssue as jest.Mock<any>).mockResolvedValue(issue);
      const response = await callTool('jira_get_issue', { issueKey: 'PROJ-2' });
      const payload = JSON.parse(response.content[0].text);
      expect(payload.success).toBe(true);
      expect(payload.data).toEqual(issue);
    });

    it('updates an issue', async () => {
      (mockClient.updateIssue as jest.Mock<any>).mockResolvedValue(undefined);
      const response = await callTool('jira_update_issue', {
        issueKey: 'PROJ-3',
        fields: { summary: 'Updated' },
      });
      const payload = JSON.parse(response.content[0].text);
      expect(payload.success).toBe(true);
      expect(payload.data).toEqual({ updated: true });
    });

    it('creates an issue', async () => {
      const issue = { key: 'PROJ-4' };
      (mockClient.createIssue as jest.Mock<any>).mockResolvedValue(issue);
      const response = await callTool('jira_create_issue', {
        projectKey: 'PROJ',
        summary: 'New issue',
      });
      const payload = JSON.parse(response.content[0].text);
      expect(payload.success).toBe(true);
      expect(payload.data).toEqual(issue);
    });

    it('adds a comment', async () => {
      const comment = { id: '100' };
      (mockClient.addComment as jest.Mock<any>).mockResolvedValue(comment);
      const response = await callTool('jira_add_comment', {
        issueKey: 'PROJ-5',
        body: 'hello',
      });
      const payload = JSON.parse(response.content[0].text);
      expect(payload.success).toBe(true);
      expect(payload.data).toEqual(comment);
    });

    it('returns an error for unknown tools', async () => {
      const response = await callTool('jira_unknown_tool', {});
      const payload = JSON.parse(response.content[0].text);
      expect(payload.success).toBe(false);
      expect(payload.error).toContain('Unknown tool');
    });

    it('returns an error for invalid arguments', async () => {
      const response = await callTool('jira_get_issue', {});
      const payload = JSON.parse(response.content[0].text);
      expect(payload.success).toBe(false);
      expect(payload.error).toBeDefined();
    });

    it('returns an error when the client throws', async () => {
      (mockClient.listIssues as jest.Mock<any>).mockRejectedValue(new Error('rate limit'));
      const response = await callTool('jira_list_issues', { projectKey: 'PROJ' });
      const payload = JSON.parse(response.content[0].text);
      expect(payload.success).toBe(false);
      expect(payload.error).toBe('rate limit');
    });

    it('returns a stringified error for non-Error rejections', async () => {
      (mockClient.listIssues as jest.Mock<any>).mockRejectedValue('string failure');
      const response = await callTool('jira_list_issues', { projectKey: 'PROJ' });
      const payload = JSON.parse(response.content[0].text);
      expect(payload.success).toBe(false);
      expect(payload.error).toBe('string failure');
    });

    it('handles missing arguments', async () => {
      createJiraServer(mockClient);
      const handler = mockSetRequestHandler.mock.calls[1][1] as (req: {
        params: { name: string; arguments?: Record<string, unknown> };
      }) => Promise<{ content: Array<{ text: string }> }>;
      const response = await handler({ params: { name: 'jira_list_issues' } });
      const payload = JSON.parse(response.content[0].text);
      expect(payload.success).toBe(false);
      expect(payload.error).toBeDefined();
    });
  });
});
