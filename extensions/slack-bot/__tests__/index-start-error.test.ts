import { jest } from '@jest/globals';

jest.unstable_mockModule('@slack/bolt', () => ({
  App: jest.fn(),
}));

jest.unstable_mockModule('node:child_process', () => ({
  spawn: jest.fn(),
}));

jest.unstable_mockModule('../src/slack-bot.js', () => ({
  createSlackBot: jest.fn(() => ({
    start: () => Promise.reject(new Error('start failed')),
    stop: () => Promise.resolve(),
  })),
}));

const mockExit = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as (code?: number) => never);

describe('slack-bot entry point start failure', () => {
  afterAll(() => {
    mockExit.mockRestore();
  });

  it('exits when bot.start fails', async () => {
    process.env.SLACK_BOT_TOKEN = 'xoxb-token';
    process.env.SLACK_SIGNING_SECRET = 'secret';
    process.env.SLACK_APP_TOKEN = 'xapp-token';

    await import('../src/index.js');

    // Wait for the rejected start promise to be processed.
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
