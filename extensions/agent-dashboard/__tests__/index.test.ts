import { jest } from '@jest/globals';

const mockStart = jest.fn<(client: unknown, port: number) => Promise<void>>();

jest.unstable_mockModule('../src/dashboard.js', () => ({
  startDashboardServer: mockStart,
}));

describe('agent-dashboard index', () => {
  const originalEnv = process.env;
  let exitSpy: jest.SpiedFunction<typeof process.exit>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockStart.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('starts the server using default environment values', async () => {
    delete process.env.GOOSE_ACP_URL;
    delete process.env.GOOSE_ACP_TOKEN;
    delete process.env.DASHBOARD_PORT;
    mockStart.mockResolvedValueOnce(undefined);

    await import('../src/index.js');

    expect(mockStart).toHaveBeenCalledTimes(1);
    expect(mockStart.mock.calls[0][1]).toBe(3001);
  });

  it('starts the server using provided environment values', async () => {
    process.env.GOOSE_ACP_URL = 'ws://example/acp';
    process.env.GOOSE_ACP_TOKEN = 'secret';
    process.env.DASHBOARD_PORT = '4000';
    mockStart.mockResolvedValueOnce(undefined);

    await import('../src/index.js');

    expect(mockStart).toHaveBeenCalledTimes(1);
    expect(mockStart.mock.calls[0][1]).toBe(4000);
  });

  it('logs the error and exits when start fails', async () => {
    const err = new Error('port in use');
    mockStart.mockRejectedValueOnce(err);

    await import('../src/index.js');

    expect(errorSpy).toHaveBeenCalledWith('Dashboard failed to start', err);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
