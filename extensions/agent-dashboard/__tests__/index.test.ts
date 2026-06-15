import { jest } from '@jest/globals';

const mockStart = jest.fn<(store: unknown, port: number) => Promise<{ close: () => Promise<void>; port: number }>>();
const mockCreateSqliteStore = jest.fn(() => ({ store: true }));

jest.unstable_mockModule('../src/dashboard.js', () => ({
  startDashboardServer: mockStart,
}));

jest.unstable_mockModule('mcp-toolshed', () => ({
  createSqliteStore: mockCreateSqliteStore,
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
    mockCreateSqliteStore.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('starts the server using default environment values', async () => {
    delete process.env.DASHBOARD_PORT;
    delete process.env.SQLITE_PATH;
    mockStart.mockResolvedValueOnce({ close: () => Promise.resolve(), port: 3001 });

    await import('../src/index.js');

    expect(mockCreateSqliteStore).toHaveBeenCalledWith('/data/dashboard.db');
    expect(mockStart).toHaveBeenCalledTimes(1);
    expect(mockStart.mock.calls[0][1]).toBe(3001);
  });

  it('starts the server using provided environment values', async () => {
    process.env.DASHBOARD_PORT = '4000';
    process.env.SQLITE_PATH = '/tmp/dashboard.db';
    mockStart.mockResolvedValueOnce({ close: () => Promise.resolve(), port: 4000 });

    await import('../src/index.js');

    expect(mockCreateSqliteStore).toHaveBeenCalledWith('/tmp/dashboard.db');
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
