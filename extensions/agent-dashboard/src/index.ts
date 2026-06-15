import { startDashboardServer } from './dashboard.js';
import { createSqliteStore } from 'mcp-toolshed';

async function main(): Promise<void> {
  const port = Number(process.env.DASHBOARD_PORT ?? 3001);
  const storePath = process.env.SQLITE_PATH ?? '/data/dashboard.db';
  const store = createSqliteStore(storePath);

  await startDashboardServer(store, port);
}

main().catch((err) => {
  console.error('Dashboard failed to start', err);
  process.exit(1);
});
