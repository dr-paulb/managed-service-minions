import { jest } from '@jest/globals';
import type { ChildProcess, SpawnOptions } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { createGooseRunner, type SpawnFn } from '../src/goose-runner.js';

function createMockChildProcess(stdoutChunks: Buffer[] = [], stderrChunks: Buffer[] = [], exitCode = 0): ChildProcess {
  const child = new EventEmitter() as ChildProcess;
  child.stdout = new EventEmitter() as NodeJS.ReadableStream;
  child.stderr = new EventEmitter() as NodeJS.ReadableStream;

  process.nextTick(() => {
    for (const chunk of stdoutChunks) {
      child.stdout?.emit('data', chunk);
    }
    for (const chunk of stderrChunks) {
      child.stderr?.emit('data', chunk);
    }
    child.emit('close', exitCode);
  });

  return child;
}

describe('createGooseRunner', () => {
  it('spawns goose with the recipe and user text', async () => {
    const spawn = jest.fn(((_cmd: string, _args: string[], _options: SpawnOptions) =>
      createMockChildProcess([Buffer.from('Goose output')])) as unknown as SpawnFn);

    const runner = createGooseRunner(spawn as unknown as SpawnFn, 'goose', 'commands/review-pr.yaml', '/plugin');
    const result = await runner.run('Review PR 42');

    expect(result).toBe('Goose output');
    expect(spawn).toHaveBeenCalledWith(
      'goose',
      ['run', '--recipe', 'commands/review-pr.yaml', '--text', 'Review PR 42', '--with-extension', '/plugin'],
      { cwd: '/plugin', env: process.env }
    );
  });

  it('rejects with stderr when goose exits non-zero', async () => {
    const spawn = jest.fn((() =>
      createMockChildProcess([], [Buffer.from('Goose failed')], 1)) as unknown as SpawnFn);

    const runner = createGooseRunner(spawn as unknown as SpawnFn, 'goose', 'commands/review-pr.yaml', '/plugin');
    await expect(runner.run('do something')).rejects.toThrow('Goose failed');
  });

  it('rejects with stdout when stderr is empty', async () => {
    const spawn = jest.fn((() =>
      createMockChildProcess([Buffer.from('stdout error')], [], 2)) as unknown as SpawnFn);

    const runner = createGooseRunner(spawn as unknown as SpawnFn, 'goose', 'commands/review-pr.yaml', '/plugin');
    await expect(runner.run('do something')).rejects.toThrow('stdout error');
  });

  it('rejects with exit code when there is no output', async () => {
    const spawn = jest.fn((() => createMockChildProcess([], [], 3)) as unknown as SpawnFn);

    const runner = createGooseRunner(spawn as unknown as SpawnFn, 'goose', 'commands/review-pr.yaml', '/plugin');
    await expect(runner.run('do something')).rejects.toThrow('Goose exited with code 3');
  });

  it('rejects when spawn fails', async () => {
    const child = new EventEmitter() as ChildProcess;
    child.stdout = new EventEmitter() as NodeJS.ReadableStream;
    child.stderr = new EventEmitter() as NodeJS.ReadableStream;
    const spawn = jest.fn((() => child) as unknown as SpawnFn);

    const runner = createGooseRunner(spawn as unknown as SpawnFn, 'goose', 'commands/review-pr.yaml', '/plugin');
    const promise = runner.run('do something');
    child.emit('error', new Error('spawn failed'));

    await expect(promise).rejects.toThrow('spawn failed');
  });
});
