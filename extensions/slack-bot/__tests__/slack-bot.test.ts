import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { App as BoltApp } from '@slack/bolt';
import { createSlackBot, createEchoRunner } from '../src/slack-bot.js';
import type { IngressRunner, SessionStore } from 'framework-core';

class MockApp {
  public eventHandlers: Record<string, (args: unknown) => Promise<void>> = {};
  public messageHandlers: Array<(args: unknown) => Promise<void>> = [];

  event = jest.fn((name: string, handler: (args: unknown) => Promise<void>) => {
    this.eventHandlers[name] = handler;
  });

  message = jest.fn((handler: (args: unknown) => Promise<void>) => {
    this.messageHandlers.push(handler);
  });

  start = jest.fn().mockResolvedValue(undefined);
  stop = jest.fn().mockResolvedValue(undefined);
}

function makeStore(): SessionStore {
  return {
    createSession: jest.fn(),
    getSession: jest.fn().mockReturnValue(undefined),
    listSessions: jest.fn(),
    createMinionRun: jest.fn(),
    updateMinionRun: jest.fn(),
    listMinionRunsBySession: jest.fn(),
    listMinionRunsByCorrelationRoot: jest.fn(),
    createApproval: jest.fn(),
    getApproval: jest.fn().mockReturnValue(undefined),
    resolveApproval: jest.fn(),
    listPendingApprovals: jest.fn(),
    createAuditEntry: jest.fn(),
    listAuditEntries: jest.fn().mockReturnValue([]),
    getCachedToolCall: jest.fn(),
    setCachedToolCall: jest.fn(),
  };
}

