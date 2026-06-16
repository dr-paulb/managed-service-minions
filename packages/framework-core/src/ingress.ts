import { randomUUID } from 'node:crypto';
import { createRootCorrelationId } from './correlation.js';
import type { Session, SessionStore } from './store.js';

/**
 * A chat-platform message that has been normalized to a common shape.
 */
export interface IngressRequest {
  platform: 'slack' | 'teams';
  teamId: string;
  channelId?: string;
  userId: string;
  text: string;
  threadId?: string;
}

/**
 * The response the bot should send back to the user. Each platform adapter picks
 * the rendering that its channel understands.
 */
export interface IngressResponse {
  text: string;
  blocks?: unknown[];
  adaptiveCard?: unknown;
}

/**
 * Something that can turn a normalized request into a response. In production this
 * is the orchestrator/minion runtime; in tests it is a mock.
 */
export interface IngressRunner {
  run(request: IngressRequest & { sessionId: string; correlationRoot: string }): Promise<IngressResponse>;
}

/**
 * Turn a normalized chat message into a stored session plus a runner response.
 * If `request.threadId` is provided the existing session is reused; otherwise a
 * fresh session id is created.
 */
export async function handleIngressMessage(
  request: IngressRequest,
  store: SessionStore,
  runner: IngressRunner
): Promise<IngressResponse> {
  const sessionId = request.threadId ?? randomUUID();
  let session: Session | undefined = store.getSession(sessionId);

  if (!session) {
    session = {
      id: sessionId,
      teamId: request.teamId,
      platform: request.platform,
      userId: request.userId,
      correlationRoot: createRootCorrelationId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    store.createSession(session);
  }

  return runner.run({
    ...request,
    sessionId,
    correlationRoot: session.correlationRoot,
  });
}
