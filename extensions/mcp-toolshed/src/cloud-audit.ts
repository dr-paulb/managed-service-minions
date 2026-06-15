import type { TableClient } from '@azure/data-tables';
import type { AuditEntry } from 'framework-core';

export type AuditLogger = (entry: AuditEntry) => void | Promise<void>;

export function createAzureTableAuditLogger(client: TableClient): AuditLogger {
  return async (entry: AuditEntry): Promise<void> => {
    await client.upsertEntity({
      partitionKey: entry.teamId,
      rowKey: entry.id,
      timestamp: entry.timestamp,
      correlationId: entry.correlationId,
      minionType: entry.minionType,
      teamId: entry.teamId,
      serverAlias: entry.serverAlias,
      toolName: entry.toolName,
      params: JSON.stringify(entry.params),
      status: entry.status,
      latencyMs: entry.latencyMs,
      error: entry.error,
      retryAfterSeconds: entry.retryAfterSeconds,
      approvalId: entry.approvalId,
    });
  };
}
