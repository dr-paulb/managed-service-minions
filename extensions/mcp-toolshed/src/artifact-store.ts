import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { ContainerClient } from '@azure/storage-blob';

export interface ArtifactStore {
  uploadArtifact(sessionId: string, name: string, data: Buffer | string): Promise<{ url: string }>;
  downloadArtifact(url: string): Promise<Buffer>;
}

export class FileSystemArtifactStore implements ArtifactStore {
  constructor(private readonly baseDir: string) {}

  async uploadArtifact(sessionId: string, name: string, data: Buffer | string): Promise<{ url: string }> {
    const dir = path.join(this.baseDir, sessionId);
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, name);
    await fs.writeFile(filePath, data);
    return { url: `file://${filePath}` };
  }

  async downloadArtifact(url: string): Promise<Buffer> {
    const filePath = url.replace('file://', '');
    return fs.readFile(filePath);
  }
}

export class AzureBlobArtifactStore implements ArtifactStore {
  constructor(private readonly containerClient: ContainerClient) {}

  async uploadArtifact(sessionId: string, name: string, data: Buffer | string): Promise<{ url: string }> {
    const blobName = `${sessionId}/${name}`;
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.upload(data, Buffer.byteLength(data));
    return { url: blockBlobClient.url };
  }

  async downloadArtifact(url: string): Promise<Buffer> {
    const blobName = url.replace(`${this.containerClient.url}/`, '');
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
    const response = await blockBlobClient.download(0);
    const chunks: Buffer[] = [];
    const body = response.readableStreamBody as NodeJS.ReadableStream | undefined;
    if (!body) {
      return Buffer.alloc(0);
    }
    for await (const chunk of body) {
      chunks.push(
        Buffer.isBuffer(chunk)
          ? chunk
          : typeof chunk === 'string'
            ? Buffer.from(chunk)
            : Buffer.from(chunk as Uint8Array)
      );
    }
    return Buffer.concat(chunks);
  }
}

export function createArtifactStoreFromEnv(): ArtifactStore {
  const baseDir = process.env.ARTIFACT_STORE_DIR;
  if (baseDir) {
    return new FileSystemArtifactStore(baseDir);
  }
  throw new Error('ARTIFACT_STORE_DIR environment variable is required for the filesystem artifact store');
}

export function createInMemoryArtifactStore(): ArtifactStore {
  const artifacts = new Map<string, Buffer>();
  return {
    async uploadArtifact(sessionId: string, name: string, data: Buffer | string): Promise<{ url: string }> {
      const url = `memory://${sessionId}/${name}`;
      artifacts.set(url, Buffer.isBuffer(data) ? data : Buffer.from(data));
      return { url };
    },
    async downloadArtifact(url: string): Promise<Buffer> {
      const data = artifacts.get(url);
      if (!data) {
        throw new Error(`Artifact not found: ${url}`);
      }
      return data;
    },
  };
}
