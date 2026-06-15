import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createAzureDevOpsClient } from './client.js';
import { startAzureDevOpsServer } from './server.js';

export const MODULE_PATH = fileURLToPath(import.meta.url);

export function loadConfigFromEnv(): { org: string; project: string; token: string } {
  const org = process.env.AZURE_DEVOPS_ORG;
  const project = process.env.AZURE_DEVOPS_PROJECT;
  const token = process.env.AZURE_DEVOPS_TOKEN;

  if (!org || !project || !token) {
    throw new Error(
      'Missing required environment variables: AZURE_DEVOPS_ORG, AZURE_DEVOPS_PROJECT, AZURE_DEVOPS_TOKEN'
    );
  }

  return { org, project, token };
}

export async function main(): Promise<void> {
  const { org, project, token } = loadConfigFromEnv();
  const client = createAzureDevOpsClient({ org, project, token });
  await startAzureDevOpsServer(client);
}

export function runIfInvoked(): void {
  const invokedPath = path.resolve(process.argv[1] ?? '');

  if (invokedPath === MODULE_PATH) {
    main().catch((err) => {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    });
  }
}

runIfInvoked();
