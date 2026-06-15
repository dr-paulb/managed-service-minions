import { jest } from '@jest/globals';
import { createMemoryStore, createSqliteStore, type PendingApproval } from '../store.js';

type Statement = {
  run(...params: unknown[]): { changes: number };
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
};

type DatabaseCtor = new (path: string) => {
  exec(sql: string): void;
  prepare(sql: string): Statement;
  close(): void;
};

function createStatement(overrides: Partial<Statement> = {}): Statement {
  return {
    run: jest.fn() as unknown as Statement['run'],
    get: jest.fn().mockReturnValue(undefined) as unknown as Statement['get'],
    all: jest.fn() as unknown as Statement['all'],
    ...overrides,
  };
}

describe('store', () => {
  describe('createMemoryStore', () => {
    it('stores and retrieves sessions', () => {
      const store = createMemoryStore();
      const session = {
        id: 's1',
        teamId: 'team-a',
        platform: 'slack',
        userId: 'u1',
        correlationRoot: 'corr_1',
        createdAt: 1,
        updatedAt: 1,
      };
      store.createSession(session);
      expect(store.getSession('s1')).toEqual(session);
      expect(store.getSession('missing')).toBeUndefined();
    });

    it('stores and updates minion runs', () => {
      const store = createMemoryStore();
      const run = {
        id: 'r1',
        sessionId: 's1',
        minionType: 'code-explorer',
        correlationId: 'corr_1',
        status: 'running',
        createdAt: 1,
      };
      store.createMinionRun(run);
      store.updateMinionRun('r1', { status: 'completed', completedAt: 2 });
      store.updateMinionRun('r1', { tokensUsed: 10 });
      store.updateMinionRun('missing', { status: 'completed' });
      expect(store.getSession('r1')).toBeUndefined();
    });

    it('stores and resolves approvals', () => {
      const store = createMemoryStore();
      const approval: PendingApproval = {
        id: 'a1',
        sessionId: 's1',
        correlationId: 'corr_1',
        serverAlias: 'github',
        toolName: 'merge_pull_request',
        paramsJson: '{}',
        requestedAt: 1,
        timeoutAt: 2,
      };
      store.createApproval(approval);
      store.resolveApproval('a1', 'approved');
      expect(approval.decision).toBe('approved');
      expect(approval.decidedAt).toBeDefined();
      store.resolveApproval('missing', 'denied');
    });

    it('caches tool calls', () => {
      const store = createMemoryStore();
      store.setCachedToolCall('key', { value: 42 });
      expect(store.getCachedToolCall('key')).toEqual({ value: 42 });
      expect(store.getCachedToolCall('missing')).toBeUndefined();
    });
  });

  describe('createSqliteStore', () => {
    it('falls back to memory when the constructor throws', () => {
      const DatabaseCtor = jest.fn().mockImplementation(() => {
        throw new Error('native bindings missing');
      }) as unknown as DatabaseCtor;
      const store = createSqliteStore(':memory:', DatabaseCtor);
      store.createSession({
        id: 's1',
        teamId: 'team-a',
        platform: 'slack',
        userId: 'u1',
        correlationRoot: 'corr_1',
        createdAt: 1,
        updatedAt: 1,
      });
      expect(store.getSession('s1')).toMatchObject({ id: 's1' });
    });

    it('falls back when the constructor throws a non-error', () => {
      const DatabaseCtor = jest.fn().mockImplementation(() => {
        throw 'string failure';
      }) as unknown as DatabaseCtor;
      const store = createSqliteStore(':memory:', DatabaseCtor);
      expect(store.getSession('s1')).toBeUndefined();
    });

    it('uses SQLite when available', () => {
      const prepared = createStatement({
        get: jest.fn().mockImplementation(
          ((id: string) => {
            if (id === 'key') return { value: JSON.stringify({ value: 42 }) };
            return {
              id: 's1',
              team_id: 'team-a',
              platform: 'slack',
              user_id: 'u1',
              correlation_root: 'corr_1',
              created_at: 1,
              updated_at: 1,
            };
          }) as (...args: unknown[]) => unknown
        ) as unknown as Statement['get'],
      });
      const db = {
        exec: jest.fn(),
        prepare: jest.fn().mockReturnValue(prepared),
        close: jest.fn(),
      };
      const DatabaseCtor = jest.fn().mockReturnValue(db) as unknown as DatabaseCtor;

      const store = createSqliteStore(':memory:', DatabaseCtor);
      store.createSession({
        id: 's1',
        teamId: 'team-a',
        platform: 'slack',
        userId: 'u1',
        correlationRoot: 'corr_1',
        createdAt: 1,
        updatedAt: 1,
      });
      store.createMinionRun({
        id: 'r1',
        sessionId: 's1',
        minionType: 'code-explorer',
        correlationId: 'corr_1',
        status: 'running',
        createdAt: 1,
      });
      store.updateMinionRun('r1', { status: 'completed', completedAt: 2 });
      store.updateMinionRun('r1', { tokensUsed: 10 });
      store.createApproval({
        id: 'a1',
        sessionId: 's1',
        correlationId: 'corr_1',
        serverAlias: 'github',
        toolName: 'merge_pull_request',
        paramsJson: '{}',
        requestedAt: 1,
        timeoutAt: 2,
      });
      store.resolveApproval('a1', 'approved');
      store.setCachedToolCall('key', { value: 42 });
      expect(store.getCachedToolCall('key')).toEqual({ value: 42 });

      expect(db.exec).toHaveBeenCalled();
      expect(prepared.run).toHaveBeenCalled();

      const session = store.getSession('s1');
      expect(session).toMatchObject({ id: 's1', teamId: 'team-a' });
    });

    it('returns undefined for missing SQLite records', () => {
      const prepared = createStatement();
      const db = {
        exec: jest.fn(),
        prepare: jest.fn().mockReturnValue(prepared),
        close: jest.fn(),
      };
      const DatabaseCtor = jest.fn().mockReturnValue(db) as unknown as DatabaseCtor;

      const store = createSqliteStore(':memory:', DatabaseCtor);
      expect(store.getSession('missing')).toBeUndefined();
    });

    it('silently ignores updates for missing runs', () => {
      const prepared = createStatement();
      const db = {
        exec: jest.fn(),
        prepare: jest.fn().mockReturnValue(prepared),
        close: jest.fn(),
      };
      const DatabaseCtor = jest.fn().mockReturnValue(db) as unknown as DatabaseCtor;

      const store = createSqliteStore(':memory:', DatabaseCtor);
      store.updateMinionRun('missing', { status: 'completed' });
    });

    it('silently ignores resolve for missing approvals', () => {
      const prepared = createStatement();
      const db = {
        exec: jest.fn(),
        prepare: jest.fn().mockReturnValue(prepared),
        close: jest.fn(),
      };
      const DatabaseCtor = jest.fn().mockReturnValue(db) as unknown as DatabaseCtor;

      const store = createSqliteStore(':memory:', DatabaseCtor);
      store.resolveApproval('missing', 'denied');
    });

    it('returns undefined when cache row is missing', () => {
      const prepared = createStatement();
      const db = {
        exec: jest.fn(),
        prepare: jest.fn().mockReturnValue(prepared),
        close: jest.fn(),
      };
      const DatabaseCtor = jest.fn().mockReturnValue(db) as unknown as DatabaseCtor;

      const store = createSqliteStore(':memory:', DatabaseCtor);
      expect(store.getCachedToolCall('missing')).toBeUndefined();
    });

    it('returns undefined when cached JSON is invalid', () => {
      const prepared = createStatement({
        get: jest.fn().mockReturnValue({ value: 'not-json' }) as unknown as Statement['get'],
      });
      const db = {
        exec: jest.fn(),
        prepare: jest.fn().mockReturnValue(prepared),
        close: jest.fn(),
      };
      const DatabaseCtor = jest.fn().mockReturnValue(db) as unknown as DatabaseCtor;

      const store = createSqliteStore(':memory:', DatabaseCtor);
      expect(store.getCachedToolCall('key')).toBeUndefined();
    });

    it('lists sessions', () => {
      const prepared = createStatement({
        all: jest.fn().mockReturnValue([
          {
            id: 's1',
            team_id: 'team-a',
            platform: 'slack',
            user_id: 'u1',
            correlation_root: 'corr_1',
            created_at: 1,
            updated_at: 1,
          },
        ]) as unknown as Statement['all'],
      });
      const db = {
        exec: jest.fn(),
        prepare: jest.fn().mockReturnValue(prepared),
        close: jest.fn(),
      };
      const DatabaseCtor = jest.fn().mockReturnValue(db) as unknown as DatabaseCtor;

      const store = createSqliteStore(':memory:', DatabaseCtor);
      expect(store.listSessions()).toHaveLength(1);
    });

    it('lists minion runs by session', () => {
      const prepared = createStatement({
        all: jest.fn().mockReturnValue([
          {
            id: 'r1',
            session_id: 's1',
            minion_type: 'code-explorer',
            correlation_id: 'corr_1',
            status: 'completed',
            result_json: null,
            tokens_used: null,
            created_at: 1,
            completed_at: 2,
          },
        ]) as unknown as Statement['all'],
      });
      const db = {
        exec: jest.fn(),
        prepare: jest.fn().mockReturnValue(prepared),
        close: jest.fn(),
      };
      const DatabaseCtor = jest.fn().mockReturnValue(db) as unknown as DatabaseCtor;

      const store = createSqliteStore(':memory:', DatabaseCtor);
      expect(store.listMinionRunsBySession('s1')).toHaveLength(1);
    });

    it('lists minion runs by correlation root', () => {
      const prepared = createStatement({
        all: jest.fn().mockReturnValue([
          {
            id: 'r1',
            session_id: 's1',
            minion_type: 'code-explorer',
            correlation_id: 'corr_1',
            status: 'completed',
            result_json: null,
            tokens_used: null,
            created_at: 1,
            completed_at: 2,
          },
        ]) as unknown as Statement['all'],
      });
      const db = {
        exec: jest.fn(),
        prepare: jest.fn().mockReturnValue(prepared),
        close: jest.fn(),
      };
      const DatabaseCtor = jest.fn().mockReturnValue(db) as unknown as DatabaseCtor;

      const store = createSqliteStore(':memory:', DatabaseCtor);
      expect(store.listMinionRunsByCorrelationRoot('corr_1')).toHaveLength(1);
    });

    it('lists pending approvals', () => {
      const prepared = createStatement({
        all: jest.fn().mockReturnValue([
          {
            id: 'a1',
            session_id: 's1',
            correlation_id: 'corr_1',
            server_alias: 'github',
            tool_name: 'merge_pull_request',
            params_json: '{}',
            requested_at: 1,
            timeout_at: 2,
            decision: null,
            decided_at: null,
          },
        ]) as unknown as Statement['all'],
      });
      const db = {
        exec: jest.fn(),
        prepare: jest.fn().mockReturnValue(prepared),
        close: jest.fn(),
      };
      const DatabaseCtor = jest.fn().mockReturnValue(db) as unknown as DatabaseCtor;

      const store = createSqliteStore(':memory:', DatabaseCtor);
      expect(store.listPendingApprovals()).toHaveLength(1);
    });

    it('maps optional sqlite row fields', () => {
      const prepared = createStatement({
        all: jest.fn().mockReturnValue([
          {
            id: 'r1',
            session_id: 's1',
            minion_type: 'code-explorer',
            correlation_id: 'corr_1',
            status: 'completed',
            result_json: 'null',
            tokens_used: 42,
            created_at: 1,
            completed_at: 2,
          },
        ]) as unknown as Statement['all'],
      });
      const db = {
        exec: jest.fn(),
        prepare: jest.fn().mockReturnValue(prepared),
        close: jest.fn(),
      };
      const DatabaseCtor = jest.fn().mockReturnValue(db) as unknown as DatabaseCtor;

      const store = createSqliteStore(':memory:', DatabaseCtor);
      const runs = store.listMinionRunsBySession('s1');
      expect(runs[0]).toMatchObject({
        resultJson: 'null',
        tokensUsed: 42,
        completedAt: 2,
      });
    });

    it('maps null optional fields to undefined', () => {
      const prepared = createStatement({
        all: jest.fn().mockReturnValue([
          {
            id: 'r1',
            session_id: 's1',
            minion_type: 'code-explorer',
            correlation_id: 'corr_1',
            status: 'completed',
            result_json: null,
            tokens_used: null,
            created_at: 1,
            completed_at: null,
          },
        ]) as unknown as Statement['all'],
      });
      const db = {
        exec: jest.fn(),
        prepare: jest.fn().mockReturnValue(prepared),
        close: jest.fn(),
      };
      const DatabaseCtor = jest.fn().mockReturnValue(db) as unknown as DatabaseCtor;

      const store = createSqliteStore(':memory:', DatabaseCtor);
      const runs = store.listMinionRunsBySession('s1');
      expect(runs[0]).toMatchObject({
        resultJson: undefined,
        tokensUsed: undefined,
        completedAt: undefined,
      });
    });

    it('maps decided approval fields', () => {
      const prepared = createStatement({
        all: jest.fn().mockReturnValue([
          {
            id: 'a1',
            session_id: 's1',
            correlation_id: 'corr_1',
            server_alias: 'github',
            tool_name: 'merge_pull_request',
            params_json: '{}',
            requested_at: 1,
            timeout_at: 2,
            decision: 'approved',
            decided_at: 3,
          },
        ]) as unknown as Statement['all'],
      });
      const db = {
        exec: jest.fn(),
        prepare: jest.fn().mockReturnValue(prepared),
        close: jest.fn(),
      };
      const DatabaseCtor = jest.fn().mockReturnValue(db) as unknown as DatabaseCtor;

      const store = createSqliteStore(':memory:', DatabaseCtor);
      const approvals = store.listPendingApprovals();
      expect(approvals[0]).toMatchObject({
        decision: 'approved',
        decidedAt: 3,
      });
    });

    it('maps null decision approval fields', () => {
      const prepared = createStatement({
        all: jest.fn().mockReturnValue([
          {
            id: 'a1',
            session_id: 's1',
            correlation_id: 'corr_1',
            server_alias: 'github',
            tool_name: 'merge_pull_request',
            params_json: '{}',
            requested_at: 1,
            timeout_at: 2,
            decision: null,
            decided_at: null,
          },
        ]) as unknown as Statement['all'],
      });
      const db = {
        exec: jest.fn(),
        prepare: jest.fn().mockReturnValue(prepared),
        close: jest.fn(),
      };
      const DatabaseCtor = jest.fn().mockReturnValue(db) as unknown as DatabaseCtor;

      const store = createSqliteStore(':memory:', DatabaseCtor);
      const approvals = store.listPendingApprovals();
      expect(approvals[0]).toMatchObject({
        decision: undefined,
        decidedAt: undefined,
      });
    });
  });

  describe('memory store list queries', () => {
    it('lists sessions', () => {
      const store = createMemoryStore();
      store.createSession({
        id: 's1',
        teamId: 'team-a',
        platform: 'slack',
        userId: 'u1',
        correlationRoot: 'corr_1',
        createdAt: 1,
        updatedAt: 1,
      });
      expect(store.listSessions()).toHaveLength(1);
    });

    it('lists minion runs by session', () => {
      const store = createMemoryStore();
      store.createMinionRun({
        id: 'r1',
        sessionId: 's1',
        minionType: 'code-explorer',
        correlationId: 'corr_1',
        status: 'completed',
        createdAt: 1,
      });
      expect(store.listMinionRunsBySession('s1')).toHaveLength(1);
      expect(store.listMinionRunsBySession('other')).toHaveLength(0);
    });

    it('lists minion runs by correlation root', () => {
      const store = createMemoryStore();
      store.createMinionRun({
        id: 'r1',
        sessionId: 's1',
        minionType: 'code-explorer',
        correlationId: 'corr_1',
        status: 'completed',
        createdAt: 1,
      });
      expect(store.listMinionRunsByCorrelationRoot('corr_1')).toHaveLength(1);
      expect(store.listMinionRunsByCorrelationRoot('corr_2')).toHaveLength(0);
    });

    it('lists only pending approvals', () => {
      const store = createMemoryStore();
      store.createApproval({
        id: 'a1',
        sessionId: 's1',
        correlationId: 'corr_1',
        serverAlias: 'github',
        toolName: 'merge_pull_request',
        paramsJson: '{}',
        requestedAt: 1,
        timeoutAt: 2,
      });
      store.resolveApproval('a1', 'approved');
      expect(store.listPendingApprovals()).toHaveLength(0);
    });
  });
});
