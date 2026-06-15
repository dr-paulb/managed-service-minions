import { fileURLToPath } from 'node:url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createJiraClient } from './client.js';
import { createJiraServer } from './server.js';

export const MODULE_PATH = fileURLToPath(import.meta.url);

export async function main(): Promise<void> {
  const host = process.env.JIRA_HOST;
  const email = process.env.JIRA_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;

  if (!host) {
    throw new Error('JIRA_HOST environment variable is required');
  }
  if (!email) {
    throw new Error('JIRA_EMAIL environment variable is required');
  }
  if (!apiToken) {
    throw new Error('JIRA_API_TOKEN environment variable is required');
  }

  const client = createJiraClient({ host, email, apiToken });
  const server = createJiraServer(client);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (process.argv[1] === MODULE_PATH) {
  try {
    await main();
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}
