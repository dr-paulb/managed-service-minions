import { jest } from '@jest/globals';

const mockConnect = jest.fn<() => Promise<void>>();
const MockAcpClient = class {
  constructor(public url: string, public token: string) {}
  connect = mockConnect;
  async sendPrompt(_sessionId: string | null, _text: string): Promise<void> {}
};

jest.unstable_mockModule('../src/acp-client.js', () => ({
  AcpClient: MockAcpClient,
}));

describe('slack-bot index', () => {
  const originalEnv = process.env;
  let exitSpy: jest.SpiedFunction<typeof process.exit>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockConnect.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('connects using default environment values', async () => {
    delete process.env.GOOSE_ACP_URL;
    delete process.env.GOOSE_ACP_TOKEN;
    mockConnect.mockResolvedValueOnce(undefined);

    await import('../src/index.js');

    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it('connects using provided environment values', async () => {
    process.env.GOOSE_ACP_URL = 'ws://example/acp';
    process.env.GOOSE_ACP_TOKEN = 'secret';
    mockConnect.mockResolvedValueOnce(undefined);

    await import('../src/index.js');

    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it('logs the error and exits when connect fails', async () => {
    const err = new Error('connection refused');
    mockConnect.mockRejectedValueOnce(err);

    await import('../src/index.js');

    expect(errorSpy).toHaveBeenCalledWith('Slack bot failed to connect to Goose ACP', err);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
