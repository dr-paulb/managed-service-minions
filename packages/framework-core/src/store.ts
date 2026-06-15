export interface Session {
  id: string;
  teamId: string;
  platform: string;
  userId: string;
  correlationRoot: string;
  createdAt: number;
  updatedAt: number;
}

export interface MinionRun {
  id: string;
  sessionId: string;
  minionType: string;
  correlationId: string;
  status: string;
  resultJson?: string;
  tokensUsed?: number;
  createdAt: number;
  completedAt?: number;
}

export interface PendingApproval {
  id: string;
  sessionId: string;
  correlationId: string;
  serverAlias: string;
  toolName: string;
  paramsJson: string;
  requestedAt: number;
  timeoutAt: number;
  decision?: 'approved' | 'denied';
  decidedAt?: number;
}

export interface SessionStore {
  createSession(session: Session): void;
  getSession(id: string): Session | undefined;
  createMinionRun(run: MinionRun): void;
  updateMinionRun(id: string, patch: Partial<MinionRun>): void;
  createApproval(approval: PendingApproval): void;
  resolveApproval(id: string, decision: 'approved' | 'denied'): void;
  getCachedToolCall(key: string): unknown | undefined;
  setCachedToolCall(key: string, value: unknown): void;
}
