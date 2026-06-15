import { describe, expect, it, jest } from '@jest/globals';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  FileSystemArtifactStore,
  AzureBlobArtifactStore,
  createArtifactStoreFromEnv,
  createInMemoryArtifactStore,
} from '../artifact-store.js';

describe('FileSystemArtifactStore', () => {
  it('uploads and downloads artifacts', async () => {
    const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'artifact-test-'));
    const store = new FileSystemArtifactStore(baseDir);

    const { url } = await store.uploadArtifact('session-1', 'output.log', 'hello world');
    expect(url.startsWith('file://')).toBe(true);

    const data = await store.downloadArtifact(url);
    expect(data.toString()).toBe('hello world');
  });

  it('uploads Buffer data', async () => {
    const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'artifact-test-'));
    const store = new FileSystemArtifactStore(baseDir);

    const { url } = await store.uploadArtifact('session-1', 'dump.bin', Buffer.from([0x00, 0x01]));
    const data = await store.downloadArtifact(url);
    expect(data).toEqual(Buffer.from([0x00, 0x01]));
  });
});

describe('AzureBlobArtifactStore', () => {
  function createFakeContainerClient(streamChunks: unknown[] = []): import('@azure/storage-blob').ContainerClient {
    const uploaded: { name: string; data: unknown; length: number }[] = [];
    const blobs = new Map<string, { data: unknown; length: number }>();
    const containerUrl = 'https://example.blob.core.windows.net/artifacts';

    return {
      url: containerUrl,
      getBlockBlobClient: jest.fn((blobName: string) => {
        const blobUrl = `${containerUrl}/${blobName}`;
        return {
          url: blobUrl,
          upload: jest.fn(async (data: unknown, length: number) => {
            uploaded.push({ name: blobName, data, length });
            blobs.set(blobName, { data, length });
          }),
          download: jest.fn(async () => {
            const blob = blobs.get(blobName);
            if (!blob) {
              throw new Error('Blob not found');
            }
            return {
              readableStreamBody: {
                [Symbol.asyncIterator]: async function* () {
                  for (const chunk of streamChunks) {
                    yield chunk;
                  }
                },
              },
            };
          }),
        };
      }),
    } as unknown as import('@azure/storage-blob').ContainerClient;
  }

  it('uploads an artifact and returns the blob url', async () => {
    const client = createFakeContainerClient();
    const store = new AzureBlobArtifactStore(client);

    const { url } = await store.uploadArtifact('session-1', 'output.log', 'hello world');

    expect(url).toBe('https://example.blob.core.windows.net/artifacts/session-1/output.log');
    expect(client.getBlockBlobClient).toHaveBeenCalledWith('session-1/output.log');
  });

  it('downloads an artifact from a blob url', async () => {
    const client = createFakeContainerClient([Buffer.from('hello world')]);
    const store = new AzureBlobArtifactStore(client);

    await store.uploadArtifact('session-1', 'output.log', 'hello world');
    const data = await store.downloadArtifact(
      'https://example.blob.core.windows.net/artifacts/session-1/output.log'
    );

    expect(data.toString()).toBe('hello world');
  });

  it('handles string chunks from the download stream', async () => {
    const client = createFakeContainerClient(['hello ', 'world']);
    const store = new AzureBlobArtifactStore(client);

    await store.uploadArtifact('session-1', 'output.log', 'hello world');
    const data = await store.downloadArtifact(
      'https://example.blob.core.windows.net/artifacts/session-1/output.log'
    );

    expect(data.toString()).toBe('hello world');
  });

  it('handles Uint8Array chunks from the download stream', async () => {
    const client = createFakeContainerClient([new Uint8Array(Buffer.from('hello world'))]);
    const store = new AzureBlobArtifactStore(client);

    await store.uploadArtifact('session-1', 'output.log', 'hello world');
    const data = await store.downloadArtifact(
      'https://example.blob.core.windows.net/artifacts/session-1/output.log'
    );

    expect(data.toString()).toBe('hello world');
  });

  it('returns an empty buffer when the download has no body', async () => {
    const client = createFakeContainerClient([]);
    const store = new AzureBlobArtifactStore(client);

    await store.uploadArtifact('session-1', 'output.log', 'hello world');
    (client.getBlockBlobClient as jest.Mock).mockReturnValueOnce({
      url: 'https://example.blob.core.windows.net/artifacts/session-1/output.log',
      upload: jest.fn().mockResolvedValue(undefined),
      download: jest.fn().mockResolvedValue({ readableStreamBody: undefined }),
    });

    const data = await store.downloadArtifact(
      'https://example.blob.core.windows.net/artifacts/session-1/output.log'
    );

    expect(data).toEqual(Buffer.alloc(0));
  });
});

describe('createArtifactStoreFromEnv', () => {
  it('creates a filesystem store from ARTIFACT_STORE_DIR', () => {
    const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'artifact-env-'));
    process.env.ARTIFACT_STORE_DIR = baseDir;
    const store = createArtifactStoreFromEnv();
    expect(store).toBeInstanceOf(FileSystemArtifactStore);
    delete process.env.ARTIFACT_STORE_DIR;
  });

  it('throws when ARTIFACT_STORE_DIR is not set', () => {
    delete process.env.ARTIFACT_STORE_DIR;
    expect(() => createArtifactStoreFromEnv()).toThrow('ARTIFACT_STORE_DIR');
  });
});

describe('createInMemoryArtifactStore', () => {
  it('uploads and downloads artifacts in memory', async () => {
    const store = createInMemoryArtifactStore();
    const { url } = await store.uploadArtifact('session-1', 'output.log', 'hello world');
    const data = await store.downloadArtifact(url);
    expect(data.toString()).toBe('hello world');
  });

  it('uploads Buffer data in memory', async () => {
    const store = createInMemoryArtifactStore();
    const { url } = await store.uploadArtifact('session-1', 'dump.bin', Buffer.from([0x00, 0x01]));
    const data = await store.downloadArtifact(url);
    expect(data).toEqual(Buffer.from([0x00, 0x01]));
  });

  it('throws when downloading a missing artifact', async () => {
    const store = createInMemoryArtifactStore();
    await expect(store.downloadArtifact('memory://missing')).rejects.toThrow('Artifact not found');
  });
});
