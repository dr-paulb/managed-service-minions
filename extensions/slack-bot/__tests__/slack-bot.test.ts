import { jest } from '@jest/globals';
import type { App, SayFn, SlackEventMiddlewareArgs } from '@slack/bolt';
import type { AppMentionEvent, GenericMessageEvent } from '@slack/types';
import { createSlackBot } from '../src/slack-bot.js';
import type { GooseRunner } from '../src/goose-runner.js';
import type { SlackBotConfig } from '../src/config.js';

describe('createSlackBot', () => {
  const config: SlackBotConfig = {
    slackBotToken: 'xoxb-token',
    slackSigningSecret: 'secret',
    slackAppToken: 'xapp-token',
    gooseExecutable: 'goose',
    goosePluginPath: '/plugin',
    gooseRecipe: 'commands/ticket-to-pr.yaml',
  };

  let handlers: Record<string, (args: unknown) => Promise<void>>;
  let say: jest.Mock<ReturnType<SayFn>, Parameters<SayFn>>;
  let runner: { run: jest.Mock<Promise<string>, [string]> };
  let app: Pick<App, 'event' | 'message' | 'start' | 'stop'>;
  let bot: { start: () => Promise<void>; stop: () => Promise<void> };

  beforeEach(() => {
    handlers = {};
    say = jest.fn() as jest.Mock<ReturnType<SayFn>, Parameters<SayFn>>;
    runner = { run: jest.fn() as jest.Mock<Promise<string>, [string]> };

    app = {
      event: jest.fn((name: string, handler: (args: unknown) => Promise<void>) => {
        handlers[name] = handler;
      }) as unknown as App['event'],
      message: jest.fn((handler: (args: unknown) => Promise<void>) => {
        handlers['message'] = handler;
      }) as unknown as App['message'],
      start: jest.fn(() => Promise.resolve()) as unknown as App['start'],
      stop: jest.fn(() => Promise.resolve()) as unknown as App['stop'],
    };

    bot = createSlackBot(app as unknown as App, config, runner as unknown as GooseRunner);
  });

  it('registers app_mention and message handlers', () => {
    expect(app.event).toHaveBeenCalledWith('app_mention', expect.any(Function));
    expect(app.message).toHaveBeenCalledWith(expect.any(Function));
  });

  it('handles app_mention events and replies in thread', async () => {
    runner.run.mockResolvedValue('Got it');
    const event: AppMentionEvent = {
      type: 'app_mention',
      user: 'U1',
      text: '<@U2> review PR 42',
      ts: '1234',
      thread_ts: '1234',
      channel: 'C1',
      event_ts: '1234',
    };

    await handlers['app_mention']({ event, say } as unknown as SlackEventMiddlewareArgs<'app_mention'>);

    expect(runner.run).toHaveBeenCalledWith('review PR 42');
    expect(say).toHaveBeenCalledWith({ text: 'Got it', thread_ts: '1234' });
  });

  it('handles direct messages', async () => {
    runner.run.mockResolvedValue('Working on it');
    const event: GenericMessageEvent = {
      type: 'message',
      subtype: undefined,
      user: 'U1',
      text: 'create a PR for PROJ-123',
      ts: '1234',
      channel: 'D1',
      channel_type: 'im',
      event_ts: '1234',
    };

    await handlers['message']({ event, say } as unknown as SlackEventMiddlewareArgs<'message'>);

    expect(runner.run).toHaveBeenCalledWith('create a PR for PROJ-123');
    expect(say).toHaveBeenCalledWith({ text: 'Working on it', thread_ts: undefined });
  });

  it('ignores non-direct-message channel messages', async () => {
    const event: GenericMessageEvent = {
      type: 'message',
      subtype: undefined,
      user: 'U1',
      text: 'hello',
      ts: '1234',
      channel: 'C1',
      channel_type: 'channel',
      event_ts: '1234',
    };

    await handlers['message']({ event, say } as unknown as SlackEventMiddlewareArgs<'message'>);

    expect(runner.run).not.toHaveBeenCalled();
    expect(say).not.toHaveBeenCalled();
  });

  it('ignores bot messages', async () => {
    const event: GenericMessageEvent = {
      type: 'message',
      subtype: undefined,
      user: 'U1',
      bot_id: 'B1',
      text: 'hello',
      ts: '1234',
      channel: 'D1',
      channel_type: 'im',
      event_ts: '1234',
    };

    await handlers['message']({ event, say } as unknown as SlackEventMiddlewareArgs<'message'>);

    expect(runner.run).not.toHaveBeenCalled();
  });

  it('replies with an error when goose fails', async () => {
    runner.run.mockRejectedValue(new Error('Goose is down'));
    const event: AppMentionEvent = {
      type: 'app_mention',
      user: 'U1',
      text: '<@U2> do something',
      ts: '1234',
      channel: 'C1',
      event_ts: '1234',
    };

    await handlers['app_mention']({ event, say } as unknown as SlackEventMiddlewareArgs<'app_mention'>);

    expect(say).toHaveBeenCalledWith({
      text: 'Sorry, something went wrong: Goose is down',
      thread_ts: undefined,
    });
  });

  it('replies with a fallback when goose returns empty output', async () => {
    runner.run.mockResolvedValue('');
    const event: AppMentionEvent = {
      type: 'app_mention',
      user: 'U1',
      text: '<@U2> do something',
      ts: '1234',
      channel: 'C1',
      event_ts: '1234',
    };

    await handlers['app_mention']({ event, say } as unknown as SlackEventMiddlewareArgs<'app_mention'>);

    expect(say).toHaveBeenCalledWith({
      text: 'Done — Goose finished with no output.',
      thread_ts: undefined,
    });
  });

  it('handles direct messages with no text property', async () => {
    runner.run.mockResolvedValue('ok');
    const event = {
      type: 'message',
      subtype: undefined,
      user: 'U1',
      ts: '1234',
      channel: 'D1',
      channel_type: 'im',
      event_ts: '1234',
    } as unknown as GenericMessageEvent;

    await handlers['message']({ event, say } as unknown as SlackEventMiddlewareArgs<'message'>);

    expect(runner.run).not.toHaveBeenCalled();
    expect(say).toHaveBeenCalledWith({
      text: "Hi! I didn't catch that. What would you like me to do?",
      thread_ts: undefined,
    });
  });

  it('replies with an error for direct messages when goose fails', async () => {
    runner.run.mockRejectedValue('unknown');
    const event: GenericMessageEvent = {
      type: 'message',
      subtype: undefined,
      user: 'U1',
      text: 'do something',
      ts: '1234',
      channel: 'D1',
      channel_type: 'im',
      event_ts: '1234',
    };

    await handlers['message']({ event, say } as unknown as SlackEventMiddlewareArgs<'message'>);

    expect(say).toHaveBeenCalledWith({
      text: 'Sorry, something went wrong: unknown',
      thread_ts: undefined,
    });
  });

  it('asks for clarification when the message is empty after stripping mentions', async () => {
    const event: AppMentionEvent = {
      type: 'app_mention',
      user: 'U1',
      text: '<@U2>',
      ts: '1234',
      channel: 'C1',
      event_ts: '1234',
    };

    await handlers['app_mention']({ event, say } as unknown as SlackEventMiddlewareArgs<'app_mention'>);

    expect(runner.run).not.toHaveBeenCalled();
    expect(say).toHaveBeenCalledWith({
      text: "Hi! I didn't catch that. What would you like me to do?",
      thread_ts: undefined,
    });
  });

  it('starts and stops the underlying app', async () => {
    await bot.start();
    expect(app.start).toHaveBeenCalled();

    await bot.stop();
    expect(app.stop).toHaveBeenCalled();
  });
});
