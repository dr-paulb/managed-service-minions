import { jest } from '@jest/globals';
import { AcpClient } from '../src/acp-client.js';

describe('AcpClient', () => {
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

  afterAll(() => {
    logSpy.mockRestore();
  });

  it('connect logs the WebSocket URL with an encoded token', async () => {
    const client = new AcpClient('ws://localhost:3284/acp', 'tok&=?');
    await client.connect();

    expect(logSpy).toHaveBeenCalledWith(
      'Dashboard connecting to ws://localhost:3284/acp?token=tok%26%3D%3F'
    );
  });

  it('listSessions returns an empty array', async () => {
    const client = new AcpClient('ws://localhost:3284/acp', 'token');
    await expect(client.listSessions()).resolves.toEqual([]);
  });

  it('loadSession returns an empty object', async () => {
    const client = new AcpClient('ws://localhost:3284/acp', 'token');
    await expect(client.loadSession('session-1')).resolves.toEqual({});
  });

  it('cancelSession resolves without doing anything', async () => {
    const client = new AcpClient('ws://localhost:3284/acp', 'token');
    await expect(client.cancelSession('session-1')).resolves.toBeUndefined();
  });
});
