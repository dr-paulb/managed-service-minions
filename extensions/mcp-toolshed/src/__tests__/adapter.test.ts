/* eslint-disable @typescript-eslint/no-explicit-any */
import { jest } from '@jest/globals';

const mockConnect = jest.fn() as jest.Mock<any>;
const mockPing = jest.fn() as jest.Mock<any>;
const mockListTools = jest.fn() as jest.Mock<any>;
const mockCallTool = jest.fn() as jest.Mock<any>;
const mockClose = jest.fn() as jest.Mock<any>;
const mockTransportClose = jest.fn() as jest.Mock<any>;

const MockClient = jest.fn() as jest.Mock<any>;
const MockTransport = jest.fn() as jest.Mock<any>;

jest.unstable_mockModule('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: MockClient,
}));

jest.unstable_mockModule('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: MockTransport,
}));

MockClient.mockImplementation(() => ({
  connect: mockConnect,
  ping: mockPing,
  listTools: mockListTools,
  callTool: mockCallTool,
  close: mockClose,
}));

MockTransport.mockImplementation(() => ({
  close: mockTransportClose,
}));

const { createMockAdapter, createMcpAdapter } = await import('../adapter.js');

describe('createMockAdapter', () => {
  it('returns default values when no handlers are provided', async () => {
    const adapter = createMockAdapter('test');
    expect(adapter.alias).toBe('test');
    expect(await adapter.health()).toEqual({ healthy: true, latencyMs: 0 });
    expect(await adapter.listTools()).toEqual([]);
    expect(await adapter.callTool('x', {})).toEqual({});
  });

  it('uses provided handlers', async () => {
    const adapter = createMockAdapter('test', {
      health: async () => ({ healthy: false, latencyMs: 12 }),
      listTools: async () => [{ name: 't', description: 'd', inputSchema: {} }],
      callTool: async (name, params) => ({ name, params }),
      close: async () => undefined,
    });
    expect(await adapter.health()).toEqual({ healthy: false, latencyMs: 12 });
    expect(await adapter.listTools()).toHaveLength(1);
    expect(await adapter.callTool('echo', { value: 1 })).toEqual({ name: 'echo', params: { value: 1 } });
    await adapter.close?.();
  });
});

describe('createMcpAdapter', () => {
  beforeEach(() => {
    mockConnect.mockReset();
    mockPing.mockReset();
    mockListTools.mockReset();
    mockCallTool.mockReset();
    mockClose.mockReset();
    mockTransportClose.mockReset();
  });

  it('creates an adapter that can list and call tools', async () => {
    mockConnect.mockResolvedValue(undefined);
    mockPing.mockResolvedValue(undefined);
    mockListTools.mockResolvedValue({
      tools: [{ name: 'echo', description: 'echo', inputSchema: { type: 'object' } }],
    });
    mockCallTool.mockResolvedValue({ content: [{ type: 'text', text: 'hi' }] });

    const adapter = await createMcpAdapter({ alias: 'local', command: 'node', args: ['server.js'] });

    expect(adapter.alias).toBe('local');
    expect(await adapter.health()).toEqual({ healthy: true, latencyMs: expect.any(Number) });
    const tools = await adapter.listTools();
    expect(tools).toHaveLength(1);
    expect(tools[0]?.name).toBe('echo');
    const result = await adapter.callTool('echo', { value: 1 });
    expect(result).toEqual({ content: [{ type: 'text', text: 'hi' }] });

    await adapter.close?.();
    expect(mockTransportClose).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
  });

  it('reports unhealthy when ping fails', async () => {
    mockConnect.mockResolvedValue(undefined);
    mockPing.mockRejectedValue(new Error('timeout'));

    const adapter = await createMcpAdapter({ alias: 'local', command: 'node' });
    const health = await adapter.health();
    expect(health.healthy).toBe(false);
  });

  it('handles listTools with missing fields', async () => {
    mockConnect.mockResolvedValue(undefined);
    mockListTools.mockResolvedValue({});

    const adapter = await createMcpAdapter({ alias: 'local', command: 'node' });
    const tools = await adapter.listTools();
    expect(tools).toEqual([]);
  });

  it('falls back to empty description', async () => {
    mockConnect.mockResolvedValue(undefined);
    mockListTools.mockResolvedValue({ tools: [{ name: 'x', inputSchema: {} }] });

    const adapter = await createMcpAdapter({ alias: 'local', command: 'node' });
    const tools = await adapter.listTools();
    expect(tools[0].description).toBe('');
  });
});
