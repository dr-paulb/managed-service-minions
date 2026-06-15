/* eslint-disable @typescript-eslint/no-explicit-any */
import { jest } from '@jest/globals';

process.env.GITHUB_TOKEN = 'test-token';
delete process.env.GITHUB_API_URL;

const mockCreateGitHubClient = jest.fn() as jest.Mock<any>;
const mockCreateGitHubServer = jest.fn() as jest.Mock<any>;
const mockConnect = jest.fn() as jest.Mock<any>;
const MockStdioTransport = jest.fn() as jest.Mock<any>;

mockCreateGitHubServer.mockReturnValue({ connect: mockConnect });
mockConnect.mockResolvedValue(undefined);

await jest.unstable_mockModule('../client.js', () => ({
  createGitHubClient: mockCreateGitHubClient,
}));

await jest.unstable_mockModule('../server.js', () => ({
  createGitHubServer: mockCreateGitHubServer,
}));

await jest.unstable_mockModule('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: MockStdioTransport,
}));

const { main } = await import('../index.js');

describe('index main', () => {
  beforeEach(() => {
    mockCreateGitHubClient.mockClear();
    mockCreateGitHubServer.mockClear();
    mockConnect.mockClear();
    MockStdioTransport.mockClear();

    process.env.GITHUB_TOKEN = 'test-token';
    delete process.env.GITHUB_API_URL;

    mockCreateGitHubServer.mockReturnValue({ connect: mockConnect });
    mockConnect.mockResolvedValue(undefined);
  });

  afterEach(() => {
    delete process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_API_URL;
  });

  it('creates a client with the default API URL and starts the server', async () => {
    await main();
    expect(mockCreateGitHubClient).toHaveBeenCalledWith('test-token', { baseUrl: undefined });
    expect(mockCreateGitHubServer).toHaveBeenCalled();
    expect(mockConnect).toHaveBeenCalled();
  });

  it('passes GITHUB_API_URL to the client', async () => {
    process.env.GITHUB_API_URL = 'https://gh.example.com/api/v3';
    await main();
    expect(mockCreateGitHubClient).toHaveBeenCalledWith('test-token', {
      baseUrl: 'https://gh.example.com/api/v3',
    });
  });

  it('throws when GITHUB_TOKEN is missing', async () => {
    delete process.env.GITHUB_TOKEN;
    await expect(main()).rejects.toThrow('GITHUB_TOKEN environment variable is required');
  });

  it('exits with a stringified error when the top-level main rejects with a string', async () => {
    mockCreateGitHubClient.mockImplementation(() => {
      throw 'startup failed';
    });

    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await import('../index.js?catch=string');

    expect(errorSpy).toHaveBeenCalledWith('startup failed');
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('exits with an error message when the top-level main rejects with an Error', async () => {
    mockCreateGitHubClient.mockImplementation(() => {
      throw new Error('boom');
    });

    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await import('../index.js?catch=error');

    expect(errorSpy).toHaveBeenCalledWith('boom');
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
