import type { App, SayFn, SlackEventMiddlewareArgs } from '@slack/bolt';
import type { AppMentionEvent, GenericMessageEvent } from '@slack/types';
import type { SlackBotConfig } from './config.js';
import type { GooseRunner } from './goose-runner.js';

type BotEvent = AppMentionEvent | GenericMessageEvent;

function isDirectMessage(event: BotEvent): boolean {
  return 'channel_type' in event && event.channel_type === 'im';
}

function stripMention(text: string): string {
  // Remove Slack user/channel mention markup such as <@U123456>.
  return text.replace(/<@[^>]+>/g, '').trim();
}

function eventThreadTs(event: BotEvent): string | undefined {
  return event.thread_ts;
}

async function handleEvent(
  event: BotEvent,
  say: SayFn,
  runner: GooseRunner
): Promise<void> {
  const text = stripMention(event.text ?? '');
  if (!text) {
    await say({ text: "Hi! I didn't catch that. What would you like me to do?", thread_ts: eventThreadTs(event) });
    return;
  }

  try {
    const output = await runner.run(text);
    await say({
      text: output || 'Done — Goose finished with no output.',
      thread_ts: eventThreadTs(event),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await say({
      text: `Sorry, something went wrong: ${message}`,
      thread_ts: eventThreadTs(event),
    });
  }
}

export function createSlackBot(
  app: App,
  _config: SlackBotConfig,
  runner: GooseRunner
): { start: () => Promise<void>; stop: () => Promise<void> } {
  app.event('app_mention', async (args: SlackEventMiddlewareArgs<'app_mention'>) => {
    const event = args.event as AppMentionEvent;
    await handleEvent(event, args.say, runner);
  });

  app.message(async (args: SlackEventMiddlewareArgs<'message'>) => {
    const event = args.event as GenericMessageEvent;
    if (!isDirectMessage(event)) {
      return;
    }
    // Ignore bot messages and message subtypes.
    if (event.subtype || event.bot_id) {
      return;
    }
    await handleEvent(event, args.say, runner);
  });

  return {
    start: async () => {
      await app.start();
    },
    stop: async () => {
      await app.stop();
    },
  };
}