describe('createSlackBot', () => {
  let app: MockApp;
  let store: SessionStore;
  let runner: IngressRunner;
  let say: jest.Mock<() => Promise<void>>;

  beforeEach(() => {
    app = new MockApp();
    store = makeStore();
    runner = { run: jest.fn().mockResolvedValue({ text: 'Done' }) };
    say = jest.fn().mockResolvedValue(undefined);
  });

  it('registers app_mention and message handlers', () => {
    createSlackBot(app as unknown as BoltApp, store, runner, {
      signingSecret: 'secret',
      token: 'token',
    });

    expect(app.event).toHaveBeenCalledWith('app_mention', expect.any(Function));
    expect(app.message).toHaveBeenCalledWith(expect.any(Function));
  });

  it('handles app_mention events and replies with runner text', async () => {
    createSlackBot(app as unknown as BoltApp, store, runner, {
      signingSecret: 'secret',
      token: 'token',
    });

    await app.eventHandlers['app_mention']({
      event: {
        type: 'app_mention',
        text: '<@U123> review PR #42',
        team: 'T1',
        channel: 'C1',
        user: 'U42',
        thread_ts: '123.456',
      },
      say,
    });

    expect(runner.run).toHaveBeenCalledWith(
      expect.objectContaining({
        platform: 'slack',
        teamId: 'T1',
        channelId: 'C1',
        userId: 'U42',
        text: 'review PR #42',
        threadId: '123.456',
      })
    );
    expect(say).toHaveBeenCalledWith('Done');
  });

  it('greets the user when the mention contains only the bot mention', async () => {
    createSlackBot(app as unknown as BoltApp, store, runner, {
      signingSecret: 'secret',
      token: 'token',
    });

    await app.eventHandlers['app_mention']({
      event: {
        type: 'app_mention',
        text: '<@U123>',
        team: 'T1',
        channel: 'C1',
        user: 'U42',
      },
      say,
    });

    expect(say).toHaveBeenCalledWith('Hi! What can I help you with?');
    expect(runner.run).not.toHaveBeenCalled();
  });

  it('handles direct messages', async () => {
    createSlackBot(app as unknown as BoltApp, store, runner, {
      signingSecret: 'secret',
      token: 'token',
    });

    await app.messageHandlers[0]({
      message: {
        type: 'message',
        subtype: undefined,
        channel_type: 'im',
        text: 'hello goose',
        team: 'T1',
        channel: 'D1',
        user: 'U42',
        ts: '1',
        event_ts: '1',
      },
      say,
    });

    expect(runner.run).toHaveBeenCalledWith(
      expect.objectContaining({
        platform: 'slack',
        teamId: 'T1',
        channelId: 'D1',
        userId: 'U42',
        text: 'hello goose',
      })
    );
    expect(say).toHaveBeenCalledWith('Done');
  });

  it('ignores non-direct message channel events', async () => {
    createSlackBot(app as unknown as BoltApp, store, runner, {
      signingSecret: 'secret',
      token: 'token',
    });

    await app.messageHandlers[0]({
      message: {
        type: 'message',
        subtype: undefined,
        channel_type: 'channel',
        text: 'hello goose',
        team: 'T1',
        channel: 'C1',
        user: 'U42',
        ts: '1',
        event_ts: '1',
      },
      say,
    });

    expect(runner.run).not.toHaveBeenCalled();
    expect(say).not.toHaveBeenCalled();
  });

  it('ignores direct messages with no text', async () => {
    createSlackBot(app as unknown as BoltApp, store, runner, {
      signingSecret: 'secret',
      token: 'token',
    });

    await app.messageHandlers[0]({
      message: {
        type: 'message',
        subtype: undefined,
        channel_type: 'im',
        text: undefined,
        team: 'T1',
        channel: 'D1',
        user: 'U42',
        ts: '1',
        event_ts: '1',
      },
      say,
    });

    expect(runner.run).not.toHaveBeenCalled();
    expect(say).not.toHaveBeenCalled();
  });

  it('sends blocks when the runner returns them', async () => {
    runner = {
      run: jest.fn().mockResolvedValue({
        text: 'Summary',
        blocks: [{ type: 'section', text: { type: 'mrkdwn', text: 'Summary' } }],
      }),
    };

    createSlackBot(app as unknown as BoltApp, store, runner, {
      signingSecret: 'secret',
      token: 'token',
    });

    await app.eventHandlers['app_mention']({
      event: {
        type: 'app_mention',
        text: '<@U123> summarize',
        team: 'T1',
        channel: 'C1',
        user: 'U42',
      },
      say,
    });

    expect(say).toHaveBeenCalledWith({
      text: 'Summary',
      blocks: [{ type: 'section', text: { type: 'mrkdwn', text: 'Summary' } }],
    });
  });

  it('surfaces runner errors as user-facing messages', async () => {
    runner = { run: jest.fn().mockRejectedValue(new Error('boom')) };

    createSlackBot(app as unknown as BoltApp, store, runner, {
      signingSecret: 'secret',
      token: 'token',
    });

    await app.eventHandlers['app_mention']({
      event: {
        type: 'app_mention',
        text: '<@U123> fail',
        team: 'T1',
        channel: 'C1',
        user: 'U42',
      },
      say,
    });

    expect(say).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });

  it('surfaces non-Error failures as user-facing messages', async () => {
    runner = { run: jest.fn().mockRejectedValue('string failure') };

    createSlackBot(app as unknown as BoltApp, store, runner, {
      signingSecret: 'secret',
      token: 'token',
    });

    await app.eventHandlers['app_mention']({
      event: {
        type: 'app_mention',
        text: '<@U123> fail',
        team: 'T1',
        channel: 'C1',
        user: 'U42',
      },
      say,
    });

    expect(say).toHaveBeenCalledWith(expect.stringContaining('string failure'));
  });

  it('fills in defaults when mention metadata is missing', async () => {
    createSlackBot(app as unknown as BoltApp, store, runner, {
      signingSecret: 'secret',
      token: 'token',
    });

    await app.eventHandlers['app_mention']({
      event: {
        type: 'app_mention',
        text: '<@U123> help',
      },
      say,
    });

    expect(runner.run).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: 'unknown',
        channelId: undefined,
        userId: 'unknown',
        threadId: undefined,
      })
    );
  });

  it('starts and stops the underlying Bolt app', async () => {
    const bot = createSlackBot(app as unknown as BoltApp, store, runner, {
      signingSecret: 'secret',
      token: 'token',
      port: 4000,
    });

    await bot.start();
    expect(app.start).toHaveBeenCalledWith(4000);

    await bot.stop();
    expect(app.stop).toHaveBeenCalled();
  });

  it('uses the default port when none is configured', async () => {
    const bot = createSlackBot(app as unknown as BoltApp, store, runner, {
      signingSecret: 'secret',
      token: 'token',
    });

    await bot.start();
    expect(app.start).toHaveBeenCalledWith(3000);
  });

  describe('createEchoRunner', () => {
    it('returns the request text wrapped in a friendly message', async () => {
      const response = await createEchoRunner().run({
        platform: 'slack',
        teamId: 'T1',
        userId: 'U1',
        text: 'hello',
        sessionId: 's1',
        correlationRoot: 'corr_1',
      });

      expect(response.text).toBe('Goose received: hello');
    });
  });
});
