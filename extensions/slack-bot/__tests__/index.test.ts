import { jest } from '@jest/globals';

const mockAppStart = jest.fn(() => Promise.resolve());
const mockAppStop = jest.fn(() => Promise.resolve());
const mockAppEvent = jest.fn();
const mockAppMessage = jest.fn();

jest.unstable_mockModule('@slack/bolt', () => ({
  App: jest.fn(() => ({
    start: mockAppStart,
    stop: mockAppStop,
    event: mockAppEvent,
    message: mockAppMessage,
  })),
}));

jest.unstable_mockModule('node:child_process', () => ({
  spawn: jest.fn(),
}));

describe('slack-bot entry point success path', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAppStart.mockResolvedValue(undefined);
  });

  it('starts the Slack bot when env vars are present', async () => {
    process.env.SLACK_BOT_TOKEN = 'xoxb-token';
    process.env.SLACK_SIGNING_SECRET = 'secret';
    process.env.SLACK_APP_TOKEN = 'xapp-token';

    await import('../src/index.js');

    expect(mockAppStart).toHaveBeenCalled();
  });
});
