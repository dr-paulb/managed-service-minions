import { jest } from '@jest/globals';
import { AcpClient } from '../src/acp-client.js';
import { startDashboardServer } from '../src/dashboard.js';

describe('startDashboardServer', () => {
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('connects the client and logs the listening port', async () => {
    const client = new AcpClient('ws://localhost:3284/acp', 'token');
    const connectSpy = jest.spyOn(client, 'connect').mockResolvedValue(undefined);

    await startDashboardServer(client, 3001);

    expect(connectSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith('Dashboard backend listening on port 3001');
  });

  it('propagates connection errors', async () => {
    const client = new AcpClient('ws://localhost:3284/acp', 'token');
    const err = new Error('fail');
    jest.spyOn(client, 'connect').mockRejectedValue(err);

    await expect(startDashboardServer(client, 3001)).rejects.toBe(err);
  });
});
