/* eslint-disable @typescript-eslint/no-explicit-any */
import { jest } from '@jest/globals';

const mockCreateAzureDevOpsClient = jest.fn() as jest.Mock<any>;
const mockStartAzureDevOpsServer = jest.fn() as jest.Mock<any>;

jest.unstable_mockModule('../client.js', () => ({
  createAzureDevOpsClient: mockCreateAzureDevOpsClient,
}));

jest.unstable_mockModule('../server.js', () => ({
  startAzureDevOpsServer: mockStartAzureDevOpsServer,
}));

const originalArgv1 = process.argv[1];
const originalExit = process.exit;

async function importIndex(): Promise<typeof import('../index.js')> {
  return import('../index.js');
}

afterEach(() => {
  process.argv[1] = originalArgv1;
  process.exit = originalExit;
  delete process.env.AZURE_DEVOPS_ORG;
  delete process.env.AZURE_DEVOPS_PROJECT;
  delete process.env.AZURE_DEVOPS_TOKEN;
  jest.clearAllMocks();
});

describe('index', () => {
  it('loadConfigFromEnv throws when variables are missing', async () => {
    const { loadConfigFromEnv } = await importIndex();
    expect(() => loadConfigFromEnv()).toThrow(
      /Missing required environment variables: AZURE_DEVOPS_ORG, AZURE_DEVOPS_PROJECT, AZURE_DEVOPS_TOKEN/
    );
  });

  it('loadConfigFromEnv returns config when variables are present', async () => {
    process.env.AZURE_DEVOPS_ORG = 'org';
    process.env.AZURE_DEVOPS_PROJECT = 'proj';
    process.env.AZURE_DEVOPS_TOKEN = 'tok';
    const { loadConfigFromEnv } = await importIndex();
    expect(loadConfigFromEnv()).toEqual({ org: 'org', project: 'proj', token: 'tok' });
  });

  it('runIfInvoked does nothing when argv[1] is undefined', async () => {
    const { runIfInvoked } = await importIndex();
    process.argv[1] = undefined as unknown as string;
    runIfInvoked();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockCreateAzureDevOpsClient).not.toHaveBeenCalled();
  });

  it('main creates client and starts server', async () => {
    process.env.AZURE_DEVOPS_ORG = 'org';
    process.env.AZURE_DEVOPS_PROJECT = 'proj';
    process.env.AZURE_DEVOPS_TOKEN = 'tok';
    mockStartAzureDevOpsServer.mockResolvedValue(undefined);

    const { main } = await importIndex();
    await main();

    expect(mockCreateAzureDevOpsClient).toHaveBeenCalledWith({
      org: 'org',
      project: 'proj',
      token: 'tok',
    });
    expect(mockStartAzureDevOpsServer).toHaveBeenCalled();
  });

  it('runIfInvoked starts server when invoked directly (exact path)', async () => {
    process.env.AZURE_DEVOPS_ORG = 'org';
    process.env.AZURE_DEVOPS_PROJECT = 'proj';
    process.env.AZURE_DEVOPS_TOKEN = 'tok';
    mockStartAzureDevOpsServer.mockResolvedValue(undefined);

    const { runIfInvoked, MODULE_PATH } = await importIndex();
    process.argv[1] = MODULE_PATH;
    runIfInvoked();

    // Allow the promise chain queued by runIfInvoked to settle.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockCreateAzureDevOpsClient).toHaveBeenCalledWith({
      org: 'org',
      project: 'proj',
      token: 'tok',
    });
    expect(mockStartAzureDevOpsServer).toHaveBeenCalled();
  });

  it('runIfInvoked does nothing when invoked from an unrelated index.js path', async () => {
    process.env.AZURE_DEVOPS_ORG = 'org';
    process.env.AZURE_DEVOPS_PROJECT = 'proj';
    process.env.AZURE_DEVOPS_TOKEN = 'tok';

    const { runIfInvoked } = await importIndex();
    process.argv[1] = '/some/other/directory/index.js';
    runIfInvoked();

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockCreateAzureDevOpsClient).not.toHaveBeenCalled();
    expect(mockStartAzureDevOpsServer).not.toHaveBeenCalled();
  });

  it('runIfInvoked exits on main failure with an Error', async () => {
    process.env.AZURE_DEVOPS_ORG = 'org';
    process.env.AZURE_DEVOPS_PROJECT = 'proj';
    process.env.AZURE_DEVOPS_TOKEN = 'tok';
    mockStartAzureDevOpsServer.mockRejectedValue(new Error('start failed'));

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
    process.env.AZURE_DEVOPS_ORG = 'org';
    process.env.AZURE_DEVOPS_PROJECT = 'proj';
    process.env.AZURE_DEVOPS_TOKEN = 'tok';
    mockStartAzureDevOpsServer.mockRejectedValue('start failed');

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
