import { describe, expect, it, jest } from '@jest/globals';
import { handleIngressMessage } from '../ingress.js';
import type { SessionStore } from '../store.js';

describe('handleIngressMessage', () => {
  const makeStore = (): SessionStore => ({
    createSession: jest.fn(),
    getSession: jest.fn().mockReturnValue(undefined),
    listSessions: jest.fn(),
    createMinionRun: jest.fn(),
    updateMinionRun: jest.fn(),
    listMinionRunsBySession: jest.fn(),
    listMinionRunsByCorrelationRoot: jest.fn(),
    createApproval: jest.fn(),
    resolveApproval: jest.fn(),
    listPendingApprovals: jest.fn(),
    getCachedToolCall: jest.fn(),
    setCachedToolCall: jest.fn(),
  });

  it('creates a new session when no thread id exists', async () => {
    const store = makeStore();
    const runner = { run: jest.fn().mockResolvedValue({ text: 'ok' }) };

    await handleIngressMessage(
      { platform: 'slack', teamId: 't1', userId: 'u1', text: 'hello' },
      store,
      runner
    );

    expect(store.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.any(String),
        teamId: 't1',
        platform: 'slack',
        userId: 'u1',
        correlationRoot: expect.stringMatching(/^corr_/),
      })
    );
  });

  it('reuses an existing session when thread id matches', async () => {
    const store = makeStore();
    store.getSession = jest.fn().mockReturnValue({
      id: 'thread-1',
      teamId: 't1',
      platform: 'slack',
      userId: 'u1',
      correlationRoot: 'corr_existing',
      createdAt: 1,
      updatedAt: 1,
    });
    const runner = { run: jest.fn().mockResolvedValue({ text: 'ok' }) };

    await handleIngressMessage(
      { platform: 'slack', teamId: 't1', userId: 'u1', text: 'hello', threadId: 'thread-1' },
      store,
      runner
    );

    expect(store.createSession).not.toHaveBeenCalled();
    expect(runner.run).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 'thread-1', correlationRoot: 'corr_existing' })
    );
  });

  it('returns the runner response', async () => {
    const store = makeStore();
    const runner = { run: jest.fn().mockResolvedValue({ text: 'done', blocks: [] }) };

    const result = await handleIngressMessage(
      { platform: 'teams', teamId: 't2', userId: 'u2', text: 'go' },
      store,
      runner
    );

    expect(result).toEqual({ text: 'done', blocks: [] });
  });
});
