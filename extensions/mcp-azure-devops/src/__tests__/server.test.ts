/* eslint-disable @typescript-eslint/no-explicit-any */
import { jest } from '@jest/globals';

const mockSetRequestHandler = jest.fn() as jest.Mock<any>;
const mockConnect = jest.fn() as jest.Mock<any>;
const MockServer = jest.fn() as jest.Mock<any>;
const MockTransport = jest.fn() as jest.Mock<any>;

jest.unstable_mockModule('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: MockServer,
}));

jest.unstable_mockModule('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: MockTransport,
}));

MockServer.mockImplementation(() => ({
  setRequestHandler: mockSetRequestHandler,
  connect: mockConnect,
}));

MockTransport.mockImplementation(() => ({}));

const { createAzureDevOpsServer, startAzureDevOpsServer } = await import('../server.js');

describe('createAzureDevOpsServer', () => {
  const mockListPullRequests = jest.fn() as jest.Mock<any>;
  const mockGetPullRequest = jest.fn() as jest.Mock<any>;
  const mockGetPullRequestDiff = jest.fn() as jest.Mock<any>;
  const mockCreatePullRequest = jest.fn() as jest.Mock<any>;
  const mockMergePullRequest = jest.fn() as jest.Mock<any>;
  const mockListWorkItems = jest.fn() as jest.Mock<any>;
  const mockGetWorkItem = jest.fn() as jest.Mock<any>;
  const mockUpdateWorkItem = jest.fn() as jest.Mock<any>;

  const mockClient = {
    listPullRequests: mockListPullRequests,
    getPullRequest: mockGetPullRequest,
    getPullRequestDiff: mockGetPullRequestDiff,
    createPullRequest: mockCreatePullRequest,
    mergePullRequest: mockMergePullRequest,
    listWorkItems: mockListWorkItems,
    getWorkItem: mockGetWorkItem,
    updateWorkItem: mockUpdateWorkItem,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockConnect.mockResolvedValue(undefined);
  });

  function getHandlers() {
    createAzureDevOpsServer(mockClient as any);
    expect(mockSetRequestHandler).toHaveBeenCalledTimes(2);
    const listToolsHandler = mockSetRequestHandler.mock.calls[0][1] as () => Promise<{
      tools: Array<{ name: string }>;
    }>;
    const callToolHandler = mockSetRequestHandler.mock.calls[1][1] as (req: {
      params: { name: string; arguments?: Record<string, unknown> };
    }) => Promise<{ content: Array<{ text: string }> }>;
    return { listToolsHandler, callToolHandler };
  }

  async function callTool(
    name: string,
    args?: Record<string, unknown>
  ): Promise<{ content: Array<{ text: string }> }> {
    const { callToolHandler } = getHandlers();
    return callToolHandler({ params: { name, arguments: args ?? {} } });
  }

  function parseText(response: { content: Array<{ text: string }> }): unknown {
    return JSON.parse(response.content[0].text);
  }

  it('lists all supported tools', async () => {
    const { listToolsHandler } = getHandlers();
    const result = await listToolsHandler();
    expect(result.tools).toHaveLength(8);
    expect(result.tools.map((t) => t.name)).toContain('ado_list_pull_requests');
    expect(result.tools.map((t) => t.name)).toContain('ado_update_work_item');
  });

  it('handles ado_list_pull_requests with defaults', async () => {
    mockListPullRequests.mockResolvedValue({ value: [] });
    const response = await callTool('ado_list_pull_requests', { repositoryId: 'repo-1' });
    expect(parseText(response)).toEqual({ success: true, data: { value: [] } });
    expect(mockListPullRequests).toHaveBeenCalledWith('repo-1', undefined, undefined);
  });

  it('handles ado_list_pull_requests with all options', async () => {
    mockListPullRequests.mockResolvedValue({ value: [] });
    await callTool('ado_list_pull_requests', { repositoryId: 'repo-1', status: 'completed', top: 5 });
    expect(mockListPullRequests).toHaveBeenCalledWith('repo-1', 'completed', 5);
  });

  it('handles ado_get_pull_request', async () => {
    mockGetPullRequest.mockResolvedValue({ pullRequestId: 1 });
    const response = await callTool('ado_get_pull_request', { repositoryId: 'repo-1', pullRequestId: 1 });
    expect(parseText(response)).toEqual({ success: true, data: { pullRequestId: 1 } });
  });

  it('handles ado_get_pull_request_diff', async () => {
    mockGetPullRequestDiff.mockResolvedValue({ changes: [] });
    const response = await callTool('ado_get_pull_request_diff', {
      repositoryId: 'repo-1',
      pullRequestId: 1,
    });
    expect(parseText(response)).toEqual({ success: true, data: { changes: [] } });
  });

  it('handles ado_create_pull_request without description', async () => {
    mockCreatePullRequest.mockResolvedValue({ pullRequestId: 2 });
    const response = await callTool('ado_create_pull_request', {
      repositoryId: 'repo-1',
      title: 'PR title',
      sourceRefName: 'refs/heads/feature',
      targetRefName: 'refs/heads/main',
    });
    expect(parseText(response)).toEqual({ success: true, data: { pullRequestId: 2 } });
    expect(mockCreatePullRequest).toHaveBeenCalledWith(
      'repo-1',
      'PR title',
      'refs/heads/feature',
      'refs/heads/main',
      undefined
    );
  });

  it('handles ado_create_pull_request with description', async () => {
    mockCreatePullRequest.mockResolvedValue({ pullRequestId: 2 });
    await callTool('ado_create_pull_request', {
      repositoryId: 'repo-1',
      title: 'PR title',
      sourceRefName: 'refs/heads/feature',
      targetRefName: 'refs/heads/main',
      description: 'desc',
    });
    expect(mockCreatePullRequest).toHaveBeenCalledWith(
      'repo-1',
      'PR title',
      'refs/heads/feature',
      'refs/heads/main',
      'desc'
    );
  });

  it('handles ado_merge_pull_request without comment', async () => {
    mockMergePullRequest.mockResolvedValue({ status: 'completed' });
    const response = await callTool('ado_merge_pull_request', {
      repositoryId: 'repo-1',
      pullRequestId: 1,
    });
    expect(parseText(response)).toEqual({ success: true, data: { status: 'completed' } });
    expect(mockMergePullRequest).toHaveBeenCalledWith('repo-1', 1, undefined);
  });

  it('handles ado_merge_pull_request with comment', async () => {
    mockMergePullRequest.mockResolvedValue({ status: 'completed' });
    await callTool('ado_merge_pull_request', {
      repositoryId: 'repo-1',
      pullRequestId: 1,
      comment: 'LGTM',
    });
    expect(mockMergePullRequest).toHaveBeenCalledWith('repo-1', 1, 'LGTM');
  });

  it('handles ado_list_work_items by ids', async () => {
    mockListWorkItems.mockResolvedValue({ value: [] });
    const response = await callTool('ado_list_work_items', { ids: [1, 2] });
    expect(parseText(response)).toEqual({ success: true, data: { value: [] } });
    expect(mockListWorkItems).toHaveBeenCalledWith(undefined, [1, 2]);
  });

  it('handles ado_list_work_items by wiql', async () => {
    mockListWorkItems.mockResolvedValue({ workItems: [] });
    await callTool('ado_list_work_items', { wiql: 'SELECT [System.Id] FROM workitems' });
    expect(mockListWorkItems).toHaveBeenCalledWith('SELECT [System.Id] FROM workitems', undefined);
  });

  it('handles ado_get_work_item', async () => {
    mockGetWorkItem.mockResolvedValue({ id: 42 });
    const response = await callTool('ado_get_work_item', { id: 42 });
    expect(parseText(response)).toEqual({ success: true, data: { id: 42 } });
  });

  it('handles ado_update_work_item', async () => {
    mockUpdateWorkItem.mockResolvedValue({ id: 42 });
    const response = await callTool('ado_update_work_item', {
      id: 42,
      fields: { 'System.Title': 'Updated', 'System.State': 'Active' },
    });
    expect(parseText(response)).toEqual({ success: true, data: { id: 42 } });
    expect(mockUpdateWorkItem).toHaveBeenCalledWith(42, {
      'System.Title': 'Updated',
      'System.State': 'Active',
    });
  });

  it('handles ado_update_work_item with non-string field values', async () => {
    mockUpdateWorkItem.mockResolvedValue({ id: 42 });
    const response = await callTool('ado_update_work_item', {
      id: 42,
      fields: { 'System.Priority': 1, 'System.IsBlocked': true },
    });
    expect(parseText(response)).toEqual({ success: true, data: { id: 42 } });
    expect(mockUpdateWorkItem).toHaveBeenCalledWith(42, {
      'System.Priority': 1,
      'System.IsBlocked': true,
    });
  });

  it('returns validation errors for invalid arguments', async () => {
    const response = await callTool('ado_get_work_item', { id: 'not-a-number' });
    const parsed = parseText(response) as { success: boolean; error: string };
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('id');
  });

  it.each([
    ['negative id', -1],
    ['zero id', 0],
    ['float id', 1.5],
  ])('returns validation errors for %s', async (_label, id) => {
    const response = await callTool('ado_get_work_item', { id });
    const parsed = parseText(response) as { success: boolean; error: string };
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('id');
  });

  it('returns validation errors when neither wiql nor ids are provided', async () => {
    const response = await callTool('ado_list_work_items', {});
    const parsed = parseText(response) as { success: boolean; error: string };
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('wiql');
  });

  it('returns error when the client throws', async () => {
    mockGetWorkItem.mockRejectedValue(new Error('ADO is down'));
    const response = await callTool('ado_get_work_item', { id: 42 });
    expect(parseText(response)).toEqual({ success: false, error: 'ADO is down' });
  });

  it('returns error for non-Error throws', async () => {
    mockGetWorkItem.mockRejectedValue('weird');
    const response = await callTool('ado_get_work_item', { id: 42 });
    expect(parseText(response)).toEqual({ success: false, error: 'weird' });
  });

  it('returns error for unknown tools', async () => {
    const response = await callTool('ado_unknown_tool', {});
    expect(parseText(response)).toEqual({ success: false, error: 'Unknown tool: ado_unknown_tool' });
  });

  it('handles missing arguments gracefully', async () => {
    const { callToolHandler } = getHandlers();
    const response = await callToolHandler({ params: { name: 'ado_get_work_item' } });
    const parsed = parseText(response) as { success: boolean; error: string };
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('id');
  });

  describe('startAzureDevOpsServer', () => {
    it('connects to stdio transport', async () => {
      await startAzureDevOpsServer(mockClient as any);
      expect(mockConnect).toHaveBeenCalled();
    });
  });
});
