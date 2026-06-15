import { jest } from '@jest/globals';
import { createAzureTableAuditLogger } from '../cloud-audit.js';
import type { AuditEntry } from 'framework-core';

function createFakeTableClient(upsert: jest.Mock = jest.fn().mockResolvedValue(undefined)) {
  return {
    upsertEntity: upsert,
  } as unknown as import('@azure/data-tables').TableClient;
}

function makeEntry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    id: 'audit_1',
    timestamp: 1,
    correlationId: 'corr_1',
    minionType: 'code-explorer',
    teamId: 'team-a',
    serverAlias: 'github',
    toolName: 'get_file_contents',
    params: { path: '/repo/readme.md' },
    status: 'success',
    latencyMs: 10,
    ...overrides,
  };
}

describe('createAzureTableAuditLogger', () => {
  it('upserts an audit entry to the table', async () => {
    const upsert = jest.fn().mockResolvedValue(undefined);
    const logger = createAzureTableAuditLogger(createFakeTableClient(upsert));
    const entry = makeEntry();

    await logger(entry);

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        partitionKey: 'team-a',
        rowKey: 'audit_1',
        correlationId: 'corr_1',
        status: 'success',
        params: '{"path":"/repo/readme.md"}',
      })
    );
  });

  it('serializes undefined params as undefined', async () => {
    const upsert = jest.fn().mockResolvedValue(undefined);
    const logger = createAzureTableAuditLogger(createFakeTableClient(upsert));

    await logger(makeEntry({ params: undefined }));

    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ params: undefined }));
  });

  it('rejects when the table client rejects', async () => {
    const upsert = jest.fn().mockRejectedValue(new Error('table unavailable'));
    const logger = createAzureTableAuditLogger(createFakeTableClient(upsert));

    await expect(logger(makeEntry())).rejects.toThrow('table unavailable');
  });
});
