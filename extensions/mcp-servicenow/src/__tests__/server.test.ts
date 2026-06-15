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

const { createServiceNowServer, startServiceNowServer } = await import('../server.js');

describe('createServiceNowServer', () => {
  const mockListIncidents = jest.fn() as jest.Mock<any>;
  const mockGetIncidentBySysId = jest.fn() as jest.Mock<any>;
  const mockGetIncidentByNumber = jest.fn() as jest.Mock<any>;
  const mockUpdateIncident = jest.fn() as jest.Mock<any>;
  const mockCreateIncident = jest.fn() as jest.Mock<any>;

  const mockClient = {
    listIncidents: mockListIncidents,
    getIncidentBySysId: mockGetIncidentBySysId,
    getIncidentByNumber: mockGetIncidentByNumber,
    updateIncident: mockUpdateIncident,
    createIncident: mockCreateIncident,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockConnect.mockResolvedValue(undefined);
  });

  function getHandlers() {
    createServiceNowServer(mockClient as any);
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
    expect(result.tools).toHaveLength(4);
    expect(result.tools.map((t) => t.name)).toContain('servicenow_list_incidents');
    expect(result.tools.map((t) => t.name)).toContain('servicenow_create_incident');
  });

  it('handles servicenow_list_incidents with no filters', async () => {
    mockListIncidents.mockResolvedValue({ result: [] });
    const response = await callTool('servicenow_list_incidents', {});
    expect(parseText(response)).toEqual({ success: true, data: { result: [] } });
    expect(mockListIncidents).toHaveBeenCalledWith(undefined, undefined);
  });

  it('handles servicenow_list_incidents with limit and state', async () => {
    mockListIncidents.mockResolvedValue({ result: [] });
    await callTool('servicenow_list_incidents', { limit: 5, state: '1' });
    expect(mockListIncidents).toHaveBeenCalledWith(5, '1');
  });

  it('handles servicenow_get_incident by sys_id', async () => {
    mockGetIncidentBySysId.mockResolvedValue({ result: { sys_id: 'abc123' } });
    const response = await callTool('servicenow_get_incident', { sys_id: 'abc123' });
    expect(parseText(response)).toEqual({ success: true, data: { result: { sys_id: 'abc123' } } });
    expect(mockGetIncidentBySysId).toHaveBeenCalledWith('abc123');
  });

  it('handles servicenow_get_incident by number', async () => {
    mockGetIncidentByNumber.mockResolvedValue({ sys_id: 'abc123', number: 'INC001' });
    const response = await callTool('servicenow_get_incident', { number: 'INC001' });
    expect(parseText(response)).toEqual({ success: true, data: { sys_id: 'abc123', number: 'INC001' } });
    expect(mockGetIncidentByNumber).toHaveBeenCalledWith('INC001');
  });

  it('handles servicenow_update_incident', async () => {
    mockUpdateIncident.mockResolvedValue({ result: { sys_id: 'abc123' } });
    const response = await callTool('servicenow_update_incident', {
      sys_id: 'abc123',
      fields: { state: '2' },
    });
    expect(parseText(response)).toEqual({ success: true, data: { result: { sys_id: 'abc123' } } });
    expect(mockUpdateIncident).toHaveBeenCalledWith('abc123', { state: '2' });
  });

  it('handles servicenow_create_incident with required fields only', async () => {
    mockCreateIncident.mockResolvedValue({ result: { sys_id: 'abc123', number: 'INC001' } });
    const response = await callTool('servicenow_create_incident', {
      short_description: 'Test incident',
    });
    expect(parseText(response)).toEqual({
      success: true,
      data: { result: { sys_id: 'abc123', number: 'INC001' } },
    });
    expect(mockCreateIncident).toHaveBeenCalledWith({ short_description: 'Test incident' });
  });

  it('handles servicenow_create_incident with all optional fields', async () => {
    mockCreateIncident.mockResolvedValue({ result: { sys_id: 'abc123', number: 'INC001' } });
    await callTool('servicenow_create_incident', {
      short_description: 'Test incident',
      description: 'Detailed description',
      urgency: '1',
      impact: '1',
    });
    expect(mockCreateIncident).toHaveBeenCalledWith({
      short_description: 'Test incident',
      description: 'Detailed description',
      urgency: '1',
      impact: '1',
    });
  });

  it('returns validation errors for invalid arguments', async () => {
    const response = await callTool('servicenow_get_incident', {});
    const parsed = parseText(response) as { success: boolean; error: string };
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('Either sys_id or number must be provided (but not both)');
  });

  it('returns validation error when both sys_id and number are provided', async () => {
    const response = await callTool('servicenow_get_incident', { sys_id: 'abc123', number: 'INC001' });
    const parsed = parseText(response) as { success: boolean; error: string };
    expect(parsed.success).toBe(false);
    expect(parsed.error).not.toContain(':');
    expect(parsed.error).toContain('Either sys_id or number must be provided (but not both)');
  });

  it('returns validation errors for invalid limit type', async () => {
    const response = await callTool('servicenow_list_incidents', { limit: 'five' });
    const parsed = parseText(response) as { success: boolean; error: string };
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('limit');
  });

  it('returns validation errors for missing short_description', async () => {
    const response = await callTool('servicenow_create_incident', {});
    const parsed = parseText(response) as { success: boolean; error: string };
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('short_description');
  });

  it('returns error when the client throws', async () => {
    mockGetIncidentBySysId.mockRejectedValue(new Error('ServiceNow is down'));
    const response = await callTool('servicenow_get_incident', { sys_id: 'abc123' });
    expect(parseText(response)).toEqual({ success: false, error: 'ServiceNow is down' });
  });

  it('returns error for non-Error throws', async () => {
    mockGetIncidentBySysId.mockRejectedValue('weird');
    const response = await callTool('servicenow_get_incident', { sys_id: 'abc123' });
    expect(parseText(response)).toEqual({ success: false, error: 'weird' });
  });

  it('returns error for unknown tools', async () => {
    const response = await callTool('servicenow_unknown_tool', {});
    expect(parseText(response)).toEqual({ success: false, error: 'Unknown tool: servicenow_unknown_tool' });
  });

  it('handles missing arguments gracefully', async () => {
    const { callToolHandler } = getHandlers();
    const response = await callToolHandler({ params: { name: 'servicenow_get_incident' } });
    const parsed = parseText(response) as { success: boolean; error: string };
    expect(parsed.success).toBe(false);
    expect(parsed.error).toContain('Either sys_id or number must be provided (but not both)');
  });

  describe('startServiceNowServer', () => {
    it('connects to stdio transport', async () => {
      await startServiceNowServer(mockClient as any);
      expect(mockConnect).toHaveBeenCalled();
    });
  });
});
