import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createGitHubClient } from './client.js';
import { createGitHubServer } from './server.js';

export async function main(): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is required');
  }

  const baseUrl = process.env.GITHUB_API_URL;
  const client = createGitHubClient(token, { baseUrl });
  const server = createGitHubServer(client);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

try {
  await main();
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
