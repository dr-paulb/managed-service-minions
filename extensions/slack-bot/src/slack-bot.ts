import type { App as BoltApp } from '@slack/bolt';
import type { AppMentionEvent, GenericMessageEvent } from '@slack/types';
import {
  formatError,
  handleIngressMessage,
  type IngressRequest,
  type IngressResponse,
  type IngressRunner,
  type SessionStore,
} from 'framework-core';

export interface SlackBotConfig {
  signingSecret: string;
  token: string;
  port?: number;
}

/**
 * A minimal runner that echoes the request back. Useful for local smoke tests
 * until the real Goose orchestrator is wired in.
 */
export function createEchoRunner(): IngressRunner {
  return {
    run: async (request) => ({ text: `Goose received: ${request.text}` }),
  };
}

function isDirectMessage(event: GenericMessageEvent): boolean {
  return event.channel_type === 'im' && event.subtype === undefined;
}

function cleanSlackText(text: string): string {
  return text.replace(/<@[A-Z0-9]+>/g, '').trim();
}

function toSlackRequest(
  event: AppMentionEvent | GenericMessageEvent,
  text: string
): IngressRequest {
  const teamId = event.team ?? 'unknown';
  const channelId = event.channel ?? undefined;
  const userId = ('user' in event && event.user ? event.user : 'unknown') as string;
  const threadId = event.thread_ts ?? event.channel ?? undefined;

  return {
    platform: 'slack',
    teamId,
    channelId,
    userId,
    text,
    threadId,
  };
}

export function createSlackBot(
  app: BoltApp,
  store: SessionStore,
  runner: IngressRunner,
  config: SlackBotConfig
): { start: () => Promise<void>; stop: () => Promise<unknown> } {
  app.event('app_mention', async ({ event, say }) => {
    const mention = event as AppMentionEvent;
    const text = cleanSlackText(mention.text);

    if (!text) {
      await say('Hi! What can I help you with?');
      return;
    }

    await handleSlackMessage(toSlackRequest(mention, text), store, runner, say);
  });

  app.message(async ({ message, say }) => {
    const msg = message as GenericMessageEvent;
    if (!isDirectMessage(msg)) {
      return;
    }

    const text = msg.text ?? '';
    if (!text) {
      return;
    }

    await handleSlackMessage(toSlackRequest(msg, text), store, runner, say);
  });

  return {
    start: async () => {
      await app.start(config.port ?? 3000);
    },
    stop: () => app.stop(),
  };
}

async function handleSlackMessage(
  request: IngressRequest,
  store: SessionStore,
  runner: IngressRunner,
  say: (message: string | { text: string; blocks?: unknown[] }) => Promise<unknown>
): Promise<void> {
  try {
    const response = await handleIngressMessage(request, store, runner);
    await sendSlackResponse(say, response);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    const summary = formatError({
      severity: 'failure',
      summary: 'Something went wrong handling your request.',
      cause: error.message,
      impact: 'Your request was not processed.',
      action: 'Try again or contact the platform team with the session id.',
      correlationId: 'unknown',
    });
    await say(summary);
  }
}

async function sendSlackResponse(
  say: (message: string | { text: string; blocks?: unknown[] }) => Promise<unknown>,
  response: IngressResponse
): Promise<void> {
  if (response.blocks && response.blocks.length > 0) {
    await say({ text: response.text, blocks: response.blocks });
  } else {
    await say(response.text);
  }
}
