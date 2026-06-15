import { jest } from '@jest/globals';

jest.unstable_mockModule('@slack/bolt', () => ({
  App: jest.fn(),
}));

jest.unstable_mockModule('node:child_process', () => ({
  spawn: jest.fn(),
}));

const mockExit = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as (code?: number) => never);

describe('slack-bot entry point error path', () => {
  afterAll(() => {
    mockExit.mockRestore();
  });

  it('exits when config loading fails', async () => {
    delete process.env.SLACK_BOT_TOKEN;
    delete process.env.SLACK_SIGNING_SECRET;
    delete process.env.SLACK_APP_TOKEN;

    await import('../src/index.js');

    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
