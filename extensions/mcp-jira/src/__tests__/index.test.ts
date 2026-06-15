/* eslint-disable @typescript-eslint/no-explicit-any */
import { jest } from '@jest/globals';

process.env.JIRA_HOST = 'jira.example.com';
process.env.JIRA_EMAIL = 'user@example.com';
process.env.JIRA_API_TOKEN = 'token';

const mockCreateJiraClient = jest.fn() as jest.Mock<any>;
const mockCreateJiraServer = jest.fn() as jest.Mock<any>;
const mockConnect = jest.fn() as jest.Mock<any>;
const MockStdioTransport = jest.fn() as jest.Mock<any>;

mockCreateJiraServer.mockReturnValue({ connect: mockConnect });
mockConnect.mockResolvedValue(undefined);

await jest.unstable_mockModule('../client.js', () => ({
  createJiraClient: mockCreateJiraClient,
}));

await jest.unstable_mockModule('../server.js', () => ({
  createJiraServer: mockCreateJiraServer,
}));

await jest.unstable_mockModule('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: MockStdioTransport,
}));

const { main, MODULE_PATH } = await import('../index.js');

describe('index main', () => {
  beforeEach(() => {
    mockCreateJiraClient.mockClear();
    mockCreateJiraServer.mockClear();
    mockConnect.mockClear();
    MockStdioTransport.mockClear();

    process.env.JIRA_HOST = 'jira.example.com';
    process.env.JIRA_EMAIL = 'user@example.com';
    process.env.JIRA_API_TOKEN = 'token';

    mockCreateJiraServer.mockReturnValue({ connect: mockConnect });
    mockConnect.mockResolvedValue(undefined);
  });

  afterEach(() => {
    delete process.env.JIRA_HOST;
    delete process.env.JIRA_EMAIL;
    delete process.env.JIRA_API_TOKEN;
  });

  it('exports MODULE_PATH as the index module path', () => {
    expect(MODULE_PATH).toContain('index');
  });

  it('creates a client and starts the server', async () => {
    await main();
    expect(mockCreateJiraClient).toHaveBeenCalledWith({
      host: 'jira.example.com',
      email: 'user@example.com',
      apiToken: 'token',
    });
    expect(mockCreateJiraServer).toHaveBeenCalled();
    expect(mockConnect).toHaveBeenCalled();
  });

  it('throws when JIRA_HOST is missing', async () => {
    delete process.env.JIRA_HOST;
    await expect(main()).rejects.toThrow('JIRA_HOST environment variable is required');
  });

  it('throws when JIRA_EMAIL is missing', async () => {
    delete process.env.JIRA_EMAIL;
    await expect(main()).rejects.toThrow('JIRA_EMAIL environment variable is required');
  });

  it('throws when JIRA_API_TOKEN is missing', async () => {
    delete process.env.JIRA_API_TOKEN;
    await expect(main()).rejects.toThrow('JIRA_API_TOKEN environment variable is required');
  });

  it('starts the server when invoked from MODULE_PATH', async () => {
    const originalArgv = process.argv[1];
    process.argv[1] = MODULE_PATH;

    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await import('../index.js?invocation=module-path');

    expect(mockCreateJiraClient).toHaveBeenCalled();
    expect(mockConnect).toHaveBeenCalled();

    process.argv[1] = originalArgv;
    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('exits with an error message when top-level main rejects with an Error', async () => {
    mockCreateJiraClient.mockImplementation(() => {
      throw new Error('boom');
    });

    const originalArgv = process.argv[1];
    process.argv[1] = MODULE_PATH;

    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await import('../index.js?invocation=error');

    expect(errorSpy).toHaveBeenCalledWith('boom');
    expect(exitSpy).toHaveBeenCalledWith(1);

    process.argv[1] = originalArgv;
    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('exits with a stringified error when top-level main rejects with a string', async () => {
    mockCreateJiraClient.mockImplementation(() => {
      throw 'startup failed';
    });

    const originalArgv = process.argv[1];
    process.argv[1] = MODULE_PATH;

    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await import('../index.js?invocation=string');

    expect(errorSpy).toHaveBeenCalledWith('startup failed');
    expect(exitSpy).toHaveBeenCalledWith(1);

    process.argv[1] = originalArgv;
    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
