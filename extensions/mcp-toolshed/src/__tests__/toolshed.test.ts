import {
  executeTool,
  initializeToolshed,
  resetToolshed,
  createDefaultToolshedState,
  getToolshedState,
} from '../toolshed.js';
import { createMemoryStore } from '../store.js';
import { createMockAdapter } from '../adapter.js';
import { TokenBucketRateLimiter } from '../rate-limiter.js';

describe('executeTool', () => {
  const baseCtx = {
    teamId: 'team-a',
    minionType: 'code-explorer',
    correlationId: 'corr_1',
    attempt: 1,
  };

  afterEach(() => {
    resetToolshed();
  });

  it('returns error when toolshed is not initialized', async () => {
    const result = await executeTool(baseCtx, 'github', 'get_file_contents', { path: '/repo/readme.md' });
    expect(result.status).toBe('error');
    expect(result.error).toBe('Toolshed not initialized');
  });

  it('blocks tools not on the allowlist', async () => {
    initializeToolshed(
      createDefaultToolshedState({
        store: createMemoryStore(),
        adapters: new Map(),
      })
    );
    const result = await executeTool(baseCtx, 'github', 'delete_repo', {});
    expect(result.status).toBe('blocked_by_allowlist');
  });

  it('handles non-object params', async () => {
    initializeToolshed(
      createDefaultToolshedState({
        store: createMemoryStore(),
        adapters: new Map(),
        allowlists: {
          allowlists: { code_explorer: { github: ['get_file_contents'] } },
          pathScopes: {},
        },
      })
    );
    const result = await executeTool(baseCtx, 'github', 'get_file_contents', null);
    expect(result.status).toBe('error');
  });

  it('blocks filesystem paths outside the base path', async () => {
    initializeToolshed(
      createDefaultToolshedState({
        store: createMemoryStore(),
        adapters: new Map(),
        allowlists: {
          allowlists: { code_explorer: { filesystem: ['read_file'] } },
          pathScopes: {},
        },
      })
    );
    const result = await executeTool(baseCtx, 'filesystem', 'read_file', { path: '/etc/passwd' });
    expect(result.status).toBe('blocked_by_allowlist');
  });

  it('throttles when rate limit is exceeded', async () => {
    const limiter = new TokenBucketRateLimiter({ requestsPerMinute: 60, burst: 0 });
    initializeToolshed(
      createDefaultToolshedState({
        store: createMemoryStore(),
        adapters: new Map(),
        allowlists: {
          allowlists: { code_explorer: { filesystem: ['read_file'] } },
          pathScopes: {},
        },
        rateLimiter: limiter,
      })
    );
    const result = await executeTool(baseCtx, 'filesystem', 'read_file', { path: '/repo/readme.md' });
    expect(result.status).toBe('throttled');
  });

  it('throttles when circuit breaker is open', async () => {
    initializeToolshed(
      createDefaultToolshedState({
        store: createMemoryStore(),
        adapters: new Map(),
        allowlists: {
          allowlists: { code_explorer: { filesystem: ['read_file'] } },
          pathScopes: {},
        },
        circuitBreakerConfig: {
          failureThreshold: 1,
          successThreshold: 1,
          timeoutSecs: 60,
          halfOpenMaxRequests: 1,
        },
      })
    );
    await executeTool(baseCtx, 'filesystem', 'read_file', { path: '/repo/readme.md' });
    const result = await executeTool(baseCtx, 'filesystem', 'read_file', { path: '/repo/readme.md' });
    expect(result.status).toBe('throttled');
    expect(result.error).toBe('Circuit breaker is open');
  });

  it('requires approval for destructive actions', async () => {
    initializeToolshed(
      createDefaultToolshedState({
        store: createMemoryStore(),
        adapters: new Map(),
        allowlists: {
          allowlists: { code_explorer: { github: ['merge_pull_request'] } },
          pathScopes: {},
        },
        governance: {
          destructiveActions: [{ serverAlias: 'github', toolName: 'merge_pull_request' }],
          approvalTimeoutMinutes: 15,
          rateLimits: { default: { requestsPerMinute: 60, burst: 20 } },
          workspaceBoundaries: { allowedBasePaths: ['/repo'], denyPatterns: [] },
        },
      })
    );
    const result = await executeTool(baseCtx, 'github', 'merge_pull_request', { pr: 1 });
    expect(result.status).toBe('approval_required');
    expect(result.approvalId).toBeDefined();
  });

  it('returns cached results', async () => {
    const store = createMemoryStore();
    store.setCachedToolCall(
      'team-a:code-explorer:github:get_file_contents:{"path":"/repo/readme.md"}',
      { content: 'cached' }
    );
    initializeToolshed(
      createDefaultToolshedState({
        store,
        adapters: new Map(),
        allowlists: {
          allowlists: { code_explorer: { github: ['get_file_contents'] } },
          pathScopes: {},
        },
      })
    );
    const result = await executeTool(baseCtx, 'github', 'get_file_contents', { path: '/repo/readme.md' });
    expect(result.status).toBe('success');
    expect(result.data).toEqual({ content: 'cached' });
  });

  it('returns error for unknown server alias', async () => {
    initializeToolshed(
      createDefaultToolshedState({
        store: createMemoryStore(),
        adapters: new Map(),
        allowlists: {
          allowlists: { code_explorer: { github: ['get_file_contents'] } },
          pathScopes: {},
        },
      })
    );
    const result = await executeTool(baseCtx, 'github', 'get_file_contents', { path: '/repo/readme.md' });
    expect(result.status).toBe('error');
    expect(result.error).toContain('Unknown MCP server alias');
  });

  it('executes a tool through an adapter and caches the result', async () => {
    const adapter = createMockAdapter('github', {
      callTool: async () => ({ content: 'hello' }),
    });
    const store = createMemoryStore();
    initializeToolshed(
      createDefaultToolshedState({
        store,
        adapters: new Map([['github', adapter]]),
        allowlists: {
          allowlists: { code_explorer: { github: ['get_file_contents'] } },
          pathScopes: {},
        },
      })
    );
    const result = await executeTool(baseCtx, 'github', 'get_file_contents', { path: '/repo/readme.md' });
    expect(result.status).toBe('success');
    expect(result.data).toEqual({ content: 'hello' });
    const cached = store.getCachedToolCall(
      'team-a:code-explorer:github:get_file_contents:{"path":"/repo/readme.md"}'
    );
    expect(cached).toEqual({ content: 'hello' });
  });

  it('handles adapter errors and trips the breaker', async () => {
    const adapter = createMockAdapter('github', {
      callTool: async () => {
        throw new Error('boom');
      },
    });
    initializeToolshed(
      createDefaultToolshedState({
        store: createMemoryStore(),
        adapters: new Map([['github', adapter]]),
        allowlists: {
          allowlists: { code_explorer: { github: ['get_file_contents'] } },
          pathScopes: {},
        },
        circuitBreakerConfig: {
          failureThreshold: 5,
          successThreshold: 3,
          timeoutSecs: 30,
          halfOpenMaxRequests: 1,
        },
      })
    );
    const result = await executeTool(baseCtx, 'github', 'get_file_contents', { path: '/repo/readme.md' });
    expect(result.status).toBe('error');
    expect(result.error).toBe('boom');
  });

  it('handles non-error adapter failures', async () => {
    const adapter = createMockAdapter('github', {
      callTool: async () => {
        throw 'string error';
      },
    });
    initializeToolshed(
      createDefaultToolshedState({
        store: createMemoryStore(),
        adapters: new Map([['github', adapter]]),
        allowlists: {
          allowlists: { code_explorer: { github: ['get_file_contents'] } },
          pathScopes: {},
        },
      })
    );
    const result = await executeTool(baseCtx, 'github', 'get_file_contents', { path: '/repo/readme.md' });
    expect(result.status).toBe('error');
    expect(result.error).toBe('string error');
  });

  it('truncates large parameters in audit logs', async () => {
    const audit: unknown[] = [];
    initializeToolshed(
      createDefaultToolshedState({
        store: createMemoryStore(),
        adapters: new Map(),
        auditLogger: (entry) => audit.push(entry),
      })
    );
    const largeParams = { content: 'x'.repeat(10_000) };
    await executeTool(baseCtx, 'github', 'delete_repo', largeParams);
    const entry = audit[0] as { params: string };
    expect(entry.params.length).toBeLessThanOrEqual(4096 + '...[truncated]'.length);
    expect(entry.params).toContain('[truncated]');
  });
});

describe('toolshed state', () => {
  afterEach(() => {
    resetToolshed();
  });

  it('returns undefined before initialization', () => {
    expect(getToolshedState()).toBeUndefined();
  });

  it('returns the initialized state', () => {
    const state = createDefaultToolshedState({
      store: createMemoryStore(),
      adapters: new Map(),
    });
    initializeToolshed(state);
    expect(getToolshedState()).toBe(state);
  });
});
