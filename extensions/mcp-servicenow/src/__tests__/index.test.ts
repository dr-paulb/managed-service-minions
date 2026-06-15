/* eslint-disable @typescript-eslint/no-explicit-any */
import { jest } from '@jest/globals';

const mockCreateServiceNowClient = jest.fn() as jest.Mock<any>;
const mockStartServiceNowServer = jest.fn() as jest.Mock<any>;

jest.unstable_mockModule('../client.js', () => ({
  createServiceNowClient: mockCreateServiceNowClient,
}));

jest.unstable_mockModule('../server.js', () => ({
  startServiceNowServer: mockStartServiceNowServer,
}));

const originalArgv1 = process.argv[1];
const originalExit = process.exit;

async function importIndex(): Promise<typeof import('../index.js')> {
  return import('../index.js');
}

afterEach(() => {
  process.argv[1] = originalArgv1;
  process.exit = originalExit;
  delete process.env.SERVICENOW_INSTANCE;
  delete process.env.SERVICENOW_USERNAME;
  delete process.env.SERVICENOW_PASSWORD;
  jest.clearAllMocks();
});

describe('index', () => {
  it('loadConfigFromEnv throws when variables are missing', async () => {
    const { loadConfigFromEnv } = await importIndex();
    expect(() => loadConfigFromEnv()).toThrow(
      /Missing required environment variables: SERVICENOW_INSTANCE, SERVICENOW_USERNAME, SERVICENOW_PASSWORD/
    );
  });

  it('loadConfigFromEnv returns config when variables are present', async () => {
    process.env.SERVICENOW_INSTANCE = 'inst';
    process.env.SERVICENOW_USERNAME = 'user';
    process.env.SERVICENOW_PASSWORD = 'pass';
    const { loadConfigFromEnv } = await importIndex();
    expect(loadConfigFromEnv()).toEqual({ instance: 'inst', username: 'user', password: 'pass' });
  });

  it('loadConfigFromEnv throws when only some variables are present', async () => {
    process.env.SERVICENOW_INSTANCE = 'inst';
    process.env.SERVICENOW_USERNAME = 'user';
    const { loadConfigFromEnv } = await importIndex();
    expect(() => loadConfigFromEnv()).toThrow(/Missing required environment variables/);
  });

  it('runIfInvoked does nothing when argv[1] is undefined', async () => {
    const { runIfInvoked } = await importIndex();
    process.argv[1] = undefined as unknown as string;
    runIfInvoked();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockCreateServiceNowClient).not.toHaveBeenCalled();
  });

  it('main creates client and starts server', async () => {
    process.env.SERVICENOW_INSTANCE = 'inst';
    process.env.SERVICENOW_USERNAME = 'user';
    process.env.SERVICENOW_PASSWORD = 'pass';
    mockStartServiceNowServer.mockResolvedValue(undefined);

    const { main } = await importIndex();
    await main();

    expect(mockCreateServiceNowClient).toHaveBeenCalledWith({
      instance: 'inst',
      username: 'user',
      password: 'pass',
    });
    expect(mockStartServiceNowServer).toHaveBeenCalled();
  });

  it('runIfInvoked starts server when invoked directly (exact path)', async () => {
    process.env.SERVICENOW_INSTANCE = 'inst';
    process.env.SERVICENOW_USERNAME = 'user';
    process.env.SERVICENOW_PASSWORD = 'pass';
    mockStartServiceNowServer.mockResolvedValue(undefined);

    const { runIfInvoked, MODULE_PATH } = await importIndex();
    process.argv[1] = MODULE_PATH;
    runIfInvoked();

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockCreateServiceNowClient).toHaveBeenCalledWith({
      instance: 'inst',
      username: 'user',
      password: 'pass',
    });
    expect(mockStartServiceNowServer).toHaveBeenCalled();
  });

  it('runIfInvoked does nothing when invoked from an unrelated index.js path', async () => {
    process.env.SERVICENOW_INSTANCE = 'inst';
    process.env.SERVICENOW_USERNAME = 'user';
    process.env.SERVICENOW_PASSWORD = 'pass';

    const { runIfInvoked } = await importIndex();
    process.argv[1] = '/some/other/directory/index.js';
    runIfInvoked();

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockCreateServiceNowClient).not.toHaveBeenCalled();
    expect(mockStartServiceNowServer).not.toHaveBeenCalled();
  });

  it('runIfInvoked exits on main failure with an Error', async () => {
    process.env.SERVICENOW_INSTANCE = 'inst';
    process.env.SERVICENOW_USERNAME = 'user';
    process.env.SERVICENOW_PASSWORD = 'pass';
    mockStartServiceNowServer.mockRejectedValue(new Error('start failed'));

    const exitMock = jest.fn() as jest.Mock<any>;
    process.exit = exitMock as unknown as typeof process.exit;
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const { runIfInvoked, MODULE_PATH } = await importIndex();
    process.argv[1] = MODULE_PATH;
    runIfInvoked();

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(errorSpy).toHaveBeenCalledWith('start failed');
    expect(exitMock).toHaveBeenCalledWith(1);

    errorSpy.mockRestore();
  });

  it('runIfInvoked exits on main failure with a non-Error', async () => {
    process.env.SERVICENOW_INSTANCE = 'inst';
    process.env.SERVICENOW_USERNAME = 'user';
    process.env.SERVICENOW_PASSWORD = 'pass';
    mockStartServiceNowServer.mockRejectedValue('start failed');

    const exitMock = jest.fn() as jest.Mock<any>;
    process.exit = exitMock as unknown as typeof process.exit;
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const { runIfInvoked, MODULE_PATH } = await importIndex();
    process.argv[1] = MODULE_PATH;
    runIfInvoked();

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(errorSpy).toHaveBeenCalledWith('start failed');
    expect(exitMock).toHaveBeenCalledWith(1);

    errorSpy.mockRestore();
  });
});
