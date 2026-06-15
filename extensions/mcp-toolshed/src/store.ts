import { createRequire } from 'node:module';
import type {
  SessionStore,
  Session,
  MinionRun,
  PendingApproval,
} from 'framework-core';

export { type SessionStore, type Session, type MinionRun, type PendingApproval };

const require = createRequire(import.meta.url);

export function createMemoryStore(): SessionStore {
  const sessions = new Map<string, Session>();
  const runs = new Map<string, MinionRun>();
  const approvals = new Map<string, PendingApproval>();
  const cache = new Map<string, unknown>();

  return {
    createSession(session: Session): void {
      sessions.set(session.id, session);
    },
    getSession(id: string): Session | undefined {
      return sessions.get(id);
    },
    createMinionRun(run: MinionRun): void {
      runs.set(run.id, run);
    },
    updateMinionRun(id: string, patch: Partial<MinionRun>): void {
      const existing = runs.get(id);
      if (existing) {
        runs.set(id, { ...existing, ...patch });
      }
    },
    createApproval(approval: PendingApproval): void {
      approvals.set(approval.id, approval);
    },
    getApproval(id: string): PendingApproval | undefined {
      return approvals.get(id);
    },
    resolveApproval(id: string, decision: 'approved' | 'denied'): void {
      const approval = approvals.get(id);
      if (approval) {
        approval.decision = decision;
        approval.decidedAt = Date.now();
      }
    },
    getCachedToolCall(key: string): unknown | undefined {
      return cache.get(key);
    },
    setCachedToolCall(key: string, value: unknown): void {
      cache.set(key, value);
    },
  };
}

export function createSqliteStore(
  path: string,
  DatabaseCtor?: new (path: string) => BetterSqlite3Database
): SessionStore {
  try {
    const Database = DatabaseCtor ?? loadBetterSqlite3();
    const db = new Database(path);
    initializeSchema(db);
    return createSqliteSessionStore(db);
  } catch (err) {
    console.warn(
      `[store] SQLite unavailable (${err instanceof Error ? err.message : String(err)}), falling back to memory store`
    );
    return createMemoryStore();
  }
}

function loadBetterSqlite3(): new (path: string) => BetterSqlite3Database {
  const mod = require('better-sqlite3');
  return mod.default ?? mod;
}

interface BetterSqlite3Database {
  exec(sql: string): void;
  prepare(sql: string): BetterSqlite3Statement;
  close(): void;
}

interface BetterSqlite3Statement {
  run(...params: unknown[]): { changes: number };
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
}

function initializeSchema(db: BetterSqlite3Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      user_id TEXT NOT NULL,
      correlation_root TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS minion_runs (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      minion_type TEXT NOT NULL,
      correlation_id TEXT NOT NULL,
      status TEXT NOT NULL,
      result_json TEXT,
      tokens_used INTEGER,
      created_at INTEGER NOT NULL,
      completed_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS pending_approvals (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      correlation_id TEXT NOT NULL,
      server_alias TEXT NOT NULL,
      tool_name TEXT NOT NULL,
      params_json TEXT NOT NULL,
      requested_at INTEGER NOT NULL,
      timeout_at INTEGER NOT NULL,
      decision TEXT,
      decided_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS tool_call_cache (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

function createSqliteSessionStore(db: BetterSqlite3Database): SessionStore {
  const insertSession = db.prepare(
    `INSERT INTO sessions (id, team_id, platform, user_id, correlation_root, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const selectSession = db.prepare('SELECT * FROM sessions WHERE id = ?');
  const insertRun = db.prepare(
    `INSERT INTO minion_runs (id, session_id, minion_type, correlation_id, status, result_json, tokens_used, created_at, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const selectRun = db.prepare('SELECT * FROM minion_runs WHERE id = ?');
  const updateRun = db.prepare('UPDATE minion_runs SET status = ?, result_json = ?, tokens_used = ?, completed_at = ? WHERE id = ?');
  const insertApproval = db.prepare(
    `INSERT INTO pending_approvals (id, session_id, correlation_id, server_alias, tool_name, params_json, requested_at, timeout_at, decision, decided_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const selectApproval = db.prepare('SELECT * FROM pending_approvals WHERE id = ?');
  const resolveApprovalStmt = db.prepare('UPDATE pending_approvals SET decision = ?, decided_at = ? WHERE id = ?');
  const selectCache = db.prepare('SELECT value FROM tool_call_cache WHERE key = ?');
  const insertCache = db.prepare('INSERT OR REPLACE INTO tool_call_cache (key, value) VALUES (?, ?)');

  return {
    createSession(session: Session): void {
      insertSession.run(
        session.id,
        session.teamId,
        session.platform,
        session.userId,
        session.correlationRoot,
        session.createdAt,
        session.updatedAt
      );
    },
    getSession(id: string): Session | undefined {
      const row = selectSession.get(id) as Record<string, unknown> | undefined;
      return row ? rowToSession(row) : undefined;
    },
    createMinionRun(run: MinionRun): void {
      insertRun.run(
        run.id,
        run.sessionId,
        run.minionType,
        run.correlationId,
        run.status,
        run.resultJson ?? null,
        run.tokensUsed ?? null,
        run.createdAt,
        run.completedAt ?? null
      );
    },
    updateMinionRun(id: string, patch: Partial<MinionRun>): void {
      const existing = selectRun.get(id) as Record<string, unknown> | undefined;
      if (!existing) return;
      updateRun.run(
        patch.status ?? existing.status,
        patch.resultJson ?? existing.result_json,
        patch.tokensUsed ?? existing.tokens_used,
        patch.completedAt ?? existing.completed_at,
        id
      );
    },
    createApproval(approval: PendingApproval): void {
      insertApproval.run(
        approval.id,
        approval.sessionId,
        approval.correlationId,
        approval.serverAlias,
        approval.toolName,
        approval.paramsJson,
        approval.requestedAt,
        approval.timeoutAt,
        approval.decision ?? null,
        approval.decidedAt ?? null
      );
    },
    getApproval(id: string): PendingApproval | undefined {
      const row = selectApproval.get(id) as Record<string, unknown> | undefined;
      return row ? rowToApproval(row) : undefined;
    },
    resolveApproval(id: string, decision: 'approved' | 'denied'): void {
      const approval = selectApproval.get(id) as Record<string, unknown> | undefined;
      if (!approval) return;
      resolveApprovalStmt.run(decision, Date.now(), id);
    },
    getCachedToolCall(key: string): unknown | undefined {
      const row = selectCache.get(key) as { value: string } | undefined;
      if (!row) return undefined;
      try {
        return JSON.parse(row.value);
      } catch {
        return undefined;
      }
    },
    setCachedToolCall(key: string, value: unknown): void {
      insertCache.run(key, JSON.stringify(value));
    },
  };
}

function rowToSession(row: Record<string, unknown>): Session {
  return {
    id: String(row.id),
    teamId: String(row.team_id),
    platform: String(row.platform),
    userId: String(row.user_id),
    correlationRoot: String(row.correlation_root),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

function rowToApproval(row: Record<string, unknown>): PendingApproval {
  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    correlationId: String(row.correlation_id),
    serverAlias: String(row.server_alias),
    toolName: String(row.tool_name),
    paramsJson: String(row.params_json),
    requestedAt: Number(row.requested_at),
    timeoutAt: Number(row.timeout_at),
    decision: row.decision == null ? undefined : (String(row.decision) as 'approved' | 'denied'),
    decidedAt: row.decided_at == null ? undefined : Number(row.decided_at),
  };
}
