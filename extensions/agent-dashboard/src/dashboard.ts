import { AcpClient } from './acp-client.js';

export async function startDashboardServer(client: AcpClient, port: number): Promise<void> {
  await client.connect();
  console.log(`Dashboard backend listening on port ${port}`);
  // TODO: start HTTP server exposing session list, transcript, correlation tree, health
}
