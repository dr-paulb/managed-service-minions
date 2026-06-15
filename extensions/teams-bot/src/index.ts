import { AcpClient } from './acp-client.js';

const acpUrl = process.env.GOOSE_ACP_URL ?? 'ws://localhost:3284/acp';
const acpToken = process.env.GOOSE_ACP_TOKEN ?? '';

const client = new AcpClient(acpUrl, acpToken);

client.connect().catch((err) => {
  console.error('Teams bot failed to connect to Goose ACP', err);
  process.exit(1);
});
