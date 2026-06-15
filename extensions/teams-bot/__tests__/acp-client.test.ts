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
      'Teams bot connecting to ws://localhost:3284/acp?token=tok%26%3D%3F'
    );
  });

  it('sendPrompt resolves without doing anything', async () => {
    const client = new AcpClient('ws://localhost:3284/acp', 'token');
    await expect(client.sendPrompt(null, 'hello')).resolves.toBeUndefined();
  });
});
