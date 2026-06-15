import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createServiceNowClient } from './client.js';
import { startServiceNowServer } from './server.js';

export const MODULE_PATH = fileURLToPath(import.meta.url);

export function loadConfigFromEnv(): {
  instance: string;
  username: string;
  password: string;
} {
  const instance = process.env.SERVICENOW_INSTANCE;
  const username = process.env.SERVICENOW_USERNAME;
  const password = process.env.SERVICENOW_PASSWORD;

  if (!instance || !username || !password) {
    throw new Error(
      'Missing required environment variables: SERVICENOW_INSTANCE, SERVICENOW_USERNAME, SERVICENOW_PASSWORD'
    );
  }

  return { instance, username, password };
}

export async function main(): Promise<void> {
  const { instance, username, password } = loadConfigFromEnv();
  const client = createServiceNowClient({ instance, username, password });
  await startServiceNowServer(client);
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
