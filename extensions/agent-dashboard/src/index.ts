import { AcpClient } from './acp-client.js';
import { startDashboardServer } from './dashboard.js';

const acpUrl = process.env.GOOSE_ACP_URL ?? 'ws://localhost:3284/acp';
const acpToken = process.env.GOOSE_ACP_TOKEN ?? '';
const port = Number(process.env.DASHBOARD_PORT ?? 3001);

const client = new AcpClient(acpUrl, acpToken);

startDashboardServer(client, port).catch((err) => {
  console.error('Dashboard failed to start', err);
  process.exit(1);
});
