import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockStart = jest.fn<() => Promise<void>>();
const mockStop = jest.fn<() => Promise<void>>();
const MockTeamsBot = {
  createTeamsBot: jest.fn().mockReturnValue({ start: mockStart, stop: mockStop }),
  createEchoRunner: jest.fn().mockReturnValue({ run: jest.fn() }),
};

jest.unstable_mockModule('../src/teams-bot.js', () => MockTeamsBot);

const mockSqliteStore = { createSession: jest.fn() };
const createSqliteStore = jest.fn().mockReturnValue(mockSqliteStore);

jest.unstable_mockModule('mcp-toolshed', () => ({
  createSqliteStore,
}));

const mockApplicationConstructor = jest.fn();
const mockTeamsAdapterConstructor = jest.fn();

jest.unstable_mockModule('@microsoft/teams-ai', () => ({
  Application: mockApplicationConstructor,
  TeamsAdapter: mockTeamsAdapterConstructor,
}));

describe('teams-bot index', () => {
  const originalEnv = process.env;
  let exitSpy: jest.SpiedFunction<typeof process.exit>;
  let errorSpy: jest.SpiedFunction<typeof console.error>;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockStart.mockReset().mockResolvedValue(undefined);
    mockStop.mockReset().mockResolvedValue(undefined);
    MockTeamsBot.createTeamsBot.mockClear();
    MockTeamsBot.createEchoRunner.mockClear();
    createSqliteStore.mockClear();
    mockApplicationConstructor.mockReset().mockReturnValue({});
    mockTeamsAdapterConstructor.mockReset().mockReturnValue({});
  });

  afterEach(() => {
    process.env = originalEnv;
    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('creates a Teams adapter and application with env config', async () => {
    process.env.MICROSOFT_APP_ID = 'app-id';
    process.env.MICROSOFT_APP_PASSWORD = 'app-password';
    process.env.MICROSOFT_APP_TYPE = 'SingleTenant';
    process.env.PORT = '4000';
    process.env.SQLITE_PATH = '/data/bot.db';

    await import('../src/index.js');

    expect(mockTeamsAdapterConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        MicrosoftAppId: 'app-id',
        MicrosoftAppPassword: 'app-password',
        MicrosoftAppType: 'SingleTenant',
      })
    );
    expect(createSqliteStore).toHaveBeenCalledWith('/data/bot.db');
    expect(MockTeamsBot.createTeamsBot).toHaveBeenCalled();
    expect(mockStart).toHaveBeenCalled();
  });

  it('exits when the bot fails to start', async () => {
    mockStart.mockRejectedValueOnce(new Error('start failed'));

    await import('../src/index.js');

    expect(errorSpy).toHaveBeenCalledWith('Teams bot failed to start', expect.any(Error));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
