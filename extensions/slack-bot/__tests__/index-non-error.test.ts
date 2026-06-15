import { jest } from '@jest/globals';

jest.unstable_mockModule('@slack/bolt', () => ({
  App: jest.fn(),
}));

jest.unstable_mockModule('node:child_process', () => ({
  spawn: jest.fn(),
}));

jest.unstable_mockModule('../src/config.js', () => ({
  loadConfig: jest.fn(() => {
    throw 'string failure';
  }),
}));

const mockExit = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as (code?: number) => never);

describe('slack-bot entry point non-error failure', () => {
  afterAll(() => {
    mockExit.mockRestore();
  });

  it('handles a non-error thrown at startup', async () => {
    await import('../src/index.js');

    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
